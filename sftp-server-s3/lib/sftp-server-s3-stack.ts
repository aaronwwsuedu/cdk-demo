import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as aws_transfer from  'aws-cdk-lib/aws-transfer';

// in addition to the standard stack properties, we want a list of networks that can connect to the service, and the vpc to deploy into.
interface SftpServerS3StackProps extends cdk.StackProps {
  allowedNetworks: {
    cidr: string;
    comment: string;
  }[]
}

export class SftpServerS3Stack extends cdk.Stack {
  public transfer_server: aws_transfer.CfnServer

  constructor(scope: Construct, id: string, props: SftpServerS3StackProps) {
    super(scope, id, props);

    if (process.env.VPC_ID == null) {
      console.log("environment variable VPC_ID must be set to desired VPC")
      process.exit(1)
    }
    const vpc    = ec2.Vpc.fromLookup(this,'default_vpc',{ vpcId: process.env.VPC_ID })
    
    /* Note that this servicePrincipal is restricted, to protect from confused deputy issues 
     * this is an example, which is still not least privilege, but limits to "only transfer servers in this account"
     * To be truly least-privileged as far as assume-role goes, we would need to specify exactly which server is allowed
     * to call assume-role
     * 
     * See: https://docs.aws.amazon.com/transfer/latest/userguide/confused-deputy.html
     * 
     * I (aaronw) am working on the circular reference issue here, where we need the role before we define
     * the xfer server, but also need to know the xfer server arn to truly restrict the role
     * As it is, this role can only be assumed by a transfer server within our account. (pretty good!)
     */
    const transferLogServicePrincipal = new cdk.aws_iam.ServicePrincipal('transfer.amazonaws.com').withConditions({
      "StringEquals" : { "aws:SourceAccount": this.account },
      "ArnLike": { "aws:SourceArn": "arn:aws:transfer:" + this.region + ":" + this.account + ":server/*" }
    });

    const sftp_access = new ec2.SecurityGroup(this,'transfer-sftp-sg',{
      vpc: vpc
    })
    // iterate the networks provided and add an ingress rule for each.
    props.allowedNetworks.forEach( (network) => {
      sftp_access.addIngressRule(ec2.Peer.ipv4(network['cidr']),ec2.Port.tcp(22),network['comment'])
    })

    // create a role that allows transfer to write to cloudwatch. Don't assign a policy until after we have an object
    // for the transfer server 
    const transferLogWriterRole = new iam.Role(this,'transfer-cloudwatch-writer', {
      assumedBy: transferLogServicePrincipal,
    })

    // select out the public networks (those that are directly routing to the internet using an internet Gateway)
    const subnets = vpc.selectSubnets( { subnetType: ec2.SubnetType.PUBLIC } ).subnetIds;
    var eips: string[] = []
    // for each subnet, grab an elastic IP to assign to the transfer service and put it in a list.
    for (let i=0;i<subnets.length;i++) {
      eips.push(new ec2.CfnEIP(this,'transferIp-' + i,{}).attrAllocationId)
    }
     
    // create a transfer server. Because we are assigning it EIP (one per subnet), it'll be publicly accessible
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


    // create a log group. We create it here so we don't need to delegate rights to transfer to create the group.
    const logGroup = new logs.LogGroup(this,'aws-xfer-lg',{
      logGroupName: '/aws/transfer/' + this.transfer_server.attrServerId,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    // add policy to allow log writer role to write to the log group. Note that this policy will only allow the log writer to write to streams in this specific log group.
    logGroup.grantWrite(transferLogWriterRole)

    // make the domain name an output of the stack, so we can see it when cdk completes.
    new cdk.CfnOutput(this, 'domainName', {
      description: 'Server endpoint hostname',
      value: `${this.transfer_server.attrServerId}.server.transfer.${this.region}.amazonaws.com`
    });
    
  }
}

