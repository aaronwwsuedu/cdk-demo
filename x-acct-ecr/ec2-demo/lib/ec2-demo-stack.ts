import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2  from 'aws-cdk-lib/aws-ec2'
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export class Ec2DemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    if (process.env.VPC_ID == null) {
      console.log("environment variable VPC_ID must be set to desired VPC")
      process.exit(1)
    }
    const vpc = ec2.Vpc.fromLookup(this,'vpc',{ vpcId: process.env.VPC_ID })
    const subnets = vpc.selectSubnets( { subnetType: ec2.SubnetType.PUBLIC } );

    const userdata = ec2.UserData.forLinux()
    userdata.addCommands(
      'dnf update -y',
      'dnf install docker -y',
      'systemctl enable docker.server',
      'systemctl start docker.service',
      'dnf needs-restarting -r || reboot'
    )
  
    const ec2_client = new ec2.Instance(this,'gwClient',{
      vpc: vpc,
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON,ec2.InstanceSize.MICRO),
      vpcSubnets: subnets,
      userData: userdata
    })
    
    /* enable SSM profile to allow us to connect to client using AWS console */
    ec2_client.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"))
    /* grant ECR privileges to the role */
    ec2_client.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryPowerUser"))

    new cdk.CfnOutput(this,'ec2Id',{ value: ec2_client.instanceId })
    new cdk.CfnOutput(this,'ec2role',{ value: ec2_client.role.roleArn })
  }
}
