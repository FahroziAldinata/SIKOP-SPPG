const { logger } = require('../lib/logger');

const errorHandler = (err, req, res, _next) => {
  logger.error(err);
  const isProd = process.env.NODE_ENV === 'production';
  const status = err.statusCode || 500;
  const message =
    isProd && status >= 500
      ? 'Terjadi kesalahan di server'
      : err.message || 'Terjadi kesalahan di server';

  res.status(status).json({ success: false, error: message });
};

module.exports = errorHandler;
