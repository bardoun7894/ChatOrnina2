#!/bin/bash

###############################################################################
# WebSocket Log Analyzer
# Analyzes Docker logs for WebSocket connection patterns and issues
###############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Default time window
TIME_WINDOW="${1:-1h}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       WebSocket Connection Analyzer                      ║${NC}"
echo -e "${BLUE}║       Time Window: $TIME_WINDOW                                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get logs
LOGS=$(docker logs --since "$TIME_WINDOW" librechat-app-prod 2>&1)

# Connection Statistics
echo -e "${CYAN}━━━ CONNECTION STATISTICS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

TOTAL_CONNECTIONS=$(echo "$LOGS" | grep -c "\[Realtime\] Client connected" || echo 0)
SUCCESSFUL_OPENS=$(echo "$LOGS" | grep -c "OpenAI connection established successfully" || echo 0)
INITIALIZING=$(echo "$LOGS" | grep -c "Sent initializing message" || echo 0)
READY_MESSAGES=$(echo "$LOGS" | grep -c "Sent ready message" || echo 0)
SESSION_CREATED=$(echo "$LOGS" | grep -c "Session configured" || echo 0)

echo -e "  Total Connections:        ${BLUE}$TOTAL_CONNECTIONS${NC}"
echo -e "  Initializing Sent:        ${BLUE}$INITIALIZING${NC}"
echo -e "  OpenAI Opens:             ${GREEN}$SUCCESSFUL_OPENS${NC}"
echo -e "  Ready Messages:           ${GREEN}$READY_MESSAGES${NC}"
echo -e "  Sessions Configured:      ${GREEN}$SESSION_CREATED${NC}"

if [[ $TOTAL_CONNECTIONS -gt 0 ]]; then
    SUCCESS_RATE=$(( (SUCCESSFUL_OPENS * 100) / TOTAL_CONNECTIONS ))
    if [[ $SUCCESS_RATE -ge 90 ]]; then
        echo -e "  Success Rate:             ${GREEN}${SUCCESS_RATE}%${NC}"
    elif [[ $SUCCESS_RATE -ge 70 ]]; then
        echo -e "  Success Rate:             ${YELLOW}${SUCCESS_RATE}%${NC}"
    else
        echo -e "  Success Rate:             ${RED}${SUCCESS_RATE}% ⚠${NC}"
    fi
fi

echo ""

# Error Analysis
echo -e "${CYAN}━━━ ERROR ANALYSIS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ERROR_1006=$(echo "$LOGS" | grep -c "code.*1006\|1006.*code" || echo 0)
ERROR_1011=$(echo "$LOGS" | grep -c "code.*1011\|1011.*code" || echo 0)
TIMEOUTS=$(echo "$LOGS" | grep -c "timeout" || echo 0)
CONNECTION_ERRORS=$(echo "$LOGS" | grep -c "connection.*error\|error.*connection" || echo 0)
OPENAI_ERRORS=$(echo "$LOGS" | grep -c "OpenAI.*error" || echo 0)

echo -e "  1006 (Abnormal Closure):  ${RED}$ERROR_1006${NC}"
echo -e "  1011 (Server Error):      ${RED}$ERROR_1011${NC}"
echo -e "  Timeouts:                 ${RED}$TIMEOUTS${NC}"
echo -e "  Connection Errors:        ${RED}$CONNECTION_ERRORS${NC}"
echo -e "  OpenAI API Errors:        ${RED}$OPENAI_ERRORS${NC}"

echo ""

# Timing Analysis
echo -e "${CYAN}━━━ TIMING ANALYSIS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Extract timestamps for connection flow
echo "$LOGS" | grep "\[Realtime\]" | grep -E "Client connected|OpenAI connection established|Sent ready message" | tail -5 | while IFS= read -r line; do
    TIMESTAMP=$(echo "$line" | grep -oP '\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z' || echo "$line" | grep -oP '\d{2}:\d{2}:\d{2}')
    MESSAGE=$(echo "$line" | sed 's/.*\[Realtime\]/[Realtime]/')
    
    if echo "$MESSAGE" | grep -q "Client connected"; then
        echo -e "  ${BLUE}$TIMESTAMP${NC} → Client connected"
    elif echo "$MESSAGE" | grep -q "OpenAI connection established"; then
        echo -e "  ${GREEN}$TIMESTAMP${NC} → OpenAI connected"
    elif echo "$MESSAGE" | grep -q "Sent ready message"; then
        echo -e "  ${GREEN}$TIMESTAMP${NC} → Ready sent to client"
    fi
