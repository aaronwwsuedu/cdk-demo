import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnParameter } from 'aws-cdk-lib/aws-ssm';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class EcrDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repo = new ecr.Repository(this,'demoRepo',{
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      repositoryName: 'aaronw-xacct-ecr-leave-this-alone',
      encryption: ecr.RepositoryEncryption.KMS,
      autoDeleteImages: true,
      imageScanOnPush: true,
    })

    // because the access role changes based on the ec2-demo stack, rather than use a hard coded string, I'm using a parameter for the ARN.
    // arn will be in form arn:aws:iam::464015903663:role/Ec2DemoStack-gwClientInstanceRoleBDF7FDEB-NGNASS6SLD2Z
    const readWriteIdentity = new cdk.CfnParameter(this,'readWriteArn',{
      type: "String",
      description: "ARN to be granted read-write access"
    }).valueAsString
    const readOnlyIdentity = new cdk.CfnParameter(this,'readOnlyArn',{
      type: "String",
      description: "ARN to be granted read-only access"
    }).valueAsString

    
    // create an account principal that is associated with the accessing account. Any IAM identity (user, role, etc) will gain the privileges granted to the account
    // note: the principal must be granted relevant roles within its own account to be able to perform the actions on this account too.
    //const faccess = new iam.AccountPrincipal('464015903663')
    //repo.grantPull(faccess) // only allow the account to pull
    //repo.grant(faccess,'ecr:GetAuthorizationToken') // pull doesnt grant auth token access by default. allow that too.

    // this construct requires you to have a specific role in the account that wants to access the repo. The role must be granted
    // relevant permissions within its own account, as well as this policy within the shared resource account
    // the role must exist before using, and AWS will internally convert the role name to an internal identifier to protect your account from role re-use
    
    const roaccess = new iam.ArnPrincipal(readOnlyIdentity)
    repo.grantPull(roaccess) // only allow the account to pull
    repo.grant(roaccess,'ecr:GetAuthorizationToken') // pull doesnt grant auth token access by default. allow that too.

    const rwaccess = new iam.ArnPrincipal(readWriteIdentity)
    repo.grantPullPush(rwaccess)
    repo.grant(rwaccess,'ecr:GetAuthorizationToken')

    new cdk.CfnOutput(this,'ecrRepo',{ value: repo.repositoryUri })
    new cdk.CfnOutput(this,'ecrArn',{ value: repo.repositoryArn })

  }
}
