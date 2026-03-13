'use strict';

const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || './logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * Winston Logger
 * --------------
 * - Console output with colourisation in development
 * - Daily rotating log files for both combined and error logs
 * - Log files rotate every day and are kept for 14 days
 */

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const transports = [];

// Only use file logging if NOT on Vercel (read-only filesystem)
if (!process.env.VERCEL) {
  transports.push(
    new winston.transports.DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      level: LOG_LEVEL,
      zippedArchive: true,
    })
  );
  transports.push(
    new winston.transports.DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      level: 'error',
      zippedArchive: true,
    })
  );
}

// Always enable console logging on Vercel or in development
if (process.env.VERCEL || process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    })
  );
} else {
  // Production (non-Vercel) - also log to console but without colors if needed
  // (usually winston handles console fine, but let's be explicit)
  transports.push(new winston.transports.Console());
}

const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: combine(errors({ stack: true }), timestamp(), logFormat),
  transports,
  exitOnError: false,
});

module.exports = logger;
