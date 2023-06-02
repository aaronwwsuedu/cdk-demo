import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

interface FileGatewayClientStackProps extends cdk.StackProps {
  file_gateway: ec2.IInstance,
 }

export class FileGatewayClientStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FileGatewayClientStackProps) {
    super(scope, id, props);

    if (process.env.VPC_ID == null) {
      console.log("environment variable VPC_ID must be set to desired VPC")
      process.exit(1)
    }
    const vpc = ec2.Vpc.fromLookup(this,'vpc',{ vpcId: process.env.VPC_ID })
    const subnets = vpc.selectSubnets( { subnetType: ec2.SubnetType.PRIVATE_ISOLATED } );

    // in order to use session manager to connect to the VM in the isolated network, we need endpiints for EC2, Session Manager, and 
    // the message services
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
    //userdata.addCommands(
    //  'mkfs -t xfs /dev/sdf',
    //  'mkdir /mnt/sourcedata',
    //  'mount -t xfs /dev/sdf /mnt/sourcedata',
    //  'echo "PS1=\`whoami\`\\@\\"FileGatewayClient>$ \\"" >> /etc/bashrc;mkdir /mnt/vaultdata',
    //  'mkdir /var/local/cdkapp-scripts;cd /var/local/cdkapp-scripts',
    //)
    //userdata.addCommands('aws s3 cp s3://' + cdkAppScriptsBucket.bucket_name + ' . --recursive --region ' + regionName)
        

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
    ec2_client.connections.allowTo(props.file_gateway,ec2.Port.tcp(2049)) // allow us to connect to NFS service
    ec2_client.connections.allowTo(props.file_gateway,ec2.Port.tcp(80)) // allow us to connect to the SG on port 80 to get the activation key
      
    /* enable SSM profile to allow us to connect to client using AWS console */
    ec2_client.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"))
  }
}
