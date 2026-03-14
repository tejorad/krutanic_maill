const nodemailer = require('nodemailer');
const SmtpAccount = require('../models/SmtpAccount');
const logger = require('./logger');

let pool = [];
// We'll use a Map to track cursors per user
const userCursors = new Map();

/**
 * Initialize or refresh the SMTP pool from the database.
 * Only loads accounts where enabled = true.
 */
async function refreshPool() {
  try {
    const accounts = await SmtpAccount.find({ enabled: true });

    // Close old transporters
    pool.forEach(entry => {
      if (entry.transporter) entry.transporter.close();
    });

    pool = accounts
      .filter(acc => acc.userId) // Safety: Skip accounts without a userId
      .map((acc) => ({
        id: acc._id,
        userId: acc.userId.toString(),
      email: acc.email,
      daily_limit: acc.daily_limit,
      sent_today: acc.sent_today,
      from: `Krutanic <${acc.email}>`,
      active: acc.status === 'active',
      failureCount: 0,
      transporter: nodemailer.createTransport({
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: acc.email,
          pass: acc.app_password,
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      }),
    }));

    userCursors.clear();
    logger.info(`[smtpRotator] Pool refreshed with ${pool.length} enabled accounts.`);
  } catch (err) {
    logger.error(`[smtpRotator] Failed to refresh pool: ${err.message}`);
  }
}

/** Returns only healthy accounts for a specific user */
function activePool(userId) {
  return pool.filter((e) => e.active && e.userId === userId);
}

/**
 * Pick the next healthy account (round-robin) for a specific user.
 */
function next(userId) {
  const userAlive = activePool(userId).filter(e => e.sent_today < e.daily_limit);

  if (userAlive.length === 0) {
    throw new Error('[smtpRotator] No active SMTP accounts available for this user. Please check limits or enable accounts in dashboard.');
  }

  let cursor = userCursors.get(userId) || 0;
  const entry = userAlive[cursor % userAlive.length];
  
  // Update cursor for this user
  userCursors.set(userId, (cursor + 1) % userAlive.length);

  return {
    transporter: entry.transporter,
    email: entry.email,
    from: entry.from,
    id: entry.id,
    increment: async () => {
      entry.sent_today += 1;
      await SmtpAccount.findByIdAndUpdate(entry.id, {
        $inc: { sent_today: 1 },
        $set: { lastUsed: new Date() }
      }).catch(() => { });
    }
  };
}

const MAX_FAILURES = 5;

function recordFailure(id) {
  const entry = pool.find(e => e.id.toString() === id.toString());
  if (!entry) return;
  entry.failureCount += 1;
  if (entry.failureCount >= MAX_FAILURES) {
    entry.active = false;
    SmtpAccount.findByIdAndUpdate(id, { status: 'error' }).catch(() => { });
    logger.warn(`[smtpRotator] Account ${entry.email} deactivated after ${MAX_FAILURES} failures.`);
  }
}

function resetFailures() {
  pool.forEach((e) => { e.failureCount = 0; e.active = true; });
  logger.info('[smtpRotator] All SMTP accounts reactivated in memory.');
}

/** 
 * Get a specific account from the pool for targeted testing.
 * Targeted testing usually implies the user already knows which one they want.
 */
function getById(id, userId) {
  const userIdStr = userId.toString();
  const entry = pool.find(e => e.id.toString() === id.toString() && e.userId === userIdStr);
  if (!entry) return null;
  
  return {
    transporter: entry.transporter,
    email: entry.email,
    from: entry.from,
    id: entry.id,
    increment: async () => {
      entry.sent_today += 1;
      await SmtpAccount.findByIdAndUpdate(entry.id, {
        $inc: { sent_today: 1 },
        $set: { lastUsed: new Date() }
      }).catch(() => { });
    }
  };
}

/** Returns the count of active/healthy SMTP accounts for a user */
function getActiveCount(userId) {
  const uId = userId.toString();
  return activePool(uId).length;
}

module.exports = { next, getById, getActiveCount, recordFailure, resetFailures, refreshPool };
