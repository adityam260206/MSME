const mongoose = require('mongoose');
const Budget = require('../models/Budget.model');
const Transaction = require('../models/Transaction.model');
const Category = require('../models/Category.model');
const AppError = require('../utils/AppError');

/**
 * Get budgets for a specific period, calculating spent amounts on the fly.
 */
async function getBudgets(userId, period) {
  // 1. Fetch budgets for the period
  const filter = { user: userId };
  if (period) {
    filter.period = period;
  } else {
    // Default to current month if no period provided
    const now = new Date();
    filter.period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const budgets = await Budget.find(filter).populate('category', 'name icon color');

  // 2. Calculate how much has been spent for each budget in this period
  // We parse '2026-07' to get the start and end of that month
  const [year, month] = filter.period.split('-');
  const startDate = new Date(year, parseInt(month) - 1, 1);
  const endDate = new Date(year, parseInt(month), 0, 23, 59, 59, 999);

  const budgetsWithSpending = await Promise.all(
    budgets.map(async (budget) => {
      // Aggregate transactions for this user, category, and month
      const [result] = await Transaction.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            category: budget.category._id,
            type: 'expense',
            date: { $gte: startDate, $lte: endDate },
          }
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$amount' }
          }
        }
      ]);

      const spent = result ? result.totalSpent : 0;
      const progress = (spent / budget.amount) * 100;
      
      // Convert mongoose doc to plain object and append dynamic fields
      return {
        ...budget.toObject(),
        spent,
        progress: Math.min(progress, 100), // Cap at 100% for UI bars
        isExceeded: spent > budget.amount
      };
    })
  );

  return budgetsWithSpending;
}

/**
 * Create a new budget.
 */
async function createBudget(userId, data) {
  // Validate category belongs to user and is an expense category
  const category = await Category.findOne({
    _id: data.categoryId,
    $or: [{ user: userId }, { user: null, isDefault: true }]
  });

  if (!category) throw AppError.badRequest('Invalid category ID');
  if (category.type === 'income') throw AppError.badRequest('Cannot set a budget for an income category');

  const budget = await Budget.create({
    user: userId,
    category: data.categoryId,
    amount: data.amount,
    period: data.period,
    alertsEnabled: data.alertsEnabled
  });

  await budget.populate('category', 'name icon color');
  return budget;
}

/**
 * Update budget amount.
 */
async function updateBudget(userId, budgetId, updates) {
  const budget = await Budget.findOneAndUpdate(
    { _id: budgetId, user: userId },
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('category', 'name icon color');

  if (!budget) throw AppError.notFound('Budget not found');
  return budget;
}

/**
 * Delete a budget.
 */
async function deleteBudget(userId, budgetId) {
  const result = await Budget.deleteOne({ _id: budgetId, user: userId });
  if (result.deletedCount === 0) throw AppError.notFound('Budget not found');
  return true;
}

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget
};
