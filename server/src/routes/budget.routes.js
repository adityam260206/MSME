const express = require('express');
const budgetController = require('../controllers/budget.controller');
const budgetValidator = require('../validators/budget.validator');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(
    budgetValidator.getBudgets,
    validate,
    budgetController.getBudgets
  )
  .post(
    budgetValidator.createBudget,
    validate,
    budgetController.createBudget
  );

router
  .route('/:id')
  .patch(
    budgetValidator.updateBudget,
    validate,
    budgetController.updateBudget
  )
  .delete(budgetController.deleteBudget);

module.exports = router;
