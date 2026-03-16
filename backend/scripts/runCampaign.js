require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Lead = require('../models/Lead');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const templateEngine = require('../utils/templateEngine');

/**
 * Campaign Runner Script (V2 — Redis-Free)
 * ========================================
 * Manually trigger a bulk email campaign via terminal.
 * 
 * Logic:
 * 1. Fetch active leads from DB.
 * 2. Loop through leads with a 200ms delay (5 emails/sec).
 * 3. Generate dynamic content JIT.
 * 4. Send directly using emailService.
 */

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runCampaign() {
  try {
    // Initialize DB connection
    await connectDB();
    logger.info('[runner] Database connected. Starting campaign (Sequential Mode)...');

    // 0. Fetch a default user for logging (since this is CLI)
    const User = require('../models/User');
    const defaultUser = await User.findOne();
    if (!defaultUser) {
      logger.error('[runner] No users found in DB. Cannot track emails. Please create a user first.');
      process.exit(1);
    }
    const userId = defaultUser._id;

    // 1. Fetch all active leads
    const activeLeads = await Lead.find({ status: 'active' }).select('email').lean();
    
    const totalLeads = activeLeads.length;
    if (totalLeads === 0) {
      logger.warn('[runner] No active leads found in the database. Exiting.');
      process.exit(0);
    }

    logger.info(`[runner] Found ${totalLeads} active lead(s). Starting delivery @ 5 emails/sec...`);

    let successCount = 0;
    let failCount = 0;

    // 2. Direct Loop with Rate Limiting
    for (let i = 0; i < totalLeads; i++) {
        const lead = activeLeads[i];
        
        try {
            // Generate content JIT
            const { subject, body } = templateEngine.generate(userId, lead);
            
            // Send email
            await emailService.sendEmail(lead.email, subject, body, userId);
            successCount++;
        } catch (err) {
            failCount++;
            logger.error(`[runner] Failed to send to ${lead.email}: ${err.message}`);
        }

        // Progress log every 10 leads
        if ((i + 1) % 10 === 0 || i + 1 === totalLeads) {
            logger.info(`[runner] Progress: ${i + 1} / ${totalLeads} processed | Success: ${successCount} | Fails: ${failCount}`);
        }

        // 3. Rate Limit: 5 emails per second = 200ms delay
        if (i < totalLeads - 1) {
            await sleep(200);
        }
    }

    logger.info(`[runner] CAMPAIGN COMPLETE: ${successCount} sent, ${failCount} failed.`);
    
    // Graceful exit
    setTimeout(() => {
      mongoose.connection.close();
      process.exit(0);
    }, 1000);

  } catch (err) {
    logger.error(`[runner] FATAL ERROR: ${err.message}`);
    process.exit(1);
  }
}

// Execute
runCampaign();
