'use strict';

const express = require('express');
const router = express.Router();
const Template = require('../models/Template');
const templateEngine = require('../utils/templateEngine');
const logger = require('../utils/logger');

/**
 * GET /api/template
 * Get the current template components
 */
router.get('/', async (req, res) => {
  try {
    let template = await Template.findOne({ name: 'Default Template', userId: req.user.id });
    
    // If no template exists yet for this user, create an empty one
    if (!template) {
       template = await Template.create({
         userId: req.user.id,
         name: 'Default Template',
         subjects: [],
         greetings: [],
         body_paragraphs: [],
         closings: [],
         signatures: [],
         enabled: {
           subjects: true,
           greetings: true,
           body_paragraphs: true,
           closings: true,
           signatures: true
         }
       });

       // Refresh the engine for this user immediately
       await templateEngine.refresh(req.user.id);
    }
    
    res.json({ success: true, data: template });
  } catch (err) {
    logger.error(`[templateRoutes] GET / error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/template
 * Update template components
 */
router.patch('/', async (req, res) => {
  try {
    const update = req.body;
    const template = await Template.findOneAndUpdate(
      { name: 'Default Template', userId: req.user.id },
      { $set: { ...update, userId: req.user.id } },
      { upsert: true, new: true }
    );
    
    // Refresh the in-memory context in the generator for this specific user
    await templateEngine.refresh(req.user.id);
    
    res.json({ success: true, data: template });
  } catch (err) {
    logger.error(`[templateRoutes] PATCH / error: ${err.message}`);
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
