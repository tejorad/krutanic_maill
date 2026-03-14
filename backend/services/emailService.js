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

    // 2. Prepare body (Pure Text)
    // Removed all HTML generation and tracking logic.
    
    // 3. Prepare email object
    let mailOptions = {
      from,
      to: recipientEmail,
      subject: subject,
      text: body,
    };

    // 3a. Sign with DKIM if configured
    if (isDkimConfigured()) {
      mailOptions = await signEmailWithDkim(mailOptions);
    }

    // 3b. Send email
    const info = await transporter.sendMail(mailOptions);

    // 4. Update sent counter
    await increment();

    // 5. Log success
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
