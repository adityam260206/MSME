const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const createCorsOptions = require('./config/cors');
const env = require('./config/env');
const AppError = require('./utils/AppError');
const errorMiddleware = require('./middleware/error.middleware');

/**
 * Express application factory.
 *
 * Middleware order matters:
 *   1. Security headers (helmet)
 *   2. CORS
 *   3. Request logging (morgan)
 *   4. Body parsing
 *   5. API routes
 *   6. 404 catch-all
 *   7. Global error handler (must be last)
 */
const app = express();

// ── Security ─────────────────────────────────────────────────────────

app.use(helmet());

// Limit requests from same IP to prevent brute force / DoS
const limiter = rateLimit({
  max: 5000, // Increased for development
  windowMs: 15 * 60 * 1000, // per 15 minutes
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again in 15 minutes.'
  }
});
app.use('/api', limiter);
app.use(cors(createCorsOptions()));

// ── Logging ──────────────────────────────────────────────────────────

if (env.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ── Body Parsing ─────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Health Check ─────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'SpendSense API is running',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

// ── API Routes ───────────────────────────────────────────────────────

const routes = require('./routes');
app.use('/api/v1', routes);

// ── 404 Catch-All ────────────────────────────────────────────────────

app.all('{*any}', (req, res, next) => {
  next(AppError.notFound(`Cannot find ${req.method} ${req.originalUrl}`));
});

// ── Global Error Handler (must be last) ──────────────────────────────

app.use(errorMiddleware);

module.exports = app;
