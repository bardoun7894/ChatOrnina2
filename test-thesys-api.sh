#!/bin/bash

echo "Testing Thesys API..."
echo ""

# Get API key from container
API_KEY=$(docker exec librechat-app-prod env | grep THESYS_API_KEY | cut -d'=' -f2)

echo "API Key found: ${API_KEY:0:20}..."
echo ""

# Test the API
echo "Sending test request to Thesys API..."
curl -X POST https://api.thesys.dev/v1/embed/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "model": "c1/anthropic/claude-sonnet-4/v-20250930",
    "messages": [
      {
        "role": "system",
        "content": "You are a Generative UI assistant. Return a valid C1 DSL JSON spec only."
      },
      {
        "role": "user",
        "content": "simple card with hello"
      }
    ],
    "stream": false,
    "max_tokens": 1000
  }' \
  2>&1 | head -100

echo ""
echo "Test complete!"
