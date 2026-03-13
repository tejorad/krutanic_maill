const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/email_marketing';

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for migration...');

    const User = require('../models/User');
    const Lead = require('../models/Lead');
    const Campaign = require('../models/Campaign');
    const SmtpAccount = require('../models/SmtpAccount');
    const Template = require('../models/Template');
    const EmailLog = require('../models/EmailLog');

    const firstUser = await User.findOne({}).sort({ createdAt: 1 });
    if (!firstUser) {
      console.log('No users found. Please sign up first.');
      process.exit(0);
    }

    const userId = firstUser._id;
    console.log(`Migrating orphan data to user: ${firstUser.email} (${userId})`);

    const result = await Promise.all([
      Lead.updateMany({ userId: { $exists: false } }, { $set: { userId } }),
      Campaign.updateMany({ userId: { $exists: false } }, { $set: { userId } }),
      SmtpAccount.updateMany({ userId: { $exists: false } }, { $set: { userId } }),
      Template.updateMany({ userId: { $exists: false } }, { $set: { userId } }),
      EmailLog.updateMany({ userId: { $exists: false } }, { $set: { userId } }),
    ]);

    console.log(`Migration complete:
      - Leads updated: ${result[0].modifiedCount}
      - Campaigns updated: ${result[1].modifiedCount}
      - SMTP Accounts updated: ${result[2].modifiedCount}
      - Templates updated: ${result[3].modifiedCount}
      - Email Logs updated: ${result[4].modifiedCount}`);

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
