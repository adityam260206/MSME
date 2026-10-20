const AppError = require('../utils/AppError');
const apiResponse = require('../utils/apiResponse');
const env = require('../config/env');

/**
 * Global error-handling middleware.
 *
 * Express identifies error middleware by its 4-parameter signature.
 * This is the ONLY place where errors are translated into HTTP responses.
 *
 * Handles:
 *  - AppError (operational — our own throws)
 *  - Mongoose ValidationError (schema validation failures)
 *  - Mongoose CastError (invalid ObjectId)
 *  - Mongoose 11000 (duplicate key)
 *  - JsonWebTokenError / TokenExpiredError
 *  - Unexpected errors (bugs — logged, sanitized for client)
 */

// ── Mongoose Error Converters ────────────────────────────────────────

function handleMongooseValidation(err) {
  const errors = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return new AppError('Validation failed', 400, errors);
}

function handleMongooseCast(err) {
  return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
}

function handleMongooseDuplicate(err) {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new AppError(
    `Duplicate value for "${field}": "${value}". Please use another value.`,
    409,
  );
}

// ── JWT Error Converters ─────────────────────────────────────────────

function handleJWTError() {
  return AppError.unauthorized('Invalid token. Please log in again.');
}

function handleJWTExpired() {
  return AppError.unauthorized('Token expired. Please log in again.');
}

// ── Main Handler ─────────────────────────────────────────────────────

function errorMiddleware(err, req, res, _next) {
  // Default to 500 if no status code is set
  err.statusCode = err.statusCode || 500;

  // Development: full error details for debugging
  if (env.isDev) {
    console.error('[error]', err);
    return sendDevError(err, res);
  }

  // Production: convert known errors, sanitize unknowns
  let error = { ...err, message: err.message, name: err.name };

  if (err.name === 'ValidationError') error = handleMongooseValidation(err);
  if (err.name === 'CastError') error = handleMongooseCast(err);
  if (err.code === 11000) error = handleMongooseDuplicate(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpired();

  return sendProdError(error, res);
}

// ── Response Senders ─────────────────────────────────────────────────

function sendDevError(err, res) {
  return res.status(err.statusCode).json({
    status: 'error',
    message: err.message,
    errors: err.errors || [],
    stack: err.stack,
  });
}

function sendProdError(err, res) {
  // Operational errors: safe to send to client
  if (err.isOperational) {
    return apiResponse.error(res, err.message, err.statusCode, err.errors || []);
  }

  // Programming / unknown errors: log and send generic message
  console.error('[error] Unexpected error:', err);
  return apiResponse.error(res, 'Something went wrong', 500);
}

module.exports = errorMiddleware;
