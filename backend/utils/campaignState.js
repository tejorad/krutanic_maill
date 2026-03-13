'use strict';

/**
 * campaignState.js
 * ----------------
 * Multi-user campaign state manager.
 * Tracks concurrent campaigns for different users using a Map.
 */

const userStates = new Map();

function getOrCreateState(userId) {
  if (!userStates.has(userId)) {
    userStates.set(userId, {
      isRunning: false,
      campaign: null,
      startedAt: null,
      totalLeads: 0,
      sentCount: 0,
      stoppedByUser: false,
      completedAt: null,
    });
  }
  return userStates.get(userId);
}

function start(userId, campaignName, totalLeads) {
  const state = getOrCreateState(userId);
  state.isRunning = true;
  state.campaign = campaignName;
  state.startedAt = new Date();
  state.totalLeads = totalLeads;
  state.sentCount = 0;
  state.stoppedByUser = false;
  state.completedAt = null;
}

function stop(userId, byUser = true) {
  const state = getOrCreateState(userId);
  state.isRunning = false;
  state.stoppedByUser = byUser;
  state.completedAt = new Date();
}

function increment(userId) {
  const state = getOrCreateState(userId);
  state.sentCount += 1;
}

function getStatus(userId) {
  const state = getOrCreateState(userId);
  const elapsedMs = state.startedAt
    ? (state.isRunning ? Date.now() : (state.completedAt || Date.now())) - state.startedAt.getTime()
    : 0;

  return {
    ...state,
    elapsedMs,
  };
}

module.exports = { start, stop, increment, getStatus };
