'use strict';

const mongoose = require('mongoose');

const smtpAccountSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  app_password: {
    type: String,
    required: true,
  },
  daily_limit: {
    type: Number,
    default: 500,
  },
  sent_today: {
    type: Number,
    default: 0,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['active', 'limit', 'error'],
    default: 'active',
  },
  lastUsed: {
    type: Date,
  }
}, { timestamps: true });

smtpAccountSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.app_password;
    return ret;
  }
});

smtpAccountSchema.index({ email: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('SmtpAccount', smtpAccountSchema);
