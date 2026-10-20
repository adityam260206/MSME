const categoryService = require('../services/category.service');
const apiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

/**
 * Get all categories
 * GET /api/v1/categories
 */
const getCategories = catchAsync(async (req, res) => {
  const categories = await categoryService.getCategories(req.user.id);
  return apiResponse.success(res, { categories });
});

/**
 * Create custom category
 * POST /api/v1/categories
 */
const createCategory = catchAsync(async (req, res) => {
  const category = await categoryService.createCategory(req.user.id, req.body);
  return apiResponse.success(res, { category }, 201);
});

/**
 * Update custom category
 * PATCH /api/v1/categories/:id
 */
const updateCategory = catchAsync(async (req, res) => {
  const category = await categoryService.updateCategory(
    req.user.id,
    req.params.id,
    req.body
  );
  return apiResponse.success(res, { category });
});

/**
 * Delete custom category
 * DELETE /api/v1/categories/:id
 */
const deleteCategory = catchAsync(async (req, res) => {
  await categoryService.deleteCategory(req.user.id, req.params.id);
  return apiResponse.noContent(res);
});

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