done

echo ""

# Common Error Patterns
echo -e "${CYAN}━━━ COMMON ERROR PATTERNS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Pattern 1: Client disconnects before OpenAI connects
PATTERN1=$(echo "$LOGS" | grep -B2 "Client disconnected" | grep -c "Connecting to OpenAI" || echo 0)
if [[ $PATTERN1 -gt 0 ]]; then
    echo -e "  ${RED}⚠${NC} Client disconnects during OpenAI handshake: ${RED}$PATTERN1${NC}"
    echo -e "     ${YELLOW}→ Possible cause: Slow OpenAI connection${NC}"
fi

# Pattern 2: OpenAI connection timeout
PATTERN2=$(echo "$LOGS" | grep -c "OpenAI connection timeout" || echo 0)
if [[ $PATTERN2 -gt 0 ]]; then
    echo -e "  ${RED}⚠${NC} OpenAI connection timeouts: ${RED}$PATTERN2${NC}"
    echo -e "     ${YELLOW}→ Possible cause: Network issues or OpenAI API slow${NC}"
fi

# Pattern 3: Upstream connection error
PATTERN3=$(echo "$LOGS" | grep -c "Upstream connection" || echo 0)
if [[ $PATTERN3 -gt 0 ]]; then
    echo -e "  ${RED}⚠${NC} Upstream connection errors: ${RED}$PATTERN3${NC}"
    echo -e "     ${YELLOW}→ Possible cause: OpenAI API issues${NC}"
fi

# Pattern 4: No errors
if [[ $ERROR_1006 -eq 0 ]] && [[ $TIMEOUTS -eq 0 ]] && [[ $CONNECTION_ERRORS -eq 0 ]]; then
    echo -e "  ${GREEN}✓ No error patterns detected${NC}"
fi

echo ""

# Recent 1006 Errors (with context)
if [[ $ERROR_1006 -gt 0 ]]; then
    echo -e "${CYAN}━━━ RECENT 1006 ERRORS (with context) ━━━━━━━━━━━━━━━━━━━${NC}"
    
    echo "$LOGS" | grep -B3 -A3 "1006" | tail -20 | while IFS= read -r line; do
        if echo "$line" | grep -q "1006"; then
            echo -e "  ${RED}→ $line${NC}"
        elif echo "$line" | grep -q "\[Realtime\]"; then
            echo -e "  ${YELLOW}  $line${NC}"
        fi
    done
    
    echo ""
fi

# Recommendations
echo -e "${CYAN}━━━ RECOMMENDATIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [[ $ERROR_1006 -gt 5 ]]; then
    echo -e "  ${RED}⚠${NC} High 1006 error rate detected"
    echo -e "     ${BLUE}1.${NC} Check if keepalive messages are being sent"
    echo -e "     ${BLUE}2.${NC} Verify Nginx proxy_read_timeout is set to 3600s"
    echo -e "     ${BLUE}3.${NC} Check OpenAI API status: https://status.openai.com"
    echo -e "     ${BLUE}4.${NC} Review recent code changes to server.js"
elif [[ $SUCCESS_RATE -lt 90 ]] && [[ $TOTAL_CONNECTIONS -gt 0 ]]; then
    echo -e "  ${YELLOW}⚠${NC} Success rate below 90%"
    echo -e "     ${BLUE}1.${NC} Monitor OpenAI API latency"
    echo -e "     ${BLUE}2.${NC} Check server resources (CPU/Memory)"
    echo -e "     ${BLUE}3.${NC} Review timeout configurations"
else
    echo -e "  ${GREEN}✓${NC} WebSocket connections appear healthy"
    echo -e "     ${BLUE}→${NC} Continue monitoring for patterns"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Usage: $0 [time-window]${NC}"
echo -e "${YELLOW}Example: $0 30m    # Analyze last 30 minutes${NC}"
echo -e "${YELLOW}         $0 2h     # Analyze last 2 hours${NC}"
echo ""
