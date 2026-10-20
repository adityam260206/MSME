const express = require('express');
const categoryController = require('../controllers/category.controller');
const categoryValidator = require('../validators/category.validator');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// All category routes require authentication
router.use(protect);

router
  .route('/')
  .get(categoryController.getCategories)
  .post(
    categoryValidator.createCategory,
    validate,
    categoryController.createCategory
  );

router
  .route('/:id')
  .patch(
    categoryValidator.updateCategory,
    validate,
    categoryController.updateCategory
  )
  .delete(categoryController.deleteCategory);

module.exports = router;
