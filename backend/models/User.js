const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  activeCampaign: {
    isRunning: { type: Boolean, default: false },
    campaign: { type: String, default: null },
    startedAt: { type: Date, default: null },
    totalLeads: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    stoppedByUser: { type: Boolean, default: false },
    completedAt: { type: Date, default: null }
  },
  createdAt: { type: Date, default: Date.now }
});

// Method to verify password (plain text comparison)
userSchema.methods.comparePassword = async function(candidatePassword) {
  return candidatePassword === this.password;
};

module.exports = mongoose.model('User', userSchema, 'bastuser');
