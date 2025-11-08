import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import OpenAI from 'openai';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Disable Next.js body parser for WebSocket
export const config = {
  api: {
    bodyParser: false,
  },
};

let wss: WebSocketServer | null = null;

// Initialize WebSocket Server
function initWebSocketServer() {
  if (!wss) {
    wss = new WebSocketServer({ noServer: true });
    console.log('[Voice Call] WebSocket server initialized');
  }
  return wss;
}

export default function handler(req: IncomingMessage, res: any) {
  const server = res.socket?.server;

  if (!server) {
    res.status(500).json({ error: 'Server not available' });
    return;
  }

  // Initialize WebSocket server once
  if (!server.ws) {
    const wss = initWebSocketServer();
    server.ws = wss;

    server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
      if (request.url === '/api/voice-call') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    });

    // Handle WebSocket connections
    wss.on('connection', async (ws: WebSocket) => {
      console.log('[Voice Call] Client connected');

      let conversationHistory: Array<{ role: string; content: string }> = [
        {
          role: 'system',
          content: 'You are a helpful AI assistant having a voice conversation. Keep your responses concise and natural for spoken dialogue. Support both Arabic and English languages.'
        }
      ];

      let audioChunks: Buffer[] = [];
      let isProcessing = false;

      ws.on('message', async (data: Buffer) => {
        try {
          // Collect audio chunks
          audioChunks.push(data);

          // Process audio every 2 seconds (or when we have enough data)
          const totalSize = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);

          if (totalSize > 50000 && !isProcessing) { // ~0.5-1 second of audio
            isProcessing = true;
            const audioBuffer = Buffer.concat(audioChunks);
            audioChunks = []; // Clear chunks

            // Save audio to temporary file
            const tempDir = path.join(process.cwd(), '.tmp');
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempFilePath = path.join(tempDir, `voice-${uuidv4()}.webm`);
            fs.writeFileSync(tempFilePath, audioBuffer);

            try {
              // Transcribe user's speech
              const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(tempFilePath),
                model: 'whisper-1',
              });

              console.log('[Voice Call] User said:', transcription.text);

              if (transcription.text.trim()) {
                // Add to conversation history
                conversationHistory.push({
                  role: 'user',
                  content: transcription.text
                });

                // Get AI response
                const completion = await openai.chat.completions.create({
                  model: 'gpt-4',
                  messages: conversationHistory as any,
                  max_tokens: 150, // Keep responses concise for voice
                  temperature: 0.7,
                });

                const aiResponse = completion.choices[0]?.message?.content || '';
                console.log('[Voice Call] AI response:', aiResponse);

                // Add AI response to history
                conversationHistory.push({
                  role: 'assistant',
                  content: aiResponse
                });

                // Send transcription to client
                ws.send(JSON.stringify({
                  type: 'transcription',
                  userText: transcription.text,
                  aiText: aiResponse
                }));

                // Convert AI response to speech
                const speech = await openai.audio.speech.create({
                  model: 'tts-1',
                  voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
                  input: aiResponse,
                  response_format: 'mp3',
                  speed: 1.0,
                });

                // Send audio response back to client
                const audioArrayBuffer = await speech.arrayBuffer();
                const audioBuffer = Buffer.from(audioArrayBuffer);
                ws.send(audioBuffer);
              }

              // Clean up temp file
              fs.unlinkSync(tempFilePath);

            } catch (error: any) {
              console.error('[Voice Call] Processing error:', error);
              ws.send(JSON.stringify({
                type: 'error',
                message: error?.message || 'Processing failed'
              }));
            }

            isProcessing = false;
          }

        } catch (error: any) {
          console.error('[Voice Call] Message error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: error?.message || 'Unknown error'
          }));
          isProcessing = false;
        }
      });

      ws.on('close', () => {
        console.log('[Voice Call] Client disconnected');
        // Clean up any remaining audio chunks
        audioChunks = [];
      });

      ws.on('error', (error) => {
        console.error('[Voice Call] WebSocket error:', error);
      });

      // Send ready message
      ws.send(JSON.stringify({
        type: 'ready',
        message: 'Voice call connected'
      }));
    });
  }

  res.status(200).json({ message: 'WebSocket endpoint ready' });
}
