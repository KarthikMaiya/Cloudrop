/**
 * error.middleware.js — Centralised Express error handler
 *
 * Must be registered as the LAST middleware (after all routes).
 * Catches both operational AppErrors and unexpected exceptions.
 */

import { AppError } from '../utils/errors.js'

// eslint-disable-next-line no-unused-vars
export function errorMiddleware(err, req, res, next) {
  // Determine status code and message
  const statusCode = err instanceof AppError ? err.statusCode : 500

  // Never expose internal error details in production
  const message =
    err instanceof AppError
      ? err.message
      : 'An unexpected error occurred. Please try again.'

  // Always log the full error server-side (but never log credentials/tokens)
  const logLevel = statusCode >= 500 ? 'error' : 'warn'
  console[logLevel](`[${req.method} ${req.path}] ${statusCode} — ${err.message}`)

  if (statusCode >= 500 && err.stack) {
    console.error(err.stack)
  }

  res.status(statusCode).json({ error: message })
}
