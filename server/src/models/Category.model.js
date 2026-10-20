const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null means it's a system default category (seeded on registration)
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [30, 'Name cannot exceed 30 characters'],
    },
    type: {
      type: String,
      enum: {
        values: ['income', 'expense', 'both'],
        message: '{VALUE} is not a valid category type',
      },
      required: [true, 'Category type is required'],
    },
    icon: {
      type: String,
      default: '📦',
      trim: true,
      maxlength: [10, 'Icon cannot exceed 10 characters'],
    },
    color: {
      type: String,
      default: '#94A3B8', // slate-400
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
    },
    isDefault: {
      type: Boolean,
      default: false,
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

// Prevent users from creating duplicate categories of the same name & type
categorySchema.index({ user: 1, name: 1, type: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
