'use strict';

const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const EmailLog = require('../models/EmailLog');
const emailService = require('../services/emailService');
const templateEngine = require('../utils/templateEngine');
const logger = require('../utils/logger');
const campaignState = require('../utils/campaignState');

const Campaign = require('../models/Campaign');

/**
 * GET /api/leads/campaigns
 * List all campaigns
 */
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await Campaign.find({ userId: req.user.id }).sort({ name: 1 });
    res.json({ success: true, data: campaigns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
/**
 * POST /api/leads/campaigns
 * Explicitly create a new campaign
 */
router.post('/campaigns', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Campaign name is required' });
    
    const campaign = await Campaign.findOneAndUpdate(
      { name: name.toLowerCase().trim(), userId: req.user.id },
      { $setOnInsert: { name: name.toLowerCase().trim(), userId: req.user.id } },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/leads/campaigns/:name
 * Delete a campaign and ALL its leads
 */
router.delete('/campaigns/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name).toLowerCase().trim();
    const [campaignResult, leadsResult] = await Promise.all([
      Campaign.deleteOne({ name, userId: req.user.id }),
      Lead.deleteMany({ campaign: name, userId: req.user.id }),
    ]);
    logger.info(`[leadRoutes] Deleted campaign "${name}": ${leadsResult.deletedCount} leads removed.`);
    res.json({
      success: true,
      message: `Campaign "${name}" deleted.`,
      leadsDeleted: leadsResult.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.get('/stats', async (req, res) => {
  try {
    const { campaign } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = { status: 'active', userId: req.user.id };
    const logQuery = { createdAt: { $gte: today }, userId: req.user.id };
    const openedQuery = { createdAt: { $gte: today }, userId: req.user.id, status: { $in: ['opened', 'clicked'] } };
    const clickedQuery = { createdAt: { $gte: today }, userId: req.user.id, status: 'clicked' };

    if (campaign && campaign !== 'all') {
      query.campaign = campaign.toLowerCase().trim();
      // For logs, it's tricky since they don't have campaign field yet. 
      // Ideally, we'd add campaign to EmailLog too.
    }

    const [totalLeads, sentToday, totalOpened, totalClicked] = await Promise.all([
      Lead.countDocuments(query),
      EmailLog.countDocuments(logQuery),
      EmailLog.countDocuments(openedQuery),
      EmailLog.countDocuments(clickedQuery)
    ]);

    const openRate = sentToday > 0 ? ((totalOpened / sentToday) * 100).toFixed(1) : 0;
    const clickRate = sentToday > 0 ? ((totalClicked / sentToday) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        totalLeads,
        sentToday,
        openRate,
        clickRate,
        delivered: Math.max(0, sentToday), // In this system, 'sent' implies attempt at delivery
        bounced: 0
      }
    });
  } catch (err) {
    logger.error(`[leadRoutes] stats error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

const SmtpAccount = require('../models/SmtpAccount');
const smtpRotator = require('../utils/smtpRotator');

/**
 * GET /api/leads/logs
 * Returns email delivery logs from today only
 */
router.get('/logs', async (req, res) => {
  try {
    const logs = await EmailLog.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(1000);
      
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/leads/logs
 * Clears all delivery logs
 */
router.delete('/logs', async (req, res) => {
  try {
    await EmailLog.deleteMany({ userId: req.user.id });
    res.json({ success: true, message: 'Logs cleared successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/leads
 * Add a single email address
 *
 * Body: { "email": "someone@example.com" }
 */
router.post('/', async (req, res) => {
  try {
    const lead = await Lead.create({ email: req.body.email, userId: req.user.id });
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'Email already exists' });
    }
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/leads/bulk
 * Import an array of email addresses — duplicates are silently skipped.
 *
 * Body: ["a@example.com", "b@example.com", ...]
 */
router.post('/bulk', async (req, res) => {
  try {
    const { emails, campaign } = req.body;
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, error: 'Body must be a non-empty array of email strings' });
    }
    if (!campaign) {
      return res.status(400).json({ success: false, error: 'Campaign selection is required' });
    }

    const campaignLower = campaign.toLowerCase().trim();

    // Ensure campaign exists for this user
    await Campaign.updateOne(
      { name: campaignLower, userId: req.user.id },
      { $setOnInsert: { name: campaignLower, userId: req.user.id } },
      { upsert: true }
    );

    const ops = emails.map((email) => ({
      updateOne: {
        filter: { email: email.toLowerCase().trim(), campaign: campaignLower, userId: req.user.id },
        update: { $setOnInsert: { email: email.toLowerCase().trim(), campaign: campaignLower, userId: req.user.id } },
        upsert: true,
      },
    }));

    const result = await Lead.bulkWrite(ops, { ordered: false });
    res.json({
      success: true,
      inserted: result.upsertedCount,
      skipped: emails.length - result.upsertedCount,
      total: emails.length,
    });
  } catch (err) {
    logger.error(`[leadRoutes] bulk error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/leads
 * List all stored email addresses (paginated).
 *
 * Query params: ?page=1&limit=100
 */
router.get('/', async (req, res) => {
  try {
    const { campaign } = req.query;
    const page  = parseInt(req.query.page,  10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip  = (page - 1) * limit;

    const query = { userId: req.user.id };
    if (campaign && campaign !== 'all') {
      query.campaign = campaign.toLowerCase().trim();
    }

    const [leads, total] = await Promise.all([
      Lead.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      Lead.countDocuments(query),
    ]);

    res.json({ success: true, data: leads, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/leads/:id
 * Remove a lead by MongoDB ID
 */
router.delete('/:id', async (req, res) => {
  try {
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/leads/send
 * Trigger a background send process for active leads.
 */
router.post('/send', async (req, res) => {
  try {
    const { campaign } = req.body;
    if (!campaign) {
      return res.status(400).json({ success: false, error: 'Campaign selection is required' });
    }

    if ((await campaignState.getStatus(req.user.id)).isRunning) {
      return res.status(409).json({ success: false, error: 'A campaign is already running for your account. Stop it first.' });
    }

    const query = { status: 'active', campaign: campaign.toLowerCase().trim(), userId: req.user.id };
    const leads = await Lead.find(query).select('email').lean();
    
    if (leads.length === 0) {
      return res.status(400).json({ success: false, error: `No active leads for campaign: ${campaign}` });
    }

    // Refresh SMTP pool from DB before starting
    await smtpRotator.refreshPool();

    // Start campaign state tracking for this user
    await campaignState.start(req.user.id, campaign, leads.length);

    const userId = req.user.id;

    // Trigger sending in the background (Non-blocking)
    process.nextTick(async () => {
      logger.info(`[api] Starting background delivery for ${leads.length} leads in "${campaign}"...`);
      for (let i = 0; i < leads.length; i++) {
        // Check if stopped by user each iteration
        const currentStatus = await campaignState.getStatus(userId);
        if (!currentStatus.isRunning) {
          logger.info(`[api] Campaign "${campaign}" stopped by user ${userId} at ${i} / ${leads.length} leads.`);
          break;
        }

        const lead = leads[i];
        try {
          const { subject, body } = templateEngine.generate(userId, lead);
          await emailService.sendEmail(lead.email, subject, body, userId);
          await campaignState.increment(userId);
        } catch (err) {
          logger.error(`[api] Background send failed for ${lead.email}: ${err.message}`);
        }
        
        // 200ms delay = 5 emails per second
        if (i < leads.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Mark complete if it ran to the end (not stopped)
      const finalStatus = await campaignState.getStatus(userId);
      if (finalStatus.isRunning) {
        await campaignState.stop(userId, false);
      }
      const lastStatus = await campaignState.getStatus(userId);
      logger.info(`[api] Campaign "${campaign}" finished for user ${userId}. Sent: ${lastStatus.sentCount} / ${leads.length}`);
    });

    res.json({ success: true, count: leads.length, message: 'Delivery started in background' });
  } catch (err) {
    logger.error(`[leadRoutes] send error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/leads/stop
 * Stop the currently running campaign.
 */
router.post('/stop', async (req, res, next) => {
  try {
    const status = await campaignState.getStatus(req.user.id);
    if (!status.isRunning) {
      return res.status(400).json({ success: false, error: 'No campaign is currently running.' });
    }
    await campaignState.stop(req.user.id, true);
    logger.info(`[api] Campaign "${status.campaign}" stop requested by user ${req.user.id}.`);
    res.json({ success: true, message: `Campaign "${status.campaign}" is being stopped.` });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/leads/campaign-status
 * Returns the current campaign run state for live UI polling.
 */
router.get('/campaign-status', async (req, res, next) => {
  try {
    res.json({ success: true, data: await campaignState.getStatus(req.user.id) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
