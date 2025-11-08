import { NextApiRequest } from 'next';
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';

// Extend NextApiRequest to include socket for WebSocket upgrade
interface WebSocketRequest extends NextApiRequest {
  socket: any;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: WebSocketRequest, res: any) {
  // This endpoint is handled by the WebSocket server in server.js
  // Just return 426 Upgrade Required for HTTP requests
  res.status(426).json({
    error: 'This endpoint requires WebSocket connection',
    upgrade: 'ws://localhost:7000/api/voice-call'
  });
}
