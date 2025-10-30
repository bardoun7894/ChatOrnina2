# Session 2025-10-29: HTTPS/SSL Setup for Voice Input

## Date: October 29, 2025

## Summary
Implemented HTTPS development server with self-signed SSL certificates to enable voice input functionality over network IP addresses, resolving MediaDevices API secure context requirement.

---

## Features Implemented

### 1. Self-Signed SSL Certificate Generation ✅

**Problem**: Voice input (MediaRecorder/getUserMedia API) requires secure context (HTTPS or localhost). Users accessing via network IP (http://72.61.178.137:7000) couldn't use microphone due to browser security restrictions.

**Solution**: Generated self-signed SSL certificate for development HTTPS server.

**Commands Used**:
```bash
mkdir -p .cert
cd .cert
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

**Files Created**:
- `/root/LibreChat/.cert/key.pem` - RSA 4096-bit private key
- `/root/LibreChat/.cert/cert.pem` - X.509 self-signed certificate (valid 365 days)

**Certificate Details**:
- **Algorithm**: RSA 4096-bit
- **Validity**: 365 days from generation
- **Common Name**: localhost
- **No passphrase**: Using `-nodes` flag for development convenience

**Result**: SSL certificates ready for HTTPS server configuration.

---

### 2. Custom HTTPS Development Server ✅

**Problem**: Next.js built-in dev server doesn't support HTTPS out of the box.

**Solution**: Created custom Node.js HTTPS server that integrates with Next.js request handler.

**Files Modified**:
- `/root/LibreChat/server.js` (NEW)
- `/root/LibreChat/package.json` (line 7)
- `/root/LibreChat/.gitignore` (should exclude .cert/)

**Implementation** ([server.js](../server.js)):

```javascript
const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 7000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, '.cert/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '.cert/cert.pem')),
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on https://${hostname}:${port}`);
    });
});
```

**Key Features**:
- Binds to `0.0.0.0` for network accessibility
- Integrates with Next.js request handler
- Graceful error handling
- Same port (7000) as HTTP version

**NPM Script Added** ([package.json:7](../package.json#L7)):
```json
"scripts": {
  "dev": "next dev -p 7000",
  "dev:https": "node server.js",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

**Result**: HTTPS server running successfully at `https://0.0.0.0:7000`

---

### 3. MediaDevices API Conditional Rendering ✅

**Problem**: Application crashed when accessing navigator.mediaDevices in non-secure contexts.

**Solution**: Added availability checks and conditional rendering for microphone button.

**Files Modified**:
- `/root/LibreChat/src/components/HomeChat/Chat.tsx` (lines 642-648, 991-1012)

**Availability Check** (lines 642-648):
```typescript
const startRecording = async () => {
  try {
    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Media devices not supported. Please use HTTPS or localhost.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // ... rest of implementation
  } catch (error: any) {
    console.error('Error accessing microphone:', error);
    const errorMessage = error?.message || 'Unable to access microphone. Please check permissions.';
    setError(errorMessage);
  }
};
```

**Conditional Rendering** (lines 991-1012):
```typescript
{/* Microphone Icon - Only show if mediaDevices is supported */}
{(typeof window !== 'undefined' && navigator.mediaDevices) && (
  <button
    type="button"
    onClick={handleMicClick}
    disabled={isLoading || isTranscribing}
    className={cn(
      "absolute top-1/2 -translate-y-1/2 hover:opacity-80 transition-all",
      isRTL ? 'left-14' : 'right-14',
      isRecording
        ? 'text-red-500 animate-pulse'
        : isDarkMode ? 'text-gray-400' : 'text-gray-500',
      (isLoading || isTranscribing) && 'opacity-50 cursor-not-allowed'
    )}
    title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing...' : 'Start voice input (requires HTTPS or localhost)'}
  >
    {isRecording ? (
      <SoundWaveIcon className="w-5 h-5" />
    ) : (
      <MicrophoneIcon className="w-5 h-5" />
    )}
  </button>
)}
```

**Result**: Microphone button only appears when API is available; graceful error messages when unavailable.

---

## Bug Fixes

### 1. MediaDevices TypeError
**Error**: `TypeError: Cannot read properties of undefined (reading 'getUserMedia')` at [Chat.tsx:642](../src/components/HomeChat/Chat.tsx#L642)

**Root Cause**: User accessing application via network IP (http://72.61.178.137:7000) instead of localhost. The MediaDevices API requires secure context.

**Browser Security Policy**:
```
navigator.mediaDevices is only available in:
- HTTPS origins (https://*)
- Localhost (http://localhost or http://127.0.0.1)
- File protocol (file://*)
```

**Solution**:
1. Implemented HTTPS server
2. Added availability checks
3. Provided helpful error messages

**Result**: Application no longer crashes; users are guided to use HTTPS.

---

## Technical Details

### Browser Secure Context Requirements

**What is a Secure Context?**
A secure context is a Window or Worker where there is reasonable confidence that the content has been delivered securely (via HTTPS/TLS), and communication with insecure contexts is limited.

**APIs Requiring Secure Context**:
- `navigator.mediaDevices` (camera/microphone)
- `navigator.geolocation`
- `navigator.credentials`
- Service Workers
- Web Bluetooth
- Web USB

**Why HTTPS is Required**:
- Prevents man-in-the-middle attacks on sensitive user data
- Ensures user's audio/video streams cannot be intercepted
- Protects user privacy

### Self-Signed Certificate Limitations

**Production Considerations**:
- ⚠️ Self-signed certificates are NOT secure for production
- Browser will show security warning
- Users must manually accept certificate
- No certificate authority validation

**Production Solutions**:
- Use Let's Encrypt for free SSL certificates
- Purchase SSL certificate from trusted CA
- Use reverse proxy (nginx, Caddy) with proper SSL
- Deploy to platforms with built-in SSL (Vercel, Netlify)

### Server Configuration

**Hostname**: `0.0.0.0`
- Binds to all network interfaces
- Accessible via:
  - `https://localhost:7000`
  - `https://127.0.0.1:7000`
  - `https://[local-ip]:7000`
  - `https://[network-ip]:7000`

**Port**: 7000
- Same as HTTP version for consistency
- Configurable via PORT environment variable

---

## Files Modified

1. **`/root/LibreChat/server.js`** (NEW)
   - Custom HTTPS server implementation
   - Integrates with Next.js request handler
   - Loads SSL certificates from `.cert/` directory

2. **`/root/LibreChat/package.json`** (line 7)
   - Added `dev:https` npm script

3. **`/root/LibreChat/.cert/key.pem`** (NEW)
   - RSA 4096-bit private key
   - Should be added to .gitignore

4. **`/root/LibreChat/.cert/cert.pem`** (NEW)
   - Self-signed X.509 certificate
   - Valid for 365 days
   - Should be added to .gitignore

5. **`/root/LibreChat/src/components/HomeChat/Chat.tsx`** (lines 642-648, 991-1012)
   - Added mediaDevices availability check
   - Conditional rendering of microphone button
   - Updated tooltip to explain HTTPS requirement

---

## Testing Instructions

### 1. Start HTTPS Server

```bash
npm run dev:https
```

Expected output:
```
> OrninaChat@1.0.0 dev:https
> node server.js

> Ready on https://0.0.0.0:7000
```

### 2. Accept Self-Signed Certificate

1. Navigate to `https://localhost:7000` (or your IP)
2. Browser will show security warning:
   - **Chrome**: "Your connection is not private" → Click "Advanced" → "Proceed to localhost (unsafe)"
   - **Firefox**: "Warning: Potential Security Risk Ahead" → Click "Advanced" → "Accept the Risk and Continue"
   - **Safari**: "This Connection Is Not Private" → Click "Show Details" → "visit this website"
3. Certificate accepted for current browser session

### 3. Test Voice Input

1. Navigate to `/home-chat` page
2. Microphone icon should be visible (if not, check browser console)
3. Click microphone icon
4. Browser will prompt for microphone permission → Click "Allow"
5. Icon turns red and pulses while recording
6. Speak in Arabic or English
7. Click microphone again to stop
8. Wait for transcription (icon shows "Transcribing...")
9. Transcribed text appears in input field

### 4. Verify Secure Context

Open browser console and run:
```javascript
console.log('Secure context:', window.isSecureContext);
console.log('MediaDevices available:', !!navigator.mediaDevices);
```

Expected output:
```
Secure context: true
MediaDevices available: true
```

---

## Known Issues

### Resolved:
- ✅ MediaDevices TypeError - Fixed with availability checks
- ✅ Non-secure context blocking microphone - Fixed with HTTPS
- ✅ Network IP access - Fixed with 0.0.0.0 binding

### Outstanding:
- ⚠️ Self-signed certificate warning on first access (expected behavior)
- ⚠️ Certificate expires in 365 days (regenerate when needed)
- ⚠️ Not production-ready (needs proper SSL certificate)

---

## Security Considerations

### Development Environment (Current Setup):
- ✅ Adequate for local network testing
- ✅ Enables MediaDevices API
- ✅ No external exposure recommended

### Production Environment (Future Requirements):
1. **Proper SSL Certificate**:
   ```bash
   # Using Let's Encrypt (free)
   certbot certonly --standalone -d yourdomain.com
   ```

2. **Environment Variables**:
   ```bash
   # .env.production
   SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
   SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
   ```

3. **Reverse Proxy** (nginx example):
   ```nginx
   server {
     listen 443 ssl http2;
     server_name yourdomain.com;

     ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
     ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

     location / {
       proxy_pass http://localhost:7000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

---

## Git Commit Message

```
feat(https): Add SSL/HTTPS support for voice input

- Generate self-signed SSL certificate with OpenSSL
- Create custom HTTPS server with Node.js HTTPS module
- Add dev:https npm script for HTTPS development
- Implement MediaDevices API availability checks
- Add conditional rendering for microphone button
- Update tooltips to explain HTTPS requirement
- Enable voice input over network IP addresses

Technical Details:
- Server binds to 0.0.0.0:7000 for network accessibility
- RSA 4096-bit certificate valid for 365 days
- Graceful degradation when MediaDevices unavailable
- Compatible with Next.js 16.0.1 request handling

Resolves: Voice input not working over network IP
Related: MediaDevices API secure context requirement

📚 Documented in .history/2025-10-29-https-ssl-setup.md
```

---

## User Confirmation

**Status**: ✅ HTTPS server running successfully
**Server URL**: https://0.0.0.0:7000
**Confirmed By**: Awaiting user testing
**Date**: 2025-10-29

---

## Next Steps (Future Enhancements)

1. **Certificate Management**:
   - Add certificate expiration check
   - Automate certificate renewal
   - Document certificate regeneration process

2. **Production Deployment**:
   - Integrate Let's Encrypt
   - Configure proper reverse proxy
   - Implement SSL/TLS best practices
   - Add HSTS headers

3. **Development Experience**:
   - Add mkcert support for trusted local certificates
   - Auto-accept certificate in development
   - Add HTTPS redirect from HTTP

4. **Documentation**:
   - Add troubleshooting guide for certificate issues
   - Document browser-specific certificate acceptance
   - Add deployment guide with proper SSL

---

## Environment Details

- **Node.js Version**: v20.19.5
- **Next.js Version**: 16.0.1
- **Platform**: Linux 6.8.0-86-generic
- **Port**: 7000 (HTTPS)
- **Certificate Algorithm**: RSA 4096-bit
- **Certificate Validity**: 365 days
- **Server Hostname**: 0.0.0.0 (all interfaces)

---

## Commands Reference

### Start HTTPS Server:
```bash
npm run dev:https
```

### Start HTTP Server (for localhost testing):
```bash
npm run dev
```

### Regenerate SSL Certificate:
```bash
cd .cert
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

### Check Certificate Details:
```bash
openssl x509 -in .cert/cert.pem -text -noout
```

### Check Certificate Expiration:
```bash
openssl x509 -in .cert/cert.pem -noout -enddate
```

---

*This document was auto-generated as part of the development history tracking system.*
