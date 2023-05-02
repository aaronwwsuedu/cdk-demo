import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secrets from 'aws-cdk-lib/aws-secretsmanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

// import * as sqs from 'aws-cdk-lib/aws-sqs';
// in addition to the standard stack properties, we want a list of networks that can connect to the service, and the vpc to deploy into.
interface AuroraPgRdsStackProps extends cdk.StackProps {
  allowedNetworks: {
    cidr: string;
    comment: string;
  }[]
  vpc_id: string,
}

//I guess at the end of the day we want the following style of RDS:
//
//Server less
//Limits access to 69.166.59.125 and the Kubernetes cluster in the account
//Utilizes Postgresql authentication
//Has standard plugins such as the uuid plugins

export class AuroraPgRdsStack extends cdk.Stack {
   rds: rds.ServerlessCluster

  constructor(scope: Construct, id: string, props: AuroraPgRdsStackProps) {
    super(scope, id, props);

    const vpc    = ec2.Vpc.fromLookup(this,'default_vpc',{ vpcId: props.vpc_id })
    //props.allowedNetworks.forEach( (network) => {
    //  sftp_access.addIngressRule(ec2.Peer.ipv4(network['cidr']),ec2.Port.tcp(22),network['comment'])
    //})


    /* 
     *  Based on work from Phillip Ninian: https://blog.phillipninan.com/provision-an-rds-instance-using-the-aws-cdk-and-secrets
     */


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


    this.rds = new rds.ServerlessCluster(this,'auroradb',{
      engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
      vpc: vpc,
      credentials: rds.Credentials.fromSecret(databaseCredentialsSecret),
      defaultDatabaseName: 'mydata',
      backupRetention: cdk.Duration.days(5),
      copyTagsToSnapshot: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      scaling: {
        autoPause: cdk.Duration.minutes(10),
        minCapacity: rds.AuroraCapacityUnit.ACU_1,
        maxCapacity: rds.AuroraCapacityUnit.ACU_2,
      }
    })
    props.allowedNetworks.forEach( (network) => {
      this.rds.connections.allowFrom(ec2.Peer.ipv4(network['cidr']),ec2.Port.tcp(5432),network['comment'])
    })


    // lets output a few properties to help use find the credentials 
    new cdk.CfnOutput(this, 'Secret Name', { value: databaseCredentialsSecret.secretName }); 
    new cdk.CfnOutput(this, 'Secret ARN', { value: databaseCredentialsSecret.secretArn }); 
    new cdk.CfnOutput(this, 'Secret Full ARN', { value: databaseCredentialsSecret.secretFullArn || '' });

  }
}
