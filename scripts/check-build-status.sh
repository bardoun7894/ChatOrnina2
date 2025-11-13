#!/bin/bash

echo "🔍 Build Status Check"
echo "===================="
echo ""

# Check if containers are running
echo "📦 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "No containers running"

echo ""
echo "🏗️  Build Process:"
if pgrep -f "docker-compose.*build" > /dev/null; then
    echo "✅ Build is RUNNING"
else
    echo "⏹️  Build is NOT running"
fi

echo ""
echo "💾 Disk Space:"
df -h / | tail -1

echo ""
echo "🐳 Docker Disk Usage:"
docker system df 2>/dev/null || echo "Docker not available"

echo ""
echo "📊 Recent Build Logs (last 10 lines):"
docker-compose -f /root/LibreChat/docker-compose.prod.yml logs --tail 10 app 2>/dev/null || echo "No logs available yet"
