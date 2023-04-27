import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as aws_transfer from  'aws-cdk-lib/aws-transfer';

export class SftpServerS3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

      const allowedNetworks = [ '10.153.3.0/24' ]

      const vpc_id = process.env['VPC_ID']
      const vpc    = ec2.Vpc.fromLookup(this,'default_vpc',{ vpcId: vpc_id })
      //const public_subnets = vpc.selectSubnets( { subnetType: ec2.SubnetType.PUBLIC } )
    
      const servicePrincipal = new cdk.aws_iam.ServicePrincipal('transfer.amazonaws.com');

      const users = [
        { 'name': 'user1', 'publickey': '1241251' }
      ]

      const sftp_access = new ec2.SecurityGroup(this,'transfer-sftp-sg',{
        vpc: vpc
      })
      allowedNetworks.forEach( (network) => {
        sftp_access.addIngressRule(ec2.Peer.ipv4(network),ec2.Port.tcp(22))
      })
    
      /* this role is not least-privilege (logs:CreateLogGroup should not be required) */
      const transferLogWriterRole = new iam.Role(this,'transfer-cloudwatch-writer', {
        assumedBy: servicePrincipal,
        inlinePolicies: {
          allowLogging: iam.PolicyDocument.fromJson({
            Version: '2012-10-17',
            Statement:[{
              Effect: 'Allow',
              Action: ['logs:CreateLogGroup','logs:CreateLogStream','logs:DescribeLogStreams', 'logs:PutLogEvents'],
              Resource: `arn:aws:logs:${ this.region }:${ this.account }:log-group:/aws/transfer/*`
            }]
          })
        }
      })
        
      const transferService = new cdk.aws_transfer.CfnServer(this, 'transferService',{
        endpointType: "VPC",
        protocols: ['SFTP'],
        identityProviderType: 'SERVICE_MANAGED',
        loggingRole: transferLogWriterRole.roleArn,
        domain: 'S3',
        endpointDetails: {
          subnetIds: vpc.selectSubnets( { subnetType: ec2.SubnetType.PUBLIC } ).subnetIds,
          vpcId: vpc.vpcId,
          //addressAllocationIds: [eip.attrAllocationId],
          securityGroupIds: [sftp_access.securityGroupId]
        },
        protocolDetails: {
          setStatOption: 'ENABLE_NO_OP'
        }
      });

      users.forEach( (user) => {
        const userBucket = new s3.Bucket(this,user['name'] + '-homedirbucket', {
          encryption: s3.BucketEncryption.S3_MANAGED,
          versioned: true,
          enforceSSL: true,
          blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
          autoDeleteObjects: true,
        })

        const transferAccessRole = new iam.Role(this,user['name'] + '-transfer-role',{
          assumedBy: servicePrincipal,
        })

        userBucket.grantReadWrite(transferAccessRole,"*")

        const sftpUser = new aws_transfer.CfnUser(this,'xfer-user-' + user['name'],{
          userName: user['name'],
          role: transferAccessRole.roleArn,
          serverId: transferService.attrArn,
          sshPublicKeys: [ user['publickey'] ],
          homeDirectoryType: 'LOGICAL',
          homeDirectoryMappings: [
            { entry: "/", target: userBucket.bucketName + "/" }
          ]
        })

      });
    };
}

