/**
 * dynamodb.service.js — DynamoDB operations
 *
 * Wraps DynamoDB Document Client calls.
 * The schema matches the existing Cloudrop table so both backends
 * (Lambda and Express) read from and write to the same records.
 *
 * Assumed DynamoDB table schema (from frontend usage analysis):
 *   Partition key: linkId  (String)
 *   Attributes stored:
 *     linkId      (String)  — share link identifier
 *     fileUrl     (String)  — S3 object URL
 *     fileName    (String)  — display file name
 *     expiresAt   (Number)  — Unix epoch milliseconds
 *     createdAt   (Number)  — Unix epoch milliseconds
 *     fileSize    (Number)  — optional, bytes
 *     uploadType  (String)  — 'direct' | 'zip'
 *     fileType    (String)  — MIME type
 *
 * DynamoDB TTL attribute (if configured on the table): ttl (Unix epoch seconds)
 */

import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { dynamoClient } from '../config/aws.js'
import { config } from '../config/env.js'
import { ConfigurationError, NotFoundError } from '../utils/errors.js'

function requireTableName() {
  if (!config.aws.dynamoTable) {
    throw new ConfigurationError(
      'DYNAMODB_TABLE is not configured. Set it in server/.env.',
    )
  }
}

/**
 * Save file metadata to DynamoDB.
 *
 * @param {object} params
 * @param {string} params.linkId
 * @param {string} params.fileUrl
 * @param {string} params.fileName
 * @param {number} params.expiryMinutes   How long until the link expires.
 * @returns {Promise<void>}
 */
export async function saveFileMeta({
  linkId,
  fileUrl,
  fileName,
  expiryMinutes,
}) {
  requireTableName()

  const now = Date.now()
  const expiresAt = now + expiryMinutes * 60 * 1000
  // DynamoDB TTL works in epoch seconds
  const ttl = Math.floor(expiresAt / 1000)

  const item = {
    linkId,
    fileUrl,
    fileName,
    expiresAt,
    createdAt: now,
    ttl,
  }

  await dynamoClient.send(
    new PutCommand({
      TableName: config.aws.dynamoTable,
      Item: item,
    }),
  )

  console.debug(`[dynamoService] Saved metadata for linkId: ${linkId}`)
}

/**
 * Retrieve file metadata from DynamoDB.
 *
 * @param {string} linkId
 * @returns {Promise<object>}  The stored metadata item.
 * @throws {NotFoundError}    If the item does not exist.
 */
export async function getFileMeta(linkId) {
  requireTableName()

  const result = await dynamoClient.send(
    new GetCommand({
      TableName: config.aws.dynamoTable,
      Key: { linkId },
    }),
  )

  if (!result.Item) {
    throw new NotFoundError(`No file found for link: ${linkId}`)
  }

  return result.Item
}
