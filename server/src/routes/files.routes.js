/**
 * files.routes.js — POST /save-link
 *
 * Matches the existing API Gateway route used by the frontend.
 */

import { Router } from 'express'
import { saveLink } from '../controllers/files.controller.js'

const router = Router()

router.post('/save-link', saveLink)

export default router
