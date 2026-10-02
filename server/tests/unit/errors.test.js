/**
 * errors.test.js — Unit tests for the error utility classes
 */

import { AppError, NotFoundError, ValidationError, ConfigurationError } from '../../src/utils/errors.js'

describe('AppError', () => {
  test('creates error with message and statusCode', () => {
    const err = new AppError('Something went wrong', 500)
    expect(err.message).toBe('Something went wrong')
    expect(err.statusCode).toBe(500)
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
  })

  test('defaults to 500 statusCode', () => {
    const err = new AppError('oops')
    expect(err.statusCode).toBe(500)
  })
})

describe('NotFoundError', () => {
  test('has statusCode 404', () => {
    const err = new NotFoundError()
    expect(err.statusCode).toBe(404)
    expect(err).toBeInstanceOf(AppError)
  })

  test('accepts custom message', () => {
    const err = new NotFoundError('Link not found')
    expect(err.message).toBe('Link not found')
  })
})

describe('ValidationError', () => {
  test('has statusCode 400', () => {
    const err = new ValidationError()
    expect(err.statusCode).toBe(400)
  })
})

describe('ConfigurationError', () => {
  test('has statusCode 503', () => {
    const err = new ConfigurationError()
    expect(err.statusCode).toBe(503)
  })
})
