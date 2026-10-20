const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Middleware to evaluate express-validator rules.
 *
 * If the request fails validation, this intercepts it before it
 * hits the controller and throws an AppError formatted with all
 * the field-level errors.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  // Format express-validator errors into our standardized shape
  const extractedErrors = errors.array().map((err) => ({
    field: err.path, // e.g., 'email'
    message: err.msg,
  }));

  throw AppError.badRequest('Validation failed', extractedErrors);
}

module.exports = validate;
