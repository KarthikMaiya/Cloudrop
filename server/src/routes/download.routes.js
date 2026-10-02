/**
 * download.routes.js — GET /get-link/:linkId
 *
 * Matches the existing API Gateway route used by DownloadPage.jsx.
 */

import { Router } from 'express'
import { getLink } from '../controllers/download.controller.js'

const router = Router()

router.get('/get-link/:linkId', getLink)

export default router
