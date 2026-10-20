const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const env = require('../config/env');
const User = require('../models/User.model');

/**
 * Authentication middleware.
 *
 * Verifies the JWT from the Authorization header, ensures the user
 * still exists in the database, and attaches the user object to `req`.
 *
 * Usage:
 *   router.get('/me', protect, authController.getMe);
 */
const protect = catchAsync(async (req, res, next) => {
  // 1. Get token and check if it's there
  let token;
  
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      AppError.unauthorized('You are not logged in. Please log in to get access.')
    );
  }

  // 2. Verify token
  // Using promisify so we can await it cleanly
  const decoded = await promisify(jwt.verify)(token, env.jwtSecret);

  // 3. Check if user still exists (in case they were deleted after token generation)
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      AppError.unauthorized('The user belonging to this token no longer exists.')
    );
  }

  // 4. Grant access to protected route
  // We attach the user to the request object so controllers have access to it
  req.user = currentUser;
  next();
});

module.exports = {
  protect,
};
