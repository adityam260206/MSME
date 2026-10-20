const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      maxlength: [50, 'Account name cannot exceed 50 characters'],
    },
    type: {
      type: String,
      enum: ['cash', 'bank', 'credit', 'savings'],
      required: [true, 'Account type is required'],
    },
    initialBalance: {
      type: Number,
      default: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: '#3b82f6', // Brand blue default
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

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;
