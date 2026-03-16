'use strict';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const base = alphabet.length;

/**
 * Encodes a MongoDB ObjectId hex string into a shorter Base62 string.
 * @param {string} hex - 24-character hex string
 * @returns {string} - Base62 encoded string
 */
function encode(hex) {
  let num = BigInt('0x' + hex);
  let res = '';
  while (num > 0n) {
    res = alphabet[Number(num % BigInt(base))] + res;
    num = num / BigInt(base);
  }
  return res;
}

/**
 * Decodes a Base62 string back into a MongoDB ObjectId hex string.
 * @param {string} str - Base62 encoded string
 * @returns {string} - 24-character hex string
 */
function decode(str) {
  let num = 0n;
  for (let i = 0; i < str.length; i++) {
    num = num * BigInt(base) + BigInt(alphabet.indexOf(str[i]));
  }
  let hex = num.toString(16);
  // Pad with leading zeros if necessary
  return hex.padStart(24, '0');
}

module.exports = { encode, decode };
