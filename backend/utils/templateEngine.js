const Template = require('../models/Template');
const logger = require('./logger');


const mongoose = require('mongoose');

/**
 * In-memory map of user templates for extremely fast generation
 * Key: userId (string)
 * Value: { subjects, greetings, body_paragraphs, closings, signatures }
 */
const userTemplatesMap = new Map();

/**
 * Default structure if no template loaded
 */
const getDefaults = () => ({
  subjects: [],
  greetings: [],
  body_paragraphs: [],
  closings: [],
  signatures: [],
  enabled: {
    subjects: true,
    greetings: true,
    body_paragraphs: true,
    closings: true,
    signatures: true,
  }
});

/**
 * Helper to pick a random item from an array
 */
function pickRandom(arr) {
  if (!arr || !arr.length) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Helper to replace {placeholder} with data
 */
function replacePlaceholders(str, data) {
  if (!str) return '';
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

/**
 * Refresh template components from the database for ALL users or a specific user.
 */
async function refresh(userId = null) {
  try {
    const query = { name: 'Default Template' };
    if (userId) query.userId = new mongoose.Types.ObjectId(userId);

    const templates = await Template.find(query);
    
    templates.forEach(template => {
      if (!template.userId) return; // Safety: skip legacy templates without a user
      const uId = template.userId.toString();
      const enabledMap = template.enabled ? Object.fromEntries(template.enabled) : {};
      
      const filterItems = (items) => {
        if (!items || !items.length) return [];
        return items.filter(item => item.enabled !== false).map(item => item.content);
      };

      userTemplatesMap.set(uId, {
        subjects: filterItems(template.subjects),
        greetings: filterItems(template.greetings),
        body_paragraphs: filterItems(template.body_paragraphs),
        closings: filterItems(template.closings),
        signatures: filterItems(template.signatures),
        enabled: {
          subjects:      enabledMap.subjects      !== false,
          greetings:     enabledMap.greetings     !== false,
          body_paragraphs: enabledMap.body_paragraphs !== false,
          closings:      enabledMap.closings      !== false,
          signatures:    enabledMap.signatures    !== false,
        }
      });
    });
    
    logger.info(`[templateEngine] Refreshed templates for ${templates.length} users.`);
  } catch (err) {
    logger.error(`[templateEngine] Refresh failed: ${err.message}`);
  }
}

/**
 * Generate a dynamic email payload for a specific user.
 */
function generate(userId, data = {}) {
  const uId = typeof userId === 'string' ? userId : userId?.toString();
  const currentTemplates = userTemplatesMap.get(uId) || getDefaults();

  const context = {
    name: data.name || 'Student',
    ctaUrl: data.ctaUrl || 'https://forms.gle/tePTM6fVj4rZdqC1A',
    ...data
  };

  const en = currentTemplates.enabled;

  const validSubjects = en.subjects ? currentTemplates.subjects : [];
  if (!validSubjects.length) throw new Error("No template subjects found. Please add a Subject in the Templates tab before sending.");
  
  const validBodies = en.body_paragraphs ? currentTemplates.body_paragraphs : [];
  if (!validBodies.length) throw new Error("No template body paragraphs found. Please add a Body Paragraph in the Templates tab before sending.");

  const subject = replacePlaceholders(
    pickRandom(validSubjects), context
  );

  const parts = [
    en.greetings && currentTemplates.greetings.length     ? replacePlaceholders(pickRandom(currentTemplates.greetings), context)     : null,
    '',
    en.body_paragraphs && validBodies.length ? replacePlaceholders(pickRandom(validBodies), context) : null,
    '',
    en.closings && currentTemplates.closings.length      ? replacePlaceholders(pickRandom(currentTemplates.closings), context)      : null,
    en.signatures && currentTemplates.signatures.length    ? replacePlaceholders(pickRandom(currentTemplates.signatures), context)    : null,
  ].filter(p => p !== null);

  return { subject, body: parts.join('\n') };
}

/**
 * Helper to check if a user has any valid templates configured to send
 */
function hasValidTemplates(userId) {
  const uId = typeof userId === 'string' ? userId : userId?.toString();
  const currentTemplates = userTemplatesMap.get(uId);
  if (!currentTemplates) return false;
  
  const hasSubjects = currentTemplates.enabled.subjects && (currentTemplates.subjects || []).length > 0;
  const hasBodies = currentTemplates.enabled.body_paragraphs && (currentTemplates.body_paragraphs || []).length > 0;
  
  return hasSubjects && hasBodies;
}

/**
 * Legacy render support
 */
function render(template, data = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    data[key] !== undefined ? String(data[key]) : ''
  );
}

module.exports = { generate, render, refresh, getDefaults, hasValidTemplates };
