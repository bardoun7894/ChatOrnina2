#!/bin/bash

###############################################################################
# LibreChat Real-time Monitoring Dashboard
# Shows live stats for WebSocket connections, errors, and system health
###############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Clear screen and hide cursor
clear
tput civis

# Cleanup on exit
cleanup() {
    tput cnorm  # Show cursor
    exit 0
}
trap cleanup EXIT INT TERM

while true; do
    # Move cursor to top
    tput cup 0 0
    
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                  LibreChat Production Monitor                             ║${NC}"
    echo -e "${BLUE}║                  $(date '+%Y-%m-%d %H:%M:%S')                                        ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Container Health
    echo -e "${CYAN}━━━ CONTAINER HEALTH ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    APP_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' librechat-app-prod 2>/dev/null || echo "not_running")
    DB_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' librechat-mongodb-prod 2>/dev/null || echo "not_running")
    
    if [[ "$APP_HEALTH" == "healthy" ]]; then
        echo -e "  App Container:      ${GREEN}●${NC} HEALTHY"
    elif [[ "$APP_HEALTH" == "unhealthy" ]]; then
        echo -e "  App Container:      ${RED}●${NC} UNHEALTHY"
    else
        echo -e "  App Container:      ${YELLOW}●${NC} $APP_HEALTH"
    fi
    
    if [[ "$DB_HEALTH" == "healthy" ]]; then
        echo -e "  MongoDB:            ${GREEN}●${NC} HEALTHY"
    elif [[ "$DB_HEALTH" == "unhealthy" ]]; then
        echo -e "  MongoDB:            ${RED}●${NC} UNHEALTHY"
    else
        echo -e "  MongoDB:            ${YELLOW}●${NC} $DB_HEALTH"
    fi
    
    # Uptime
    APP_UPTIME=$(docker inspect --format='{{.State.StartedAt}}' librechat-app-prod 2>/dev/null)
    if [[ -n "$APP_UPTIME" ]]; then
        UPTIME_SECONDS=$(( $(date +%s) - $(date -d "$APP_UPTIME" +%s) ))
        UPTIME_HUMAN=$(printf '%dd %dh %dm' $((UPTIME_SECONDS/86400)) $((UPTIME_SECONDS%86400/3600)) $((UPTIME_SECONDS%3600/60)))
        echo -e "  Uptime:             ${BLUE}$UPTIME_HUMAN${NC}"
    fi
    
    echo ""
    
    # WebSocket Stats (Last 5 minutes)
    echo -e "${CYAN}━━━ WEBSOCKET STATS (Last 5 min) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    LOGS=$(docker logs --since 5m librechat-app-prod 2>&1)
    
    WS_CONNECTIONS=$(echo "$LOGS" | grep -c "\[Realtime\] Client connected" || echo 0)
    WS_READY=$(echo "$LOGS" | grep -c "OpenAI connection established successfully" || echo 0)
    WS_1006=$(echo "$LOGS" | grep -c "1006" || echo 0)
    WS_ERRORS=$(echo "$LOGS" | grep -c "\[Realtime\].*error" || echo 0)
    WS_TIMEOUTS=$(echo "$LOGS" | grep -c "timeout" || echo 0)
    
    echo -e "  New Connections:    ${GREEN}$WS_CONNECTIONS${NC}"
    echo -e "  Successful Opens:   ${GREEN}$WS_READY${NC}"
    
    if [[ $WS_1006 -eq 0 ]]; then
        echo -e "  1006 Errors:        ${GREEN}$WS_1006${NC}"
    elif [[ $WS_1006 -lt 5 ]]; then
        echo -e "  1006 Errors:        ${YELLOW}$WS_1006${NC}"
    else
        echo -e "  1006 Errors:        ${RED}$WS_1006 ⚠${NC}"
    fi
    
    if [[ $WS_ERRORS -eq 0 ]]; then
        echo -e "  Other WS Errors:    ${GREEN}$WS_ERRORS${NC}"
    else
        echo -e "  Other WS Errors:    ${YELLOW}$WS_ERRORS${NC}"
    fi
    
    if [[ $WS_TIMEOUTS -gt 0 ]]; then
        echo -e "  Timeouts:           ${RED}$WS_TIMEOUTS ⚠${NC}"
    else
        echo -e "  Timeouts:           ${GREEN}$WS_TIMEOUTS${NC}"
    fi
    
    echo ""
    
    # Nginx Stats
    echo -e "${CYAN}━━━ NGINX STATS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [[ -f /var/log/nginx/librechat-error.log ]]; then
        NGINX_ERRORS=$(tail -100 /var/log/nginx/librechat-error.log 2>/dev/null | grep -c "error" || echo 0)
        NGINX_WARNS=$(tail -100 /var/log/nginx/librechat-error.log 2>/dev/null | grep -c "warn" || echo 0)
        
        if [[ $NGINX_ERRORS -eq 0 ]]; then
            echo -e "  Errors (last 100):  ${GREEN}$NGINX_ERRORS${NC}"
        elif [[ $NGINX_ERRORS -lt 10 ]]; then
            echo -e "  Errors (last 100):  ${YELLOW}$NGINX_ERRORS${NC}"
        else
            echo -e "  Errors (last 100):  ${RED}$NGINX_ERRORS ⚠${NC}"
        fi
        
        echo -e "  Warnings:           ${BLUE}$NGINX_WARNS${NC}"
    else
        echo -e "  ${YELLOW}Log file not found${NC}"
    fi
    
    echo ""
    
    # System Resources
    echo -e "${CYAN}━━━ SYSTEM RESOURCES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Docker stats (single snapshot)
    STATS=$(docker stats --no-stream --format "{{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | grep librechat)
    
    if [[ -n "$STATS" ]]; then
        echo "$STATS" | while IFS=$'\t' read -r CONTAINER CPU MEM; do
            CONTAINER_SHORT=$(echo "$CONTAINER" | sed 's/librechat-//')
            CPU_NUM=$(echo "$CPU" | sed 's/%//')
            
            if (( $(echo "$CPU_NUM > 80" | bc -l 2>/dev/null || echo 0) )); then
                CPU_COLOR=$RED
            elif (( $(echo "$CPU_NUM > 50" | bc -l 2>/dev/null || echo 0) )); then
                CPU_COLOR=$YELLOW
            else
                CPU_COLOR=$GREEN
            fi
            
            printf "  %-20s ${CPU_COLOR}%6s${NC}  %s\n" "$CONTAINER_SHORT" "$CPU" "$MEM"
        done
    fi
    
    echo ""
    
    # Recent Errors (Last 10)
    echo -e "${CYAN}━━━ RECENT ERRORS (Last 10) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    RECENT_ERRORS=$(docker logs --since 5m librechat-app-prod 2>&1 | grep -i "error\|1006" | tail -10)
    
    if [[ -z "$RECENT_ERRORS" ]]; then
        echo -e "  ${GREEN}✓ No errors in last 5 minutes${NC}"
    else
        echo "$RECENT_ERRORS" | while IFS= read -r line; do
            # Truncate long lines
            SHORT_LINE=$(echo "$line" | cut -c1-75)
            echo -e "  ${RED}•${NC} $SHORT_LINE"
        done
    fi
    
    echo ""
    
    # SSL Certificate
    echo -e "${CYAN}━━━ SSL CERTIFICATE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    SSL_CERT="/etc/letsencrypt/live/www.chat.ornina.ae/fullchain.pem"
    if [[ -f "$SSL_CERT" ]]; then
        EXPIRY=$(openssl x509 -enddate -noout -in "$SSL_CERT" 2>/dev/null | cut -d= -f2)
        EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo 0)
        NOW_EPOCH=$(date +%s)
        DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))
        
        if [[ $DAYS_LEFT -lt 7 ]]; then
            echo -e "  Expires in:         ${RED}$DAYS_LEFT days ⚠${NC}"
        elif [[ $DAYS_LEFT -lt 30 ]]; then
            echo -e "  Expires in:         ${YELLOW}$DAYS_LEFT days${NC}"
        else
            echo -e "  Expires in:         ${GREEN}$DAYS_LEFT days${NC}"
        fi
    else
        echo -e "  ${RED}Certificate not found${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit | Refreshing every 5 seconds...${NC}"
    
    # Wait 5 seconds
    sleep 5
done
