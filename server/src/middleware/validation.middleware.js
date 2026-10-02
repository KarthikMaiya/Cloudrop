/**
 * validation.middleware.js — Input validation helpers
 *
 * Provides reusable validation logic for request bodies and params.
 * Throws ValidationError so the error middleware sends a 400 response.
 */

import { ValidationError } from '../utils/errors.js'

/**
 * Sanitize and validate a linkId string.
 * Mirrors the frontend sanitizeLinkId() logic so both sides agree on
 * what constitutes a valid link identifier.
 *
 * @param {string} raw  The raw string from the request.
 * @returns {string}    The sanitized linkId.
 * @throws {ValidationError} If the result is empty or too long.
 */
export function validateLinkId(raw) {
  if (typeof raw !== 'string') {
    throw new ValidationError('linkId must be a string.')
  }

  const sanitized = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!sanitized) {
    throw new ValidationError(
      'linkId is invalid. Use letters, numbers, and hyphens only.',
    )
  }

  if (sanitized.length > 100) {
    throw new ValidationError('linkId is too long (max 100 characters).')
  }

  return sanitized
}

/**
 * Validate a fileName string.
 * @param {string} raw
 * @returns {string}
 */
export function validateFileName(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new ValidationError('fileName is required and must be a non-empty string.')
  }
  if (raw.length > 500) {
    throw new ValidationError('fileName is too long (max 500 characters).')
  }
  return raw.trim()
}

/**
 * Validate a content-type string.
 * Allows common MIME types and defaults to application/octet-stream.
 *
 * @param {string} raw
 * @returns {string}
 */
export function validateContentType(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return 'application/octet-stream'
  }
  // Basic MIME format check: type/subtype (with optional parameters)
  if (!/^[a-zA-Z0-9!#$&\-^_]+\/[a-zA-Z0-9!#$&\-^_.+]+/.test(raw.trim())) {
    return 'application/octet-stream'
  }
  return raw.trim()
}

/**
 * Validate expiryMinutes — must be a positive integer.
 * Defaults to 10 minutes. Capped at 10080 (1 week).
 *
 * @param {*} raw
 * @returns {number}
 */
export function validateExpiryMinutes(raw) {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return 10
  return Math.min(Math.floor(value), 10080)
}
