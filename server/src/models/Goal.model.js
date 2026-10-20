const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be at least 1'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current saved amount cannot be negative'],
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    // Note: To be populated automatically via Phase 5 (Multiple Accounts)
    linkedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual for completion percentage
goalSchema.virtual('completionPercentage').get(function () {
  if (this.targetAmount === 0) return 0;
  return Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100));
});

// Virtual for remaining amount
goalSchema.virtual('remainingAmount').get(function () {
  return Math.max(0, this.targetAmount - this.currentAmount);
});

// Virtual for estimated completion
goalSchema.virtual('isOverdue').get(function () {
  return new Date() > this.deadline && this.status === 'active';
});

const Goal = mongoose.model('Goal', goalSchema);

module.exports = Goal;
