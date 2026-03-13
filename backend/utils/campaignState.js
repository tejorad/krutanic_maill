'use strict';

/**
 * campaignState.js
 * ----------------
 * Multi-user campaign state manager.
 * Tracks concurrent campaigns for different users using Redis.
 */
const redis = require('../config/redis');
const logger = require('./logger');

const STATE_PREFIX = 'campaign_state:';

async function getOrCreateState(userId) {
  try {
    const data = await redis.get(`${STATE_PREFIX}${userId}`);
    if (data) {
      const state = JSON.parse(data);
      // Ensure date objects are correctly parsed back
      if (state.startedAt) state.startedAt = new Date(state.startedAt);
      if (state.completedAt) state.completedAt = new Date(state.completedAt);
      return state;
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

async function saveState(userId, state) {
  try {
    await redis.set(`${STATE_PREFIX}${userId}`, JSON.stringify(state), 'EX', 86400); // 24h expiry
  } catch (err) {
    logger.error(`[campaignState] Save error for ${userId}: ${err.message}`);
  }
}

async function start(userId, campaignName, totalLeads) {
  const state = {
    isRunning: true,
    campaign: campaignName,
    startedAt: new Date(),
    totalLeads: totalLeads,
    sentCount: 0,
    stoppedByUser: false,
    completedAt: null,
  };
  await saveState(userId, state);
}

async function stop(userId, byUser = true) {
  const state = await getOrCreateState(userId);
  state.isRunning = false;
  state.stoppedByUser = byUser;
  state.completedAt = new Date();
  await saveState(userId, state);
}

async function increment(userId) {
  const state = await getOrCreateState(userId);
  state.sentCount += 1;
  await saveState(userId, state);
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

module.exports = { start, stop, increment, getStatus };
