/**
 * upload.controller.js
 *
 * Handles: POST /generate-upload-url
 *
 * The frontend POSTs { fileName, contentType, linkId } and expects:
 *   { uploadUrl: string, fileUrl: string }
 *
 * The browser then PUTs the file directly to S3 using uploadUrl.
 * Express never proxies file bytes.
 */

import { validateLinkId, validateFileName, validateContentType } from '../middleware/validation.middleware.js'
import { generatePresignedUploadUrl } from '../services/s3.service.js'
import { ValidationError } from '../utils/errors.js'

export async function generateUploadUrl(req, res, next) {
  try {
    const { fileName: rawFileName, contentType: rawContentType, linkId: rawLinkId } = req.body

    if (!rawLinkId) {
      throw new ValidationError('linkId is required.')
    }
    if (!rawFileName) {
      throw new ValidationError('fileName is required.')
    }

    const linkId = validateLinkId(rawLinkId)
    const fileName = validateFileName(rawFileName)
    const contentType = validateContentType(rawContentType)

    const { uploadUrl, fileUrl } = await generatePresignedUploadUrl({
      linkId,
      fileName,
      contentType,
    })

    // SECURITY: Do not log uploadUrl — it is a time-limited credential.
    console.info(`[uploadController] Generated presigned URL for linkId=${linkId}`)

    res.status(200).json({ uploadUrl, fileUrl })
  } catch (err) {
    next(err)
  }
}
