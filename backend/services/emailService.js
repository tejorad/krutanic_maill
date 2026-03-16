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
    
    // --- REPLY THREADING LOGIC ---
    // Check if we have a previous email to this recipient to "thread" the conversation
    const previousLog = await EmailLog.findOne({ 
      email: recipientEmail, 
      userId: userId, 
      status: { $in: ['sent', 'opened', 'clicked'] } 
    }).sort({ createdAt: -1 });

    let threadHeaders = {};
    let finalSubject = subject;

    if (previousLog && previousLog.metadata && previousLog.metadata.get('messageId')) {
      const prevMsgId = previousLog.metadata.get('messageId');
      threadHeaders = {
        'In-Reply-To': prevMsgId,
        'References': prevMsgId
      };
      if (!subject.toLowerCase().startsWith('re:')) {
        finalSubject = `Re: ${subject}`;
      }
      logger.info(`[emailService] Threading email to ${recipientEmail} as reply to ${prevMsgId}`);
    }

    // Update log with SMTP account info
    await EmailLog.findByIdAndUpdate(logId, { smtp_account: senderEmail }).catch(() => {});

    // 2. Prepare body (Pure Text + Click Tracking)
    const trackedBody = await wrapLinksAndStore(body, logId);
    
    // Append tracking pixel (shortened version)
    const { encode } = require('../utils/shortId');
    const shortLogId = encode(logId.toString());
    const trackingPixel = `\n\n[t: ${process.env.TRACKING_BASE_URL}/o/${shortLogId}]`;
    
    // 3. Prepare email object
    let mailOptions = {
      from,
      to: recipientEmail,
      subject: finalSubject,
      text: trackedBody + trackingPixel,
      headers: threadHeaders
    };

    // 3a. Sign with DKIM if configured
    if (isDkimConfigured()) {
      const senderDomain = senderEmail.split('@')[1];
      mailOptions = await signEmailWithDkim(mailOptions, senderDomain);
    }

    // 3b. Send email
    const info = await transporter.sendMail(mailOptions);
    
    // Capture messageId for future threading
    if (info.messageId) {
      await EmailLog.findByIdAndUpdate(logId, { 
        $set: { 'metadata.messageId': info.messageId } 
      }).catch(() => {});
    }

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
      smtpRotator.recordFailure(account.id, isAuthError);
    }
    
    throw err;
  }
}

/**
 * Helper to wrap URLs in plain text with tracking redirects
 * And update the log with the identified links
 */
async function wrapLinksAndStore(text, logId) {
  const baseUrl = process.env.TRACKING_BASE_URL;
  if (!baseUrl || !logId) return text;

  const { encode } = require('../utils/shortId');
  const shortLogId = encode(logId.toString());

  // Regex to find URLs (matches http:// and https://)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  const foundLinks = [];
  logger.info(`[emailService] Wrapping links. BaseURL: ${baseUrl}, LogId: ${logId}`);
  const trackedText = text.replace(urlRegex, (url) => {
    // Skip if already a tracking link or looks like a tracking pixel
    if (url.includes('/track/') || url.includes('/o/') || url.includes('/c/')) {
      logger.info(`[emailService] Skipping already tracked URL: ${url}`);
      return url;
    }
    
    // Clean trailing punctuation
    let cleanUrl = url;
    const lastChar = url[url.length - 1];
    if ([',', '.', '!', '?', ')', ']'].includes(lastChar)) {
      cleanUrl = url.slice(0, -1);
    }

    const index = foundLinks.length;
    foundLinks.push(cleanUrl);
    
    const suffix = cleanUrl !== url ? url[url.length - 1] : '';
    const tracked = `${baseUrl}/c/${shortLogId}/${index}${suffix}`;
    logger.info(`[emailService] Shortened URL: ${cleanUrl} -> ${tracked}`);
    return tracked;
  });

  // Store the found links in the EmailLog
  if (foundLinks.length > 0) {
    await EmailLog.findByIdAndUpdate(logId, { links: foundLinks }).catch(err => {
      logger.error(`[emailService] Failed to store links for ${logId}: ${err.message}`);
    });
  }

  return trackedText;
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
