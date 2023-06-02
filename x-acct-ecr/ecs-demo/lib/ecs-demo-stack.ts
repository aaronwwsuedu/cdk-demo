import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class EcsDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ecr.Repository.fromRepositoryArn requires early binding, so to use a parameter, we need to know the name 
    // and arn.
    const repo = new cdk.CfnParameter(this,'ecrName',{
      type: "String",
      description: "ECR Repo Name for hello world image",
    })
    const account = new cdk.CfnParameter(this,'ecrAcct',{
      type: "String",
      description: "AWS Account holding ECR repo for hello world image",
    })

    if (process.env.VPC_ID == null) {
      console.log("environment variable VPC_ID must be set to desired VPC")
      process.exit(1)
    }
    const vpc = ec2.Vpc.fromLookup(this,'vpc',{ vpcId: process.env.VPC_ID })

    const lg = new logs.LogGroup(this,'helloWorldContainer',{
      logGroupName: '/ecs/fargate/hello-world',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const cluster = new ecs.Cluster(this,'demoCluster',{
      vpc: vpc,
      enableFargateCapacityProviders: true,
    })

    const fgTask = new ecs.FargateTaskDefinition(this,'demoTask',{
      memoryLimitMiB: 512,
      cpu: 256,
    });
    const container = fgTask.addContainer('demoContainer',{
      image: ecs.ContainerImage.fromEcrRepository( ecr.Repository.fromRepositoryAttributes(this,'externalRepo',{
        repositoryArn: "arn:aws:ecs:" + this.region + ":" + account.valueAsString + ":repository/" + repo.valueAsString ,
        repositoryName: repo.valueAsString
      } ) ),
      portMappings: [ { containerPort: 80 }],
      logging: ecs.LogDriver.awsLogs({ streamPrefix: 'demoLogs' }),
    })
    if (fgTask.executionRole) {
      new cdk.CfnOutput(this,'ExecutionRole', { value: fgTask.executionRole.roleArn })
    }
    new cdk.CfnOutput(this,'TaskRole', { value: fgTask.taskRole.roleArn })
    fgTask.executionRole?.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'))


    // HACK ALERT! This service is being deployed to the public subnet with a public IP.
    // a production service should use a private subnet with AWS Service Endpoints, or
    // a nat-egress network.
    const service = new ecs.FargateService(this,'demoService',{
      cluster: cluster,
      taskDefinition: fgTask,
      desiredCount: 1,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      assignPublicIp: true,
      platformVersion: ecs.FargatePlatformVersion.VERSION1_3,
    });

    const lb = new elbv2.ApplicationLoadBalancer(this,'demoLB',{
      vpc: vpc,
      internetFacing: true,
      vpcSubnets: vpc.selectSubnets( { subnetType: ec2.SubnetType.PUBLIC } )
    })
    const listener = lb.addListener('Listener',{ port: 80 });
    const tg1 = listener.addTargets('ecsTarget',{
      port: 80,
      targets: [ service ]
    })
    // allow world access to hello world service
    lb.connections.allowFromAnyIpv4(ec2.Port.tcp(80),"Allow world to access service")
      
    new cdk.CfnOutput(this,'LbName',{ value: lb.loadBalancerDnsName })
  }
}
