const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/email_marketing';

async function purgeGhostIndexes() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for index purging...');

    const db = mongoose.connection.db;
    const collections = ['templates', 'campaigns', 'leads', 'smtpaccounts'];

    for (const collName of collections) {
      try {
        const coll = db.collection(collName);
        const indexes = await coll.indexes();
        console.log(`Checking indexes for ${collName}...`);

        for (const idx of indexes) {
          if (idx.name === '_id_') continue;

          // Conditions for purging old/incompatible indexes
          const isGhostIndex = 
            idx.name.includes('_user_') || 
            idx.name === 'user_1' || 
            idx.name === 'name_1' || 
            idx.name === 'email_1' || 
            idx.name === 'email_1_campaign_1';

          if (isGhostIndex) {
            console.log(`  Dropping index: ${idx.name}`);
            await coll.dropIndex(idx.name);
          }
        }
      } catch (e) {
        console.error(`  Error processing collection ${collName}: ${e.message}`);
      }
    }

    console.log('Purge complete.');
    process.exit(0);
  } catch (err) {
    console.error('Purge failed:', err);
    process.exit(1);
  }
}

purgeGhostIndexes();
