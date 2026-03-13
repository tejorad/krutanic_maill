'use strict';

const express  = require('express');
const multer   = require('multer');
const { parse } = require('csv-parse');
const Lead     = require('../models/Lead');
const logger   = require('../utils/logger');

const router = express.Router();

// ── Multer — memory storage (no temp files written to disk) ──────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are accepted'), false);
    }
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

function isValidEmail(str) {
  return typeof str === 'string' && EMAIL_REGEX.test(str.trim());
}

/**
 * Parse a CSV Buffer and collect every value that looks like an email.
 * The parser is aware of common header names from Google Forms and other tools.
 *
 * @param {Buffer} buffer
 * @returns {Promise<string[]>}  — raw (non-deduped) validated emails
 */
function extractEmailsFromCsv(buffer) {
  return new Promise((resolve, reject) => {
    const emails = [];

    const parser = parse(buffer, {
      columns: true,          // Use first row as column names
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    // Known email headers (Google Forms, typical exports)
    const knownHeaders = ['email address', 'email', 'e-mail', 'mail'];

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        // 1. Check for known headers first
        const keys = Object.keys(record);
        const emailKey = keys.find((k) => 
          knownHeaders.includes(k.toLowerCase().trim())
        );

        if (emailKey && isValidEmail(record[emailKey])) {
          emails.push(record[emailKey].trim().toLowerCase());
        } else {
          // 2. Fallback: scan every cell if no header matches
          for (const key of keys) {
            const val = record[key];
            if (isValidEmail(val)) {
              emails.push(val.trim().toLowerCase());
              break; // Only take one email per row if scanning cells
            }
          }
        }
      }
    });

    parser.on('error', reject);
    parser.on('end', () => resolve(emails));
  });
}

// ── Route ─────────────────────────────────────────────────────────────────────

/**
 * POST /import-leads
 *
 * Accepts a multipart/form-data upload with a field named "file".
 * Parses the CSV, validates emails, removes duplicates (in-memory + DB upsert),
 * and bulk-inserts new leads into MongoDB.
 *
 * Response:
 * {
 *   success   : true,
 *   total     : number,  — rows parsed from CSV
 *   valid     : number,  — valid email addresses found
 *   imported  : number,  — newly inserted into DB
 *   duplicates: number,  — already existed (skipped)
 *   invalid   : number,  — rows that failed email validation
 * }
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    // ── 1. Validate upload & campaign ─────────────────────────────────────────
    const { campaign } = req.body;
    if (!campaign) {
      return res.status(400).json({ success: false, error: 'Campaign name is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No CSV file uploaded. Use field name "file".' });
    }

    // Ensure campaign exists for this user or create it
    const Campaign = require('../models/Campaign');
    await Campaign.updateOne(
      { name: campaign.toLowerCase().trim(), userId: req.user.id },
      { $setOnInsert: { name: campaign.toLowerCase().trim(), userId: req.user.id } },
      { upsert: true }
    );

    // ── 2. Parse CSV ──────────────────────────────────────────────────────────
    let rawEmails;
    try {
      rawEmails = await extractEmailsFromCsv(req.file.buffer);
    } catch (parseErr) {
      return res.status(422).json({ success: false, error: `CSV parse error: ${parseErr.message}` });
    }

    if (rawEmails.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'No valid email addresses found in the CSV. Make sure there is a column named "email".',
      });
    }

    // ── 3. In-memory deduplication ────────────────────────────────────────────
    const uniqueEmails = [...new Set(rawEmails)];
    const inMemoryDups = rawEmails.length - uniqueEmails.length;

    // ── 4. Bulk upsert — skip existing addresses (DB-level dedup) ────────────
    const ops = uniqueEmails.map((email) => ({
      updateOne: {
        filter: { email, campaign: campaign.toLowerCase().trim(), userId: req.user.id },
        update: { $setOnInsert: { email, campaign: campaign.toLowerCase().trim(), userId: req.user.id, status: 'active', created_at: new Date() } },
        upsert: true,
      },
    }));

    const result = await Lead.bulkWrite(ops, { ordered: false });
    const imported  = result.upsertedCount;
    const dbDups    = uniqueEmails.length - imported;

    logger.info(
      `[importLeads] file="${req.file.originalname}" ` +
      `total=${rawEmails.length} valid=${uniqueEmails.length} ` +
      `imported=${imported} duplicates=${inMemoryDups + dbDups}`
    );

    return res.status(200).json({
      success    : true,
      total      : rawEmails.length,       // rows with any email-shaped value
      valid      : uniqueEmails.length,    // after in-memory dedup
      imported,                            // new records added to DB
      duplicates : inMemoryDups + dbDups,  // in-file dups + already in DB
      invalid    : 0,                      // invalid rows never enter rawEmails
    });
  } catch (err) {
    logger.error(`[importLeads] unexpected error: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Multer error handler (catches file-type rejection) ────────────────────────
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ success: false, error: err.message });
  }
  res.status(500).json({ success: false, error: 'Upload failed' });
});

module.exports = router;
