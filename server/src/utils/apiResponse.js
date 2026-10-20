/**
 * Standardized API response builders.
 *
 * Every endpoint in the application uses these to ensure a
 * consistent JSON envelope:
 *
 *   Success → { status: 'success', data, meta? }
 *   Error   → { status: 'error', message, errors? }
 *
 * Usage:
 *   apiResponse.success(res, { user }, 201);
 *   apiResponse.success(res, { transactions }, 200, { page: 1, limit: 20, total: 145 });
 *   apiResponse.error(res, 'Validation failed', 400, errors);
 */

const apiResponse = {
  /**
   * Send a success response.
   * @param {import('express').Response} res
   * @param {Object} data — Response payload
   * @param {number} statusCode — HTTP status (default 200)
   * @param {Object|null} meta — Optional pagination / metadata
   */
  success(res, data = null, statusCode = 200, meta = null) {
    const body = { status: 'success' };

    if (data !== null) {
      body.data = data;
    }

    if (meta !== null) {
      body.meta = meta;
    }

    return res.status(statusCode).json(body);
  },

  /**
   * Send an error response.
   * @param {import('express').Response} res
   * @param {string} message — Human-readable error message
   * @param {number} statusCode — HTTP status (default 500)
   * @param {Array} errors — Optional field-level errors
   */
  error(res, message = 'Something went wrong', statusCode = 500, errors = []) {
    const body = {
      status: 'error',
      message,
    };

    if (errors.length > 0) {
      body.errors = errors;
    }

    return res.status(statusCode).json(body);
  },

  /**
   * Send a 204 No Content response (for deletes).
   * @param {import('express').Response} res
   */
  noContent(res) {
    return res.status(204).send();
  },
};

module.exports = apiResponse;
