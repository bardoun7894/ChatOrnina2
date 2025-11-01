import { NextApiRequest, NextApiResponse } from 'next';
import { WebSocketServer } from 'ws';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store WebSocket server instance
let wss: WebSocketServer | null = null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // This endpoint is for WebSocket upgrade only
  // Next.js API routes don't natively support WebSocket upgrades
  // We need to handle this in a custom server

  res.status(426).json({
    error: 'Upgrade Required',
    message: 'This endpoint requires WebSocket protocol. Please use a custom Next.js server with WebSocket support.',
  });
}

// Export WebSocket handler for custom server
export const handleWebSocketUpgrade = (ws: any, req: any) => {
  console.log('[Voice Call WebSocket] Client connected');

  let rtConnection: any = null;

  ws.on('message', async (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('[Voice Call WebSocket] Received:', data.type);

      switch (data.type) {
        case 'start':
          // Initialize OpenAI Realtime API connection
          console.log('[Voice Call WebSocket] Starting Realtime API session');

          // For now, send a mock response
          // TODO: Implement actual OpenAI Realtime API integration
          ws.send(JSON.stringify({
            type: 'session_started',
            sessionId: `session-${Date.now()}`,
          }));
          break;

        case 'audio':
          // Handle incoming audio from client
          if (rtConnection) {
            // Forward to OpenAI Realtime API
            rtConnection.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: data.audio,
            }));
          }
          break;

        case 'stop':
          // Clean up connection
          if (rtConnection) {
            rtConnection.close();
            rtConnection = null;
          }
          ws.send(JSON.stringify({ type: 'stopped' }));
          break;

        default:
          console.warn('[Voice Call WebSocket] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[Voice Call WebSocket] Error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  });

  ws.on('close', () => {
    console.log('[Voice Call WebSocket] Client disconnected');
    if (rtConnection) {
      rtConnection.close();
      rtConnection = null;
    }
  });

  ws.on('error', (error: Error) => {
    console.error('[Voice Call WebSocket] Error:', error);
  });
};
