#!/bin/bash

###############################################################################
# LibreChat Production Deployment Script
# - Checks port conflicts before deployment
# - Fixes Nginx configuration
# - Rebuilds and deploys Docker containers
# - Sets up monitoring
# - Verifies SSL and WebSocket connectivity
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_PORT=7002
NGINX_CONFIG="/etc/nginx/sites-enabled/librechat"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
LOG_DIR="/var/log/librechat"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       LibreChat Production Deployment Script             ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# 1. PRE-DEPLOYMENT CHECKS
###############################################################################

echo -e "${YELLOW}[1/8] Running pre-deployment checks...${NC}"

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}✗ This script must be run as root or with sudo${NC}"
   exit 1
fi

# Check required commands
for cmd in docker docker-compose nginx curl; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}✗ Required command not found: $cmd${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ All required commands available${NC}"

###############################################################################
# 2. PORT CONFLICT CHECK
###############################################################################

echo -e "${YELLOW}[2/8] Checking for port conflicts...${NC}"

check_port() {
    local port=$1
    local service=$2
    
    if netstat -tlnp 2>/dev/null | grep -q ":$port " || ss -tlnp 2>/dev/null | grep -q ":$port "; then
        local process=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | head -1)
        if [[ -z "$process" ]]; then
            process=$(ss -tlnp 2>/dev/null | grep ":$port " | awk -F'users:' '{print $2}' | head -1)
        fi
        
        # Check if it's our Docker container (expected)
        if echo "$process" | grep -q "docker-proxy"; then
            echo -e "${GREEN}✓ Port $port in use by Docker ($service) - Expected${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠ Port $port in use by: $process${NC}"
            echo -e "${YELLOW}  Service: $service${NC}"
            read -p "  Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        echo -e "${GREEN}✓ Port $port available for $service${NC}"
    fi
}

check_port 80 "Nginx HTTP"
check_port 443 "Nginx HTTPS"
check_port $APP_PORT "LibreChat App"
check_port 27019 "MongoDB"

###############################################################################
# 3. NGINX CONFIGURATION FIX
###############################################################################

echo -e "${YELLOW}[3/8] Checking Nginx configuration...${NC}"

if [[ ! -f "$NGINX_CONFIG" ]]; then
    echo -e "${RED}✗ Nginx config not found: $NGINX_CONFIG${NC}"
    exit 1
fi

# Check if Nginx is pointing to wrong port (7001 instead of 7002)
if grep -q "proxy_pass https://127.0.0.1:7001" "$NGINX_CONFIG"; then
    echo -e "${YELLOW}⚠ Found incorrect port 7001 in Nginx config${NC}"
    echo -e "${BLUE}  Fixing: 7001 → 7002${NC}"
    
    # Backup original config
    cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Fix the port
    sed -i 's|proxy_pass https://127.0.0.1:7001|proxy_pass http://127.0.0.1:7002|g' "$NGINX_CONFIG"
    
    # Also fix proxy_ssl_verify (not needed for localhost)
    sed -i '/proxy_ssl_verify off;/d' "$NGINX_CONFIG"
    
    echo -e "${GREEN}✓ Nginx config updated${NC}"
    
    # Test Nginx config
    if nginx -t 2>&1 | grep -q "successful"; then
        echo -e "${GREEN}✓ Nginx config test passed${NC}"
        systemctl reload nginx
        echo -e "${GREEN}✓ Nginx reloaded${NC}"
    else
        echo -e "${RED}✗ Nginx config test failed${NC}"
        nginx -t
        exit 1
    fi
else
    echo -e "${GREEN}✓ Nginx config already correct${NC}"
fi

# Verify WebSocket configuration
if grep -q "proxy_read_timeout 3600s" "$NGINX_CONFIG"; then
    echo -e "${GREEN}✓ WebSocket timeout configured (3600s)${NC}"
else
    echo -e "${YELLOW}⚠ WebSocket timeout not optimal${NC}"
fi

###############################################################################
# 4. SSL CERTIFICATE CHECK
###############################################################################

echo -e "${YELLOW}[4/8] Checking SSL certificates...${NC}"

SSL_CERT=$(grep -oP 'ssl_certificate\s+\K[^;]+' "$NGINX_CONFIG" | head -1 | xargs)
SSL_KEY=$(grep -oP 'ssl_certificate_key\s+\K[^;]+' "$NGINX_CONFIG" | head -1 | xargs)

