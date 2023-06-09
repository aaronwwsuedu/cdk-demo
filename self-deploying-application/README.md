# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## To Set up

* Create a repo to hold this project. Commit this directory to that repo. 
* modify [the deployer stack](lib/aws-cdk-infrastructure-deployer-stack.ts) to update the source repo and target account data
* Bootstrap the account that is the target environment to allow the source environment to run.
  * `npx cdk bootstrap --profile <target_admin_profile>  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess --trust <source_aws_account_id> aws://<target_aws_account_id>/<region>`
* Perfom initial deployment
  * `cdk deploy --profile <source_account_admin_profile> --all`
* Log in to AWS on the source account and watch the pipeline status
* Look in target account and confirm that the CF stack was deployed
* Make a change to the example stack
* Commit
* Make sure the change deploys