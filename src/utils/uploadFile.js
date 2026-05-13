import { PutObjectCommand } from '@aws-sdk/client-s3'
import s3Client from '../aws-config'

/**
 * Upload a file to S3.
 * - Stores objects under the `uploads/` prefix
 * - Preserves the Content-Type
 * - Shows success/failure alerts
 */
export async function uploadFile({ file, bucketName, customLink }) {
  if (!file) {
    alert('Please select a file first.')
    return null
  }

  if (!bucketName) {
    alert('Missing S3 bucket name. Set VITE_S3_BUCKET_NAME in your .env file.')
    return null
  }

  // Use the custom link as a friendly key prefix if provided.
  // Keep it simple and beginner-friendly: sanitize to safe URL-ish characters.
  const safeCustom = (customLink || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_/]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '')

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')

  // Always store under uploads/
  const keyBase = safeCustom ? `${safeCustom}/${safeName}` : safeName
  const objectKey = `uploads/${Date.now()}-${keyBase}`

  const params = {
    Bucket: bucketName,
    Key: objectKey,
    Body: file,
    ContentType: file.type || 'application/octet-stream',
  }

  try {
    // PutObject uploads the file bytes directly to your S3 bucket.
    const command = new PutObjectCommand(params)
    await s3Client.send(command)

    return { bucketName, objectKey }
  } catch (error) {
    console.error('Upload Error:', error)

    const errorName = error?.name || 'UnknownError'
    const status = error?.$metadata?.httpStatusCode
    const message = error?.message

    const details = [
      `Reason: ${errorName}${status ? ` (HTTP ${status})` : ''}`,
      message ? `Message: ${message}` : null,
      '',
      'Fix checklist:',
      '- Bucket exists and is in the same region as AWS_REGION',
      '- IAM user has s3:PutObject permission for this bucket',
      '- S3 CORS allows PUT from http://localhost:5173',
    ]
      .filter(Boolean)
      .join('\n')

    alert(`Upload failed.\n\n${details}`)
    return null
  }
}
