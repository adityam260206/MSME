const express = require('express');
const authRoutes = require('./auth.routes');

const router = express.Router();

/**
 * API Route Aggregator
 * 
 * All feature routes are mounted here. This file is then
 * mounted at /api/v1 in app.js.
 */

const categoryRoutes = require('./category.routes');
const transactionRoutes = require('./transaction.routes');
const budgetRoutes = require('./budget.routes');
const analyticsRoutes = require('./analytics.routes');
const goalRoutes = require('./goal.routes');
const recurringRoutes = require('./recurring.routes');
const reportRoutes = require('./report.routes');
const aiRoutes = require('./ai.routes');
const accountRoutes = require('./account.routes');

router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/categories', categoryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/budgets', budgetRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/goals', goalRoutes);
router.use('/recurring', recurringRoutes);
router.use('/reports', reportRoutes);
router.use('/ai', aiRoutes);
// router.use('/categories', categoryRoutes);
// router.use('/transactions', transactionRoutes);
// router.use('/budgets', budgetRoutes);
// router.use('/analytics', analyticsRoutes);

module.exports = router;
