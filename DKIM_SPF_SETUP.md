# DKIM and SPF Setup Guide

## Overview

This guide will help you set up **DKIM (DomainKeys Identified Mail)** and **SPF (Sender Policy Framework)** to prevent your emails from being marked as spam and improve deliverability.

---

## What is DKIM?

**DKIM** adds a cryptographic signature to your emails that allows receiving servers to verify:
- ✅ The email actually came from your domain
- ✅ The email content wasn't modified in transit
- ✅ You are a legitimate sender

**Benefits:**
- Improves email deliverability
- Avoids spam folder
- Builds sender reputation
- Required by Gmail, Yahoo, and other major providers

---

## What is SPF?

**SPF** is a DNS record that specifies which mail servers are authorized to send emails on behalf of your domain.

**Benefits:**
- Prevents email spoofing
- Tells ISPs which servers should be trusted
- Simple to set up (one DNS record)
- Complements DKIM and DMARC

---

## Step 1: Generate DKIM Keys

You need to create a public-private key pair. Run these commands:

```bash
# Generate a private key (2048-bit RSA)
openssl genrsa -out dkim-private.pem 2048

# Extract the public key
openssl rsa -in dkim-private.pem -pubout -out dkim-public.pem

# Display the private key (for environment variable)
cat dkim-private.pem
```

**Output will look like:**
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890...
...
-----END RSA PRIVATE KEY-----
```

---

## Step 2: Configure DKIM in Your Application

### Option A: Using Environment Variables (Recommended)

Create a `.env` file in your project root:

```bash
# DKIM Configuration
DKIM_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890...
(paste your entire private key here)
-----END RSA PRIVATE KEY-----"

DKIM_DOMAIN=krutanic.org
DKIM_SELECTOR=default
```

OR use a file path:
```bash
DKIM_PRIVATE_KEY=/path/to/dkim-private.pem
DKIM_DOMAIN=krutanic.org
DKIM_SELECTOR=default
```

OR base64-encoded:
```bash
# Encode private key to base64
base64 -i dkim-private.pem -o dkim-private.b64

DKIM_PRIVATE_KEY=<contents of dkim-private.b64>
DKIM_DOMAIN=krutanic.org
DKIM_SELECTOR=default
```

### Option B: Production Deployment

For production, use your server's secret management:
- **AWS Secrets Manager**
- **Azure Key Vault**
- **HashiCorp Vault**
- **Docker Secrets**

---

## Step 3: Add DKIM Public Key to Your DNS

1. **Log into your DNS provider** (GoDaddy, Route 53, Cloudflare, Namecheap, etc.)

2. **Find the TXT Records section**

3. **Create a new TXT record** with:
   - **Name/Host:** `default._domainkey` (or `{selector}._domainkey`)
   - **Value:** Extract the public key content between markers and format as:
     ```
     v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDX...
     ```

   **How to prepare the public key:**
   - Remove the `-----BEGIN PUBLIC KEY-----` and `-----END PUBLIC KEY-----` lines
   - Remove all newlines
   - The result should be one continuous string starting with `MIGfMA0...`

   **Full TXT Record Value:**
   ```
   v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDX...
   ```

4. **Save the DNS record**

5. **Verify with:** `nslookup -type=TXT default._domainkey.krutanic.org` (allow 24-48 hours for propagation)

---

## Step 4: Configure SPF Record

1. **Log into your DNS provider**

2. **Create a new TXT record** with:
   - **Name/Host:** `@` (root domain) or `krutanic.org`
   - **Value:**
     ```
     v=spf1 include:_spf.google.com ~all
     ```

**SPF Record Explanation:**
| Component | Meaning |
|-----------|---------|
| `v=spf1` | SPF version |
| `include:_spf.google.com` | Authorize Gmail/Google Workspace SMTP servers |
| `~all` | Soft fail - other servers can send but might fail checks |
| `-all` | Hard fail - only authorized servers (use with caution) |

### Multi-service SPF (if using multiple email services):
```
v=spf1 include:sendgrid.net include:_spf.google.com ~all
```

### With specific IP:
```
v=spf1 ip4:123.45.67.89 include:_spf.google.com ~all
```

---

## Step 5: Verify Your Setup

### Check DKIM:
```bash
# Linux/Mac
nslookup -type=TXT default._domainkey.krutanic.org

# Windows
nslookup -type=TXT default._domainkey.krutanic.org
```

### Check SPF:
```bash
nslookup -type=TXT krutanic.org
```

### Online Tools:
- **DKIM Checker:** https://mxtoolbox.com/dkim.aspx
- **SPF Checker:** https://mxtoolbox.com/spf.aspx
- **Complete Check:** https://www.dmarcian.com/domain-alignment/

---

## DMARC (Optional but Recommended)

Once DKIM and SPF are set up, add DMARC for policy enforcement:

```
_dmarc.krutanic.org TXT: v=DMARC1; p=none; rua=mailto:dmarc@krutanic.org
```

This receives reports about DKIM/SPF failures.

---

## Troubleshooting

### Emails Still Going to Spam?
- ✅ Verify DKIM and SPF are properly configured
- ✅ Check DKIM selector matches your configuration
- ✅ Ensure DNS records have propagated (wait 24-48 hours)
- ✅ Check that `From` header domain matches DKIM domain
- ✅ Add DMARC policy

### Test Email Authentication:
1. Send a test email from your application
2. Go to **Gmail > Show Original**
3. Look for:
   - `dkim=pass`
   - `spf=pass`
   - `dmarc=pass`

### Common Issues:
| Issue | Solution |
|-------|----------|
| `dkim=fail` | Private key doesn't match public key in DNS |
| `spf=fail` | SPF record not configured or wrong include |
| DNS won't accept record | Remove newlines from public key |
| Record too long | Use multiple `p=` segments if needed |

---

## Email Headers to Verify

After sending an email, check these headers:

```
Authentication-Results: dkim=pass header.i=@krutanic.org
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=krutanic.org
Received-SPF: pass
```

---

## Application Integration

Your code is already integrated! The email service automatically:

1. ✅ Checks if DKIM is configured
2. ✅ Signs emails with DKIM before sending
3. ✅ Adds DKIM-Signature header
4. ✅ Falls back gracefully if DKIM is disabled

### Check DKIM Status in Logs:
```
[DKIM] Configured for domain: krutanic.org (selector: default)
[DKIM] Email signed for domain: krutanic.org
```

---

## Production Checklist

- [ ] DKIM private key secured in environment/vault
- [ ] DKIM public key added to DNS
- [ ] SPF record configured
- [ ] DMARC policy set up (optional)
- [ ] Test emails sent and verified
- [ ] Monitor spam folder for first week
- [ ] Set up DMARC reporting
- [ ] Document DNS changes

---

## Environment Variables Reference

```bash
# Required for DKIM
DKIM_PRIVATE_KEY=<your-private-key-or-path>
DKIM_DOMAIN=krutanic.org
DKIM_SELECTOR=default

# Optional for SPF
SPF_DOMAIN=krutanic.org
SPF_HARD_FAIL=false  # Use ~all (soft fail) instead of -all (hard fail)
```

---

## Support Resources

- **DKIM Standard:** https://tools.ietf.org/html/rfc6376
- **SPF Standard:** https://tools.ietf.org/html/rfc7208
- **DMARC Standard:** https://tools.ietf.org/html/rfc7489
- **Mail Tester:** https://www.mail-tester.com/
- **Mailgun Blog:** https://www.mailgun.com/blog/
