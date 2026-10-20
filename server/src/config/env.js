const dotenv = require('dotenv');
const path = require('path');

// Load .env from server root (one level up from src/config/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Environment configuration.
 *
 * Every environment variable the application needs is validated here.
 * No other module should read process.env directly — import this instead.
 *
 * Required variables throw on startup if missing (fail-fast).
 * Optional variables fall back to sensible defaults.
 */

// ── Helpers ──────────────────────────────────────────────────────────

function required(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[env] Missing required environment variable: ${key}\n` +
      `  → Copy .env.example to .env and fill in the values.`
    );
  }
  return value;
}

function optional(key, fallback) {
  return process.env[key] || fallback;
}

// ── Configuration ────────────────────────────────────────────────────

const env = Object.freeze({
  // Server
  port: parseInt(optional('PORT', '5000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),

  // Database
  mongodbUri: required('MONGODB_URI'),

  // Authentication
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),

  // Client
  clientUrl: optional('CLIENT_URL', 'http://localhost:5173'),

  // Derived
  get isDev() {
    return this.nodeEnv === 'development';
  },
  get isProd() {
    return this.nodeEnv === 'production';
  },
});

module.exports = env;
