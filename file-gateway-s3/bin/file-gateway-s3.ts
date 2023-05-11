#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FileGatewayS3Stack } from '../lib/file-gateway-s3-bucket-stack';
import { FileGatewayFileGatewayStack } from '../lib/file-gateway-s3-local-stack';
import { FileGatewayClientStack } from '../lib/file-gateway-s3-client-stack'

const app = new cdk.App();
const vpc_id = 'vpc-0216c91a9f09136b7';
const tags = {
  'service-name': 'demo-file-gateway',
  'service-family': 'storage-gateway',
}

/* stack that contains bucket(s) that will store data */
const s3Stack = new FileGatewayS3Stack(app, 'StorageGWS3Stack', {
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  tags: tags,
});
/* File gateway appliance/cache. Typically Deployed in "customer datacenter", not AWS */
const fileGWStack = new FileGatewayFileGatewayStack(app,'FileGWStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  vpc_id: vpc_id,
  tags: tags,
})
/* client to test */
const clientStack = new FileGatewayClientStack(app,'ClientStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  vpc_id: vpc_id,
  file_gateway: fileGWStack.file_gateway_instance,
  tags: tags,
})