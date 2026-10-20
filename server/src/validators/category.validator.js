const { body } = require('express-validator');
const CONSTANTS = require('../utils/constants');

/**
 * Validation rules for category routes.
 */

const createCategory = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 30 })
    .withMessage('Name must be between 2 and 30 characters'),

  body('type')
    .notEmpty()
    .withMessage('Type is required')
    .isIn(CONSTANTS.CATEGORY_TYPES)
    .withMessage(`Type must be one of: ${CONSTANTS.CATEGORY_TYPES.join(', ')}`),

  body('icon')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Icon cannot exceed 10 characters'),

  body('color')
    .optional()
    .trim()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex code (e.g. #FF0000)'),
];

const updateCategory = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Name must be between 2 and 30 characters'),

  body('type')
    .optional()
    .isIn(CONSTANTS.CATEGORY_TYPES)
    .withMessage(`Type must be one of: ${CONSTANTS.CATEGORY_TYPES.join(', ')}`),

  body('icon')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Icon cannot exceed 10 characters'),

  body('color')
    .optional()
    .trim()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex code (e.g. #FF0000)'),
];

module.exports = {
  createCategory,
  updateCategory,
};
