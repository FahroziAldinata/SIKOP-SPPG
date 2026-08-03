const pino = require('pino');
const pinoHttp = require('pino-http');

const isTest = process.env.NODE_ENV === 'test';

const logger = pino({
  level: isTest ? 'silent' : (process.env.LOG_LEVEL || 'info')
});

const httpLogger = pinoHttp({
  logger,
  autoLogging: !isTest
});

module.exports = { logger, httpLogger };
