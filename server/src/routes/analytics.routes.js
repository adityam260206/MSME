const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth.middleware');
const { query } = require('express-validator');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

router.use(protect);

// Reusable validator for period query
const periodValidator = [
  query('period')
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('Period must be in YYYY-MM format')
];

router.get(
  '/summary',
  periodValidator,
  validate,
  analyticsController.getSummary
);

router.get(
  '/breakdown',
  periodValidator,
  validate,
  analyticsController.getBreakdown
);

router.get(
  '/trend',
  analyticsController.getTrend
);

router.get(
  '/health',
  analyticsController.getHealthScore
);

router.get(
  '/insights',
  analyticsController.getInsights
);

router.get(
  '/prediction',
  analyticsController.getPrediction
);

module.exports = router;
