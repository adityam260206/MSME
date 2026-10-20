const Category = require('../models/Category.model');
const AppError = require('../utils/AppError');

/**
 * Get all categories for a user (includes system defaults).
 */
async function getCategories(userId) {
  // Find categories where user matches OR user is null (system defaults)
  const categories = await Category.find({
    $or: [{ user: userId }, { user: null, isDefault: true }],
  }).sort({ name: 1 });

  return categories;
}

/**
 * Create a custom category.
 */
async function createCategory(userId, categoryData) {
  // Duplicate check handled by Mongoose unique index (errorMiddleware catches 11000)
  const category = await Category.create({
    ...categoryData,
    user: userId,
    isDefault: false,
  });

  return category;
}

/**
 * Update a custom category.
 */
async function updateCategory(userId, categoryId, updates) {
  const category = await Category.findOne({ _id: categoryId, user: userId });

  if (!category) {
    throw AppError.notFound('Category not found.');
  }

  if (category.isDefault) {
    throw AppError.forbidden('Cannot modify default system categories.');
  }

  // Apply updates
  Object.assign(category, updates);
  await category.save();

  return category;
}

/**
 * Delete a custom category.
 */
async function deleteCategory(userId, categoryId) {
  const category = await Category.findOne({ _id: categoryId, user: userId });

  if (!category) {
    throw AppError.notFound('Category not found.');
  }

  if (category.isDefault) {
    throw AppError.forbidden('Cannot delete default system categories.');
  }

  // Check if category is in use by any transactions
  const Transaction = require('../models/Transaction.model');
  const inUseCount = await Transaction.countDocuments({ category: categoryId, user: userId });
  if (inUseCount > 0) {
    throw AppError.badRequest(`Cannot delete category. It is currently used by ${inUseCount} transaction(s).`);
  }

  await category.deleteOne();
  return true;
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
