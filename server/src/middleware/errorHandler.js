const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let code = err.code || 'E_INTERNAL';
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError') {
    status = 400;
    code = 'E_VALIDATION';
    const first = Object.values(err.errors)[0];
    message = first ? first.message : 'Invalid input';
  } else if (err.name === 'CastError') {
    status = 400;
    code = 'E_CAST';
    message = 'Invalid identifier';
  } else if (err.code === 11000) {
    status = 409;
    code = 'E_DUPLICATE';
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `${field} already in use`;
  } else if (err.type === 'entity.too.large') {
    status = 413;
    code = 'E_TOO_LARGE';
    message = 'Request body too large';
  }

  if (status >= 500) {
    console.error(`[err][${req.id || '-'}]`, err);
  }

  const body = { error: { code, message, requestId: req.id } };
  if (!env.isProd && status >= 500) body.error.stack = err.stack;

  res.status(status).json(body);
}

function notFound(_req, _res, next) {
  next(ApiError.notFound('Route not found', 'E_ROUTE'));
}

module.exports = { errorHandler, notFound };
