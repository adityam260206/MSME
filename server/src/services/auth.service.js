const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Category = require('../models/Category.model');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const CONSTANTS = require('../utils/constants');

/**
 * Generate a JWT token for a user.
 * @param {string} userId - The user's MongoDB ObjectId
 * @returns {string} Signed JWT token
 */
function generateToken(userId) {
  return jwt.sign({ id: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

/**
 * Seed default categories for a new user.
 * This runs in the background during registration.
 * @param {string} userId - The user's MongoDB ObjectId
 */
async function seedDefaultCategories(userId) {
  try {
    const categoriesToInsert = CONSTANTS.DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      user: userId,
      isDefault: true,
    }));
    await Category.insertMany(categoriesToInsert);
  } catch (error) {
    // We log this but don't fail the registration if seeding fails
    console.error(`[auth] Failed to seed default categories for user ${userId}:`, error);
  }
}

/**
 * Register a new user.
 * @param {Object} userData - Registration data (name, email, password, currency)
 * @returns {Promise<{user: Object, token: string}>}
 */
async function register(userData) {
  // Check if user already exists (extra safety net alongside Mongoose unique constraint)
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw AppError.conflict('A user with this email already exists.');
  }

  // Create the user
  const user = await User.create({
    name: userData.name,
    email: userData.email,
    password: userData.password,
    currency: userData.currency,
  });

  // Generate token
  const token = generateToken(user._id);

  // Seed default categories (fire and forget)
  seedDefaultCategories(user._id);

  // Convert to plain object to apply toJSON transforms (removes password)
  return {
    user: user.toJSON(),
    token,
  };
}

/**
 * Authenticate a user and return a token.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: Object, token: string}>}
 */
async function login(email, password) {
  // 1. Find user and explicitly select the password field (since it's select: false by default)
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    throw AppError.unauthorized('Invalid email or password.');
  }

  // 2. Check if password is correct using the instance method we defined
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    throw AppError.unauthorized('Invalid email or password.');
  }

  // 3. Generate token
  const token = generateToken(user._id);

  return {
    user: user.toJSON(),
    token,
  };
}

/**
 * Get user profile by ID.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found.');
  }
  return user;
}

/**
 * Update user profile (nickname and password).
 * @param {string} userId
 * @param {Object} updateData
 * @returns {Promise<Object>}
 */
async function updateProfile(userId, updateData) {
  const { nickname, oldPassword, newPassword } = updateData;

  // 1. Fetch user (need password if changing it)
  const user = await User.findById(userId).select(newPassword ? '+password' : '');
  if (!user) {
    throw AppError.notFound('User not found.');
  }

  // 2. Handle password update
  if (newPassword) {
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      throw AppError.badRequest('Incorrect old password.');
    }
    user.password = newPassword;
  }

  // 3. Handle nickname update
  if (nickname !== undefined) {
    user.nickname = nickname;
  }

  // 4. Save and return (save will trigger pre-save hook for password hashing if modified)
  await user.save();
  return user.toJSON();
}

/**
 * Verify a user's current password.
 * @param {string} userId
 * @param {string} password
 * @returns {Promise<boolean>}
 */
async function verifyPassword(userId, password) {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw AppError.notFound('User not found.');
  }
  
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw AppError.badRequest('Incorrect old password.');
  }
  
  return true;
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  verifyPassword,
  generateToken,
};
