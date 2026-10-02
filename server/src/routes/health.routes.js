/**
 * health.routes.js — GET /health
 *
 * A simple liveness endpoint.
 * Does NOT expose credentials, environment values, or AWS details.
 */

import { Router } from 'express'

const router = Router()

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'cloudrop-express',
    timestamp: new Date().toISOString(),
  })
})

export default router
