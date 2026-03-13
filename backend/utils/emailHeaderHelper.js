'use strict';

/**
 * emailHeaderHelper.js
 * ====================
 * Utility to add and verify email authentication headers
 * Helps debug DKIM/SPF/DMARC issues
 */

const logger = require('../utils/logger');

/**
 * Add standard email headers for authentication
 * 
 * @param {Object} mailOptions - Nodemailer mail options
 * @param {Object} config - Authentication config
 * @returns {Object} - Updated mail options with headers
 */
function addAuthHeaders(mailOptions, config = {}) {
  const {
    domain = process.env.DKIM_DOMAIN || 'krutanic.org',
    selector = process.env.DKIM_SELECTOR || 'default',
    replyTo = process.env.REPLY_TO_EMAIL || null,
    unsubscribeUrl = null,
  } = config;

  // Initialize headers if not present
  if (!mailOptions.headers) {
    mailOptions.headers = {};
  }

  // Add Reply-To header
  if (replyTo) {
    mailOptions.headers['Reply-To'] = replyTo;
  }

  // Add List-Unsubscribe header for spam compliance
  if (unsubscribeUrl) {
    mailOptions.headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
    mailOptions.headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  // Add X-Mailer header (optional, helps with authentication checks)
  mailOptions.headers['X-Mailer'] = 'Krutanic Email System v1.0';

  // Add custom tracking headers (safe, non-spam)
  mailOptions.headers['X-Campaign'] = mailOptions.headers['X-Campaign'] || 'email-campaign';

  return mailOptions;
}

/**
 * Verify email headers for authentication
 * Useful for debugging authentication issues
 * 
 * @param {String} rawEmail - Raw email message
 * @returns {Object} - Authentication status
 */
function verifyAuthHeaders(rawEmail) {
  const authStatus = {
    dkim: 'unknown',
    spf: 'unknown',
    dmarc: 'unknown',
    headers: {},
  };

  if (!rawEmail) return authStatus;

  // Check for DKIM-Signature
  if (rawEmail.includes('DKIM-Signature:')) {
    authStatus.dkim = 'signed';
    authStatus.headers.dkimSignature = true;
  }

  // Check for SPF result in Authentication-Results
  if (rawEmail.includes('spf=pass')) {
    authStatus.spf = 'pass';
  } else if (rawEmail.includes('spf=fail')) {
    authStatus.spf = 'fail';
  } else if (rawEmail.includes('spf=softfail')) {
    authStatus.spf = 'softfail';
  }

  // Check for DMARC result
  if (rawEmail.includes('dmarc=pass')) {
    authStatus.dmarc = 'pass';
  } else if (rawEmail.includes('dmarc=fail')) {
    authStatus.dmarc = 'fail';
  }

  // Check for other important headers
  authStatus.headers.replyTo = rawEmail.includes('Reply-To:');
  authStatus.headers.listUnsubscribe = rawEmail.includes('List-Unsubscribe:');
  authStatus.headers.contentType = rawEmail.includes('Content-Type:');

  return authStatus;
}

/**
 * Log authentication status (for debugging)
 * 
 * @param {Object} authStatus - Authentication status object
 */
function logAuthStatus(authStatus) {
  logger.info('[Auth Headers]', {
    dkim: authStatus.dkim,
    spf: authStatus.spf,
    dmarc: authStatus.dmarc,
  });
}

/**
 * Generate DMARC record
 * 
 * @param {String} domain - Domain name
 * @param {String} reportEmail - Email for DMARC reports
 * @returns {String} - DMARC TXT record
 */
function generateDmarcRecord(domain = 'krutanic.org', reportEmail = null) {
  let record = `v=DMARC1; p=none; rua=mailto:${reportEmail || `dmarc-reports@${domain}`}`;
  
  // Optional: Add forensics report
  record += `; ruf=mailto:${reportEmail || `dmarc-reports@${domain}`}`;
  
  // Optional: Alignment (strict/relaxed)
  record += '; alig=relaxed';
  
  return record;
}

module.exports = {
  addAuthHeaders,
  verifyAuthHeaders,
  logAuthStatus,
  generateDmarcRecord,
};
