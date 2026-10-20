const authService = require('../services/auth.service');
const apiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
const register = catchAsync(async (req, res) => {
  const { user, token } = await authService.register(req.body);

  // Return 201 Created
  return apiResponse.success(
    res,
    { user, token },
    201
  );
});

/**
 * Log in a user
 * POST /api/v1/auth/login
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  
  const { user, token } = await authService.login(email, password);

  // Return 200 OK
  return apiResponse.success(res, { user, token });
});

/**
 * Get current user profile
 * GET /api/v1/auth/me
 * (Requires auth middleware)
 */
const getMe = catchAsync(async (req, res) => {
  // req.user is set by the auth.middleware
  const user = await authService.getProfile(req.user.id);
  
  return apiResponse.success(res, { user });
});

/**
 * Update user profile
 * PUT /api/v1/auth/profile
 * (Requires auth middleware)
 */
const updateProfile = catchAsync(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body);
  return apiResponse.success(res, { user });
});

/**
 * Verify user's current password
 * POST /api/v1/auth/verify-password
 * (Requires auth middleware)
 */
const verifyPassword = catchAsync(async (req, res) => {
  await authService.verifyPassword(req.user.id, req.body.password);
  return apiResponse.success(res, { verified: true });
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  verifyPassword,
};
