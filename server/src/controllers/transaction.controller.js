const transactionService = require('../services/transaction.service');
const apiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

/**
 * Get paginated transactions
 * GET /api/v1/transactions
 */
const getTransactions = catchAsync(async (req, res) => {
  const paginatedResult = await transactionService.getTransactions(req.user.id, req.query);
  return apiResponse.success(res, paginatedResult);
});

/**
 * Create a transaction
 * POST /api/v1/transactions
 */
const createTransaction = catchAsync(async (req, res) => {
  const transaction = await transactionService.createTransaction(req.user.id, req.body);
  return apiResponse.success(res, { transaction }, 201);
});

/**
 * Update a transaction
 * PATCH /api/v1/transactions/:id
 */
const updateTransaction = catchAsync(async (req, res) => {
  const transaction = await transactionService.updateTransaction(
    req.user.id,
    req.params.id,
    req.body
  );
  return apiResponse.success(res, { transaction });
});

/**
 * Delete a transaction
 * DELETE /api/v1/transactions/:id
 */
const deleteTransaction = catchAsync(async (req, res) => {
  await transactionService.deleteTransaction(req.user.id, req.params.id);
  return apiResponse.noContent(res);
});

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
