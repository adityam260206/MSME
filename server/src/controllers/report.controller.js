const reportService = require('../services/report.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Download Monthly CSV
 * GET /api/v1/reports/csv?period=YYYY-MM
 */
const downloadCSV = catchAsync(async (req, res) => {
  const { period } = req.query;
  
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    throw AppError.badRequest('A valid period (YYYY-MM) is required.');
  }

  const csv = await reportService.generateMonthlyCSV(req.user.id, period);

  if (!csv) {
    throw AppError.notFound(`No transactions found for ${period}.`);
  }

  // Set headers to trigger file download in browser
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=SpendSense_${period}.csv`);
  
  return res.status(200).send(csv);
});

module.exports = {
  downloadCSV
};
