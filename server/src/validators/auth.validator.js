const { body } = require('express-validator');
const CONSTANTS = require('../utils/constants');

/**
 * Validation rules for authentication routes.
 * Used in conjunction with validate.middleware.js
 */

const register = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: CONSTANTS.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${CONSTANTS.PASSWORD_MIN_LENGTH} characters`),

  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency code must be exactly 3 characters')
    .toUpperCase(),
];

const login = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const updateProfile = [
  body('nickname')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Nickname cannot exceed 30 characters'),

  body('newPassword')
    .optional()
    .isLength({ min: CONSTANTS.PASSWORD_MIN_LENGTH })
    .withMessage(`New password must be at least ${CONSTANTS.PASSWORD_MIN_LENGTH} characters`),

  body('oldPassword')
    .if(body('newPassword').exists())
    .notEmpty()
    .withMessage('Old password is required when changing password'),
];

module.exports = {
  register,
  login,
  updateProfile,
};
