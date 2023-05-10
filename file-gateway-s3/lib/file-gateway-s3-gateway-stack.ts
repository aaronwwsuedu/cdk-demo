import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface PrivateEndpointStackProps extends cdk.StackProps {
 vpc_id: string;
}

export class PrivateEndpointStack extends cdk.Stack {
  sgEndpoint: ec2.IInterfaceVpcEndpoint;


  constructor(scope: Construct, id: string, props: PrivateEndpointStackProps) {
    super(scope, id, props);
    const vpc = ec2.Vpc.fromLookup(this,'vpc',{ vpcId: props.vpc_id })

    const subnets = vpc.selectSubnets( { subnetType: ec2.SubnetType.PUBLIC } );

    // This implementation uses an isolated network, so it cannot use public endpoints or access the public internet. Create PrivateLink endpoints

      const s3InterfaceEndpoint = new ec2.InterfaceVpcEndpoint(this,'S3GatewayEndpoint',{
        vpc: vpc,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        service: ec2.InterfaceVpcEndpointAwsService.S3
      })
      this.sgEndpoint = new ec2.InterfaceVpcEndpoint(this,'storageGatewayEndpoint',{
        vpc: vpc,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        service: ec2.InterfaceVpcEndpointAwsService.STORAGE_GATEWAY,
      })

      // output dns name and Endpoint ID of S3 endpoint
      new cdk.CfnOutput(this,'S3EndpointDNS',{
        value: s3InterfaceEndpoint.vpcEndpointDnsEntries[0]
      })
      new cdk.CfnOutput(this,'S3EndpointId',{
        value: s3InterfaceEndpoint.vpcEndpointId
      })

  }
}
