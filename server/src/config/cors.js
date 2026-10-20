const cors = require('cors');
const env = require('./env');

/**
 * CORS configuration.
 *
 * In development: allows the Vite dev server origin.
 * In production: restricts to the configured CLIENT_URL.
 *
 * Credentials are enabled so the browser sends cookies / auth headers.
 */
function createCorsOptions() {
  const whitelist = [env.clientUrl];

  return {
    origin(origin, callback) {
      // Allow requests with no origin (server-to-server, curl, Postman)
      if (!origin) return callback(null, true);

      if (whitelist.includes(origin)) {
        return callback(null, true);
      }

      // In dev, also allow localhost on any port
      if (env.isDev && origin.startsWith('http://localhost')) {
        return callback(null, true);
      }

      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // Cache preflight for 24h
  };
}

module.exports = createCorsOptions;
