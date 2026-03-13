'use strict';

const mongoose = require('mongoose');

/**
 * EmailLog Model
 * --------------
 * Persistent record of an email delivery and its engagement.
 * Used by the tracking system to record opens.
 */
const emailLogSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String,
    enum: ['sent', 'opened', 'clicked', 'bounced', 'failed'],
    default: 'sent'
  },
  smtp_account: {
    type: String,
    index: true
  },
  openedAt: {
    type: Date
  },
  clickedAt: {
    type: Date
  },
  // To match the user's ?id=EMAIL_ID request, we'll use a short ID or the Mongo _id
  metadata: {
    type: Map,
    of: String
  }
}, { timestamps: true });

module.exports = mongoose.model('EmailLog', emailLogSchema);
