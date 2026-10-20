const cron = require('node-cron');
const recurringService = require('../services/recurring.service');

function initCronJobs() {
  console.log('[cron] Initializing scheduled background jobs...');

  // Run every day at midnight (00:00 server time)
  cron.schedule('0 0 * * *', async () => {
    try {
      await recurringService.processDueTransactions();
    } catch (err) {
      console.error('[cron] Unhandled error during recurring transaction processing:', err);
    }
  });
  
  // For development testing, it can be useful to run processDueTransactions 
  // right at startup to process any that were missed while server was offline.
  // We'll run it once asynchronously after startup without blocking.
  setTimeout(async () => {
    try {
      await recurringService.processDueTransactions();
    } catch (err) {
      console.error('[cron] Error during initial startup run:', err);
    }
  }, 5000); // Wait 5s for DB to be fully ready and app to start
}

module.exports = initCronJobs;
