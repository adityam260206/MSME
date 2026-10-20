const express = require('express');
const accountController = require('../controllers/account.controller');
const { protect } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

router.use(protect);

const accountValidation = [
  body('name').trim().notEmpty().withMessage('Account name is required').isLength({ max: 50 }),
  body('type').isIn(['cash', 'bank', 'credit', 'savings']).withMessage('Invalid account type'),
  body('initialBalance').optional().isFloat().withMessage('Initial balance must be a number'),
  body('color').optional().isString().isLength({ max: 20 }),
];

const transferValidation = [
  body('fromAccountId').isMongoId().withMessage('Invalid origin account ID'),
  body('toAccountId').isMongoId().withMessage('Invalid destination account ID'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Transfer amount must be greater than zero'),
];

router.route('/')
  .get(accountController.getAll)
  .post(accountValidation, validate, accountController.create);

router.post('/transfer', transferValidation, validate, accountController.transfer);

router.route('/:id')
  .get(accountController.getById)
  .put(accountValidation, validate, accountController.update)
  .delete(accountController.delete);

module.exports = router;
