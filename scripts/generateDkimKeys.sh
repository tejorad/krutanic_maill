#!/bin/bash

# DKIM Key Generation Script
# ==========================
# Generates DKIM public/private key pair for email authentication
#
# Usage: bash scripts/generateDkimKeys.sh

set -e

KEYS_DIR="./dkim-keys"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          DKIM Key Pair Generator                           ║"
echo "╚════════════════════════════════════════════════════════════╝"

# Create keys directory if it doesn't exist
if [ ! -d "$KEYS_DIR" ]; then
  mkdir -p "$KEYS_DIR"
  echo "✓ Created directory: $KEYS_DIR"
fi

# Check if openssl is installed
if ! command -v openssl &> /dev/null; then
  echo "✗ Error: OpenSSL is not installed. Please install it first:"
  echo "  - macOS: brew install openssl"
  echo "  - Ubuntu/Debian: sudo apt-get install openssl"
  echo "  - Windows: Install from https://slproweb.com/products/Win32OpenSSL.html"
  exit 1
fi

PRIVATE_KEY="$KEYS_DIR/dkim-private.pem"
PUBLIC_KEY="$KEYS_DIR/dkim-public.pem"

echo ""
echo "Generating 2048-bit RSA key pair..."
echo ""

# Generate private key
openssl genrsa -out "$PRIVATE_KEY" 2048 2>/dev/null

# Extract public key
openssl rsa -in "$PRIVATE_KEY" -pubout -out "$PUBLIC_KEY" 2>/dev/null

echo "✓ Keys generated successfully!"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📄 PRIVATE KEY (keep secret!):"
echo "   File: $PRIVATE_KEY"
echo ""
cat "$PRIVATE_KEY"
echo ""

echo "════════════════════════════════════════════════════════════"
echo ""
echo "📄 PUBLIC KEY (for DNS):"
echo "   File: $PUBLIC_KEY"
echo ""
cat "$PUBLIC_KEY"
echo ""

echo "════════════════════════════════════════════════════════════"
echo ""
echo "🔑 FORMATTED PUBLIC KEY (for DNS TXT record):"
echo ""
# Extract the key content without headers
PUB_KEY_CONTENT=$(openssl rsa -in "$PRIVATE_KEY" -pubout -outform DER 2>/dev/null | openssl enc -base64 -A)
echo "v=DKIM1; k=rsa; p=$PUB_KEY_CONTENT"
echo ""

echo "════════════════════════════════════════════════════════════"
echo ""
echo "📝 NEXT STEPS:"
echo ""
echo "1. Create/update .env file with private key:"
echo ""
echo "   DKIM_PRIVATE_KEY=\"$(cat $PRIVATE_KEY)\""
echo "   DKIM_DOMAIN=krutanic.org"
echo "   DKIM_SELECTOR=default"
echo ""
echo "2. Add TXT record to your DNS:"
echo ""
echo "   Name: default._domainkey.krutanic.org"
echo "   Value: v=DKIM1; k=rsa; p=$PUB_KEY_CONTENT"
echo ""
echo "3. Add SPF record to your DNS:"
echo ""
echo "   Name: @ (root domain)"
echo "   Value: v=spf1 include:_spf.google.com ~all"
echo ""
echo "4. Verify DNS propagation (wait 24-48 hours):"
echo "   nslookup -type=TXT default._domainkey.krutanic.org"
echo ""
echo "5. Run 'npm install' to install dkim-signer package"
echo ""
echo "6. Test with: npm run start"
echo ""
echo "✅ For detailed instructions, see: DKIM_SPF_SETUP.md"
echo ""
