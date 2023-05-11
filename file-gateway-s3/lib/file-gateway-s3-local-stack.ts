import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { addDependency } from 'aws-cdk-lib/core/lib/deps';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface FileGatewayFileGatewayStackProps extends cdk.StackProps {
  vpc_id: string,
 }
 
export class FileGatewayFileGatewayStack extends cdk.Stack {
  file_gateway_instance: ec2.IInstance;

  constructor(scope: Construct, id: string, props: FileGatewayFileGatewayStackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this,'vpc',{ vpcId: props.vpc_id })
    const subnets = vpc.selectSubnets( { subnetType: ec2.SubnetType.PUBLIC } );


    // This implementation uses an isolated network, so it cannot use public endpoints or access the public internet.
    // Create PrivateLink endpoints.
    // NOTE: it may be appropriate to create a separate CDK application for the endpoints so they can be shared among multiple
    // applications, then modify this stack to use parameters rather than create them here.
    //
    // by default, endpoints are assigned a security group that allows the entire VPC to use them to access AWS services.

    const S3GatewayEndpoint = new ec2.GatewayVpcEndpoint(this,'S3GatewayEndpoint',{
      vpc: vpc,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }],
      service: ec2.GatewayVpcEndpointAwsService.S3
    })
    const sgEndpoint = new ec2.InterfaceVpcEndpoint(this,'storageGWInterfaceEndpoint',{
      vpc: vpc,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      service: ec2.InterfaceVpcEndpointAwsService.STORAGE_GATEWAY,
    })
    const s3Endpoint = new ec2.InterfaceVpcEndpoint(this,'s3InterfaceEndpoint',{
      vpc: vpc,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      service: ec2.InterfaceVpcEndpointAwsService.S3
    })
    s3Endpoint.node.addDependency(S3GatewayEndpoint)


    // output dns name and Endpoint ID of S3 Interface endpoint so we know which to use for shares
    new cdk.CfnOutput(this,'S3EndpointId',{
      value: s3Endpoint.vpcEndpointId
    })



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
    this.file_gateway_instance.connections.allowTo(sgEndpoint, ec2.Port.tcp(1026))
    this.file_gateway_instance.connections.allowTo(sgEndpoint, ec2.Port.tcp(1027))
    this.file_gateway_instance.connections.allowTo(sgEndpoint, ec2.Port.tcp(1028))
    this.file_gateway_instance.connections.allowTo(sgEndpoint, ec2.Port.tcp(1031))
    this.file_gateway_instance.connections.allowTo(sgEndpoint, ec2.Port.tcp(2222))

    // output dns name of File gateway VM
    new cdk.CfnOutput(this,'File Gateway Private Name',{
      value: this.file_gateway_instance.instancePrivateDnsName
    })
    // this URL is only accessible from INSIDE THE VPC!
    new cdk.CfnOutput(this,'curlUrl',{
      value: "http://" + 
         this.file_gateway_instance.instancePrivateDnsName + 
        "/?gatewayType=FILE_S3&activationRegion=" + props.env?.region + "&vpcEndpoint=" + 
          cdk.Fn.split(':',cdk.Fn.select(0,sgEndpoint.vpcEndpointDnsEntries),2)[1] + 
          "&no_redirect"
    })
  }
}
