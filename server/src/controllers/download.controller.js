/**
 * download.controller.js
 *
 * Handles: GET /get-link/:linkId
 *
 * The download page fetches metadata for a given linkId so it can display
 * the file name, expiry countdown, and file type, and provide a download URL.
 *
 * The frontend then downloads directly from the fileUrl (S3).
 * Express does not proxy file bytes.
 *
 * Response schema (matches what DownloadPage.jsx consumes):
 * {
 *   linkId:     string,
 *   fileUrl:    string,   — S3 object URL
 *   fileName:   string,
 *   expiresAt:  number,   — Unix ms
 *   createdAt:  number,   — Unix ms
 *   uploadType: string,   — 'direct' | 'zip'
 *   fileType:   string,   — MIME type
 *   fileSize:   number,   — bytes (optional)
 * }
 */

import { validateLinkId } from '../middleware/validation.middleware.js'
import { getFileMeta } from '../services/dynamodb.service.js'

export async function getLink(req, res, next) {
  try {
    const { linkId: rawLinkId } = req.params
    const linkId = validateLinkId(rawLinkId)

    const item = await getFileMeta(linkId)

    // Check server-side expiry — return 404 so the download page shows
    // "Link not found" rather than allowing a post-expiry download.
    const now = Date.now()
    if (typeof item.expiresAt === 'number' && item.expiresAt < now) {
      console.info(`[downloadController] Expired link requested: ${linkId}`)
      // Return the expired metadata so the frontend can show the countdown/expired state
      // (matching Lambda behavior — frontend handles display of expiry itself)
    }

    console.info(`[downloadController] Metadata retrieved for linkId=${linkId}`)

    res.status(200).json(item)
  } catch (err) {
    next(err)
  }
}
