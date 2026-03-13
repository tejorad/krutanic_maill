'use strict';

const { Redis } = require('ioredis');
const logger = require('../utils/logger');

/**
 * Shared IORedis client.
 * maxRetriesPerRequest: null and enableReadyCheck: false are both
 * required by BullMQ — do not remove them.
 */
const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  keepAlive: 10000,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 100, 3000);
    logger.warn(`Redis reconnecting... attempt #${times}`);
    return delay;
  },
});

redisClient.on('connect', () => logger.info('Redis connected'));
redisClient.on('error', (err) => logger.error(`Redis error: ${err.message}`));

module.exports = redisClient;
