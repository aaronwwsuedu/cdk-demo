# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript. This project will
create an aurora database for Postgresql within a VPC, with a proxy that allows
public access.

This is a POC only. To use in your account, you will likely need to modify
 bin/aurora-pg-rds.ts
 * change allowedNetworks to contain your access networks
 * Change vpc_id to your VPC

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
