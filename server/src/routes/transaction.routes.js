const express = require('express');
const transactionController = require('../controllers/transaction.controller');
const transactionValidator = require('../validators/transaction.validator');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(
    transactionValidator.getTransactions,
    validate,
    transactionController.getTransactions
  )
  .post(
    transactionValidator.createTransaction,
    validate,
    transactionController.createTransaction
  );

router
  .route('/:id')
  .patch(
    transactionValidator.updateTransaction,
    validate,
    transactionController.updateTransaction
  )
  .delete(transactionController.deleteTransaction);

module.exports = router;
