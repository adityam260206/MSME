const Transaction = require('../models/Transaction.model');
const Category = require('../models/Category.model');
const Account = require('../models/Account.model');
const AppError = require('../utils/AppError');
const { getPaginationArgs, formatPaginatedResponse } = require('../utils/pagination');

/**
 * Get paginated and filtered transactions for a user.
 */
async function getTransactions(userId, query) {
  const { page, limit, skip } = getPaginationArgs(query);
  const filter = { user: userId };

  // Apply filters
  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(query.startDate);
    if (query.endDate) filter.date.$lte = new Date(query.endDate);
  }

  if (query.categoryId) {
    filter.category = query.categoryId;
  }

  if (query.type) {
    filter.type = query.type;
  }

  // Execute query and count in parallel
  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ date: -1, createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .populate('category', 'name icon color type'), // Populate category details
    Transaction.countDocuments(filter),
  ]);

  return formatPaginatedResponse(transactions, total, page, limit);
}

/**
 * Create a transaction. Validates that the category belongs to the user.
 */
async function createTransaction(userId, data) {
  // Ensure the category exists and either belongs to the user or is a system default
  const category = await Category.findOne({
    _id: data.categoryId,
    $or: [{ user: userId }, { user: null, isDefault: true }]
  });

  if (!category) {
    throw AppError.badRequest('Invalid category ID provided.');
  }

  // Ensure category type matches transaction type (unless category is 'both')
  if (category.type !== 'both' && category.type !== data.type) {
    throw AppError.badRequest(`Cannot assign a ${data.type} to an ${category.type} category.`);
  }

  // Ensure account exists
  let account = null;
  if (data.accountId) {
    account = await Account.findOne({ _id: data.accountId, user: userId });
    if (!account) {
      throw AppError.badRequest('Invalid account ID provided.');
    }
  }

  const transaction = await Transaction.create({
    user: userId,
    category: data.categoryId,
    account: data.accountId || null,
    type: data.type,
    amount: data.amount,
    date: data.date,
    description: data.description,
    tags: data.tags,
  });

  // Update account balance
  if (account) {
    if (data.type === 'income') {
      account.currentBalance += data.amount;
    } else {
      account.currentBalance -= data.amount;
    }
    await account.save();
  }

  // Populate category before returning so the UI has immediate access to icon/color
  await transaction.populate('category', 'name icon color type');
  
  return transaction;
}

/**
 * Update a transaction.
 */
async function updateTransaction(userId, transactionId, updates) {
  const transaction = await Transaction.findOne({ _id: transactionId, user: userId });

  if (!transaction) {
    throw AppError.notFound('Transaction not found.');
  }

  // If category is being updated, validate it
  if (updates.categoryId && updates.categoryId !== transaction.category.toString()) {
    const category = await Category.findOne({
      _id: updates.categoryId,
      $or: [{ user: userId }, { user: null, isDefault: true }]
    });

    if (!category) {
      throw AppError.badRequest('Invalid category ID provided.');
    }

    const typeToCheck = updates.type || transaction.type;
    if (category.type !== 'both' && category.type !== typeToCheck) {
      throw AppError.badRequest(`Cannot assign a ${typeToCheck} to an ${category.type} category.`);
    }

    transaction.category = updates.categoryId;
  }

  // Handle account balance adjustments if amount, type, or account changes
  let oldAccount = null;
  let newAccount = null;
  
  if (transaction.account) {
    oldAccount = await Account.findOne({ _id: transaction.account, user: userId });
  }

  if (updates.accountId !== undefined && updates.accountId !== (transaction.account ? transaction.account.toString() : null)) {
    if (updates.accountId) {
      newAccount = await Account.findOne({ _id: updates.accountId, user: userId });
      if (!newAccount) throw AppError.badRequest('Invalid account ID provided.');
    }
    transaction.account = updates.accountId || null;
  } else {
    newAccount = oldAccount;
  }

  // Revert old transaction effect
  if (oldAccount) {
    if (transaction.type === 'income') oldAccount.currentBalance -= transaction.amount;
    else oldAccount.currentBalance += transaction.amount;
  }

  // Apply other updates
  ['type', 'amount', 'date', 'description', 'tags'].forEach(field => {
    if (updates[field] !== undefined) {
      transaction[field] = updates[field];
    }
  });

  // Apply new transaction effect
  if (newAccount) {
    if (transaction.type === 'income') newAccount.currentBalance += transaction.amount;
    else newAccount.currentBalance -= transaction.amount;
    
    // Save new account if it's different from old account, otherwise they are the same object reference
    if (oldAccount && oldAccount._id.toString() !== newAccount._id.toString()) {
      await oldAccount.save();
    }
    await newAccount.save();
  } else if (oldAccount) {
    await oldAccount.save();
  }

  await transaction.save();
  await transaction.populate('category', 'name icon color type');

  return transaction;
}

/**
 * Delete a transaction.
 */
async function deleteTransaction(userId, transactionId) {
  const transaction = await Transaction.findOne({ _id: transactionId, user: userId });
  
  if (!transaction) {
    throw AppError.notFound('Transaction not found.');
  }

  if (transaction.account) {
    const account = await Account.findOne({ _id: transaction.account, user: userId });
    if (account) {
      if (transaction.type === 'income') {
        account.currentBalance -= transaction.amount;
      } else {
        account.currentBalance += transaction.amount;
      }
      await account.save();
    }
  }

  await Transaction.deleteOne({ _id: transactionId });
  
  return true;
}

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
