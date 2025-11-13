#!/bin/bash

echo "🔧 Quick Fix & Deploy Script"
echo "=============================="
echo ""

cd /root/LibreChat

echo "1️⃣ Stopping containers..."
docker-compose -f docker-compose.prod.yml down

echo ""
echo "2️⃣ Building fresh image (no cache)..."
docker-compose -f docker-compose.prod.yml build --no-cache app

echo ""
echo "3️⃣ Starting containers..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "4️⃣ Waiting for containers to be healthy..."
sleep 10

echo ""
echo "5️⃣ Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "6️⃣ Testing health endpoint..."
sleep 5
curl -s http://localhost:7002/api/health | jq '.' || echo "Health check failed"

echo ""
echo "7️⃣ Recent logs:"
docker logs --tail 20 librechat-app-prod

echo ""
echo "✅ Done! Site should be accessible at https://www.chat.ornina.ae"
echo ""
echo "To monitor logs: docker logs -f librechat-app-prod"
echo "To check status: docker ps"
