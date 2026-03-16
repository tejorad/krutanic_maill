'use strict';

const mongoose = require('mongoose');

/**
 * Lead Model
 * ----------
 * Stores only email addresses and their delivery status.
 * Email templates are NEVER stored in the database — content is
 * generated dynamically at send time by templateEngine.js.
 */
const leadSchema = new mongoose.Schema({
  // ── Core field ──────────────────────────────────────────────────────────────
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // ── Campaign Association ────────────────────────────────────────────────────
  campaign: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },

  // status ──────────────────────────────────────────────────────────────────
  // active       — can receive emails
  // sent         — successfully emailed in this campaign
  // unsubscribed — opted out; must never be emailed again
  // bounced      — hard/soft bounce; excluded from future sends
  status: {
    type: String,
    enum: ['active', 'sent', 'unsubscribed', 'bounced'],
    default: 'active',
  },

  // ── Timestamp ───────────────────────────────────────────────────────────────
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Indexing for search and per-user unique leads
leadSchema.index({ email: 1, campaign: 1, userId: 1 }, { unique: true });

// Fast lookup: skip inactive leads when building send batches
leadSchema.index({ status: 1 });

module.exports = mongoose.model('Lead', leadSchema);
