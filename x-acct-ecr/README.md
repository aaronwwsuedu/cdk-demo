This is an example of a cross-account ECR resource that does not use
AWS Organizations to grant access. This example expects to grant a specific
role in the "secondary" account access to read a repo in a "primary" account.

To deploy:
1. Deploy the Secondary service that will access the repository in read-write mode
 cd ec2-demo && cdk deploy --profile secondary-account-profile

Note the outputs!
 * ec2Id: the instance id of the running ec2 instance that we'll use to test
   ECR
 * ec2role: the arn of the role we need to grant access
 * ecrRepo: a local repo we can read and write to within the secondary account

2. Deploy the ECR repo in the primary service, passing the arn of the secondary
   service role. For demo read only access, pass the AWS account as an arn to
   grant RO access to all roles in the account
 cd ecr-demo && cdk deploy --profile primary-account-profile \
  --parameters readWriteArn=the-role-from-step-1 \
  --parameters readOnlyArn=arn:aws:iam::<secondary account>:root

Note the output!
 * EcrDemoStack.ecrRepo: the repo that can be read, but not written

3. Write an image to the repository. A good choice is something like the tutum 'hello world' example app
 # Connect to the EC2 console using systems manager session manbager
 # sudo -i
 # docker pull docker pull tutum/hello-world
 # aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <ecr repo path>
 # docker tag hello-world <ecr repo path>:latest
 # docker push <ecr repo path>:latest

4. Download the image to an ECS task instance in the secondary account
 cd ecs-demo && cdk deploy --profile secondary-account-profile