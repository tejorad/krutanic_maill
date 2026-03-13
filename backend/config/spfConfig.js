'use strict';

/**
 * spfConfig.js
 * =============
 * SPF (Sender Policy Framework) Configuration
 * 
 * SPF is a DNS record that specifies which mail servers are authorized
 * to send emails on behalf of your domain.
 * 
 * This file documents the SPF records needed for your email marketing setup.
 */

const logger = require('../utils/logger');

/**
 * Generate SPF record recommendations based on email infrastructure
 */
function generateSpfRecords() {
  const spfRecords = {
    domain: process.env.SPF_DOMAIN || 'krutanic.org',
    records: [
      // Gmail SMTP (for this application)
      'v=spf1 include:sendgrid.net ~all',
      // Alternative: Using Gmail's authorized servers
      'v=spf1 include:_spf.google.com ~all',
      // Full recommended SPF (includes multiple services)
      'v=spf1 ip4:YOUR_IP_ADDRESS include:sendgrid.net include:_spf.google.com ~all',
    ],
    notes: {
      'v=spf1': 'SPF version',
      'include:_spf.google.com': 'Authorizes Gmail/Google Workspace SMTP servers',
      'include:sendgrid.net': 'If using SendGrid (optional)',
      'ip4:': 'Authorize specific IP address of your mail server',
      '~all': 'Soft fail (recommended) - allows non-authorized servers to pass',
      '-all': 'Hard fail - rejects non-authorized servers (use with caution)',
    },
    instructions: {
      step1: 'Log into your DNS provider (GoDaddy, Route53, Cloudflare, etc.)',
      step2: 'Find TXT Records section',
      step3: 'Add a new TXT record with:',
      step3a: 'Name: @ (or your domain)',
      step3b: 'Value: v=spf1 include:_spf.google.com ~all',
      step4: 'Save and wait 24-48 hours for DNS propagation',
      step5: 'Verify with SPF checkers (like mxtoolbox.com)',
    },
  };

  return spfRecords;
}

/**
 * Get SPF configuration
 */
function getSpfConfig() {
  const domain = process.env.SPF_DOMAIN || 'krutanic.org';
  const useHardFail = process.env.SPF_HARD_FAIL === 'true';
  
  return {
    domain,
    failPolicy: useHardFail ? '-all' : '~all',
    recommendedRecord: `v=spf1 include:_spf.google.com ~all`,
    domain_info: `For domain: ${domain}`,
  };
}

logger.info('[SPF] Configuration loaded');

module.exports = {
  generateSpfRecords,
  getSpfConfig,
};