if [[ -f "$SSL_CERT" ]] && [[ -f "$SSL_KEY" ]]; then
    echo -e "${GREEN}✓ SSL certificate found: $SSL_CERT${NC}"
    
    # Check expiration
    EXPIRY=$(openssl x509 -enddate -noout -in "$SSL_CERT" | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))
    
    if [[ $DAYS_LEFT -lt 30 ]]; then
        echo -e "${YELLOW}⚠ SSL certificate expires in $DAYS_LEFT days${NC}"
        echo -e "${BLUE}  Run: sudo certbot renew${NC}"
    else
        echo -e "${GREEN}✓ SSL certificate valid for $DAYS_LEFT days${NC}"
    fi
else
    echo -e "${RED}✗ SSL certificate not found${NC}"
    echo -e "${BLUE}  Install Let's Encrypt: sudo certbot --nginx -d chat.ornina.ae -d www.chat.ornina.ae${NC}"
    exit 1
fi

###############################################################################
# 5. ENVIRONMENT VARIABLES CHECK
###############################################################################

echo -e "${YELLOW}[5/8] Checking environment variables...${NC}"

if [[ ! -f ".env" ]]; then
    echo -e "${RED}✗ .env file not found${NC}"
    exit 1
fi

# Check critical variables
REQUIRED_VARS=("OPENAI_API_KEY" "NEXTAUTH_SECRET" "NEXTAUTH_URL")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env; then
        MISSING_VARS+=("$var")
    fi
done

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
    echo -e "${RED}✗ Missing required environment variables:${NC}"
    printf '  - %s\n' "${MISSING_VARS[@]}"
    exit 1
fi

echo -e "${GREEN}✓ All required environment variables present${NC}"

###############################################################################
# 6. DOCKER BUILD & DEPLOY
###############################################################################

echo -e "${YELLOW}[6/8] Building and deploying Docker containers...${NC}"

# Stop existing containers gracefully
echo -e "${BLUE}  Stopping existing containers...${NC}"
docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans || true

# Build with no cache to ensure latest code
echo -e "${BLUE}  Building Docker image (this may take a few minutes)...${NC}"
docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache

# Start containers
echo -e "${BLUE}  Starting containers...${NC}"
docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

# Wait for containers to be healthy
echo -e "${BLUE}  Waiting for containers to be healthy...${NC}"
MAX_WAIT=120
WAITED=0

while [[ $WAITED -lt $MAX_WAIT ]]; do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' librechat-app-prod 2>/dev/null || echo "starting")
    
    if [[ "$HEALTH" == "healthy" ]]; then
        echo -e "${GREEN}✓ Container is healthy${NC}"
        break
    elif [[ "$HEALTH" == "unhealthy" ]]; then
        echo -e "${RED}✗ Container is unhealthy${NC}"
        docker logs --tail 50 librechat-app-prod
        exit 1
    fi
    
    echo -e "${BLUE}  Status: $HEALTH (${WAITED}s/${MAX_WAIT}s)${NC}"
    sleep 5
    WAITED=$((WAITED + 5))
done

if [[ $WAITED -ge $MAX_WAIT ]]; then
    echo -e "${YELLOW}⚠ Health check timeout, but container may still be starting${NC}"
fi

###############################################################################
# 7. MONITORING SETUP
###############################################################################

echo -e "${YELLOW}[7/8] Setting up monitoring...${NC}"

# Create log directory
mkdir -p "$LOG_DIR"

# Create monitoring script
cat > /usr/local/bin/librechat-monitor.sh << 'MONITOR_EOF'
#!/bin/bash

LOG_FILE="/var/log/librechat/monitor.log"
ALERT_FILE="/var/log/librechat/alerts.log"

# Check Docker container health
HEALTH=$(docker inspect --format='{{.State.Health.Status}}' librechat-app-prod 2>/dev/null || echo "not_running")

if [[ "$HEALTH" != "healthy" ]]; then
    echo "[$(date)] ALERT: Container unhealthy - Status: $HEALTH" >> "$ALERT_FILE"
fi

