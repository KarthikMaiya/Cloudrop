/**
 * s3.service.js — S3 operations
 *
 * Wraps AWS SDK S3 calls in a thin service layer.
 * The Express controllers call this; Lambda functions are unaffected.
 */

import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client } from '../config/aws.js'
import { config } from '../config/env.js'
import { ConfigurationError } from '../utils/errors.js'

/**
 * Generate a presigned S3 PUT URL for a direct browser-to-S3 upload.
 *
 * The key format mirrors the existing serverless convention so that the same
 * S3 bucket and DynamoDB records work with both backends.
 * Key format: uploads/<linkId>/<fileName>
 *
 * @param {object} params
 * @param {string} params.linkId        Sanitized share link identifier.
 * @param {string} params.fileName      File name (used in the S3 key).
 * @param {string} params.contentType   MIME type for the Content-Type constraint.
 * @returns {Promise<{uploadUrl: string, fileUrl: string}>}
 */
export async function generatePresignedUploadUrl({ linkId, fileName, contentType }) {
  if (!config.aws.s3Bucket) {
    throw new ConfigurationError(
      'S3_BUCKET is not configured. Set it in server/.env.',
    )
  }

  const key = `uploads/${linkId}/${fileName}`

  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: config.aws.uploadUrlExpirySeconds,
  })

  // The public (or authenticated) S3 URL the downloader will use.
  // Using the path-style URL to match the expected format.
  const fileUrl = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`

  // SECURITY: Do not log the presigned URL — it grants temporary write access.
  console.debug(`[s3Service] Presigned upload URL generated for key: ${key}`)

  return { uploadUrl, fileUrl }
}
