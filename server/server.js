const env = require('./src/config/env');
const connectDB = require('./src/config/db');
const app = require('./src/app');

/**
 * Server entry point.
 *
 * Boot sequence:
 *   1. Connect to MongoDB (retries on failure)
 *   2. Start Express HTTP server
 *
 * Process-level safety nets:
 *   - uncaughtException  → log and exit (can't trust process state)
 *   - unhandledRejection → log and exit (treat as fatal in production)
 */

// ── Process Safety Nets ──────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  console.error('[fatal] Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[fatal] Unhandled Rejection:', reason);
  process.exit(1);
});

// ── Boot ─────────────────────────────────────────────────────────────

async function startServer() {
  // 1. Database
  await connectDB();

  // 1b. Run One-Time Migrations
  const migrateAccounts = require('./src/utils/migrateAccounts');
  await migrateAccounts();

  // 2. HTTP Server
  const server = app.listen(env.port, () => {
    console.log(`\n  SpendSense API`);
    console.log(`  ─────────────────────────────`);
    console.log(`  Environment : ${env.nodeEnv}`);
    console.log(`  Port        : ${env.port}`);
    console.log(`  Health      : http://localhost:${env.port}/api/health`);
    console.log(`  ─────────────────────────────\n`);
  });

  // 3. Background Jobs
  const initCronJobs = require('./src/config/cron');
  initCronJobs();

  // Graceful shutdown for HTTP server
  const shutdown = (signal) => {
    console.log(`\n[server] ${signal} received — shutting down…`);
    server.close(() => {
      console.log('[server] HTTP server closed');
      // MongoDB shutdown is handled by db.js SIGINT/SIGTERM handlers
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer();
