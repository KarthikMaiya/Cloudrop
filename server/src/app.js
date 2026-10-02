/**
 * app.js — Express application factory
 *
 * Creates and configures the Express app without starting the server.
 * Keeping the app and server separate makes it easy to import the app
 * in tests without binding a port.
 */

import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { config } from './config/env.js'
import { errorMiddleware } from './middleware/error.middleware.js'
import healthRouter from './routes/health.routes.js'
import uploadRouter from './routes/upload.routes.js'
import filesRouter from './routes/files.routes.js'
import downloadRouter from './routes/download.routes.js'

export function createApp() {
  const app = express()

  // ── Security / CORS ────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman, same-origin)
        if (!origin) return callback(null, true)
        if (config.corsOrigins.includes(origin)) return callback(null, true)
        callback(new Error(`CORS: origin ${origin} not allowed.`))
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    }),
  )

  // ── Body parsing ───────────────────────────────────────────────────────────
  // Limit JSON bodies to 1 MB — the frontend never sends file bytes through
  // Express (uploads go direct to S3), so this only covers metadata requests.
  app.use(express.json({ limit: '1mb' }))

  // ── Rate limiting ──────────────────────────────────────────────────────────
  // Apply a global rate limit.  Adjust windowMs / max for production.
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  })
  app.use(globalLimiter)

  // Stricter limit on the upload-URL generation endpoint to prevent abuse
  const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many upload requests. Please slow down.' },
  })
  app.use('/generate-upload-url', uploadLimiter)

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.use(healthRouter)
  app.use(uploadRouter)
  app.use(filesRouter)
  app.use(downloadRouter)

  // ── 404 fallback ───────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' })
  })

  // ── Centralised error handler ──────────────────────────────────────────────
  // Must be last.
  app.use(errorMiddleware)

  return app
}
