const express = require('express');
const recurringController = require('../controllers/recurring.controller');
const { protect } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

router.use(protect);

const recurringValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
  body('type').isIn(['income', 'expense']).withMessage('Invalid type'),
  body('category').isMongoId().withMessage('Invalid category ID'),
  body('frequency').isIn(['daily', 'weekly', 'monthly', 'yearly']).withMessage('Invalid frequency'),
  body('nextDueDate').isISO8601().withMessage('Valid date is required'),
];

router.route('/')
  .get(recurringController.getAll)
  .post(recurringValidation, validate, recurringController.create);

router.route('/:id')
  .get(recurringController.getById)
  .put(recurringValidation, validate, recurringController.update)
  .delete(recurringController.delete);

router.patch('/:id/toggle', recurringController.toggleStatus);

module.exports = router;
