const RecurringTransaction = require('../models/RecurringTransaction.model');
const Transaction = require('../models/Transaction.model');
const transactionService = require('./transaction.service');
const AppError = require('../utils/AppError');
const mongoose = require('mongoose');

// ── CRUD Operations ───────────────────────────────────────────────

exports.getAll = async (userId) => {
  return await RecurringTransaction.find({ user: userId })
    .populate('category', 'name icon color')
    .sort({ nextDueDate: 1 }); // Soonest first
};

exports.getById = async (id, userId) => {
  const recurring = await RecurringTransaction.findOne({ _id: id, user: userId })
    .populate('category', 'name icon color');
  
  if (!recurring) {
    throw new AppError('Recurring transaction not found', 404);
  }
  return recurring;
};

exports.create = async (userId, data) => {
  // Reset time to start of day for accurate comparison
  const dueDate = new Date(data.nextDueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  const recurring = await RecurringTransaction.create({
    ...data,
    user: userId,
    nextDueDate: dueDate
  });
  
  return await recurring.populate('category', 'name icon color');
};

exports.update = async (id, userId, data) => {
  if (data.nextDueDate) {
    const dueDate = new Date(data.nextDueDate);
    dueDate.setHours(0, 0, 0, 0);
    data.nextDueDate = dueDate;
  }

  const recurring = await RecurringTransaction.findOneAndUpdate(
    { _id: id, user: userId },
    data,
    { new: true, runValidators: true }
  ).populate('category', 'name icon color');

  if (!recurring) {
    throw new AppError('Recurring transaction not found', 404);
  }

  return recurring;
};

exports.delete = async (id, userId) => {
  const recurring = await RecurringTransaction.findOneAndDelete({ _id: id, user: userId });
  if (!recurring) {
    throw new AppError('Recurring transaction not found', 404);
  }
  return true;
};

exports.toggleStatus = async (id, userId) => {
  const recurring = await RecurringTransaction.findOne({ _id: id, user: userId });
  if (!recurring) {
    throw new AppError('Recurring transaction not found', 404);
  }

  recurring.status = recurring.status === 'active' ? 'paused' : 'active';
  
  // If resuming, make sure the due date isn't stuck in the past
  if (recurring.status === 'active') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(recurring.nextDueDate) < today) {
      recurring.nextDueDate = today;
    }
  }

  await recurring.save();
  return await recurring.populate('category', 'name icon color');
};

// ── Background Processor ──────────────────────────────────────────

/**
 * Automatically creates Transaction records for any active 
 * RecurringTransaction whose nextDueDate is <= today.
 * Then advances the nextDueDate according to the frequency.
 */
exports.processDueTransactions = async () => {
  console.log('[cron] Checking for due recurring transactions...');
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  try {
    // Find all active transactions due today or earlier
    const dueRecurring = await RecurringTransaction.find({
      status: 'active',
      nextDueDate: { $lte: today }
    });

    if (dueRecurring.length === 0) {
      console.log('[cron] No recurring transactions due today.');
      return;
    }

    let processedCount = 0;

    // Process each one within a session (transaction) if possible,
    // but a simple loop is safer for bulk without a replica set.
    for (const rt of dueRecurring) {
      try {
        // 1. Create the actual transaction using transactionService so account balances update
        await transactionService.createTransaction(rt.user.toString(), {
          categoryId: rt.category.toString(),
          accountId: rt.account ? rt.account.toString() : null,
          type: rt.type,
          amount: rt.amount,
          date: today, // or rt.nextDueDate if you prefer strict historical accuracy
          description: `${rt.name} (Recurring)`,
          tags: ['recurring']
        });

        // 2. Calculate the next due date based on frequency
        const nextDate = new Date(rt.nextDueDate);
        switch (rt.frequency) {
          case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        }

        // 3. Update the recurring schedule
        rt.nextDueDate = nextDate;
        rt.lastProcessedDate = new Date();
        await rt.save();

        processedCount++;
      } catch (err) {
        console.error(`[cron] Failed to process recurring tx ${rt._id}:`, err);
      }
    }

    console.log(`[cron] Successfully processed ${processedCount} recurring transactions.`);
  } catch (error) {
    console.error('[cron] Error processing recurring transactions:', error);
  }
};
