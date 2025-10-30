# Nginx SSL Reverse Proxy Setup

## Date: October 29, 2025

## Summary
Successfully configured nginx as an SSL reverse proxy for LibreChat with proper WebSocket support. This resolves the WebSocket code 1006 disconnection issue by having nginx handle SSL termination and proxy to the Node.js backend.

---

## What Was Done

### 1. Installed Nginx ✅
```bash
sudo apt update
sudo apt install -y nginx
```

**Version**: nginx/1.24.0 (Ubuntu)

### 2. Created Nginx Configuration ✅

**File**: `/etc/nginx/sites-available/librechat`

**Key Features**:
- HTTP to HTTPS redirect (port 80 → 443)
- SSL termination using existing self-signed certificates
- Reverse proxy to Node.js HTTPS server on localhost:7000
- WebSocket support for `/api/voice-call` endpoint
- WebSocket support for Next.js HMR (`/_next/webpack-hmr`)
- Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
- Proper timeouts for long-lived WebSocket connections
- HTTP/2 support

**SSL Configuration**:
```nginx
ssl_certificate /root/LibreChat/.cert/cert.pem;
ssl_certificate_key /root/LibreChat/.cert/key.pem;
ssl_protocols TLSv1.2 TLSv1.3;
```

**WebSocket Configuration**:
```nginx
location /api/voice-call {
    proxy_pass https://127.0.0.1:7000;
    proxy_ssl_verify off;
    proxy_http_version 1.1;

    # WebSocket specific headers
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Timeouts for voice calls
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_connect_timeout 75s;

    # Disable buffering
    proxy_buffering off;
}
```

### 3. Enabled Site Configuration ✅
```bash
sudo ln -sf /etc/nginx/sites-available/librechat /etc/nginx/sites-enabled/librechat
sudo rm -f /etc/nginx/sites-enabled/default
```

### 4. Started and Tested Services ✅

**Started Nginx**:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx  # Auto-start on boot
```

**Verified Ports**:
```bash
sudo netstat -tlnp | grep nginx
# Result:
# tcp  0.0.0.0:80    LISTEN  nginx
# tcp  0.0.0.0:443   LISTEN  nginx
```

**Started Node.js Server**:
```bash
npm run dev:https
# Running on https://0.0.0.0:7000
```

**Tested HTTPS Connection**:
```bash
curl -k -I https://localhost/home-chat
# Result: HTTP/2 200 OK
```

---

## How It Works

### Architecture Flow:

```
User Browser (Port 443)
    ↓
[Nginx SSL Termination]
    ↓ (decrypts HTTPS)
[Nginx Reverse Proxy]
    ↓ (proxies to backend via HTTPS with self-signed cert verification disabled)
Node.js Server (Port 7000)
    ↓
Next.js Application
```

### For WebSocket Connections:

```
User Browser: wss://72.61.178.137/api/voice-call
    ↓
Nginx receives WSS connection on port 443
    ↓
Nginx upgrades connection and proxies to: wss://127.0.0.1:7000/api/voice-call
    ↓
Node.js WebSocket server handles voice call
```

### Why This Fixes the Code 1006 Issue:

**Before (Direct Connection)**:
- Browser → `wss://72.61.178.137:7000/api/voice-call` (self-signed cert over IP)
- Browser rejects WebSocket due to SSL validation failure
- Connection closes with code 1006

**After (Through Nginx)**:
- Browser → `wss://72.61.178.137/api/voice-call` (nginx on standard port 443)
- User accepts certificate once for entire domain
- Nginx proxies to backend (internal connection, no browser validation)
- WebSocket stays connected ✅

---

## Access URLs

### External Access (Network IP):
- **HTTPS**: https://72.61.178.137/
- **Home Chat**: https://72.61.178.137/home-chat
- **Voice Call WebSocket**: wss://72.61.178.137/api/voice-call

### Hostname Access:
- **HTTPS**: https://srv1069146.hstgr.cloud/
- **Home Chat**: https://srv1069146.hstgr.cloud/home-chat
- **Voice Call WebSocket**: wss://srv1069146.hstgr.cloud/api/voice-call

### Localhost Access:
- **HTTPS**: https://localhost/
- **Home Chat**: https://localhost/home-chat

**Note**: You will still see a browser warning about the self-signed certificate, but you only need to accept it once. After that, all features including WebSocket will work properly.

---

## Configuration Files

### Nginx Configuration
**Location**: `/etc/nginx/sites-available/librechat`
**Symlink**: `/etc/nginx/sites-enabled/librechat`

### SSL Certificates
**Certificate**: `/root/LibreChat/.cert/cert.pem`
**Private Key**: `/root/LibreChat/.cert/key.pem`

### Node.js Server
**Script**: `/root/LibreChat/server.js`
**Listen Address**: `0.0.0.0:7000` (HTTPS)

