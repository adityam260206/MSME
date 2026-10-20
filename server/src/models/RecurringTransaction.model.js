const mongoose = require('mongoose');

const recurringTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'Type is required'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: false,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: [true, 'Frequency is required'],
    },
    nextDueDate: {
      type: Date,
      required: [true, 'Next due date is required'],
      index: true, // Crucial for cron job querying
    },
    status: {
      type: String,
      enum: ['active', 'paused'],
      default: 'active',
    },
    lastProcessedDate: {
      type: Date,
      default: null, // Tracks when it was last successfully processed
    },
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

const RecurringTransaction = mongoose.model('RecurringTransaction', recurringTransactionSchema);

module.exports = RecurringTransaction;
