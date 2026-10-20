const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
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
      required: [true, 'Budget must be assigned to a category'],
    },
    amount: {
      type: Number,
      required: [true, 'Budget amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    // We store budgets per month-year (e.g., '2026-07') to allow historical tracking
    period: {
      type: String, 
      required: [true, 'Budget period (YYYY-MM) is required'],
      match: [/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format'],
      index: true,
    },
    alertsEnabled: {
      type: Boolean,
      default: true,
    }
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

// A user can only have one budget per category per month
budgetSchema.index({ user: 1, category: 1, period: 1 }, { unique: true });

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;
