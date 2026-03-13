'use strict';

/**
 * dkimConfig.js
 * ==============
 * DKIM (DomainKeys Identified Mail) Configuration
 * 
 * Configures DKIM signing for outgoing emails to improve deliverability.
 * DKIM adds a cryptographic signature to your emails to verify authenticity.
 */

const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Load DKIM private keys from environment variables or files
 * Format: base64-encoded private keys or file paths
 * 
 * Environment variables expected:
 * - DKIM_PRIVATE_KEY: Raw private key or path to key file
 * - DKIM_DOMAIN: Domain used for signing (e.g., "krutanic.org")
 * - DKIM_SELECTOR: DKIM selector (e.g., "default", "mail", "selector1")
 */
function loadDkimKeys() {
  const dkimConfigs = {};

  // Check if DKIM_PRIVATE_KEY is provided
  const privateKeyEnv = process.env.DKIM_PRIVATE_KEY;
  const domain = process.env.DKIM_DOMAIN || 'krutanic.org';
  const selector = process.env.DKIM_SELECTOR || 'default';

  if (!privateKeyEnv) {
    logger.warn('[DKIM] No DKIM_PRIVATE_KEY found in environment. DKIM signing disabled.');
    return null;
  }

  try {
    let privateKey;

    // Check if it's a file path or raw key
    if (privateKeyEnv.includes('BEGIN RSA PRIVATE KEY') || privateKeyEnv.includes('BEGIN PRIVATE KEY')) {
      // It's a raw key
      privateKey = privateKeyEnv;
    } else if (fs.existsSync(privateKeyEnv)) {
      // It's a file path
      privateKey = fs.readFileSync(privateKeyEnv, 'utf-8');
    } else {
      // Try to decode from base64
      try {
        privateKey = Buffer.from(privateKeyEnv, 'base64').toString('utf-8');
      } catch (e) {
        throw new Error('DKIM_PRIVATE_KEY is neither a valid key, file path, nor valid base64');
      }
    }

    dkimConfigs[domain] = {
      domain: domain,
      selector: selector,
      privateKey: privateKey.trim(),
    };

    logger.info(`[DKIM] Configured for domain: ${domain} (selector: ${selector})`);
    return dkimConfigs;
  } catch (err) {
    logger.error(`[DKIM] Failed to load DKIM key: ${err.message}`);
    return null;
  }
}

/**
 * Get DKIM configuration for a specific domain
 */
function getDkimConfig(domain = 'krutanic.org') {
  const configs = loadDkimKeys();
  return configs ? configs[domain] : null;
}

/**
 * Get all configured DKIM settings
 */
function getAllDkimConfigs() {
  return loadDkimKeys();
}

module.exports = {
  loadDkimKeys,
  getDkimConfig,
  getAllDkimConfigs,
};
