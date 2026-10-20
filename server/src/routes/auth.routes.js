const express = require('express');
const authController = require('../controllers/auth.controller');
const authValidator = require('../validators/auth.validator');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authValidator.register,
  validate,
  authController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post(
  '/login',
  authValidator.login,
  validate,
  authController.login
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/me',
  protect,
  authController.getMe
);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update current user profile (nickname/password)
 * @access  Private
 */
router.put(
  '/profile',
  protect,
  authValidator.updateProfile,
  validate,
  authController.updateProfile
);

/**
 * @route   POST /api/v1/auth/verify-password
 * @desc    Verify current user password
 * @access  Private
 */
router.post(
  '/verify-password',
  protect,
  authController.verifyPassword
);

module.exports = router;