# Check for WebSocket 1006 errors
WS_ERRORS=$(docker logs --since 5m librechat-app-prod 2>&1 | grep -c "1006" || echo 0)

if [[ $WS_ERRORS -gt 5 ]]; then
    echo "[$(date)] ALERT: High WebSocket 1006 errors: $WS_ERRORS in last 5 minutes" >> "$ALERT_FILE"
fi

# Check Nginx errors
NGINX_ERRORS=$(tail -100 /var/log/nginx/librechat-error.log 2>/dev/null | grep -c "error" || echo 0)

if [[ $NGINX_ERRORS -gt 10 ]]; then
    echo "[$(date)] ALERT: High Nginx errors: $NGINX_ERRORS in last 100 lines" >> "$ALERT_FILE"
fi

# Log status
echo "[$(date)] Health: $HEALTH | WS Errors: $WS_ERRORS | Nginx Errors: $NGINX_ERRORS" >> "$LOG_FILE"
MONITOR_EOF

chmod +x /usr/local/bin/librechat-monitor.sh

# Create systemd service for monitoring
cat > /etc/systemd/system/librechat-monitor.service << 'SERVICE_EOF'
[Unit]
Description=LibreChat Monitoring Service
After=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/librechat-monitor.sh
SERVICE_EOF

# Create systemd timer (runs every 5 minutes)
cat > /etc/systemd/system/librechat-monitor.timer << 'TIMER_EOF'
[Unit]
Description=LibreChat Monitoring Timer
Requires=librechat-monitor.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
TIMER_EOF

# Enable and start timer
systemctl daemon-reload
systemctl enable librechat-monitor.timer
systemctl start librechat-monitor.timer

echo -e "${GREEN}✓ Monitoring service installed${NC}"
echo -e "${BLUE}  Logs: $LOG_DIR/monitor.log${NC}"
echo -e "${BLUE}  Alerts: $LOG_DIR/alerts.log${NC}"

###############################################################################
# 8. VERIFICATION
###############################################################################

echo -e "${YELLOW}[8/8] Running verification tests...${NC}"

# Test health endpoint
echo -e "${BLUE}  Testing health endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:$APP_PORT/api/health)

if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ Health endpoint responding${NC}"
else
    echo -e "${RED}✗ Health endpoint failed${NC}"
    echo "$HEALTH_RESPONSE"
fi

# Test HTTPS
echo -e "${BLUE}  Testing HTTPS...${NC}"
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://www.chat.ornina.ae)

if [[ "$HTTPS_CODE" == "200" ]]; then
    echo -e "${GREEN}✓ HTTPS working (HTTP $HTTPS_CODE)${NC}"
else
    echo -e "${YELLOW}⚠ HTTPS returned HTTP $HTTPS_CODE${NC}"
fi

# Show container status
echo -e "${BLUE}  Container status:${NC}"
docker ps --filter "name=librechat" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

###############################################################################
# DEPLOYMENT SUMMARY
###############################################################################

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Deployment Complete!                            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Monitoring:${NC}"
echo -e "   • Logs: tail -f $LOG_DIR/monitor.log"
echo -e "   • Alerts: tail -f $LOG_DIR/alerts.log"
echo -e "   • Docker logs: docker logs -f librechat-app-prod"
echo -e "   • Nginx logs: tail -f /var/log/nginx/librechat-error.log"
echo ""
echo -e "${BLUE}🔍 Useful Commands:${NC}"
echo -e "   • Check health: curl http://localhost:$APP_PORT/api/health"
echo -e "   • Container status: docker ps"
echo -e "   • Restart: docker-compose -f $DOCKER_COMPOSE_FILE restart app"
echo -e "   • View logs: docker logs -f librechat-app-prod | grep -i realtime"
echo ""
echo -e "${BLUE}🌐 URLs:${NC}"
echo -e "   • Production: https://www.chat.ornina.ae"
echo -e "   • Health: https://www.chat.ornina.ae/api/health"
echo ""
echo -e "${YELLOW}⚠ Next Steps:${NC}"
echo -e "   1. Test voice call at https://www.chat.ornina.ae"
echo -e "   2. Monitor for 1006 errors: docker logs -f librechat-app-prod | grep 1006"
echo -e "   3. Check alerts: tail -f $LOG_DIR/alerts.log"
echo ""
