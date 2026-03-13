'use strict';

const mongoose = require('mongoose');

/**
 * Template Model
 * --------------
 * Stores the building blocks for dynamic email generation.
 * Each field is an array of options used by the rotator.
 */
const templateItemSchema = new mongoose.Schema({
  content: String,
  enabled: { type: Boolean, default: true }
}, { _id: false });

const templateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: {
    type: String,
    default: 'Default Template',
  },
  subjects: [templateItemSchema],
  greetings: [templateItemSchema],
  body_paragraphs: [templateItemSchema],
  closings: [templateItemSchema],
  signatures: [templateItemSchema],
  enabled: {
    type: Map,
    of: Boolean,
    default: {
      subjects: true,
      greetings: true,
      body_paragraphs: true,
      closings: true,
      signatures: true,
    }
  }
}, { timestamps: true });

templateSchema.index({ name: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Template', templateSchema);
