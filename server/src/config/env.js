/**
 * env.js — centralised environment configuration
 *
 * Reads process.env (populated by dotenv in server.js) and exposes a
 * validated, typed config object.  Import this instead of referencing
 * process.env directly throughout the codebase.
 */

export const config = {
  // ── Server ────────────────────────────────────────────────────────────────
  port: parseInt(process.env.PORT || '3001', 10),

  // ── CORS ─────────────────────────────────────────────────────────────────
  // Supports comma-separated list for multiple allowed origins.
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // ── AWS ──────────────────────────────────────────────────────────────────
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    s3Bucket: process.env.S3_BUCKET || '',
    dynamoTable: process.env.DYNAMODB_TABLE || '',
    uploadUrlExpirySeconds: parseInt(
      process.env.UPLOAD_URL_EXPIRY_SECONDS || '300',
      10,
    ),
  },
}

/**
 * Validate that the required AWS configuration values are present.
 * Called once at server startup. Logs a warning for each missing value but
 * does NOT exit — the server still starts so health checks can respond.
 */
export function validateEnv() {
  const missing = []

  if (!config.aws.s3Bucket) missing.push('S3_BUCKET')
  if (!config.aws.dynamoTable) missing.push('DYNAMODB_TABLE')
  if (!config.aws.region) missing.push('AWS_REGION')

  if (missing.length > 0) {
    console.warn(
      `[config] ⚠️  Missing environment variables: ${missing.join(', ')}. ` +
        'AWS operations will fail until these are set. ' +
        'Copy server/.env.example to server/.env and fill in the values.',
    )
  } else {
    console.info('[config] ✅ AWS environment configuration validated.')
    console.info(`[config]    Region:  ${config.aws.region}`)
    console.info(`[config]    Bucket:  ${config.aws.s3Bucket}`)
    console.info(`[config]    Table:   ${config.aws.dynamoTable}`)
  }
}
