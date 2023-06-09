#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsCdkInfrastructureDeployerStack } from '../lib/aws-cdk-infrastructure-deployer-stack';

const app = new cdk.App();

new AwsCdkInfrastructureDeployerStack(app, 'ApplicationStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});