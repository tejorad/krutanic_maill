'use strict';

const express = require('express');
const router = express.Router();
const EmailLog = require('../models/EmailLog');
const logger = require('../utils/logger');

/**
 * GET /track/open?id=EMAIL_ID
 * 
 * Records an email open event and returns a 1x1 transparent GIF.
 */
router.get('/open', async (req, res) => {
  const { id } = req.query;

  if (id) {
    try {
      // Record the open event in MongoDB
      // Only update status to 'opened' if it's currently 'sent'
      // This prevents a late open pixel from overwriting a 'clicked' status
      const log = await EmailLog.findOneAndUpdate(
        { _id: id, status: 'sent' },
        { status: 'opened', openedAt: new Date() },
        { new: true }
      );

      // Even if already opened/clicked, we still update openedAt if it was null
      if (!log) {
        await EmailLog.updateOne(
          { _id: id, openedAt: { $exists: false } },
          { openedAt: new Date() }
        );
      }

      if (log) {
        logger.info(`[tracking] Email ${id} opened by ${log.email}`);
      } else {
        logger.warn(`[tracking] Open tracked for unknown ID: ${id}`);
      }
    } catch (err) {
      logger.error(`[tracking] Error recording open for ${id}: ${err.message}`);
    }
  }

  // 1x1 Transparent GIF Pixel
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });

  res.send(pixel);
});

/**
 * GET /track/click?id=EMAIL_ID&url=DESTINATION
 * 
 * Records a click event and redirects the user.
 */
router.get('/click', async (req, res) => {
  const { id, url } = req.query;

  if (!url) {
    return res.status(400).send('Destination URL is required');
  }

  if (id) {
    try {
      const log = await EmailLog.findByIdAndUpdate(id, {
        status: 'clicked',
        clickedAt: new Date(),
        // Ensure openedAt is also set if it wasn't already
        $setOnInsert: { openedAt: new Date() } 
      }, { new: true });

      // If it hasn't been opened yet, mark it as opened too
      if (log && !log.openedAt) {
        log.openedAt = new Date();
        await log.save();
      }

      if (log) {
        logger.info(`[tracking] Link clicked in email ${id} by ${log.email} → ${url}`);
      }
    } catch (err) {
      logger.error(`[tracking] Error recording click for ${id}: ${err.message}`);
    }
  }

  // Redirect to destination
  res.redirect(url);
});

module.exports = router;
