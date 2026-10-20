const analyticsService = require('../services/analytics.service');
const apiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

/**
 * Get monthly summary metrics
 * GET /api/v1/analytics/summary?period=YYYY-MM
 */
const getSummary = catchAsync(async (req, res) => {
  const period = req.query.period || getCurrentPeriod();
  const summary = await analyticsService.getMonthlySummary(req.user.id, period);
  return apiResponse.success(res, summary);
});

/**
 * Get spending breakdown by category
 * GET /api/v1/analytics/breakdown?period=YYYY-MM
 */
const getBreakdown = catchAsync(async (req, res) => {
  const period = req.query.period || getCurrentPeriod();
  const accountId = req.query.accountId;
  const breakdown = await analyticsService.getCategoryBreakdown(req.user.id, period, accountId);
  return apiResponse.success(res, { period, breakdown });
});

/**
 * Get 6-month historical trend
 * GET /api/v1/analytics/trend
 */
const getTrend = catchAsync(async (req, res) => {
  const trend = await analyticsService.getSixMonthTrend(req.user.id);
  return apiResponse.success(res, { trend });
});

// Helper for defaulting to current month
/**
 * Get financial health score
 * GET /api/v1/analytics/health
 */
const getHealthScore = catchAsync(async (req, res) => {
  const health = await analyticsService.getFinancialHealth(req.user.id);
  return apiResponse.success(res, health);
});

/**
 * Get spending insights
 * GET /api/v1/analytics/insights
 */
const getInsights = catchAsync(async (req, res) => {
  const insights = await analyticsService.getSpendingInsights(req.user.id);
  return apiResponse.success(res, insights);
});

// Helper for defaulting to current month
function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get spending prediction for next month
 * GET /api/v1/analytics/prediction
 */
const getPrediction = catchAsync(async (req, res) => {
  const prediction = await analyticsService.getSpendingPrediction(req.user.id);
  return apiResponse.success(res, prediction);
});

module.exports = {
  getSummary,
  getBreakdown,
  getTrend,
  getHealthScore,
  getInsights,
  getPrediction
};
