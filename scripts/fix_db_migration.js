const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/email_marketing';

async function fixDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB...');

    // 1. Drop existing index on SmtpAccount email if it exists
    const db = mongoose.connection.db;
    try {
      await db.collection('smtpaccounts').dropIndex('email_1');
      console.log('Dropped global unique index on SMTP email.');
    } catch (err) {
      console.log('Global index email_1 not found or already dropped.');
    }

    const User = require('../models/User');
    const Lead = require('../models/Lead');
    const Campaign = require('../models/Campaign');
    const SmtpAccount = require('../models/SmtpAccount');
    const Template = require('../models/Template');
    const EmailLog = require('../models/EmailLog');

    // 2. Identify the target user
    const targetUser = await User.findOne({}).sort({ createdAt: 1 });
    if (!targetUser) {
      console.log('No users found. Please sign up first.');
      process.exit(0);
    }

    const userId = targetUser._id;
    console.log(`Re-associating ALL data to user: ${targetUser.email} (${userId})`);

    // 3. Forcibly update ALL records to belong to this user
    // This fixes the "belongs to another user" error when the DB contains mismatched IDs
    const result = await Promise.all([
      Lead.updateMany({}, { $set: { userId } }),
      Campaign.updateMany({}, { $set: { userId } }),
      SmtpAccount.updateMany({}, { $set: { userId } }),
      Template.updateMany({}, { $set: { userId } }),
      EmailLog.updateMany({}, { $set: { userId } }),
    ]);

    console.log(`Data cleanup complete:
      - Leads updated: ${result[0].modifiedCount}
      - Campaigns updated: ${result[1].modifiedCount}
      - SMTP Accounts updated: ${result[2].modifiedCount}
      - Templates updated: ${result[3].modifiedCount}
      - Email Logs updated: ${result[4].modifiedCount}`);

    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

fixDatabase();
