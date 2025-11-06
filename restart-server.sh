#!/bin/bash

echo "🔄 Restarting LibreChat Server..."

# Kill existing server processes
echo "📍 Stopping existing server..."
pkill -f "node.*server.js" || echo "No server process found"
pkill -f "npm.*dev" || echo "No dev process found"

# Wait for ports to be released
sleep 2

# Clear any stuck processes on ports 7000 and 7001
lsof -ti:7000 | xargs kill -9 2>/dev/null || true
lsof -ti:7001 | xargs kill -9 2>/dev/null || true

echo "✅ Old processes stopped"

# Start the server
echo "🚀 Starting server..."
cd /root/LibreChat

# Run in background and redirect output
nohup npm run dev > server.log 2>&1 &

echo "✅ Server starting..."
echo "📝 Logs: tail -f /root/LibreChat/server.log"
echo "🌐 HTTPS: https://www.chat.ornina.ae"
echo "🌐 HTTP: http://localhost:7001"

# Wait a moment and check if it started
sleep 3
if lsof -i:7000 > /dev/null 2>&1; then
    echo "✅ Server is running on port 7000"
else
    echo "⚠️  Server may not have started - check logs"
fi
