import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class TargetStack extends cdk.Stack {
  public targetSG: cdk.aws_ec2.SecurityGroup ;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.targetSG = new cdk.aws_ec2.SecurityGroup(this,'DemoServerSecurityGroup',{
      vpc: cdk.aws_ec2.Vpc.fromLookup(this,'defaultVpc',{ vpcId: 'vpc-0599fbc5b1840589d' })
    })
    new cdk.CfnOutput(this,'SGIdOutPut',{ value: this.targetSG.securityGroupId })
    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'TargetQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
