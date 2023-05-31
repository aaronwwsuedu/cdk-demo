# cdk-demo

This is a set of demo CDK applications that can be used as a starting point to build out resources.

## aurora-pg-rds

a demo application that deploys an Aurora PgSQL serverless instance and a client within the VPC that can access the instance

## file-gateway-s3

a demo application that deploys a AWS File Gateway appliance to AWS and a cline that can acces the File Gateway.

## serverless-restapi

a demo application that creates a basic "hello world" REST API using Lambda and API Gateway

## sftp-sever-s3

a demo application that creates an AWS Transfer family SFTP service to access S3 buckets

## x-acct-acr

a set of demo applications to deploy an ECR repository in one account, which can be used by a second account.

# warnings

* CDK expects to know items like pre-defined Virtual Private Cloud ids at _build_ time. For ease of use, these demos use the environment variable VPC_ID to store vpc identifiers. When required, run CDK as follows
Unix Systems
: ```
  VPC_ID='vpc-XXXXXXXXXXXXXXXXX' cdk deploy ...
  ```
Windows Systems
: ```
  set VPC_ID=vpc-XXXXXXXXXXXXXXXXX
  cdk deploy ...
  ```

* When working with multiple accounts or environment that uses SSO/Amazon Identity center, take advantage of the --profile option.