# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

Where EC2 instances are used, these playbooks use the Session Manager component
of Systems Manager to connect to the instance. This requires you to use the AWS
console or set up the AWS CLI session manager plugin.

https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html

To use the session manager plugin once installed:
```aws sso --profile <my_profile> ssm start-session --target i-XXXXXX```