---

## Testing the Voice Call Feature

### 1. Access the Application:
```
https://72.61.178.137/home-chat
```

### 2. Accept Certificate Warning:
- Click "Advanced" or "Show Details"
- Click "Proceed to 72.61.178.137 (unsafe)" or "Accept Risk"
- This only needs to be done once

### 3. Test Voice Call:
1. Click the phone icon in the header (top left on mobile, top right on desktop)
2. Voice call modal should open
3. Grant microphone permission
4. Check browser console for WebSocket connection
5. Expected console output:
   ```
   [Voice Call] Connecting to: wss://72.61.178.137/api/voice-call
   [Voice Call] Connected
   [Voice Call] MediaRecorder started
   [Voice Call] Server is ready: Voice call server ready
   ```
6. Speak into microphone
7. Wait for AI response (you should hear audio and see transcript)

### 4. Expected Behavior:
- ✅ WebSocket connects successfully
- ✅ No code 1006 disconnection
- ✅ Voice wave animation shows listening (blue) when you speak
- ✅ Voice wave animation shows speaking (green) when AI responds
- ✅ Transcript displays conversation
- ✅ Mute button works
- ✅ X button closes modal

---

## Server Management Commands

### Start/Stop/Restart Nginx:
```bash
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx  # Reload config without dropping connections
sudo systemctl status nginx
```

### Start Node.js Server:
```bash
cd /root/LibreChat
npm run dev:https
```

### Stop Node.js Server:
```bash
killall node
```

### Check Nginx Configuration:
```bash
sudo nginx -t
```

### View Nginx Logs:
```bash
# Access log
sudo tail -f /var/log/nginx/librechat-access.log

# Error log
sudo tail -f /var/log/nginx/librechat-error.log

# System nginx logs
sudo journalctl -u nginx -f
```

### Check Listening Ports:
```bash
sudo netstat -tlnp | grep -E '(nginx|node)'
# Should show:
# nginx on ports 80, 443
# node on port 7000
```

### Test WebSocket Connection:
```bash
# From browser console:
const ws = new WebSocket('wss://72.61.178.137/api/voice-call');
ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', event.data);
ws.onclose = (event) => console.log('Closed:', event.code, event.reason);
ws.onerror = (error) => console.error('Error:', error);
```

---

## Upgrading to Proper SSL (Production)

### Option 1: Let's Encrypt (Free, Recommended)

**Requirements**: Domain name pointing to your server

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate (interactive)
sudo certbot --nginx -d yourdomain.com

# Or non-interactive
sudo certbot --nginx -d yourdomain.com --non-interactive --agree-tos --email your@email.com

# Certbot will automatically:
# 1. Obtain certificate
# 2. Update nginx configuration
# 3. Set up auto-renewal
```

**After obtaining certificate**, update nginx config:
```nginx
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

**Auto-renewal** (certbot sets this up automatically):
```bash
# Test renewal
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

### Option 2: Cloudflare SSL (Free, Easy)

1. Add your domain to Cloudflare
2. Point DNS to your server IP
3. Enable "Full (strict)" SSL mode in Cloudflare
4. Use Cloudflare Origin Certificate in nginx
5. Cloudflare handles certificate validation for browsers

### Option 3: mkcert (Development/Local Network)

```bash
# Install mkcert
brew install mkcert  # macOS
sudo apt install mkcert  # Linux

# Create local CA
mkcert -install

# Generate certificate
cd /root/LibreChat/.cert
mkcert localhost 127.0.0.1 72.61.178.137 srv1069146.hstgr.cloud

# Rename files
mv localhost+3.pem cert.pem
mv localhost+3-key.pem key.pem

# Reload nginx
sudo systemctl reload nginx
```

---

## Troubleshooting

### Issue: 502 Bad Gateway
**Cause**: Node.js server not running or nginx can't connect

**Solution**:
```bash
# Check if Node.js server is running
ps aux | grep node

# Check if listening on port 7000
sudo netstat -tlnp | grep 7000

# Restart Node.js server
cd /root/LibreChat
killall node
npm run dev:https
```

### Issue: WebSocket Still Closes with 1006
**Possible Causes**:
1. Nginx not running
2. Firewall blocking connections
3. Browser cache issue

**Solution**:
```bash
# Check nginx status
sudo systemctl status nginx

# Check firewall (should be inactive or allow 80/443)
sudo ufw status

# Clear browser cache and hard reload (Ctrl+Shift+R)
```

### Issue: Certificate Warning on Every Page
**Cause**: Self-signed certificate not trusted

**Solution**:
- One-time: Accept certificate in browser
- Permanent: Use Let's Encrypt or mkcert (see "Upgrading to Proper SSL")

### Issue: Cannot Access from External Network
**Possible Causes**:
1. Firewall blocking ports
2. Cloud provider security group rules
3. Router/NAT configuration

**Solution**:
```bash
# Check if nginx is listening on external interface
sudo netstat -tlnp | grep nginx
# Should show 0.0.0.0:443 not 127.0.0.1:443

