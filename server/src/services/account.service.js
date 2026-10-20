const Account = require('../models/Account.model');
const Transaction = require('../models/Transaction.model');
const Category = require('../models/Category.model');
const transactionService = require('./transaction.service');
const AppError = require('../utils/AppError');

exports.getAll = async (userId) => {
  return await Account.find({ user: userId }).sort({ type: 1, name: 1 });
};

exports.getById = async (id, userId) => {
  const account = await Account.findOne({ _id: id, user: userId });
  if (!account) {
    throw new AppError('Account not found', 404);
  }
  return account;
};

exports.create = async (userId, data) => {
  const account = await Account.create({
    ...data,
    user: userId,
    currentBalance: data.initialBalance || 0
  });
  return account;
};

exports.update = async (id, userId, data) => {
  // Prevent updating currentBalance directly via standard update endpoint
  delete data.currentBalance;
  
  const account = await Account.findOneAndUpdate(
    { _id: id, user: userId },
    data,
    { new: true, runValidators: true }
  );
  
  if (!account) {
    throw new AppError('Account not found', 404);
  }
  return account;
};

exports.delete = async (id, userId) => {
  // Prevent deletion if transactions exist
  const txCount = await Transaction.countDocuments({ account: id, user: userId });
  if (txCount > 0) {
    throw new AppError('Cannot delete account with existing transactions', 400);
  }

  const account = await Account.findOneAndDelete({ _id: id, user: userId });
  if (!account) {
    throw new AppError('Account not found', 404);
  }
  return true;
};

/**
 * Handle direct transfers between accounts.
 * Usually implemented by creating two transactions (expense on from, income on to).
 */
exports.transfer = async (userId, { fromAccountId, toAccountId, amount, description }) => {
  if (amount <= 0) throw new AppError('Transfer amount must be positive', 400);
  if (fromAccountId === toAccountId) throw new AppError('Cannot transfer to the same account', 400);

  const fromAccount = await Account.findOne({ _id: fromAccountId, user: userId });
  const toAccount = await Account.findOne({ _id: toAccountId, user: userId });

  if (!fromAccount || !toAccount) {
    throw new AppError('One or both accounts not found', 404);
  }

  // Find "Other Income" and "Other Expense" categories for the user, or fallback to the first one available
  let incomeCategory = await Category.findOne({ user: { $in: [userId, null] }, type: 'income', name: /Other/i });
  if (!incomeCategory) {
    incomeCategory = await Category.findOne({ user: { $in: [userId, null] }, type: 'income' });
  }

  let expenseCategory = await Category.findOne({ user: { $in: [userId, null] }, type: 'expense', name: /Other/i });
  if (!expenseCategory) {
    expenseCategory = await Category.findOne({ user: { $in: [userId, null] }, type: 'expense' });
  }

  const expenseDesc = description || `Transfer to ${toAccount.name}`;
  const incomeDesc = description || `Transfer from ${fromAccount.name}`;

  // Create an expense transaction for the source account using transactionService (which handles balance updates)
  await transactionService.createTransaction(userId, {
    categoryId: expenseCategory._id.toString(),
    accountId: fromAccountId,
    type: 'expense',
    amount: amount,
    date: new Date(),
    description: expenseDesc,
    tags: ['transfer']
  });

  // Create an income transaction for the destination account
  await transactionService.createTransaction(userId, {
    categoryId: incomeCategory._id.toString(),
    accountId: toAccountId,
    type: 'income',
    amount: amount,
    date: new Date(),
    description: incomeDesc,
    tags: ['transfer']
  });

  // Re-fetch to return updated balances
  const updatedFrom = await Account.findById(fromAccountId);
  const updatedTo = await Account.findById(toAccountId);

  return { fromAccount: updatedFrom, toAccount: updatedTo };
};
