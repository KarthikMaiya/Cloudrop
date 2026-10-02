/**
 * errors.js — Application error classes
 *
 * Extending Error allows the error middleware to distinguish between
 * operational errors (predictable, e.g. "link not found") and unexpected
 * errors, and to set appropriate HTTP status codes automatically.
 */

export class AppError extends Error {
  /**
   * @param {string} message  Human-readable error description.
   * @param {number} statusCode  HTTP status code to send to the client.
   */
  constructor(message, statusCode = 500) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    // Ensures correct instanceof checks after transpilation
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404)
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request') {
    super(message, 400)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class ConfigurationError extends AppError {
  constructor(message = 'Server configuration error') {
    super(message, 503)
    this.name = 'ConfigurationError'
    Object.setPrototypeOf(this, ConfigurationError.prototype)
  }
}
