import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as aws_transfer from  'aws-cdk-lib/aws-transfer';

interface SftpServerS3StackProps extends cdk.StackProps {
  allowedNetworks: string[]
  vpc_id: string,
  users: {
    name: string;
    publickey: string;
  }[]
}

export class SftpServerS3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: SftpServerS3StackProps) {
    super(scope, id, props);

    const vpc    = ec2.Vpc.fromLookup(this,'default_vpc',{ vpcId: props?.vpc_id })
    
    /* Note that this servicePrincipal is restricted, to protect from confused deputy issues 
     * this is an example, which is still not least privilege, but limits to "only transfer servers in this account"
     * and "only users of transfer servers in this account"
     * 
     * See: https://docs.aws.amazon.com/transfer/latest/userguide/confused-deputy.html
     */
    const transferLogServicePrincipal = new cdk.aws_iam.ServicePrincipal('transfer.amazonaws.com').withConditions({
      "StringEquals" : { "aws:SourceAccount": this.account },
      "ArnLike": { "aws:SourceArn": "arn:aws:transfer:" + this.region + ":" + this.account + ":server/*" }
    });

    const users = [
      { 'name': 'user1', 'publickey': 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCv+gxHkQB8pHR+KLyQa2Tmj9wxsMeMN+zONsqxqoZVu5I4JnLS2cA7K31KgEx3Vh61ID5tKtEOUu1uHpGV2omSJN2b0FIOiwBpw7A/iUBSl1cO7GvCeNxvsgJNvZGWgBh4Jo07UsGMFpMBSha7BiFRqaEIby/1HJedW46SCMdUPXi3kV9vmfqJEk/9iF/+HVuV1+ZorZbOxFEEE2AZq5WMtE0GdgARwwRoeeETLsw+qH564kvtJQM5yKIGkC+u0rpxabwyrR4THcoWsL7s3eD4vNMm0T6KCWGxqIpdi4DdEeKdYYdnXL+Pm6LkhBe8sw2e04SPpFlCx3J5H/XDKdZkGxOPqu4vS1PyD50DpFcd1ciDI2dLAY+Z6wsB3jL+Mv5Y239YhUTGEDhMjssk9nhAX4SPYBBe+iwCW28i8jNmTwKQgDssAEELFQKCZxEthDVeugVmogiasqdPPM/0OfGoPe02tG9xoBQ/KTKhpyoXpuvlg3I52MYB1tFvZmXM7A0= localaaron@t1-001013.vpn.wsu.edu' }
    ]

    const sftp_access = new ec2.SecurityGroup(this,'transfer-sftp-sg',{
      vpc: vpc
    })
    props?.allowedNetworks.forEach( (network) => {
      sftp_access.addIngressRule(ec2.Peer.ipv4(network),ec2.Port.tcp(22))
    })

    // create a role that allows transfer to write to cloudwatch. Don't assign a policy just yet. 
    const transferLogWriterRole = new iam.Role(this,'transfer-cloudwatch-writer', {
      assumedBy: transferLogServicePrincipal,
    })

    const subnets = vpc.selectSubnets( { subnetType: ec2.SubnetType.PUBLIC } ).subnetIds;
    var eips: string[] = []
    for (let i=0;i<subnets.length;i++) {
      eips.push(new ec2.CfnEIP(this,'transferIp-' + i,{}).attrAllocationId)
    }
        
    const transferService = new cdk.aws_transfer.CfnServer(this, 'transferService',{
      endpointType: "VPC",
      protocols: ['SFTP'],
      identityProviderType: 'SERVICE_MANAGED',
      loggingRole: transferLogWriterRole.roleArn,
      domain: 'S3',
      endpointDetails: {
        subnetIds: subnets,
        vpcId: vpc.vpcId,
        securityGroupIds: [sftp_access.securityGroupId],
        // allocate an elastic IP so we can access our service over the internet
        addressAllocationIds: eips,
      },
      protocolDetails: {
        setStatOption: 'ENABLE_NO_OP'
      }
    });
    // make the domain name an output of the stack.
    new cdk.CfnOutput(this, 'domainName', {
      description: 'Server endpoint hostname',
      value: `${transferService.attrServerId}.server.transfer.${this.region}.amazonaws.com`
    });

    // create a log group. WE create it here so we don't need to delegate rights to transfer to create the group.
    const logGroup = new logs.LogGroup(this,'aws-xfer-lg',{
      logGroupName: '/aws/transfer/' + transferService.attrServerId,
      retention: logs.RetentionDays.ONE_MONTH
    })

    // add policy to allow log writer role to write to the log group.
    logGroup.grantWrite(transferLogWriterRole)

    props?.users.forEach( (user) => {
      const userBucket = new s3.Bucket(this,user['name'] + '-homedirbucket', {
        encryption: s3.BucketEncryption.S3_MANAGED,
        versioned: true,
        enforceSSL: true,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      })

      // only allow the transfer server that is connected as this particular user to assume the role associated with the user
      // THIS IS LEAST PRIVILEGE for assume-role
      const transferUserServicePrincipal = new cdk.aws_iam.ServicePrincipal('transfer.amazonaws.com').withConditions({
        "StringEquals" : { "aws:SourceAccount": this.account },
        "ArnLike": { "aws:SourceArn": "arn:aws:transfer:" + this.region + ":" + this.account + ":user/" + transferService.attrServerId + "/" + user['name'] }
      });
  
      const transferAccessRole = new iam.Role(this,user['name'] + '-transfer-role',{
        assumedBy: transferUserServicePrincipal,
      })

      userBucket.grantReadWrite(transferAccessRole,"*")

      const sftpUser = new aws_transfer.CfnUser(this,'xfer-user-' + user['name'],{
        userName: user['name'],
        role: transferAccessRole.roleArn,
        serverId: transferService.attrServerId,
        sshPublicKeys: [ user['publickey'] ],
        homeDirectoryType: 'LOGICAL',
        homeDirectoryMappings: [
          { entry: "/", target: "/" + userBucket.bucketName  }
        ]
      })
    });
  }
}

