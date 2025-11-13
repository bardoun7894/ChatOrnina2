#!/bin/bash

###############################################################################
# Quick Non-Interactive Deployment
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       LibreChat Quick Deployment                         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Fix Nginx config
echo -e "${YELLOW}[1/5] Fixing Nginx configuration...${NC}"
NGINX_CONFIG="/etc/nginx/sites-enabled/librechat"

if grep -q "proxy_pass https://127.0.0.1:7001" "$NGINX_CONFIG"; then
    echo -e "${BLUE}  Backing up config...${NC}"
    cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    
    echo -e "${BLUE}  Fixing port: 7001 → 7002${NC}"
    sed -i 's|proxy_pass https://127.0.0.1:7001|proxy_pass http://127.0.0.1:7002|g' "$NGINX_CONFIG"
    sed -i '/proxy_ssl_verify off;/d' "$NGINX_CONFIG"
    
    if nginx -t 2>&1 | grep -q "successful"; then
        systemctl reload nginx
        echo -e "${GREEN}✓ Nginx config fixed and reloaded${NC}"
    else
        echo -e "${RED}✗ Nginx config test failed${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Nginx config already correct${NC}"
fi

# Stop containers
echo -e "${YELLOW}[2/5] Stopping containers...${NC}"
cd /root/LibreChat
docker-compose -f docker-compose.prod.yml down --remove-orphans

# Build
echo -e "${YELLOW}[3/5] Building Docker image...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

# Start
echo -e "${YELLOW}[4/5] Starting containers...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Wait for health
echo -e "${YELLOW}[5/5] Waiting for containers...${NC}"
sleep 10

# Check status
HEALTH=$(docker inspect --format='{{.State.Health.Status}}' librechat-app-prod 2>/dev/null || echo "unknown")
echo -e "${BLUE}  Container health: $HEALTH${NC}"

# Test health endpoint
HEALTH_RESPONSE=$(curl -s http://localhost:7002/api/health)
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ Health endpoint responding${NC}"
else
    echo -e "${YELLOW}⚠ Health endpoint: $HEALTH_RESPONSE${NC}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Deployment Complete!                            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Monitor: bash scripts/monitor-dashboard.sh"
echo -e "  2. Test voice call at: https://www.chat.ornina.ae"
echo -e "  3. Check logs: docker logs -f librechat-app-prod | grep -i realtime"
echo ""
