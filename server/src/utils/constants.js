/**
 * Server-wide constants.
 *
 * Centralizes magic numbers and strings so they can be changed
 * in one place and referenced everywhere.
 */

const CONSTANTS = Object.freeze({
  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,

  // Auth
  SALT_ROUNDS: 12,
  PASSWORD_MIN_LENGTH: 8,

  // Transaction types
  TRANSACTION_TYPES: ['income', 'expense'],

  // Category types
  CATEGORY_TYPES: ['income', 'expense', 'both'],

  // Default categories seeded for new users
  DEFAULT_CATEGORIES: [
    { name: 'Food & Dining', type: 'expense', icon: '🍔', color: '#F59E0B' },
    { name: 'Travel', type: 'expense', icon: '✈️', color: '#06B6D4' },
    { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#FF7A59' },
    { name: 'Bills & Utilities', type: 'expense', icon: '💡', color: '#94A3B8' },
    { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#EC4899' },
    { name: 'Health', type: 'expense', icon: '💊', color: '#10B981' },
    { name: 'Education', type: 'expense', icon: '📚', color: '#6366F1' },
    { name: 'Groceries', type: 'expense', icon: '🛒', color: '#F59E0B' },
    { name: 'Transport', type: 'expense', icon: '🚗', color: '#06B6D4' },
    { name: 'Rent', type: 'expense', icon: '🏠', color: '#FF5A5F' },
    { name: 'Salary', type: 'income', icon: '💰', color: '#00C896' },
    { name: 'Freelance', type: 'income', icon: '💻', color: '#00C896' },
    { name: 'Investments', type: 'income', icon: '📈', color: '#8B5CF6' },
    { name: 'Other Income', type: 'income', icon: '💵', color: '#94A3B8' },
    { name: 'Other Expense', type: 'expense', icon: '📦', color: '#94A3B8' },
  ],

  // Months
  MONTHS: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
});

module.exports = CONSTANTS;
