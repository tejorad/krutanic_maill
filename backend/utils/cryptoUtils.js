'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 characters (64 hex chars if from randomBytes)
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts a plain text string using AES-256-CBC.
 * Returns a string in the format "iv:ciphertext" (hex).
 */
function encrypt(text) {
  if (!text) return text;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not defined in environment variables.');
  }

  // Ensure key is the correct length (32 bytes)
  // If the key in .env is 64 hex chars, we convert it to Buffer.
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) {
    throw new Error('Invalid ENCRYPTION_KEY length. Must be 32 bytes (64 hex characters).');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted string in the format "iv:ciphertext".
 * If the input does not match the format, it returns the input as-is (fallback).
 */
function decrypt(text) {
  if (!text || !text.includes(':')) return text;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not defined in environment variables.');
  }

  try {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    // If decryption fails, it might be plain text or a different key
    return text;
  }
}

module.exports = { encrypt, decrypt };
