import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as autoscale from 'aws-cdk-lib/aws-autoscaling';

// import * as sqs from 'aws-cdk-lib/aws-sqs';
// in addition to the standard stack properties, we want a list of networks that can connect to the service, and the vpc to deploy into.
interface AuroraPgRdsStackProps extends cdk.StackProps {
  allowedNetworks: {
    cidr: string;
    comment: string;
  }[]
}

//I guess at the end of the day we want the following style of RDS:
//
//Server less
//Limits access to 69.166.59.125 and the Kubernetes cluster in the account
//Utilizes Postgresql authentication
//Has standard plugins such as the uuid plugins

export class AuroraPgRdsStack extends cdk.Stack {
   rds: rds.IDatabaseCluster

  constructor(scope: Construct, id: string, props: AuroraPgRdsStackProps) {
    super(scope, id, props);

    const vpc    = ec2.Vpc.fromLookup(this,'default_vpc',{ vpcId: process.env.VPC_ID })

    // first, lets generate a secret to be used as credentials for our database
    const databaseCredentialsSecret = new secrets.Secret(this, 'DBCredentialsSecret', {
      secretName: '/demo/rds/postgresql/credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'postgres',
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    });

    // the ServerlessCluster construct creates a v1 serverless cluster. There's no support for V2 directly, but the
    // workaround is to create a DatabaseCluster and override the instance-related structures with serverless.
    // See https://github.com/aws/aws-cdk/issues/20197
    this.rds = new rds.DatabaseCluster(this,"auroradb",{
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_2
      }),
      instanceProps: {
        vpc: vpc,
        instanceType: "serverless" as any,
        vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      },
      credentials: rds.Credentials.fromSecret(databaseCredentialsSecret),
      defaultDatabaseName: 'mydata',
      copyTagsToSnapshot: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      iamAuthentication: false,
      storageEncrypted: true,
      instances: 1,
      backup: {
        retention: cdk.Duration.days(5)
      },
      parameterGroup: rds.ParameterGroup.fromParameterGroupName(this,'auroraPgGroup','default.aurora-postgresql15')
    });
    // add a scaling configuration to the raw Cfn object.
    (this.rds.node.findChild("Resource") as rds.CfnDBCluster).serverlessV2ScalingConfiguration = {
      minCapacity: 1,
      maxCapacity: 2,
    }

    // allow access to the Aurora cluster from outside networks.
    props.allowedNetworks.forEach( (network) => {
      this.rds.connections.allowFrom(ec2.Peer.ipv4(network['cidr']),ec2.Port.tcp(5432),network['comment'])
    })

    // lets output a few properties to help use find the credentials 
    new cdk.CfnOutput(this, 'Secret Name', { value: databaseCredentialsSecret.secretName }); 
    new cdk.CfnOutput(this, 'Secret ARN', { value: databaseCredentialsSecret.secretArn }); 
    new cdk.CfnOutput(this, 'Secret Full ARN', { value: databaseCredentialsSecret.secretFullArn || '' });
    new cdk.CfnOutput(this, 'Database host', { value: this.rds.clusterEndpoint.hostname + ':' + this.rds.clusterEndpoint.port })
  }
}
