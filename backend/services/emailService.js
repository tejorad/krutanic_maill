const smtpRotator = require('../utils/smtpRotator');
const logger = require('../utils/logger');
const EmailLog = require('../models/EmailLog');
const Lead = require('../models/Lead');
const { signEmailWithDkim, isDkimConfigured } = require('../utils/dkimSigner');

/**
 * Email Sending Service
 * =====================
 * Core service to handle the actual delivery of emails.
 */

/**
 * Internal helper to handle the actual delivery logic
 */
async function sendEmailInternal(account, recipientEmail, subject, body, userId) {
  let logId;
  
  try {
    // 1. Create initial log entry with userId
    const log = await EmailLog.create({
      email: recipientEmail,
      userId: userId,
      status: 'sent',
      metadata: { subject }
    });
    logId = log._id;

    const { transporter, email: senderEmail, from, id: accountId, increment } = account;
    
    // Update log with SMTP account info
    await EmailLog.findByIdAndUpdate(logId, { smtp_account: senderEmail }).catch(() => {});

    // 2. Prepare body (Pure Text + Click Tracking)
    const trackedBody = wrapLinks(body, logId);
    
    // 3. Prepare email object
    let mailOptions = {
      from,
      to: recipientEmail,
      subject: subject,
      text: trackedBody,
    };

    // 3a. Sign with DKIM if configured
    if (isDkimConfigured()) {
      mailOptions = await signEmailWithDkim(mailOptions);
    }

    // 3b. Send email
    const info = await transporter.sendMail(mailOptions);

    // 4. Update sent counter
    await increment();

    // 5. Log success and mark lead as sent
    await Lead.findOneAndUpdate({ email: recipientEmail, userId: userId }, { status: 'sent' }).catch(() => {});
    logger.info(`[emailService] SUCCESS: Sent to ${recipientEmail} [LogID: ${logId}] via ${senderEmail}`);
    
    return { success: true, messageId: info.messageId, logId };

  } catch (err) {
    const errorMsg = err.message || 'Unknown error';
    const senderEmail = account?.email || 'unknown';
    logger.error(`[emailService] FAILURE: ${recipientEmail} via ${senderEmail} - ${errorMsg}`);
    
    // 6. Bounce Detection
    const isAuthError = [535, 534].includes(err.responseCode);
    const isBounce = !isAuthError && err.responseCode && String(err.responseCode).startsWith('5');
    
    if (logId) {
      const updateData = { status: isBounce ? 'bounced' : 'failed' };
      await EmailLog.findByIdAndUpdate(logId, updateData).catch(() => {});
    }

    if (isBounce) {
      await Lead.findOneAndUpdate({ email: recipientEmail, userId: userId }, { status: 'bounced' }).catch(() => {});
      logger.warn(`[emailService] BOUNCE detected for ${recipientEmail}. Lead marked as bounced.`);
    }

    // SMTP Rotator health tracking
    if (account && !isBounce) {
      smtpRotator.recordFailure(account.id);
    }
    
    throw err;
  }
}

/**
 * Helper to wrap URLs in plain text with tracking redirects
 */
function wrapLinks(text, logId) {
  const baseUrl = process.env.TRACKING_BASE_URL;
  if (!baseUrl || !logId) return text;

  // Regex to find URLs (matches http:// and https://)
  // We use a simple but effective regex for plain text
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return text.replace(urlRegex, (url) => {
    // Skip if already a tracking link or looks like a tracking pixel
    if (url.includes('/track/')) return url;
    
    // Clean trailing punctuation that might be caught in the regex (like a dot at end of sentence)
    let cleanUrl = url;
    const lastChar = url[url.length - 1];
    if ([',', '.', '!', '?', ')', ']'].includes(lastChar)) {
      cleanUrl = url.slice(0, -1);
    }

    const encodedUrl = encodeURIComponent(cleanUrl);
    const suffix = cleanUrl !== url ? url[url.length - 1] : '';
    
    return `${baseUrl}/track/click?id=${logId}&url=${encodedUrl}${suffix}`;
  });
}

/**
 * Standard send function using the rotator (Round-robin)
 */
async function sendEmail(recipientEmail, subject, body, userId) {
  const account = smtpRotator.next(userId.toString());
  return sendEmailInternal(account, recipientEmail, subject, body, userId);
}

/**
 * Targeted send function using a specific SMTP account ID
 */
async function sendEmailWithSMTP(smtpId, recipientEmail, subject, body, userId) {
  const account = smtpRotator.getById(smtpId, userId.toString());
  if (!account) {
    throw new Error(`SMTP account with ID ${smtpId} not found in pool or belongs to another user.`);
  }
  return sendEmailInternal(account, recipientEmail, subject, body, userId);
}

module.exports = { sendEmail, sendEmailWithSMTP };
