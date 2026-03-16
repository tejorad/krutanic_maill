# DNS Setup Guide for Krutanic Mail

To prevent Google from suspending your accounts and to ensure your emails land in the **Inbox**, you must configure these 3 security records in your domain's DNS settings (GoDaddy, Namecheap, etc.).

## 1. SPF (Sender Policy Framework)
**Type**: `TXT`
**Host/Name**: `@` or leave blank
**Value**: `v=spf1 include:_spf.google.com ~all`

> [!NOTE]
> This tells other servers that Google is authorized to send emails on behalf of your domain.

## 2. DKIM (DomainKeys Identified Mail)

### Where to find your keys in Google Admin Console:
1.  Log in to [admin.google.com](https://admin.google.com).
2.  Go to **Apps** > **Google Workspace** > **Gmail**.
3.  Click on **Authenticate email**.
4.  Select your **Domain** from the dropdown.
5.  Click **Generate new record**.
6.  It will give you a **TXT record name** (usually `google._domainkey`) and a **TXT record value** (this is your **Public Key**).

### For the Private Key:
> [!IMPORTANT]
> If you are sending through Google's servers (`smtp.gmail.com`), Google **automatically signs** your emails once you enable the setting above. You do **not** need to add the `DKIM_PRIVATE_KEY` to your `.env`. 
>
> If you still want to handle signing manually, you must generate an RSA private key using a tool like [dkimcore.org](https://dkimcore.org/tools/keys.html) and put the public half in your DNS.

## 3. DMARC (Domain-based Message Authentication)
**Type**: `TXT`
**Host/Name**: `_dmarc`
**Value**: `v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com`

> [!TIP]
> `p=quarantine` tells servers to put suspicious emails in Spam instead of rejecting them. `rua` sends you reports on who is trying to send maskquerading as you.

## 4. Backend Configuration
Once you have your DKIM private key, add these to your `.env` file (or Vercel ENV):

```bash
DKIM_DOMAIN=yourdomain.com
DKIM_SELECTOR=google
DKIM_PRIVATE_KEY="---BEGIN PRIVATE KEY---
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDh...
---END PRIVATE KEY---"
```

> [!IMPORTANT]
> Keep your **Private Key** secret! Never share it. Only the **Public Key** goes in your DNS records.
Once you've added these, wait 1 hour and check your domain here:
- [MXToolbox SuperTool](https://mxtoolbox.com/SuperTool.aspx)
- [Mail-Tester](https://www.mail-tester.com/) (Send a test email here to see your score)
