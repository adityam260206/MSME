const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const CONSTANTS = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: [30, 'Nickname cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [
        CONSTANTS.PASSWORD_MIN_LENGTH,
        `Password must be at least ${CONSTANTS.PASSWORD_MIN_LENGTH} characters`,
      ],
      select: false, // Do not return password by default in queries
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(CONSTANTS.SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare provided password with hashed password in database
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
