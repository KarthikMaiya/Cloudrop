/**
 * apiConfig.js — Centralised API base URL resolver
 *
 * Reads VITE_BACKEND_MODE to determine which backend the frontend targets.
 *
 *   VITE_BACKEND_MODE=serverless  →  uses VITE_API_URL (API Gateway)
 *   VITE_BACKEND_MODE=express     →  uses VITE_EXPRESS_URL (local Express)
 *
 * If VITE_BACKEND_MODE is not set, it defaults to 'serverless' to preserve
 * the existing behaviour exactly.
 *
 * All frontend modules import API_BASE from here instead of reading
 * import.meta.env.VITE_API_URL directly, so switching backend requires
 * only a change to the .env file and a Vite dev server restart.
 *
 * AWS credentials are NEVER placed here. They belong only in server/.env.
 */

const mode = import.meta.env.VITE_BACKEND_MODE || 'serverless'

let rawBase = ''

if (mode === 'express') {
  rawBase = import.meta.env.VITE_EXPRESS_URL || 'http://localhost:3001'
} else {
  // 'serverless' or any unrecognised value — use the original API Gateway URL
  rawBase = import.meta.env.VITE_API_URL || ''
}

/**
 * The resolved API base URL, with any trailing slash removed.
 * Append route paths (e.g. /generate-upload-url) directly to this.
 */
export const API_BASE = rawBase.replace(/\/$/, '')

/**
 * The active backend mode ('serverless' | 'express').
 * Useful for debug logging and conditional behaviour.
 */
export const BACKEND_MODE = mode

// Log the resolved configuration once at module load, for debugging.
if (!API_BASE) {
  console.warn(
    `[apiConfig] ⚠️  No API base URL configured. ` +
      `Set VITE_API_URL (serverless mode) or VITE_EXPRESS_URL (express mode) in your .env file.`,
  )
} else {
  console.debug(`[apiConfig] Backend mode: ${BACKEND_MODE}`)
  console.debug(`[apiConfig] API base:     ${API_BASE}`)
}
