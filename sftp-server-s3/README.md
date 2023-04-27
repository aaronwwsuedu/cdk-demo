# Welcome to your CDK TypeScript project

This is a project for CDK development with TypeScript. This project will
create a simple SFTP server using AWS Transfer Family that writes to
a set of S3 buckets (one per user)

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
