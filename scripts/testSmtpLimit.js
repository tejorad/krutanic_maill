'use strict';

const emailService = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * Test SMTP Limit Script
 * =======================
 * Sends emails in a loop to a test recipient until the limit is hit.
 * This helps determine the actual sending limit for your Gmail account(s).
 *
 * Usage:
 *   node scripts/testSmtpLimit.js
 *
 * WARNING:
 * - Use a test email you control (e.g., your own).
 * - This will consume your daily SMTP quota.
 * - Run in small batches to avoid permanent blocks.
 * - Monitor logs for errors.
 */

require('dotenv').config();

const TEST_RECIPIENT = process.env.TEST_EMAIL || 'your-test-email@example.com'; // Replace with your test email
const DELAY_MS = 1000; // 1 second delay between sends to avoid rapid throttling

async function testLimit() {
  let sentCount = 0;
  let lastError = null;

  logger.info(`[testLimit] Starting SMTP limit test. Sending to ${TEST_RECIPIENT}`);

  while (true) {
    try {
      await emailService.sendEmail(
        TEST_RECIPIENT,
        `Test Email ${sentCount + 1}`,
        `This is test email number ${sentCount + 1} to check SMTP limits.`
      );
      sentCount++;
      logger.info(`[testLimit] Sent ${sentCount} emails successfully.`);

      // Optional: Add delay to simulate real usage and avoid instant throttling
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));

    } catch (err) {
      lastError = err.message;
      logger.error(`[testLimit] Send failed at ${sentCount + 1} emails: ${lastError}`);

      // Check for common rate limit or quota errors
      if (lastError.includes('quota') || lastError.includes('limit') || lastError.includes('exceeded') ||
          lastError.includes('daily') || err.responseCode === 550 || err.responseCode === 421) {
        logger.info(`[testLimit] Likely hit limit at ${sentCount} successful sends.`);
        break;
      }

      // If it's a temporary error, wait longer and retry
      if (err.responseCode === 421 || lastError.includes('temporary')) {
        logger.warn(`[testLimit] Temporary error, waiting 30s before retry...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
        continue;
      }

      // For other errors, stop
      break;
    }
  }

  logger.info(`[testLimit] Test complete. Total successful sends: ${sentCount}`);
  if (lastError) {
    logger.info(`[testLimit] Last error: ${lastError}`);
  }
  logger.info(`[testLimit] This suggests your Gmail account limit is around ${sentCount} emails per day.`);

  process.exit(0);
}

testLimit().catch(err => {
  logger.error(`[testLimit] Unexpected error: ${err.message}`);
  process.exit(1);
});