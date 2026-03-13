'use strict';

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * smtpAccounts.js — Phase 4
 * -------------------------
 * Stores 150 Gmail SMTP accounts with usage tracking.
 */
const ACCOUNTS = [
  { 
    email: 'abdul@krutanic.org', 
    app_password: 'jotq lwmp jfuu fuye', 
    daily_limit: 500, 
    sent_today: 0 
  },
];

/**
 * Build a pooled Nodemailer transporter for each Gmail account.
 * We attach the limit and counter to the pool object for the rotator to reference.
 */
const smtpPool = ACCOUNTS.map((acc, index) => ({
  index,
  email: acc.email,
  daily_limit: acc.daily_limit,
  sent_today: acc.sent_today,
  // use a fixed sender name instead of generic "Sender 1", etc.
  // previously: `Sender ${index + 1} <${acc.email}>`
  from: `Krutanic <${acc.email}>`,
  transporter: nodemailer.createTransport({
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: acc.email,
      pass: acc.app_password,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  }),
}));

logger.info(`SMTP pool initialised with ${smtpPool.length} accounts (Phase 4)`);

module.exports = smtpPool;
