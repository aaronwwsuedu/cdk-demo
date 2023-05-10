import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface FileGatewayFileGatewayStackProps extends cdk.StackProps {
  vpc_id: string,
  sgEndpoint: ec2.IInterfaceVpcEndpoint
 }
 
export class FileGatewayFileGatewayStack extends cdk.Stack {
  file_gateway_instance: ec2.IInstance;

  constructor(scope: Construct, id: string, props: FileGatewayFileGatewayStackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this,'vpc',{ vpcId: props.vpc_id })
    const subnets = vpc.selectSubnets( { subnetType: ec2.SubnetType.PUBLIC } );

    // Gateway requirements from https://docs.aws.amazon.com/filegateway/latest/files3/Requirements.html
    const gateway_ami = ec2.MachineImage.lookup({ name: "aws-storage-gateway*" })
    this.file_gateway_instance = new ec2.Instance(this,'fileGateway',{
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.R6A,ec2.InstanceSize.XLARGE),
      machineImage: gateway_ami,
      vpc: vpc,
      vpcSubnets: subnets,
      blockDevices: [
       {
        deviceName: '/dev/sda1',
        volume: ec2.BlockDeviceVolume.ebs(150)
       }
      ]
    })
    // allow gateway instance to talk to SG endpioint on all service ports
    this.file_gateway_instance.connections.allowTo(props.sgEndpoint, ec2.Port.tcp(1026))
    this.file_gateway_instance.connections.allowTo(props.sgEndpoint, ec2.Port.tcp(1027))
    this.file_gateway_instance.connections.allowTo(props.sgEndpoint, ec2.Port.tcp(1028))
    this.file_gateway_instance.connections.allowTo(props.sgEndpoint, ec2.Port.tcp(1031))
    this.file_gateway_instance.connections.allowTo(props.sgEndpoint, ec2.Port.tcp(2222))

    // output dns name of File gateway VM
    new cdk.CfnOutput(this,'File Gateway Private Name',{
      value: this.file_gateway_instance.instancePrivateDnsName
    })
  }
}