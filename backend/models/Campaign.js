'use strict';

const mongoose = require('mongoose');

/**
 * Campaign Model
 * ==============
 * Stores campaign names and metadata.
 */
const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

campaignSchema.index({ name: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Campaign', campaignSchema);
