/**
 * validation.test.js — Unit tests for validation middleware helpers
 */

import {
  validateLinkId,
  validateFileName,
  validateContentType,
  validateExpiryMinutes,
} from '../../src/middleware/validation.middleware.js'
import { ValidationError } from '../../src/utils/errors.js'

// ── validateLinkId ─────────────────────────────────────────────────────────

describe('validateLinkId', () => {
  test('accepts a clean lowercase alphanumeric string', () => {
    expect(validateLinkId('my-file')).toBe('my-file')
  })

  test('lowercases and trims input', () => {
    expect(validateLinkId('  My File  ')).toBe('my-file')
  })

  test('replaces spaces with hyphens', () => {
    expect(validateLinkId('hello world')).toBe('hello-world')
  })

  test('removes leading and trailing hyphens', () => {
    expect(validateLinkId('--hello--')).toBe('hello')
  })

  test('replaces invalid characters with hyphens', () => {
    expect(validateLinkId('file@name!')).toBe('file-name')
  })

  test('collapses multiple hyphens', () => {
    expect(validateLinkId('a---b')).toBe('a-b')
  })

  test('throws ValidationError for empty input', () => {
    expect(() => validateLinkId('')).toThrow(ValidationError)
    expect(() => validateLinkId('   ')).toThrow(ValidationError)
    expect(() => validateLinkId('---')).toThrow(ValidationError)
  })

  test('throws ValidationError for non-string input', () => {
    expect(() => validateLinkId(null)).toThrow(ValidationError)
    expect(() => validateLinkId(123)).toThrow(ValidationError)
  })

  test('throws ValidationError for linkId longer than 100 chars', () => {
    expect(() => validateLinkId('a'.repeat(101))).toThrow(ValidationError)
  })

  test('accepts exactly 100 chars after sanitization', () => {
    const input = 'a'.repeat(100)
    expect(validateLinkId(input)).toBe(input)
  })
})

// ── validateFileName ───────────────────────────────────────────────────────

describe('validateFileName', () => {
  test('returns trimmed filename', () => {
    expect(validateFileName('  myfile.zip  ')).toBe('myfile.zip')
  })

  test('throws for empty string', () => {
    expect(() => validateFileName('')).toThrow(ValidationError)
    expect(() => validateFileName('   ')).toThrow(ValidationError)
  })

  test('throws for non-string', () => {
    expect(() => validateFileName(null)).toThrow(ValidationError)
  })

  test('throws for filename longer than 500 chars', () => {
    expect(() => validateFileName('a'.repeat(501))).toThrow(ValidationError)
  })
})

// ── validateContentType ────────────────────────────────────────────────────

describe('validateContentType', () => {
  test('returns valid MIME type unchanged', () => {
    expect(validateContentType('application/zip')).toBe('application/zip')
    expect(validateContentType('image/png')).toBe('image/png')
  })

  test('defaults to application/octet-stream for empty input', () => {
    expect(validateContentType('')).toBe('application/octet-stream')
    expect(validateContentType(null)).toBe('application/octet-stream')
    expect(validateContentType(undefined)).toBe('application/octet-stream')
  })

  test('defaults to application/octet-stream for invalid MIME', () => {
    expect(validateContentType('not-a-mime')).toBe('application/octet-stream')
  })
})

// ── validateExpiryMinutes ─────────────────────────────────────────────────

describe('validateExpiryMinutes', () => {
  test('returns parsed integer for valid input', () => {
    expect(validateExpiryMinutes(10)).toBe(10)
    expect(validateExpiryMinutes('30')).toBe(30)
  })

  test('defaults to 10 for invalid input', () => {
    expect(validateExpiryMinutes(null)).toBe(10)
    expect(validateExpiryMinutes('abc')).toBe(10)
    expect(validateExpiryMinutes(-5)).toBe(10)
    expect(validateExpiryMinutes(0)).toBe(10)
  })

  test('caps at 10080 (1 week)', () => {
    expect(validateExpiryMinutes(99999)).toBe(10080)
  })

  test('floors non-integer values', () => {
    expect(validateExpiryMinutes(7.9)).toBe(7)
  })
})
