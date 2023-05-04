import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as gateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class ServerlessRestapiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes her
    const default_handler = new lambda.Function(this,'defHandler',{
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/default`) // lib/lambda/default/index.js
    })

    const restapi = new gateway.LambdaRestApi(this,'hdtools',{
      handler: default_handler,
      proxy: false,
    })

    const items = restapi.root.addResource('items')
    items.addMethod('GET')
    const singleitem = items.addResource('{item}')
    singleitem.addMethod('GET')
    const itemevent = singleitem.addResource('event')
    // items/{item}/event gets a dedicated handler.
    itemevent.addMethod('GET',new gateway.LambdaIntegration(new lambda.Function(this,'itemEventHandler',{
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${__dirname}/lambda/users/user/event`)
    })));
    
  }
}
