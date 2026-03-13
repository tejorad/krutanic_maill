@echo off
REM DKIM Key Generation Script for Windows
REM =======================================
REM Generates DKIM public/private key pair for email authentication
REM
REM Usage: generateDkimKeys.bat
REM Note: Requires OpenSSL to be installed and in PATH

setlocal enabledelayedexpansion

set KEYS_DIR=dkim-keys

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          DKIM Key Pair Generator (Windows)                 ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Create keys directory if it doesn't exist
if not exist "%KEYS_DIR%" (
  mkdir "%KEYS_DIR%"
  echo ✓ Created directory: %KEYS_DIR%
)

REM Check if openssl is installed
where openssl >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo ✗ Error: OpenSSL is not installed or not in PATH
  echo.
  echo Please install OpenSSL from:
  echo https://slproweb.com/products/Win32OpenSSL.html
  echo.
  echo Or if using WSL:
  echo wsl bash scripts/generateDkimKeys.sh
  pause
  exit /b 1
)

set PRIVATE_KEY=%KEYS_DIR%\dkim-private.pem
set PUBLIC_KEY=%KEYS_DIR%\dkim-public.pem

echo Generating 2048-bit RSA key pair...
echo.

REM Generate private key
call openssl genrsa -out "%PRIVATE_KEY%" 2048 >nul 2>&1

if %ERRORLEVEL% neq 0 (
  echo ✗ Error generating private key
  pause
  exit /b 1
)

REM Extract public key
call openssl rsa -in "%PRIVATE_KEY%" -pubout -out "%PUBLIC_KEY%" >nul 2>&1

if %ERRORLEVEL% neq 0 (
  echo ✗ Error extracting public key
  pause
  exit /b 1
)

echo ✓ Keys generated successfully!
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo 📄 PRIVATE KEY (keep secret!)
echo    File: %PRIVATE_KEY%
echo.
type "%PRIVATE_KEY%"
echo.

echo ════════════════════════════════════════════════════════════
echo.
echo 📄 PUBLIC KEY (for DNS)
echo    File: %PUBLIC_KEY%
echo.
type "%PUBLIC_KEY%"
echo.

echo ════════════════════════════════════════════════════════════
echo.
echo 📝 NEXT STEPS:
echo.
echo 1. Open the private key file and copy its contents:
echo    type %PRIVATE_KEY%
echo.
echo 2. Add to .env file:
echo    DKIM_PRIVATE_KEY="^<paste private key here^>"
echo    DKIM_DOMAIN=krutanic.org
echo    DKIM_SELECTOR=default
echo.
echo 3. Add SPF and DKIM TXT records to your DNS provider:
echo    - See DKIM_SPF_SETUP.md for detailed instructions
echo.
echo 4. Run: npm install
echo.
echo 5. Start server: npm start
echo.
echo ✅ For detailed instructions, see: DKIM_SPF_SETUP.md
echo.
pause
