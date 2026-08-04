const pino = require('pino');
const pinoHttp = require('pino-http');

const isTest = process.env.NODE_ENV === 'test';

const logger = pino({
  level: isTest ? 'silent' : (process.env.LOG_LEVEL || 'info'),
  // Redact kredensial dari log HTTP (pino-http default serializer meng-output
  // headers lengkap — termasuk Authorization Bearer token & Cookie). Berjalan
  // SETELAH serializer (termasuk wrapRequestSerializer), jadi tetap efektif.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]'
    ],
    censor: '[Redacted]'
  }
});

const httpLogger = pinoHttp({
  logger,
  autoLogging: !isTest
});

module.exports = { logger, httpLogger };
