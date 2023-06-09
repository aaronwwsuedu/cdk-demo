import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as pipelines from 'aws-cdk-lib/pipelines'
import * as codecommit from 'aws-cdk-lib/aws-codecommit'
import { ExampleApplicationStack } from './aws-cdk-infrastructure-deployedapp-stack';

export class AwsCdkInfrastructureDeployerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // change these strings to match your needs
    const sourceRepositoryName = 'selfDeployingRepo'
    const branchName = 'sandbox'
    const targetAccount = '2222222222222'
    const targetRegion = 'us-west-2'

    // define a pipeline for deployment
    // WARNING: this is a self-mutating pipeline, and will self-modify when the relevant branch is committed.
    // This could lead to confusion when working against multiple branches.
    const repository = codecommit.Repository.fromRepositoryName(this, 'Repository', sourceRepositoryName);
    const pipeline = new pipelines.CodePipeline(this,'pipeline',{
      crossAccountKeys: true,
      enableKeyRotation: true,
      synth: new pipelines.ShellStep('Synth',{
        input: pipelines.CodePipelineSource.codeCommit(repository,branchName),
        commands: [ 'npm ci','npm run build','npx cdk synth' ]
      }),
    });
    // add a stage that deploys the application to a second account.
    pipeline.addStage(new SandboxApplicationStage(this,'sandboxDeployment', {
      env: {
        account: targetAccount, 
        region: targetRegion
      },
    }));
  }
}

export class SandboxApplicationStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    const dbStack = new ExampleApplicationStack(this, 'MyApp');
  }
}
