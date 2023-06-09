import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

// the actual code we want to deploy into the example account
export class ExampleApplicationStack extends cdk.Stack {

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // our application is going to deploy a single S3 bucket as a demo.
    new cdk.aws_s3.Bucket(this,'exampleApplicationBucket',{
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    /*
     * this repo construct is commented out so you can make a change and watch it deploy
     */
    //new cdk.aws_codecommit.Repository(this,'exampleTargetRepository',{
    //  repositoryName: 'demoTargetRepo',
    //  description: "A demo repo",
    //}).applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)
  }
}
