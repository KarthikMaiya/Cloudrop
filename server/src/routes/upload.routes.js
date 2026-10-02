/**
 * upload.routes.js — POST /generate-upload-url
 *
 * Matches the existing API Gateway route used by the frontend.
 */

import { Router } from 'express'
import { generateUploadUrl } from '../controllers/upload.controller.js'

const router = Router()

router.post('/generate-upload-url', generateUploadUrl)

export default router
