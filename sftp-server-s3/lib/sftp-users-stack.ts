import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
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

    // iterate through each user
    props.users.forEach( (user) => {
      // create a user-specific bucket to store user data
      const userBucket = new s3.Bucket(this,user['name'] + '-homedirbucket', {
        encryption: s3.BucketEncryption.S3_MANAGED,
        versioned: true,
        enforceSSL: true,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      })

      // define a service principal for AWS transfer that is specific to this specific sftp service user. Use a condition to ensure the 
      // principal can only be used by the specific user logged in to transfer sftp.
      const transferUserServicePrincipal = new cdk.aws_iam.ServicePrincipal('transfer.amazonaws.com').withConditions({
        "StringEquals" : { "aws:SourceAccount": this.account },
        "ArnLike": { "aws:SourceArn": "arn:aws:transfer:" + this.region + ":" + this.account + ":user/" + props.transferServer.attrServerId + "/" + user['name'] }
      });
  
      // create a role that can be assumed by the sftp-user-specific service principal
      const transferAccessRole = new iam.Role(this,user['name'] + '-transfer-role',{
        assumedBy: transferUserServicePrincipal,
      })
      // grant read and write access to the home directory bucket. "*" is not required here, but is here to show how we can 
      // limit the objects based on a glob pattern.
      userBucket.grantReadWrite(transferAccessRole,"*")

      // create an sftp user that can see their own bucket as /
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

