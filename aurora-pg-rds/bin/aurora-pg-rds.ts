#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuroraPgRdsStack } from '../lib/aurora-pg-rds-stack';
import { AuroraPgClientStack } from "../lib/aurora-pg-rds-client-stack";

const vpc_id = 'vpc-0216c91a9f09136b7'
const allowed_networks = [
  { 'comment': 'EIS admin VPN egress IP', 'cidr': '69.166.59.127/32'},
]
const tags = {
  'service-family': 'demo-rds',
  'service-id': 'demo-rds',
  'environment': 'development'
}


const app = new cdk.App();
const DbStack = new AuroraPgRdsStack(app, 'AuroraPgRdsStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */

  tags: tags,
  vpc_id: vpc_id,
  allowedNetworks: allowed_networks
});
new AuroraPgClientStack(app,'AuroraPgRdsClientStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */

  tags: tags,
  vpc_id: vpc_id,
  rds_instance: DbStack.rds
})