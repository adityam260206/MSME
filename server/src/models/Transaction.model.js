const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Transaction must belong to a category'],
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: false, // Legacy transactions won't have this until migration script runs
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'Transaction type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    date: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now,
      index: true, // Frequent querying by date range
    },
    description: {
      type: String,
      trim: true,
      maxlength: [100, 'Description cannot exceed 100 characters'],
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [20, 'Tag cannot exceed 20 characters'],
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for querying user's transactions within a date range efficiently
transactionSchema.index({ user: 1, date: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
