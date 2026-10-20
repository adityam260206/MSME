const { Parser } = require('json2csv');
const Transaction = require('../models/Transaction.model');

/**
 * Generate a CSV report of all transactions for a given month.
 */
async function generateMonthlyCSV(userId, period) {
  const [year, month] = period.split('-');
  const startDate = new Date(year, parseInt(month) - 1, 1);
  const endDate = new Date(year, parseInt(month), 0, 23, 59, 59, 999);

  // Fetch transactions and populate category names
  const transactions = await Transaction.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate }
  })
    .sort({ date: -1 })
    .populate('category', 'name type');

  if (transactions.length === 0) {
    return null;
  }

  // Format data for CSV
  const data = transactions.map(t => ({
    Date: t.date.toISOString().split('T')[0],
    Type: t.type.charAt(0).toUpperCase() + t.type.slice(1),
    Category: t.category ? t.category.name : 'Uncategorized',
    Description: t.description || '',
    Amount: t.amount,
  }));

  // Setup CSV parser fields
  const fields = ['Date', 'Type', 'Category', 'Description', 'Amount'];
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(data);

  return csv;
}

module.exports = {
  generateMonthlyCSV
};
