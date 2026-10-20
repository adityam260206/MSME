const mongoose = require('mongoose');
const env = require('./env');

/**
 * MongoDB connection manager.
 *
 * Features:
 *  - Automatic retry with exponential backoff (up to 5 attempts)
 *  - Connection event logging for observability
 *  - Graceful shutdown on SIGINT / SIGTERM
 */

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;

/**
 * Connect to MongoDB with retry logic.
 * @returns {Promise<void>}
 */
async function connectDB() {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      attempt++;

      if (env.isDev) {
        console.log(`[db] Connecting to MongoDB (attempt ${attempt}/${MAX_RETRIES})…`);
      }

      await mongoose.connect(env.mongodbUri);
      console.log(`[db] Connected to MongoDB — ${mongoose.connection.name}`);
      return;
    } catch (err) {
      console.error(`[db] Connection failed: ${err.message}`);

      if (attempt >= MAX_RETRIES) {
        console.error('[db] Max retries reached. Exiting.');
        process.exit(1);
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[db] Retrying in ${delay / 1000}s…`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// ── Connection Events ────────────────────────────────────────────────

mongoose.connection.on('disconnected', () => {
  console.warn('[db] MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error(`[db] MongoDB error: ${err.message}`);
});

mongoose.connection.on('reconnected', () => {
  console.log('[db] MongoDB reconnected');
});

// ── Graceful Shutdown ────────────────────────────────────────────────

async function gracefulShutdown(signal) {
  console.log(`\n[db] ${signal} received — closing MongoDB connection…`);
  await mongoose.connection.close();
  console.log('[db] MongoDB connection closed');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = connectDB;
