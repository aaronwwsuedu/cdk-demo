#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SftpServerS3Stack } from '../lib/sftp-server-s3-stack';
import { SftpUsersStack } from '../lib/sftp-users-stack';

const app = new cdk.App();

// change these variable to suit your deployment.
const allowedNetworks = [ {'cidr': '69.166.59.127/32','comment': 'ITS EIS VPN NAT gateway' } ]
const users = [
  { 'name': 'user1', 'publickey': 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCv+gxHkQB8pHR+KLyQa2Tmj9wxsMeMN+zONsqxqoZVu5I4JnLS2cA7K31KgEx3Vh61ID5tKtEOUu1uHpGV2omSJN2b0FIOiwBpw7A/iUBSl1cO7GvCeNxvsgJNvZGWgBh4Jo07UsGMFpMBSha7BiFRqaEIby/1HJedW46SCMdUPXi3kV9vmfqJEk/9iF/+HVuV1+ZorZbOxFEEE2AZq5WMtE0GdgARwwRoeeETLsw+qH564kvtJQM5yKIGkC+u0rpxabwyrR4THcoWsL7s3eD4vNMm0T6KCWGxqIpdi4DdEeKdYYdnXL+Pm6LkhBe8sw2e04SPpFlCx3J5H/XDKdZkGxOPqu4vS1PyD50DpFcd1ciDI2dLAY+Z6wsB3jL+Mv5Y239YhUTGEDhMjssk9nhAX4SPYBBe+iwCW28i8jNmTwKQgDssAEELFQKCZxEthDVeugVmogiasqdPPM/0OfGoPe02tG9xoBQ/KTKhpyoXpuvlg3I52MYB1tFvZmXM7A0= localaaron@t1-001013.vpn.wsu.edu' },
 { 'name': 'user2', 'publickey': 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCid0eK1uwTup/7bqFEvST554qI5PWm5G7l4OKJ5qTRjjLLeFmF6BTo3VlDK5XgW6QQxDTC2V02AZxZ0QBLlqxMjNjJxhB5XqhA/Pn5ovv482OUVI/qSEDqcORWMxJqKrQmfv/mgIWz/H3bJKBT4lD/LvfnbYlspoPhaqtUBMGWGo6u5n4dzVns15bUPYbH+yeQ8nOmQEScnQc9igmbPC1qXD3L3+zYpos8hHTAk9rqoXCokuoFDr+9jIl/3egZoJy9ye3VxOMQj25pCd1TD+2rAEIy5NfoMuBpky8AFuVeC9YBU5uGmZdypo9Z4bPozkPlWh50ZbYhvEdKF1y3M8G+861CXd/f04Lv9Ey5LssJ5Q6Udd2guyWVlhPmSILj7a0MGeMiYscOHZJw+b9ONC4hOseHi9ckaXnJE44UA1LtWXweLT4K34+K2SGuGzJuuUS57lkT5iRaO0X289PD8NjNfbmrIx/2Fbr4ydTgKWC9+MgGfDx4i0XcRHmGF/4lvls= localaaron@t1-001013.vpn.wsu.edu' }
]

const tags = {
  'service-family': 'demo-sftp',
  'service-id': 'demo-sftp',
  'environment': 'development'
}


const serverStack = new SftpServerS3Stack(app, 'SftpServerS3Stack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  tags: tags,

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */



  // these properties are extensions of the standard Stack properties.
  allowedNetworks: allowedNetworks,
});
new SftpUsersStack(app,'SftpUsersStack', {
  // the user stack uses the transfer server created in the app stack, also with an extension of the stack properties
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  users: users,
  transferServer: serverStack.transfer_server,
  tags: tags,
})
