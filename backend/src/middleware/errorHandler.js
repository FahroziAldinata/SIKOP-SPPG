const { logger } = require('../lib/logger');

const errorHandler = (err, req, res, _next) => {
  logger.error(err);
  res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Terjadi kesalahan di server' });
};

module.exports = errorHandler;
