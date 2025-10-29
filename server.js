const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 7000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, '.cert/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '.cert/cert.pem')),
};

app.prepare().then(() => {
  const server = createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create WebSocket server for voice calls
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade requests
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '');

    if (pathname === '/api/voice-call') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Import and setup WebSocket handlers
  const OpenAI = require('openai');
  const { v4: uuidv4 } = require('uuid');

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });

  // Handle WebSocket connections
  wss.on('connection', async (ws) => {
    console.log('[Voice Call] Client connected');

    let conversationHistory = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant having a voice conversation. Keep your responses concise and natural for spoken dialogue. Support both Arabic and English languages.'
      }
    ];

    let audioChunks = [];
    let isProcessing = false;

    ws.on('message', async (data) => {
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
          const tempDir = path.join(__dirname, '.tmp');
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
                messages: conversationHistory,
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

          } catch (error) {
            console.error('[Voice Call] Processing error:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: error?.message || 'Processing failed'
            }));
          }

          isProcessing = false;
        }

      } catch (error) {
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

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on https://${hostname}:${port}`);
      console.log(`> WebSocket ready for voice calls`);
    });
});
