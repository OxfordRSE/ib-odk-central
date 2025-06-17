#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { OdkCentralStack } from '../lib/odk-stack';

const app = new cdk.App();
new OdkCentralStack(app, 'OdkCentralStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});