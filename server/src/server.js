/**
 * server.js — HTTP server entry point
 *
 * Loads environment variables, validates configuration, and starts the
 * Express server on the configured port.
 *
 * Start with:
 *   npm run dev    (uses --watch for auto-restart on file changes)
 *   npm start      (production)
 */

import 'dotenv/config'
import { config, validateEnv } from './config/env.js'
import { createApp } from './app.js'

// Validate AWS configuration at startup (warns on missing values)
validateEnv()

const app = createApp()

const server = app.listen(config.port, () => {
  console.info(`\n🚀 Cloudrop Express server running`)
  console.info(`   Port:    ${config.port}`)
  console.info(`   CORS:    ${config.corsOrigins.join(', ')}`)
  console.info(`   Health:  http://localhost:${config.port}/health\n`)
})

// Graceful shutdown
function shutdown(signal) {
  console.info(`\n[server] ${signal} received — shutting down gracefully...`)
  server.close(() => {
    console.info('[server] HTTP server closed.')
    process.exit(0)
  })
  // Force exit if graceful shutdown takes too long
  setTimeout(() => process.exit(1), 10_000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
