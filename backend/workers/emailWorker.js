'use strict';

const { Worker } = require('bullmq');
const redisClient = require('../config/redis');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * Email Worker
 * ============
 * Pulls jobs from the email queue and calls emailService.send().
 *
 * Scaling guide:
 *   WORKER_CONCURRENCY=50  →  ~50 parallel sends per process
 *   Run 4 worker processes (PM2 cluster) → 200 parallel sends
 *   200 sends × 1,000 emails/hr per SMTP account ≈ 200,000 emails/day
 *
 * Start separately from the API:
 *   node workers/emailWorker.js
 */

require('dotenv').config();

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY, 10) || 50;
const QUEUE_NAME  = process.env.QUEUE_NAME || 'email-queue';

const Lead = require('../models/Lead');
const templateEngine = require('../utils/templateEngine');

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { email } = job.data;

    // 1. Fetch lead from database
    const lead = await Lead.findOne({ email }).lean();
    if (!lead) {
      throw new Error(`Lead with email ${email} not found in database.`);
    }

    // 2. Generate dynamic email content
    const { subject, body } = templateEngine.generate(lead.userId, lead);

    // 3 & 4. Get SMTP account from rotator and send email
    const result = await emailService.sendEmail(lead.email, subject, body, lead.userId);

    // 5. Update logs (already handled inside sendEmail and via job lifecycle)
    // 6. Retry if failure occurs (handled automatically by BullMQ configuration)
    
    return result;
  },
  {
    connection: redisClient,
    concurrency: CONCURRENCY,
    limiter: {
      max: 10,
      duration: 1000,
    },
    stalledInterval: 30_000,
    maxStalledCount: 2,
  }
);

worker.on('ready', () =>
  logger.info(`[worker] ready — concurrency: ${CONCURRENCY}`)
);
worker.on('failed', (job, err) =>
  logger.error(`[worker] job ${job?.id} failed: ${err.message}`)
);
worker.on('error', (err) =>
  logger.error(`[worker] error: ${err.message}`)
);

// Graceful shutdown
async function shutdown() {
  logger.info('[worker] shutting down...');
  await worker.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = worker;
