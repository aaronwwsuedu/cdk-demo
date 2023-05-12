# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript. This project will
create an aurora database for Postgresql within a VPC, with a jump host that allows
access to the db.

This is a POC only. To use in your account, you will likely need to modify
 bin/aurora-pg-rds.ts
 * change allowedNetworks to contain your access networks
 * Change vpc_id to your VPC

 To connect to the database:
 deploy the stack: cdk deploy --parameters instanceCount=1
 get the IP of the jump service: aws ec2 describe-instances --filters Name=tag:aws:autoscaling:groupName,Values=TheAsgName --query 'Reservations[].Instances[].PublicIpAddress' (this will be provided by the Cdk output)
 get the private key save to your local disk:

 connect to the jump server using AWS console

 get credentials from AWS secrets manager:

 connect to pgsql: 
 from the client: psql -h <rds name> -U postgres mydata

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
