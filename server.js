const { createServer: createHttpServer } = require('http');
const { createServer: createHttpsServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 7000;
const httpPort = 7001; // Port for nginx to proxy to

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, '.cert/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '.cert/cert.pem')),
};

app.prepare().then(() => {
  // Create request handler for both HTTP and HTTPS
  const requestHandler = async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // Don't handle WebSocket upgrade requests through Next.js
      if (req.url === '/api/voice-call' && req.headers.upgrade) {
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  };

  // Create HTTPS server for direct access
  const httpsServer = createHttpsServer(httpsOptions, requestHandler);

  // Create HTTP server for nginx reverse proxy
  const httpServer = createHttpServer(requestHandler);

  // Create WebSocket server for voice calls
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade requests on HTTPS server
  httpsServer.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '');

    if (pathname === '/api/voice-call') {
      console.log('[WebSocket] Voice call upgrade (HTTPS)');
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  // Handle WebSocket upgrade requests on HTTP server
  httpServer.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '');

    if (pathname === '/api/voice-call') {
      console.log('[WebSocket] Voice call upgrade (HTTP/Nginx proxy)');
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  // Import and setup WebSocket handlers
  const OpenAI = require('openai');
  let uuidv4;
  (async () => {
    const { v4 } = await import('uuid');
    uuidv4 = v4;
  })();

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
    let isAlive = true;
    let lastProcessTime = Date.now();
    let chunkAccumulationTimeout = null;

    // Set up ping/pong heartbeat
    const heartbeatInterval = setInterval(() => {
      if (!isAlive) {
        console.log('[Voice Call] Client unresponsive, terminating connection');
        clearInterval(heartbeatInterval);
        return ws.terminate();
      }
      isAlive = false;
      ws.ping();
    }, 30000); // Ping every 30 seconds

    ws.on('pong', () => {
      isAlive = true;
    });

    // Send ready message to client
    try {
      ws.send(JSON.stringify({
        type: 'ready',
        message: 'Voice call server ready'
      }));
      console.log('[Voice Call] Sent ready message to client');
    } catch (error) {
      console.error('[Voice Call] Error sending ready message:', error);
    }

    // Function to process accumulated audio
    const processAudio = async () => {
      if (isProcessing || audioChunks.length === 0) {
        console.log('[Voice Call] Skipping audio processing - isProcessing:', isProcessing, 'chunks:', audioChunks.length);
        return;
      }

      isProcessing = true;
      const audioBuffer = Buffer.concat(audioChunks);
      const bufferSize = audioBuffer.length;
      audioChunks = []; // Clear chunks
      console.log('[Voice Call] Processing audio buffer of size:', bufferSize);

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
          // Detect language from user input (simple detection for Arabic)
          const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(transcription.text);
          const detectedLanguage = isArabic ? 'ar' : 'en';
          console.log('[Voice Call] Detected language:', detectedLanguage);

          // Add system prompt for language preference if first message
          if (conversationHistory.length === 0) {
            conversationHistory.push({
              role: 'system',
              content: isArabic
                ? 'أنت مساعد ذكي. تحدث باللغة العربية بشكل طبيعي ومحترم. أجب بإيجاز ووضوح مناسب للمحادثة الصوتية.'
                : 'You are a helpful AI assistant. Keep responses concise and clear for voice conversation.'
            });
          }

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
            aiText: aiResponse,
            language: detectedLanguage
          }));

          // Convert AI response to speech
          // Use 'nova' voice which has better multilingual support
          const speech = await openai.audio.speech.create({
            model: 'tts-1',
            voice: 'nova', // Changed from 'alloy' to 'nova' for better multilingual support
            input: aiResponse,
            response_format: 'mp3',
            speed: 1.0,
          });

          // Send audio response back to client
          const audioArrayBuffer = await speech.arrayBuffer();
          const audioBuffer = Buffer.from(audioArrayBuffer);
          ws.send(audioBuffer);
          console.log('[Voice Call] Sent audio response to client');
        }

        // Clean up temp file
        fs.unlinkSync(tempFilePath);

      } catch (error) {
        console.error('[Voice Call] Processing error:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: error?.message || 'Processing failed'
          }));
        }
      } finally {
        // ALWAYS reset the processing flag
        isProcessing = false;
        lastProcessTime = Date.now();
      }
    };

    // Handle complete audio segments from client
    ws.on('message', async (data) => {
      try {
        // Check if already processing
        if (isProcessing) {
          console.log('[Voice Call] Already processing, skipping...');
          return;
        }

        console.log('[Voice Call] Received complete audio segment, size:', data.length);

        // Process the complete audio segment immediately
        if (data.length > 1000) { // Minimum size for valid audio
          isProcessing = true;

          // Process the audio directly
          audioChunks = [data];
          await processAudio();
        }

      } catch (error) {
        console.error('[Voice Call] Message error:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: error?.message || 'Unknown error'
          }));
        }
        isProcessing = false;
      }
    });

    ws.on('close', (code, reason) => {
      console.log('[Voice Call] Client disconnected - code:', code, 'reason:', reason.toString());
      clearInterval(heartbeatInterval);
      if (chunkAccumulationTimeout) {
        clearTimeout(chunkAccumulationTimeout);
      }
      audioChunks = [];
    });

    ws.on('error', (error) => {
      console.error('[Voice Call] WebSocket error:', error);
      console.error('[Voice Call] Error stack:', error.stack);
    });
  });

  // Start both servers
  httpsServer
    .once('error', (err) => {
      console.error('HTTPS Server Error:', err);
      process.exit(1);
    })
    .listen(port, '127.0.0.1', () => {
      console.log(`> HTTPS Server ready on https://127.0.0.1:${port}`);
    });

  httpServer
    .once('error', (err) => {
      console.error('HTTP Server Error:', err);
      process.exit(1);
    })
    .listen(httpPort, '127.0.0.1', () => {
      console.log(`> HTTP Server ready on http://127.0.0.1:${httpPort}`);
      console.log(`> Nginx proxy: http://127.0.0.1:${httpPort}`);
      console.log(`> WebSocket ready for voice calls`);
    });
});
