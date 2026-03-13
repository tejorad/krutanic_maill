'use strict';

/**
 * dkimSigner.js
 * ==============
 * Utility to sign emails with DKIM before sending
 */

const dkimSigner = require('dkim-signer');
const logger = require('../utils/logger');
const dkimConfig = require('../config/dkimConfig');

/**
 * Sign email content with DKIM
 * 
 * @param {Object} mailOptions - Nodemailer mail options
 * @param {String} domain - Domain for DKIM signing
 * @returns {Promise<Object>} - DKIM signed email
 */
async function signEmailWithDkim(mailOptions, domain = 'krutanic.org') {
  try {
    const config = dkimConfig.getDkimConfig(domain);

    if (!config) {
      logger.warn(`[DKIM] No DKIM configuration found for domain: ${domain}. Sending without DKIM.`);
      return mailOptions;
    }

    // Use dkim-signer to add DKIM-Signature header
    const signedEmail = dkimSigner.sign(mailOptions, {
      privateKey: config.privateKey,
      domainName: config.domain,
      keySelector: config.selector,
      headerFieldNames: 'from:to:subject:date',
    });

    logger.debug(`[DKIM] Email signed for domain: ${domain}`);
    return signedEmail;
  } catch (err) {
    logger.error(`[DKIM] Failed to sign email: ${err.message}`);
    // Return original email if signing fails (don't block sending)
    return mailOptions;
  }
}

/**
 * Validate DKIM setup availability
 * 
 * @returns {Boolean} - True if DKIM is configured
 */
function isDkimConfigured() {
  const config = dkimConfig.getAllDkimConfigs();
  return config !== null && Object.keys(config).length > 0;
}

module.exports = {
  signEmailWithDkim,
  isDkimConfigured,
};
