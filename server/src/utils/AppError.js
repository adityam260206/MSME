/**
 * Custom application error.
 *
 * Extends the native Error with an HTTP status code and an `isOperational`
 * flag to distinguish expected errors (bad input, not found) from
 * unexpected ones (bugs, DB failures).
 *
 * Usage:
 *   throw new AppError('User not found', 404);
 *   throw new AppError('Email already registered', 409);
 *   throw AppError.badRequest('Invalid amount');
 *   throw AppError.unauthorized();
 */
class AppError extends Error {
  /**
   * @param {string} message  — Human-readable error message
   * @param {number} statusCode — HTTP status code (default 500)
   * @param {Array}  errors — Optional array of field-level errors
   */
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    // Capture stack trace without polluting it with this constructor
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Factory Methods ──────────────────────────────────────────────

  static badRequest(message = 'Bad request', errors = []) {
    return new AppError(message, 400, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }

  static conflict(message = 'Resource already exists') {
    return new AppError(message, 409);
  }

  static tooMany(message = 'Too many requests') {
    return new AppError(message, 429);
  }

  static internal(message = 'Internal server error') {
    return new AppError(message, 500);
  }
}

module.exports = AppError;
