const { body, query } = require('express-validator');
const CONSTANTS = require('../utils/constants');

/**
 * Validation rules for transaction routes.
 */

const createTransaction = [
  body('categoryId')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('type')
    .notEmpty()
    .withMessage('Type is required')
    .isIn(CONSTANTS.CATEGORY_TYPES.filter(t => t !== 'both')) // Income or expense
    .withMessage('Type must be income or expense'),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a number greater than 0'),

  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 string'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Description cannot exceed 100 characters'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array of strings'),
  
  body('tags.*')
    .trim()
    .isLength({ max: 20 })
    .withMessage('Each tag cannot exceed 20 characters'),
];

const updateTransaction = [
  body('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('type')
    .optional()
    .isIn(CONSTANTS.CATEGORY_TYPES.filter(t => t !== 'both'))
    .withMessage('Type must be income or expense'),

  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a number greater than 0'),

  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 string'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Description cannot exceed 100 characters'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array of strings'),
];

const getTransactions = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('startDate').optional().isISO8601().withMessage('Invalid startDate format'),
  query('endDate').optional().isISO8601().withMessage('Invalid endDate format'),
  query('categoryId').optional().isMongoId().withMessage('Invalid category ID'),
  query('type').optional().isIn(['income', 'expense']).withMessage('Invalid type filter'),
];

module.exports = {
  createTransaction,
  updateTransaction,
  getTransactions,
};
