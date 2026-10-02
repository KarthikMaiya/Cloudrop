/**
 * aws.js — AWS SDK v3 client singletons
 *
 * Creates shared S3 and DynamoDB clients using the AWS SDK's default
 * credential provider chain.  The chain resolves credentials in this order:
 *   1. Explicit env vars (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)
 *   2. AWS_PROFILE / named profile in ~/.aws/credentials
 *   3. ECS task role / EC2 instance profile (for future cloud deployment)
 *
 * No credentials are hardcoded here.
 */

import { S3Client } from '@aws-sdk/client-s3'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { config } from './env.js'

// ── S3 client ───────────────────────────────────────────────────────────────
export const s3Client = new S3Client({
  region: config.aws.region,
})

// ── DynamoDB raw client ──────────────────────────────────────────────────────
const dynamoRawClient = new DynamoDBClient({
  region: config.aws.region,
})

// ── DynamoDB Document client (marshals JS objects ↔ DynamoDB types) ─────────
export const dynamoClient = DynamoDBDocumentClient.from(dynamoRawClient, {
  marshallOptions: {
    // Remove undefined values so optional attributes are not stored as NULL
    removeUndefinedValues: true,
  },
})
