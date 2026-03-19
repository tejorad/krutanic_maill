'use strict';

const express = require('express');
const router = express.Router();
const SmtpAccount = require('../models/SmtpAccount');
const smtpRotator = require('../utils/smtpRotator');
const logger = require('../utils/logger');
const { encrypt } = require('../utils/cryptoUtils');

/**
 * GET /api/smtp
 * List all SMTP accounts
 */
router.get('/', async (req, res) => {
  try {
    const accounts = await SmtpAccount.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Alias for frontend */
router.get('/status', async (req, res) => {
  try {
    const accounts = await SmtpAccount.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/smtp
 * Add a new SMTP account
 */
router.post('/', async (req, res) => {
  try {
    const { email, app_password, daily_limit } = req.body;
    
    // Encrypt the password before storing it
    const encryptedPassword = encrypt(app_password);

    const account = await SmtpAccount.create({ 
      email, 
      app_password: encryptedPassword, 
      daily_limit: daily_limit || 500,
      userId: req.user.id
    });
    
    // Refresh the in-memory pool so the new account is immediately available for sending
    await smtpRotator.refreshPool();
    
    res.status(201).json({ success: true, data: account });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'Account already exists' });
    }
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/smtp/:id
 * Toggle enabled status or update details
 */
router.patch('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // If password is being updated, encrypt it
    if (updateData.app_password) {
      updateData.app_password = encrypt(updateData.app_password);
    }

    const account = await SmtpAccount.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: updateData }, 
      { new: true }
    );
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
    
    // Refresh pool in case enabled status or credentials changed
    await smtpRotator.refreshPool();
    
    res.json({ success: true, data: account });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/smtp/:id/check-reset
 * Check if 24h has passed since lastUsed; if so, reset sent_today to 0.
 */
router.post('/:id/check-reset', async (req, res) => {
  try {
    const account = await SmtpAccount.findOne({ _id: req.params.id, userId: req.user.id });
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    const now = new Date();
    const lastUsed = account.lastUsed;
    const hoursSinceLast = lastUsed ? (now - lastUsed) / (1000 * 60 * 60) : null;
    // Only eligible to reset if lastUsed exists AND 24h have passed
    const shouldReset = hoursSinceLast !== null && hoursSinceLast >= 24;
    const hoursRemaining = hoursSinceLast !== null ? Math.max(0, 24 - hoursSinceLast) : null;

    let wasReset = false;
    if (shouldReset && account.sent_today > 0) {
      account.sent_today = 0;
      account.status = 'active';
      await account.save();
      wasReset = true;
      logger.info(`[smtp] Reset sent_today for ${account.email} (${hoursSinceLast.toFixed(1)} hrs since last send)`);
    }

    res.json({
      success: true,
      data: account,
      reset: wasReset,
      eligible: shouldReset,
      lastUsed: lastUsed || null,
      hoursSinceLast: hoursSinceLast !== null ? parseFloat(hoursSinceLast.toFixed(2)) : null,
      hoursRemaining: hoursRemaining !== null ? parseFloat(hoursRemaining.toFixed(2)) : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const emailService = require('../services/emailService');
const templateEngine = require('../utils/templateEngine');

/**
 * POST /api/smtp/test-delivery
 * Send test emails from selected SMTPs to selected recipients.
 * Body: { smtpIds: ["id1", "id2"], testEmails: ["t1", "t2"] }
 */
router.post('/test-delivery', async (req, res) => {
  try {
    const { smtpIds, testEmails } = req.body;
    
    if (!smtpIds || !Array.isArray(smtpIds) || smtpIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Select at least one SMTP account.' });
    }
    if (!testEmails || !Array.isArray(testEmails) || testEmails.length === 0) {
      return res.status(400).json({ success: false, error: 'Enter at least one test email address.' });
    }

    const results = [];
    
    // We run this sequentially or with limited concurrency to avoid being flagged
    // Since it's a "test" with small numbers, sequential is fine for safety.
    for (const smtpId of smtpIds) {
      for (const recipient of testEmails) {
        try {
          // Generate a dummy context for the template
          const userId = req.user.id;
          const context = { name: 'Test User', ctaUrl: 'http://example.com' };
          const { subject, body } = templateEngine.generate(userId, context);
          
          await emailService.sendEmailWithSMTP(smtpId, recipient.trim(), `[TEST] ${subject}`, body, userId);
          
          results.push({ smtpId, recipient, status: 'success' });
        } catch (err) {
          results.push({ smtpId, recipient, status: 'failed', error: err.message });
        }
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/smtp/:id
 * Remove an SMTP account
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await SmtpAccount.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, error: 'Account not found' });
    
    // Refresh pool to remove the deleted account from memory
    await smtpRotator.refreshPool();
    
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
