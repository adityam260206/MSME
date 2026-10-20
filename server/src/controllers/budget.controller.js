const budgetService = require('../services/budget.service');
const apiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

/**
 * Get budgets with computed spending
 * GET /api/v1/budgets?period=YYYY-MM
 */
const getBudgets = catchAsync(async (req, res) => {
  const budgets = await budgetService.getBudgets(req.user.id, req.query.period);
  return apiResponse.success(res, { budgets });
});

/**
 * Create a new budget
 * POST /api/v1/budgets
 */
const createBudget = catchAsync(async (req, res) => {
  const budget = await budgetService.createBudget(req.user.id, req.body);
  return apiResponse.success(res, { budget }, 201);
});

/**
 * Update a budget
 * PATCH /api/v1/budgets/:id
 */
const updateBudget = catchAsync(async (req, res) => {
  const budget = await budgetService.updateBudget(req.user.id, req.params.id, req.body);
  return apiResponse.success(res, { budget });
});

/**
 * Delete a budget
 * DELETE /api/v1/budgets/:id
 */
const deleteBudget = catchAsync(async (req, res) => {
  await budgetService.deleteBudget(req.user.id, req.params.id);
  return apiResponse.noContent(res);
});

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget
};
