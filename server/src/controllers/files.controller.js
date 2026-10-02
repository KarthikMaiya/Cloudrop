/**
 * files.controller.js
 *
 * Handles: POST /save-link
 *
 * The frontend POSTs { linkId, fileUrl, fileName, expiryMinutes } after
 * the S3 upload completes, to persist metadata in DynamoDB.
 *
 * Expected response: { success: true }
 */

import { validateLinkId, validateFileName, validateExpiryMinutes } from '../middleware/validation.middleware.js'
import { saveFileMeta } from '../services/dynamodb.service.js'
import { ValidationError } from '../utils/errors.js'

export async function saveLink(req, res, next) {
  try {
    const {
      linkId: rawLinkId,
      fileUrl: rawFileUrl,
      fileName: rawFileName,
      expiryMinutes: rawExpiry,
    } = req.body

    if (!rawLinkId) throw new ValidationError('linkId is required.')
    if (!rawFileUrl) throw new ValidationError('fileUrl is required.')
    if (!rawFileName) throw new ValidationError('fileName is required.')

    const linkId = validateLinkId(rawLinkId)
    const fileName = validateFileName(rawFileName)
    const expiryMinutes = validateExpiryMinutes(rawExpiry)

    // Basic URL format validation
    try {
      new URL(rawFileUrl)
    } catch {
      throw new ValidationError('fileUrl must be a valid URL.')
    }

    await saveFileMeta({
      linkId,
      fileUrl: rawFileUrl,
      fileName,
      expiryMinutes,
    })

    console.info(`[filesController] Metadata saved for linkId=${linkId}`)

    res.status(200).json({ success: true })
  } catch (err) {
    next(err)
  }
}
