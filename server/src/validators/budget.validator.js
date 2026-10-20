const { body, query } = require('express-validator');

const createBudget = [
  body('categoryId')
    .notEmpty()
    .withMessage('Category ID is required')
    .isMongoId()
    .withMessage('Invalid category ID'),

  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),

  body('period')
    .notEmpty()
    .withMessage('Period is required')
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('Period must be in YYYY-MM format'),
    
  body('alertsEnabled')
    .optional()
    .isBoolean()
    .withMessage('alertsEnabled must be a boolean')
];

const updateBudget = [
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
    
  body('alertsEnabled')
    .optional()
    .isBoolean()
    .withMessage('alertsEnabled must be a boolean')
];

const getBudgets = [
  query('period')
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('Period must be in YYYY-MM format')
];

module.exports = {
  createBudget,
  updateBudget,
  getBudgets,
};