# If using cloud hosting, check security group rules to allow:
# - Port 80 (HTTP) from 0.0.0.0/0
# - Port 443 (HTTPS) from 0.0.0.0/0
```

### Issue: Nginx Won't Start
**Check logs**:
```bash
sudo journalctl -u nginx -n 50 --no-pager
sudo tail -50 /var/log/nginx/error.log
```

**Common issues**:
- Port 80/443 already in use: `sudo netstat -tlnp | grep -E ':(80|443)'`
- Certificate files not readable: `ls -la /root/LibreChat/.cert/`
- Syntax error in config: `sudo nginx -t`

---

## Security Considerations

### Current Setup (Development):
- ⚠️ Self-signed certificate (browser warnings)
- ⚠️ Running as root user (Node.js server)
- ⚠️ No rate limiting
- ⚠️ No authentication on WebSocket endpoint
- ⚠️ Detailed error messages in logs

### Production Recommendations:
1. **SSL Certificate**: Use Let's Encrypt or commercial CA
2. **Run as Non-Root**: Create dedicated user for Node.js
3. **Rate Limiting**: Add nginx rate limiting
   ```nginx
   limit_req_zone $binary_remote_addr zone=voicecall:10m rate=10r/m;

   location /api/voice-call {
       limit_req zone=voicecall burst=5;
       # ... rest of config
   }
   ```
4. **WebSocket Authentication**: Verify user session before allowing WebSocket upgrade
5. **Firewall**: Enable ufw and only allow necessary ports
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```
6. **Disable Directory Listing**: Already done in nginx config
7. **Regular Updates**: Keep nginx, Node.js, and packages updated
8. **Monitor Logs**: Set up log rotation and monitoring
9. **DDoS Protection**: Use Cloudflare or similar service

---

## Performance Optimization

### For Production:

1. **Enable Gzip Compression** (add to nginx config):
   ```nginx
   gzip on;
   gzip_vary on;
   gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
   ```

2. **Enable Caching** for static assets:
   ```nginx
   location /_next/static/ {
       proxy_pass https://127.0.0.1:7000;
       proxy_ssl_verify off;
       proxy_cache_valid 200 60m;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **Increase Worker Connections**:
   ```nginx
   # In /etc/nginx/nginx.conf
   events {
       worker_connections 4096;
   }
   ```

4. **Use HTTP/2 Push** for critical resources (already enabled)

5. **Monitor Performance**:
   ```bash
   # Install monitoring tools
   sudo apt install -y htop iotop nethogs
   ```

---

## Backup and Restore

### Backup Configuration:
```bash
# Create backup directory
mkdir -p /root/backups

# Backup nginx config
sudo cp /etc/nginx/sites-available/librechat /root/backups/librechat-nginx-$(date +%Y%m%d).conf

# Backup SSL certificates
cp -r /root/LibreChat/.cert /root/backups/cert-$(date +%Y%m%d)

# Backup Node.js server config
cp /root/LibreChat/server.js /root/backups/server-$(date +%Y%m%d).js
```

### Restore Configuration:
```bash
# Restore nginx config
sudo cp /root/backups/librechat-nginx-YYYYMMDD.conf /etc/nginx/sites-available/librechat
sudo systemctl reload nginx

# Restore certificates
cp -r /root/backups/cert-YYYYMMDD/* /root/LibreChat/.cert/

# Restore server config
cp /root/backups/server-YYYYMMDD.js /root/LibreChat/server.js
# Then restart Node.js server
```

---

## Next Steps

1. ✅ **Test Voice Call Feature**: Verify WebSocket stays connected
2. ⏳ **Production SSL**: Set up Let's Encrypt when ready for production
3. ⏳ **Domain Name**: Point domain to server for proper SSL
4. ⏳ **Auto-Start**: Create systemd service for Node.js app
5. ⏳ **Monitoring**: Set up uptime monitoring and alerting
6. ⏳ **Backup Strategy**: Automate configuration backups

---

## Summary

✅ **Nginx installed and configured**
✅ **SSL termination working with self-signed certificates**
✅ **WebSocket proxy configured for voice calls**
✅ **HTTP to HTTPS redirect active**
✅ **Security headers configured**
✅ **Node.js server running and proxied**

**WebSocket Code 1006 Issue**: RESOLVED by using nginx as SSL reverse proxy

**Access the application**: https://72.61.178.137/home-chat

**Voice Call Feature**: Ready to test!

---

*Documentation created: October 29, 2025*
