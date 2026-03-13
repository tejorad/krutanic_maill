'use strict';

/**
 * campaignState.js
 * ----------------
 * Multi-user campaign state manager.
 * Tracks concurrent campaigns for different users using MongoDB.
 */
const User = require('../models/User');
const logger = require('./logger');

async function getOrCreateState(userId) {
  try {
    const user = await User.findById(userId).select('activeCampaign');
    if (user && user.activeCampaign) {
      return user.activeCampaign;
    }
  } catch (err) {
    logger.error(`[campaignState] Get error for ${userId}: ${err.message}`);
  }

  return {
    isRunning: false,
    campaign: null,
    startedAt: null,
    totalLeads: 0,
    sentCount: 0,
    stoppedByUser: false,
    completedAt: null,
  };
}

async function start(userId, campaignName, totalLeads) {
  try {
    await User.findByIdAndUpdate(userId, {
      $set: {
        activeCampaign: {
          isRunning: true,
          campaign: campaignName,
          startedAt: new Date(),
          totalLeads: totalLeads,
          sentCount: 0,
          stoppedByUser: false,
          completedAt: null,
        }
      }
    });
  } catch (err) {
    logger.error(`[campaignState] Start error for ${userId}: ${err.message}`);
  }
}

async function stop(userId, byUser = true) {
  try {
    await User.findByIdAndUpdate(userId, {
      $set: {
        'activeCampaign.isRunning': false,
        'activeCampaign.stoppedByUser': byUser,
        'activeCampaign.completedAt': new Date(),
      }
    });
  } catch (err) {
    logger.error(`[campaignState] Stop error for ${userId}: ${err.message}`);
  }
}

async function increment(userId) {
  try {
    await User.findByIdAndUpdate(userId, {
      $inc: { 'activeCampaign.sentCount': 1 }
    });
  } catch (err) {
    logger.error(`[campaignState] Increment error for ${userId}: ${err.message}`);
  }
}

async function batchIncrement(userId, count) {
  try {
    await User.findByIdAndUpdate(userId, {
      $inc: { 'activeCampaign.sentCount': count }
    });
  } catch (err) {
    logger.error(`[campaignState] Batch increment error for ${userId}: ${err.message}`);
  }
}

async function getStatus(userId) {
  const state = await getOrCreateState(userId);
  const now = Date.now();
  const startTs = state.startedAt ? state.startedAt.getTime() : 0;
  
  const elapsedMs = startTs
    ? (state.isRunning ? now : (state.completedAt ? state.completedAt.getTime() : now)) - startTs
    : 0;

  return {
    ...state,
    elapsedMs,
  };
}

module.exports = { start, stop, increment, batchIncrement, getStatus };
