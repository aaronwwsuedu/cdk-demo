import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface AuroraPgClientStackProps extends cdk.StackProps {
  vpc_id: string,
  rds_instance: rds.IDatabaseCluster,
 }

export class AuroraPgClientStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AuroraPgClientStackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this,'vpc',{ vpcId: props.vpc_id })
    const subnets = vpc.selectSubnets( { subnetType: ec2.SubnetType.PRIVATE_ISOLATED } );

    // in order to use session manager to connect to the VM in the isolated network, we need endpiints for EC2, Session Manager, and 
    // the message services
    // in order to get updates and talk to S3, we also need a gateway interface
    //
    // This is a demo, so make the endpoints. In normal use, you'd want to have generic endpoints and reference them
    // as parameters.
    const s3gw = new ec2.GatewayVpcEndpoint(this,'s3Gateway',{
        vpc: vpc,
        subnets: [ { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }],
        service: ec2.GatewayVpcEndpointAwsService.S3
    })
    const s3int = new ec2.InterfaceVpcEndpoint(this,'s3Interface',{
        vpc: vpc,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        service: ec2.InterfaceVpcEndpointAwsService.S3
    })
    // add a strict dependency here so when we destroy the stack, the endpoints are destroyed in order.
    s3int.node.addDependency(s3gw)

    const interfaces: { [index: string]: ec2.InterfaceVpcEndpointAwsService } = {
      'ec2': ec2.InterfaceVpcEndpointAwsService.EC2,
      'ec2-message': ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
      'ssm': ec2.InterfaceVpcEndpointAwsService.SSM,
      'ssm-message': ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
    }
    for (let key in interfaces) { 
      new ec2.InterfaceVpcEndpoint(this,key,{
        vpc: vpc,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        service: interfaces[key]
      })
    }

    const userdata = ec2.UserData.forLinux()
    userdata.addCommands('dnf install -y postgresql15')
    userdata.addCommands('dnf update -y')
    userdata.addCommands('dnf needs-restarting && reboot') 

    const ec2_client = new ec2.Instance(this,'gwClient',{
      vpc: vpc,
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON,ec2.InstanceSize.MICRO),
      vpcSubnets: subnets,
      userData: userdata
    })

    /* allow client to connect to storage gateway appliance */
    ec2_client.connections.allowTo(props.rds_instance,ec2.Port.tcp(5432))
      
    /* enable SSM profile to allow us to connect to client using AWS console */
    ec2_client.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"))
  }
}
