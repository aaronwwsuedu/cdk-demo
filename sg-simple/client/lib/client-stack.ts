import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ClientStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sgParam = new cdk.CfnParameter(this,'targetSgParam')

    const targetSg = cdk.aws_ec2.SecurityGroup.fromSecurityGroupId(this,'targetSg',sgParam.valueAsString)

    const clientSg = new cdk.aws_ec2.SecurityGroup(this,'clientSg',{
      vpc: cdk.aws_ec2.Vpc.fromLookup(this,'defaultVpc',{ vpcId: 'vpc-0599fbc5b1840589d' })
    })

    targetSg.addIngressRule(clientSg,cdk.aws_ec2.Port.tcp(5432),"Allow add ingress rule to PostgreSQL for clients using clientSG")
    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'ClientQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
