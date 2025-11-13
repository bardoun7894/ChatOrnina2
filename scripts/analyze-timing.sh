#!/bin/bash

echo "🔍 WebSocket Timing Analysis"
echo "============================"
echo ""

# Get the last 100 lines of logs
LOGS=$(docker logs --tail 100 librechat-app-prod 2>&1)

# Extract realtime connection attempts
echo "📊 Recent Connection Attempts:"
echo "$LOGS" | grep -E "\[Realtime\]" | tail -50

echo ""
echo "⏱️  Timing Analysis:"
echo "-------------------"

# Look for timing patterns
echo "$LOGS" | grep -E "after.*ms" | tail -20

echo ""
echo "🔴 Error Summary:"
echo "----------------"
echo "$LOGS" | grep -E "Error|error|❌" | grep -i realtime | tail -10

echo ""
echo "📈 ReadyState Progression:"
echo "-------------------------"
echo "$LOGS" | grep -i "readystate" | tail -10

echo ""
echo "🎯 Key Events:"
echo "-------------"
# Show the sequence of events
echo "$LOGS" | grep -E "Creating OpenAI|initial readyState|Client disconnected|OpenAI connection closed|Timeout check" | tail -20
