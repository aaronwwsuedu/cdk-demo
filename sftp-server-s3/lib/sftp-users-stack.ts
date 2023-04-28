import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as aws_transfer from  'aws-cdk-lib/aws-transfer';

interface SftpUsersStackProps extends cdk.StackProps {
  transferServer: aws_transfer.CfnServer,
  users: {
    name: string;
    publickey: string;
  }[]
}

export class SftpUsersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SftpUsersStackProps) {
    super(scope, id, props);

    props.users.forEach( (user) => {
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
        "ArnLike": { "aws:SourceArn": "arn:aws:transfer:" + this.region + ":" + this.account + ":user/" + props.transferServer.attrServerId + "/" + user['name'] }
      });
  
      const transferAccessRole = new iam.Role(this,user['name'] + '-transfer-role',{
        assumedBy: transferUserServicePrincipal,
      })

      userBucket.grantReadWrite(transferAccessRole,"*")

      const sftpUser = new aws_transfer.CfnUser(this,'xfer-user-' + user['name'],{
        userName: user['name'],
        role: transferAccessRole.roleArn,
        serverId: props.transferServer.attrServerId,
        sshPublicKeys: [ user['publickey'] ],
        homeDirectoryType: 'LOGICAL',
        homeDirectoryMappings: [
          { entry: "/", target: "/" + userBucket.bucketName  }
        ]
      })
    });
  }
}

