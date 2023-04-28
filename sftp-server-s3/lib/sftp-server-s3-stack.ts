import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as aws_transfer from  'aws-cdk-lib/aws-transfer';

interface SftpServerS3StackProps extends cdk.StackProps {
  allowedNetworks: string[]
  vpc_id: string,
}

export class SftpServerS3Stack extends cdk.Stack {
  public transfer_server: aws_transfer.CfnServer

  constructor(scope: Construct, id: string, props: SftpServerS3StackProps) {
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

    const sftp_access = new ec2.SecurityGroup(this,'transfer-sftp-sg',{
      vpc: vpc
    })
    props.allowedNetworks.forEach( (network) => {
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
        
    this.transfer_server = new cdk.aws_transfer.CfnServer(this, 'transferService',{
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
      value: `${this.transfer_server.attrServerId}.server.transfer.${this.region}.amazonaws.com`
    });

    // create a log group. WE create it here so we don't need to delegate rights to transfer to create the group.
    const logGroup = new logs.LogGroup(this,'aws-xfer-lg',{
      logGroupName: '/aws/transfer/' + this.transfer_server.attrServerId,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    // add policy to allow log writer role to write to the log group.
    logGroup.grantWrite(transferLogWriterRole)
  }
}

