const rateLimit = require('express-rate-limit');
const env = require('../config/env');

function makeLimiter({ windowMs, max, code, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Skip entirely in development so local testing isn't throttled.
    skip: () => !env.isProd,
    handler: (_req, res) => {
      res.status(429).json({ error: { code, message } });
    },
  });
}

// 30 attempts per 15 min — blocks credential-stuffing without blocking
// a forgetful user.
const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  code: 'E_RATE_LIMIT_AUTH',
  message: 'Too many attempts. Try again in a few minutes.',
});

// Higher limit on general API for normal CRUD use.
const apiLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 120,
  code: 'E_RATE_LIMIT',
  message: 'You are doing that too often. Slow down a bit.',
});

module.exports = { authLimiter, apiLimiter };
