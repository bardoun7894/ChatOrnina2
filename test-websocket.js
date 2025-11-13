const WebSocket = require('ws');

console.log('Testing WebSocket connection to ws://localhost:7002/api/voice-realtime');

const ws = new WebSocket('ws://localhost:7002/api/voice-realtime?lang=ar');

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!');
  ws.close();
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log(`WebSocket closed: ${code} ${reason}`);
  if (code !== 1000) {
    process.exit(1);
  }
});

setTimeout(() => {
  console.log('⏱️ Timeout - connection took too long');
  ws.close();
  process.exit(1);
}, 5000);
