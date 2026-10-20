const express = require('express');
const goalController = require('../controllers/goal.controller');
const { protect } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

router.use(protect);

const goalValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 100 }),
  body('targetAmount').isFloat({ min: 1 }).withMessage('Target amount must be at least 1'),
  body('currentAmount').optional().isFloat({ min: 0 }).withMessage('Current amount cannot be negative'),
  body('deadline').isISO8601().withMessage('Valid deadline date is required'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
];

router.route('/')
  .get(goalController.getAll)
  .post(goalValidation, validate, goalController.create);

router.route('/:id')
  .get(goalController.getById)
  .put(goalValidation, validate, goalController.update)
  .delete(goalController.delete);

module.exports = router;
