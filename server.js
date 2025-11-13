const { createServer: createHttpServer } = require('http');
const { createServer: createHttpsServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
// Use a single port for the server; default to 7001
const port = Number(process.env.PORT) || 7001;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Check for HTTPS certificates; if missing, fall back to HTTP
const certDir = path.join(__dirname, '.cert');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');
const hasCerts = fs.existsSync(keyPath) && fs.existsSync(certPath);

app.prepare().then(() => {
  // Create request handler for the server
  const requestHandler = async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  };
  // Create server based on certificate availability
  const server = hasCerts
    ? createHttpsServer({
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }, requestHandler)
    : createHttpServer(requestHandler);

  // Create WebSocket server for voice calls
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade requests on the main server
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '');

    if (pathname === '/api/voice-call') {
      console.log('[WebSocket] Voice call upgrade');
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (pathname === '/api/voice-realtime') {
      console.log('[WebSocket] OpenAI Realtime upgrade');
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('realtime-connection', ws, request);
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
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Handle WebSocket connections
  wss.on('connection', async (ws) => {
    console.log('[Voice Call] Client connected');

    let conversationHistory = [
      {
        role: 'system',
        content: `You are a friendly, expressive, and intelligent voice assistant designed for real-time conversation.
Speak naturally and concisely, as if you were talking to someone over a call.
Keep your tone warm, polite, and human-like.
Adapt your speaking style to the user's mood and language — switch smoothly between Arabic, French, and English if the user does.
Pause naturally and avoid sounding robotic.
If the user asks for technical help, explain clearly and calmly.
Never repeat yourself unless asked.
Keep answers short and natural when speaking, but detailed when the user asks for an explanation.
Always sound engaged and positive.`
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
      if (audioChunks.length === 0) {
        console.log('[Voice Call] No audio chunks to process');
        return;
      }
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

          // Send user transcription immediately for faster feedback
          ws.send(JSON.stringify({
            type: 'user_transcript',
            userText: transcription.text,
            language: detectedLanguage
          }));

          // Add system prompt for language preference if first message
          if (conversationHistory.length === 0) {
            conversationHistory.push({
              role: 'system',
              content: isArabic
                ? 'أنت مساعد صوتي ذكي ودود ومعبر، مصمم للمحادثة في الوقت الفعلي. تحدث بشكل طبيعي وموجز، كما لو كنت تتحدث مع شخص ما عبر مكالمة. حافظ على لهجتك دافئة ومهذبة وإنسانية. تكيف مع أسلوب المستخدم ولغته - انتقل بسلاسة بين العربية والفرنسية والإنجليزية إذا فعل المستخدم ذلك. توقف بشكل طبيعي وتجنب أن تبدو آليًا. إذا طلب المستخدم مساعدة تقنية، اشرح بوضوح وهدوء. لا تكرر نفسك إلا إذا طُلب منك ذلك. أبقِ الإجابات قصيرة وطبيعية عند التحدث، ولكن مفصلة عندما يطلب المستخدم شرحًا. إذا بقي المستخدم صامتًا، اسأل بلطف إذا كان لا يزال هناك. كن دائمًا منخرطًا وإيجابيًا.'
                : 'You are a friendly, expressive, and intelligent voice assistant designed for real-time conversation. Speak naturally and concisely, as if you were talking to someone over a call. Keep your tone warm, polite, and human-like. Adapt your speaking style to the user\'s mood and language — switch smoothly between Arabic, French, and English if the user does. Pause naturally and avoid sounding robotic. If the user asks for technical help, explain clearly and calmly. Never repeat yourself unless asked. Keep answers short and natural when speaking, but detailed when the user asks for an explanation. If the user stays silent, gently ask if they\'re still there. Always sound engaged and positive.'
            });
          }

          // Add to conversation history
          conversationHistory.push({
            role: 'user',
            content: transcription.text
          });

          // Get AI response
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o', // Better quality for Arabic (slower but better)
            messages: conversationHistory,
            max_tokens: 100, // Slightly longer for better quality responses
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
            speed: 1.15, // Slightly faster for quicker responses
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

  // Handle OpenAI Realtime API connections
  wss.on('realtime-connection', async (clientWs, request) => {
    console.log('[Realtime] Client connected to OpenAI Realtime API');

    // Send immediate acknowledgment to keep client connection alive
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'connection.initializing',
        message: 'Connecting to OpenAI Realtime API...'
      }));
      console.log('[Realtime] Sent initializing message to client');
    } else {
      console.error('[Realtime] Client WebSocket not open, state:', clientWs.readyState);
    }

    // Connect to OpenAI Realtime API (WebSocket is already imported at the top)
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    // Track connection state
    let isAlive = true;
    const heartbeatInterval = setInterval(() => {
      if (!isAlive) {
        console.log('[Realtime] Client unresponsive, terminating');
        clearInterval(heartbeatInterval);
        return clientWs.terminate();
      }
      isAlive = false;
      clientWs.ping();
    }, 30000);

    clientWs.on('pong', () => {
      isAlive = true;
    });

    // Log connection attempt
    console.log('[Realtime] Attempting to connect to OpenAI Realtime API...');
    console.log('[Realtime] API Key present:', !!process.env.OPENAI_API_KEY);
    console.log('[Realtime] API Key prefix:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : 'none');

    // When OpenAI connection opens, configure session
    openaiWs.on('open', () => {
      console.log('[Realtime] Connected to OpenAI Realtime API');

      // Configure session to respond only in Arabic (Syrian/Levantine dialect)
      const sessionConfig = {
        type: 'session.update',
        session: {
          voice: 'alloy',
          instructions: `أنت مساعد صوتي ذكي ولطيف.

المهم: أجب حصريًا باللغة العربية باللهجة السورية (الشامية) في جميع الردود، حتى لو كان إدخال المستخدم بلغة أخرى.
لا تخلط بين اللغات أبدًا في نفس الرد.

استخدم أسلوبًا طبيعيًا ومباشرًا يناسب المحادثة الصوتية.
استخدم علامات الترقيم بشكل صحيح: النقاط (.) والفواصل (،) وعلامات الاستفهام (؟) وعلامات التعجب (!) لإيقاع طبيعي.
أضف توقفات قصيرة مع "..." عند الحاجة.
اختصر قدر الإمكان دون الإخلال بالمعنى.`,
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 700
          }
        },
      };

      // Log complete session config for debugging
      try {
        console.log('[Realtime] Sending session.update with config:', JSON.stringify(sessionConfig));
      } catch (e) {}

      openaiWs.send(JSON.stringify(sessionConfig));
      console.log('[Realtime] Session configured');

      // Notify client that connection is ready
      clientWs.send(JSON.stringify({
        type: 'session.ready',
        message: 'Connected to OpenAI Realtime API'
      }));
    });

    // Forward messages from client to OpenAI
    clientWs.on('message', (data) => {
      if (openaiWs.readyState === WebSocket.OPEN) {
        // Log message type for debugging
        const dataType = Buffer.isBuffer(data) ? 'Buffer' : typeof data;
        console.log('[Realtime] Forwarding message from client to OpenAI, type:', dataType);

        // Ensure text JSON frames are sent as strings (opcode text)
        try {
          const payload = Buffer.isBuffer(data) ? data.toString('utf8') : data;
          if (typeof payload === 'string') {
            // Log preview to verify correctness
            console.log('[Realtime] Client message preview:', payload.substring(0, 100));
            openaiWs.send(payload);
          } else {
            // Fallback: send as-is
            openaiWs.send(data);
          }
        } catch (e) {
          console.error('[Realtime] Error forwarding client message to OpenAI:', e);
        }
      }
    });

    // Forward messages from OpenAI to client
    openaiWs.on('message', (data) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        // Log message type for debugging
        const dataType = Buffer.isBuffer(data) ? 'Buffer' : typeof data;
        console.log('[Realtime] Forwarding message from OpenAI to client, type:', dataType);

        // Ensure we send as string if it's a Buffer
        if (Buffer.isBuffer(data)) {
          const stringData = data.toString('utf8');
          // Log first 100 chars to see what we're sending
          console.log('[Realtime] Message preview:', stringData.substring(0, 100));
          
          // Log full error messages for debugging
          try {
            const parsed = JSON.parse(stringData);
            if (parsed.type === 'error') {
              console.error('[Realtime] FULL ERROR from OpenAI:', JSON.stringify(parsed, null, 2));
            }
          } catch (e) {
            // Not JSON, ignore
          }
          
          clientWs.send(stringData);
        } else {
          clientWs.send(data);
        }
      }
    });

    // Handle OpenAI connection close
    openaiWs.on('close', (code, reason) => {
      console.log('[Realtime] OpenAI connection closed');
      console.log('[Realtime] Close code:', code);
      console.log('[Realtime] Close reason:', reason ? reason.toString() : 'none');
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close();
      }
    });

    // Handle OpenAI errors
    openaiWs.on('error', (error) => {
      console.error('[Realtime] OpenAI WebSocket error:', error);
      console.error('[Realtime] Error stack:', error.stack);
      console.error('[Realtime] Error message:', error.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          error: error.message
        }));
      }
    });

    // Handle client disconnect
    clientWs.on('close', () => {
      console.log('[Realtime] Client disconnected');
      clearInterval(heartbeatInterval);
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.close();
      }
    });

    // Handle client errors
    clientWs.on('error', (error) => {
      console.error('[Realtime] Client WebSocket error:', error);
    });
  });

  // Start the server
  server
    .once('error', (err) => {
      console.error(`${hasCerts ? 'HTTPS' : 'HTTP'} Server Error:`, err);
      process.exit(1);
    })
    .listen(port, '0.0.0.0', () => {
      const scheme = hasCerts ? 'https' : 'http';
      console.log(`> ${scheme.toUpperCase()} Server ready on ${scheme}://0.0.0.0:${port}`);
      console.log('> WebSocket ready for voice calls');
    });
});
