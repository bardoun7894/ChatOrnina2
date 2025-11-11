import React, { useState, useRef, useEffect } from 'react';
import { XIcon, MicrophoneIcon, PhoneIcon } from './icons';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface VoiceCallRealtimeProps {
  onClose: () => void;
  isDarkMode?: boolean;
  onTranscript?: (userText: string, aiText: string) => void;
}

interface RealtimeMessage {
  type: string;
  [key: string]: any;
}

const VoiceCallRealtime: React.FC<VoiceCallRealtimeProps> = ({ onClose, isDarkMode = false, onTranscript }) => {
  const { language } = useLanguage();
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'listening' | 'speaking'>('connecting');
  const [isMuted, setIsMuted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitialized = useRef(false);
  const isClosing = useRef(false);
  const hasStartedCaptureRef = useRef(false);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Audio playback queue for streaming
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const playbackLoopRef = useRef<Promise<void> | null>(null);
  const activeAudioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const currentUserTranscript = useRef<string>('');
  const currentAiResponse = useRef<string>('');
  const isSpeakingRef = useRef(false); // Track if AI is currently speaking
  const isWaitingForResponseRef = useRef(false); // Track if we're waiting for AI response
  const appendedSamplesSinceCommitRef = useRef<number>(0); // Track appended samples to avoid empty commits
  const lastCommitTimeRef = useRef<number>(0);
  const samplesSinceSpeechStartRef = useRef<number>(0);
  const commitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speakingInactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Buffer for user audio (for Whisper transcription)
  const userAudioBufferRef = useRef<Int16Array[]>([]);
  const isRecordingUserAudioRef = useRef(false);
  // Jitter buffer for smoother AI playback
  const pendingPcmRef = useRef<Int16Array | null>(null);
  const MIN_CHUNK_MS = 120; // coalesce to ~120ms chunks for smoother playback (increased from 80ms)
  const MIN_QUEUE_SIZE_TO_START = 7; // Wait for 7 chunks (840ms) before starting playback (increased to reduce overlap)

  useEffect(() => {
    // Clear any pending cleanup from React StrictMode double-mount
    if (cleanupTimeoutRef.current) {
      console.log('[Realtime] Clearing pending cleanup timeout');
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    // Prevent double initialization in React StrictMode
    if (isInitialized.current) {
      console.log('[Realtime] Already initialized, skipping...');
      return;
    }
    isInitialized.current = true;

    console.log('[Realtime] Component mounted, starting call...');
    startCall();

    return () => {
      console.log('[Realtime] Component unmounting, scheduling cleanup...');

      // Delay cleanup by 100ms to avoid React StrictMode double-mount issue
      cleanupTimeoutRef.current = setTimeout(() => {
        console.log('[Realtime] Executing delayed cleanup...');
        isClosing.current = true;
        cleanup();
      }, 100);
    };
  }, []);

  // Audio helpers: ensure 24kHz PCM16 for Realtime API
  const floatTo16BitPCM = (float32: Float32Array): Int16Array => {
    const out = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  };

  const downsampleToPCM16 = (buffer: Float32Array, inRate: number, outRate: number): Int16Array => {
    if (outRate === inRate) {
      return floatTo16BitPCM(buffer);
    }
    const sampleRateRatio = inRate / outRate;
    const newLength = Math.floor(buffer.length / sampleRateRatio);
    const result = new Int16Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < newLength) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      // Simple averaging to reduce aliasing
      let accum = 0;
      let count = 0;
      for (let i = Math.floor(offsetBuffer); i < Math.min(nextOffsetBuffer, buffer.length); i++) {
        accum += buffer[i];
        count++;
      }
      const value = count > 0 ? accum / count : 0;
      const s = Math.max(-1, Math.min(1, value));
      result[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7fff;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  const base64FromInt16 = (pcm16: Int16Array): string => {
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const startCall = async () => {
    try {
      setCallStatus('connecting');

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported. Please use HTTPS or localhost.');
      }

      console.log('[Realtime] Requesting microphone access...');

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000, // OpenAI Realtime API uses 24kHz
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      audioStreamRef.current = stream;
      console.log('[Realtime] Microphone access granted');

      // Create audio context for playback and recording
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });
      audioContextRef.current = audioContext;

      // Resume AudioContext if suspended (Chrome/Safari policy)
      if (audioContext.state === 'suspended') {
        console.log('[Realtime] Resuming suspended AudioContext');
        await audioContext.resume();
      }

      console.log('[Realtime] Audio context created');
      console.log('[Realtime] AudioContext sampleRate:', audioContext.sampleRate);

      // Connect WebSocket to Realtime API
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/voice-realtime?lang=${language}`;
      console.log('[Realtime] Connecting to:', wsUrl, 'with language:', language);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Realtime] Connected to OpenAI Realtime API');
        setCallStatus('connected');
        reconnectAttemptsRef.current = 0;
        // Wait for session.ready before starting capture
      };

      ws.onmessage = async (event) => {
        try {
          // Check if message is JSON string or Blob
          if (typeof event.data === 'string') {
            try {
              const message: RealtimeMessage = JSON.parse(event.data);
              handleRealtimeMessage(message);
            } catch (parseError) {
              console.log('[Realtime] Received non-JSON string:', event.data);
            }
          } else if (event.data instanceof Blob) {
            // Backend might send audio as Blob - ignore for now as Realtime API uses base64
            console.log('[Realtime] Received Blob (ignoring, Realtime API uses base64)');
          } else {
            console.log('[Realtime] Unknown message type:', typeof event.data);
          }
        } catch (error) {
          console.error('[Realtime] Error handling message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[Realtime] WebSocket error:', error);
        setCallStatus('connecting');
      };

      ws.onclose = (event) => {
        console.log('[Realtime] WebSocket closed:', event.code, event.reason);

        if (event.code !== 1000 && !isClosing.current) {
          const maxAttempts = 5;
          const baseDelay = 1000;

          if (reconnectAttemptsRef.current < maxAttempts) {
            reconnectAttemptsRef.current++;
            const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);

            console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxAttempts})...`);
            setCallStatus('connecting');

            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('[Realtime] Attempting reconnection...');
              startCall();
            }, delay);
          } else {
            console.error('[Realtime] Max reconnection attempts reached');
            alert('Connection lost. Please close and try again.');
          }
        }
      };

    } catch (error) {
      console.error('[Realtime] Start error:', error);
      alert('Unable to start voice call. Please check microphone permissions.');
      onClose();
    }
  };

  const startAudioCapture = () => {
    if (!audioStreamRef.current || !audioContextRef.current || !wsRef.current) {
      console.log('[Realtime] Cannot start audio capture - missing dependencies');
      return;
    }

    const audioContext = audioContextRef.current;
    const source = audioContext.createMediaStreamSource(audioStreamRef.current);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
      // Don't send audio while AI is speaking to prevent echo/feedback
      if (isMuted || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || isSpeakingRef.current) {
        // Clear the output buffer to ensure silence
        const outputData = e.outputBuffer.getChannelData(0);
        outputData.fill(0);
        return;
      }

      // Get audio data
      const inputData = e.inputBuffer.getChannelData(0);
      const inRate = audioContext.sampleRate;
      // Downsample to 24kHz PCM16 if needed
      const pcm16 = inRate === 24000
        ? floatTo16BitPCM(inputData)
        : downsampleToPCM16(inputData, inRate, 24000);
      
      // Save user audio for Whisper transcription (non-blocking)
      if (isRecordingUserAudioRef.current) {
        userAudioBufferRef.current.push(new Int16Array(pcm16));
      }
      
      // Track appended samples for commit threshold
      appendedSamplesSinceCommitRef.current += pcm16.length;
      // Track samples per speech turn
      samplesSinceSpeechStartRef.current += pcm16.length;
      // Convert to base64
      const base64Audio = base64FromInt16(pcm16);

      // Send audio to OpenAI Realtime API
      try {
        wsRef.current.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64Audio
        }));
      } catch (error) {
        console.error('[Realtime] Error sending audio:', error);
      }
    };

    setCallStatus('listening');
    console.log('[Realtime] Audio capture started');
  };

  const handleRealtimeMessage = async (message: RealtimeMessage) => {
    console.log('[Realtime] Received message type:', message.type);

    switch (message.type) {
      case 'session.created':
      case 'session.updated':
        console.log('[Realtime] Session configured');
        setCallStatus('listening');
        if (!hasStartedCaptureRef.current) {
          hasStartedCaptureRef.current = true;
          startAudioCapture();
        }
        break;

      case 'session.ready':
        console.log('[Realtime] Session ready');
        setCallStatus('listening');
        if (!hasStartedCaptureRef.current) {
          hasStartedCaptureRef.current = true;
          startAudioCapture();
        }
        break;

      case 'input_audio_buffer.speech_started':
        console.log('[Realtime] User started speaking');
        currentUserTranscript.current = '';
        setCallStatus('listening');
        // Reset per-turn counter
        samplesSinceSpeechStartRef.current = 0;
        // Clear any pending commit timeout from previous turn
        if (commitTimeoutRef.current) {
          clearTimeout(commitTimeoutRef.current);
          commitTimeoutRef.current = null;
        }
        // Start recording user audio for Whisper transcription
        userAudioBufferRef.current = [];
        isRecordingUserAudioRef.current = true;
        console.log('[Realtime] Started recording user audio for transcription');
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('[Realtime] User stopped speaking - validating buffer');
        // Stop recording user audio
        isRecordingUserAudioRef.current = false;
        
        // Transcribe user audio in background (non-blocking)
        transcribeUserAudio().then(transcript => {
          if (transcript) {
            console.log('[Whisper] Setting user transcript:', transcript);
            currentUserTranscript.current = transcript;
          }
        }).catch(err => {
          console.error('[Whisper] Background transcription error:', err);
        });
        
        // Skip commit if AI is speaking or a response is in progress
        if (isSpeakingRef.current || isWaitingForResponseRef.current) {
          console.warn('[Realtime] Skipping commit: AI speaking or waiting for response');
          samplesSinceSpeechStartRef.current = 0; // Reset counter
          break;
        }
        // Debounce duplicate commits
        if (Date.now() - lastCommitTimeRef.current < 1000) {
          console.warn('[Realtime] Skipping commit: debounced');
          samplesSinceSpeechStartRef.current = 0; // Reset counter
          break;
        }
        // Schedule a delay to allow final audio frames to arrive
        if (commitTimeoutRef.current) {
          clearTimeout(commitTimeoutRef.current);
        }
        commitTimeoutRef.current = setTimeout(() => {
          const sr = audioContextRef.current?.sampleRate || 24000;
          const minSamples = Math.floor(sr * 0.2); // 200ms minimum (increased from 100ms)
          const actualSamples = samplesSinceSpeechStartRef.current;
          
          console.log('[Realtime] Commit validation:', {
            actualSamples,
            minSamples,
            durationMs: (actualSamples / sr * 1000).toFixed(2)
          });
          
          if (actualSamples < minSamples) {
            console.warn('[Realtime] Skipping commit: buffer too small -', actualSamples, 'samples (', (actualSamples / sr * 1000).toFixed(2), 'ms), need', minSamples, 'samples (200ms)');
            samplesSinceSpeechStartRef.current = 0; // Reset counter
            return;
          }
          
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            samplesSinceSpeechStartRef.current = 0; // Reset counter
            return;
          }
          
          wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
          console.log('[Realtime] Sent input_audio_buffer.commit with', actualSamples, 'samples (', (actualSamples / sr * 1000).toFixed(2), 'ms)');
          lastCommitTimeRef.current = Date.now();
        }, 200); // Increased delay to 200ms
        break;

      case 'conversation.item.input_audio_transcription.completed':
        console.log('[Realtime] User transcript:', message.transcript);
        currentUserTranscript.current = message.transcript || '';
        break;
      
      case 'conversation.item.created':
        // User transcript comes in this event
        console.log('[Realtime] conversation.item.created - role:', message.item?.role, 'type:', message.item?.type);
        if (message.item?.role === 'user') {
          const content = message.item?.content;
          if (Array.isArray(content)) {
            // Look for input_audio content with transcript
            for (const c of content) {
              if (c.type === 'input_audio') {
                console.log('[Realtime] Found input_audio, has transcript:', !!c.transcript);
                if (c.transcript) {
                  console.log('[Realtime] ✅ User transcript from item.created:', c.transcript);
                  currentUserTranscript.current = c.transcript;
                  break;
                }
              } else if (c.type === 'input_text' && c.text) {
                // Fallback to text if available
                console.log('[Realtime] ✅ User text from item.created:', c.text);
                currentUserTranscript.current = c.text;
                break;
              }
            }
          }
        }
        break;

      case 'response.audio_transcript.delta':
        // Accumulate AI response text
        if (message.delta) {
          currentAiResponse.current += message.delta;
          console.log('[Realtime] AI transcript delta:', message.delta);
        }
        break;

      case 'response.audio_transcript.done':
        console.log('[Realtime] AI transcript complete:', message.transcript || currentAiResponse.current);
        // Use the complete transcript from the message if available
        if (message.transcript) {
          currentAiResponse.current = message.transcript;
        }
        break;

      case 'response.audio.delta':
        // Handle streaming audio from AI
        if (message.delta) {
          if (!isSpeakingRef.current) {
            console.log('[Realtime] AI started speaking - pausing mic');
            const stopStart = performance.now();
            // Stop any previous audio and clear queue to prevent overlap
            await stopAllAudioAndWait();
            console.log(`[Audio] Stopped previous audio in ${(performance.now() - stopStart).toFixed(1)}ms`);
            isSpeakingRef.current = true;
            isWaitingForResponseRef.current = false;
          }
          setCallStatus('speaking');
          playAudioDelta(message.delta);
        }
        break;

      case 'response.audio.done':
        console.log('[Realtime] AI finished speaking - resuming mic');
        const drainStart = performance.now();
        
        // Flush any residual pending buffer (final tiny tail)
        if (pendingPcmRef.current && pendingPcmRef.current.length > 0) {
          console.log(`[Audio] Flushing final ${(pendingPcmRef.current.length / 24000 * 1000).toFixed(1)}ms from pending buffer`);
          audioQueueRef.current.push(pendingPcmRef.current);
          pendingPcmRef.current = null;
        }
        
        // Force playback of remaining chunks even if below threshold
        if (!isPlayingRef.current && !playbackLoopRef.current && audioQueueRef.current.length > 0) {
          console.log(`[Audio] Force-starting playback for final ${audioQueueRef.current.length} chunks`);
          playbackLoopRef.current = playAudioQueue();
        }
        
        // Wait for audio queue to finish playing before finalizing
        await waitForAudioQueueToFinish();
        console.log(`[Audio] Queue drained in ${(performance.now() - drainStart).toFixed(1)}ms`);
        
        isSpeakingRef.current = false;
        isWaitingForResponseRef.current = false;

        // Update transcript and save to chat
        if (currentUserTranscript.current || currentAiResponse.current) {
          const userText = currentUserTranscript.current || '';
          const aiText = currentAiResponse.current || '';
          
          console.log('[Realtime] ===== TRANSCRIPT SAVE ATTEMPT =====');
          console.log('[Realtime] User text:', userText);
          console.log('[Realtime] AI text:', aiText);
          console.log('[Realtime] onTranscript callback exists:', !!onTranscript);

          // Send to parent component to save in chat messages
          if (onTranscript) {
            // Require at least AI text (user text can be placeholder)
            if (aiText) {
              let finalUserText = userText;
              if (!finalUserText) {
                const timestamp = new Date().toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' });
                finalUserText = `🎤 رسالة صوتية (${timestamp})`;
              }
              console.log('[Realtime] ✅ Calling onTranscript with:', { userText: finalUserText, aiText });
              onTranscript(finalUserText, aiText);
              console.log('[Realtime] ✅ onTranscript called successfully');
            } else {
              console.warn('[Realtime] ❌ Skipping transcript save - no AI text');
            }
          } else {
            console.error('[Realtime] ❌ onTranscript callback is not defined!');
          }

          // Reset for next interaction
          currentUserTranscript.current = '';
          currentAiResponse.current = '';
        } else {
          console.warn('[Realtime] ❌ No transcript to save - both user and AI are empty');
        }

        setCallStatus('listening');
        break;

      case 'error':
        console.error('[Realtime] Server error:', message.error);
        // Handle recoverable errors without resetting waiting state
        if (message.error?.code === 'input_audio_buffer_commit_empty') {
          // Keep waiting flag as-is; just log
          console.warn('[Realtime] Recoverable error (empty commit).');
          break;
        }
        if (message.error?.code === 'conversation_already_has_active_response') {
          // Do not flip waiting flag; response is in progress
          console.warn('[Realtime] Recoverable error (active response).');
          break;
        }
        // For other errors: reset waiting and surface alert
        isWaitingForResponseRef.current = false;
        if (message.error) {
          alert(`Voice call error: ${message.error.message || JSON.stringify(message.error)}`);
        }
        break;

      case 'response.done':
        console.log('[Realtime] Response complete');
        // If we have AI response but no user transcript, use a descriptive placeholder
        if (currentAiResponse.current && !currentUserTranscript.current) {
          console.warn('[Realtime] No user transcript received, using placeholder');
          const timestamp = new Date().toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' });
          currentUserTranscript.current = `🎤 رسالة صوتية (${timestamp})`;
        }
        break;

      case 'input_audio_buffer.committed':
        console.log('[Realtime] Audio buffer committed successfully');
        // Reset appended sample counter after commit ack
        appendedSamplesSinceCommitRef.current = 0;
        samplesSinceSpeechStartRef.current = 0;
        // We're now waiting for a response generated by the server
        isWaitingForResponseRef.current = true;
        break;

      default:
        // Log unknown message types for debugging (skip known but unhandled types)
        const knownUnhandledTypes = [
          'response.content_part.added',
          'response.content_part.done',
          'response.output_item.added',
          'response.output_item.done',
          'rate_limits.updated'
        ];
        if (!message.type.includes('ping') && 
            !message.type.includes('pong') && 
            !knownUnhandledTypes.includes(message.type)) {
          console.log('[Realtime] Unknown message type:', message.type);
        }
    }
  };

  const playAudioDelta = async (base64Audio: string) => {
    if (!audioContextRef.current) return;

    try {
      const startTime = performance.now();
      
      // Decode base64 to PCM16
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      const deltaSizeMs = (pcm16.length / 24000 * 1000).toFixed(1);

      // Coalesce small deltas into ~120ms chunks before enqueueing
      const sr = 24000;
      const minChunkSamples = Math.floor(sr * (MIN_CHUNK_MS / 1000));

      if (!pendingPcmRef.current || pendingPcmRef.current.length === 0) {
        pendingPcmRef.current = pcm16;
      } else {
        // Concatenate pending + new
        const merged = new Int16Array(pendingPcmRef.current.length + pcm16.length);
        merged.set(pendingPcmRef.current, 0);
        merged.set(pcm16, pendingPcmRef.current.length);
        pendingPcmRef.current = merged;
      }

      // While we have enough samples, push fixed-size chunks
      let chunksCreated = 0;
      while (pendingPcmRef.current && pendingPcmRef.current.length >= minChunkSamples) {
        const chunk = pendingPcmRef.current.subarray(0, minChunkSamples);
        audioQueueRef.current.push(chunk);
        chunksCreated++;
        const remainder = pendingPcmRef.current.subarray(minChunkSamples);
        pendingPcmRef.current = remainder.length > 0 ? new Int16Array(remainder) : null;
      }

      const processingTime = (performance.now() - startTime).toFixed(1);
      const pendingMs = pendingPcmRef.current ? (pendingPcmRef.current.length / 24000 * 1000).toFixed(1) : '0';
      
      console.log(`[Audio] Delta: ${deltaSizeMs}ms | Chunks: ${chunksCreated} | Queue: ${audioQueueRef.current.length} | Pending: ${pendingMs}ms | Process: ${processingTime}ms`);

      // Start playing queue if not already playing AND we have enough buffered
      if (!isPlayingRef.current && !playbackLoopRef.current && audioQueueRef.current.length >= MIN_QUEUE_SIZE_TO_START) {
        console.log(`[Audio] Starting playback - queue reached ${audioQueueRef.current.length} chunks (${(audioQueueRef.current.length * MIN_CHUNK_MS).toFixed(0)}ms)`);
        playbackLoopRef.current = playAudioQueue();
      } else if (!isPlayingRef.current) {
        console.log(`[Audio] Buffering... ${audioQueueRef.current.length}/${MIN_QUEUE_SIZE_TO_START} chunks`);
      }

    } catch (error) {
      console.error('[Realtime] Error playing audio:', error);
    }
  };

  const playAudioQueue = async () => {
    if (!audioContextRef.current || isPlayingRef.current) {
      console.log('[Playback] Already playing, skipping duplicate start');
      return;
    }
    
    isPlayingRef.current = true;
    const audioContext = audioContextRef.current;
    let nextStartTime = audioContext.currentTime;
    const queueStartTime = performance.now();
    let totalChunksPlayed = 0;

    console.log(`[Playback] Starting continuous playback loop at context time ${audioContext.currentTime.toFixed(3)}s`);

    // Continuous playback loop - keeps running as long as there are chunks
    let emptyQueueCount = 0;
    const MAX_EMPTY_CHECKS = 3; // Allow 3 empty checks before stopping
    
    while (true) {
      // Wait for chunks if queue is empty
      if (audioQueueRef.current.length === 0) {
        emptyQueueCount++;
        console.log(`[Playback] Queue empty, waiting... (${emptyQueueCount}/${MAX_EMPTY_CHECKS})`);
        
        // Wait for new chunks to arrive (200ms total)
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (audioQueueRef.current.length === 0) {
          if (emptyQueueCount >= MAX_EMPTY_CHECKS) {
            console.log('[Playback] No more chunks after waiting, ending loop');
            break;
          }
          // Continue waiting
          continue;
        } else {
          // Reset counter when chunks arrive
          emptyQueueCount = 0;
        }
      } else {
        // Reset counter when processing chunks
        emptyQueueCount = 0;
      }
      
      totalChunksPlayed++;
      const pcm16 = audioQueueRef.current.shift()!;

      // Convert PCM16 to Float32 for Web Audio API
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
      }

      // Create audio buffer
      const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      // Schedule audio to play seamlessly with volume control
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Add gain node to control volume and prevent clipping
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.85; // Slightly reduce volume to prevent distortion
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Track active sources
      activeAudioSourcesRef.current.push(source);
      
      // Remove from active list when done
      source.onended = () => {
        const index = activeAudioSourcesRef.current.indexOf(source);
        if (index > -1) {
          activeAudioSourcesRef.current.splice(index, 1);
        }
      };
      
      // Schedule at the next available time slot
      const startTime = Math.max(nextStartTime, audioContext.currentTime);
      source.start(startTime);
      
      // Calculate next start time
      nextStartTime = startTime + audioBuffer.duration;
    }

    const queueProcessTime = (performance.now() - queueStartTime).toFixed(1);
    console.log(`[Playback] Playback loop ended. Total chunks played: ${totalChunksPlayed} in ${queueProcessTime}ms. Final time: ${nextStartTime.toFixed(3)}s`);

    isPlayingRef.current = false;
    playbackLoopRef.current = null;
  };

  const stopAllAudio = () => {
    const activeSources = activeAudioSourcesRef.current.length;
    const queueSize = audioQueueRef.current.length;
    const pendingMs = pendingPcmRef.current ? (pendingPcmRef.current.length / 24000 * 1000).toFixed(1) : '0';
    
    console.log(`[Audio] Stopping: ${activeSources} sources, ${queueSize} queued chunks, ${pendingMs}ms pending`);
    
    // Stop all active audio sources
    activeAudioSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Already stopped
      }
    });
    activeAudioSourcesRef.current = [];
    // Clear audio queue
    audioQueueRef.current = [];
    // Clear pending buffer
    pendingPcmRef.current = null;
    isPlayingRef.current = false;
    playbackLoopRef.current = null;
  };

  const stopAllAudioAndWait = async () => {
    stopAllAudio();
    // Wait a bit for audio context to settle
    await new Promise(resolve => setTimeout(resolve, 50));
  };

  const waitForAudioQueueToFinish = async () => {
    // Wait for audio queue to be empty and no sources playing
    let attempts = 0;
    while ((audioQueueRef.current.length > 0 || activeAudioSourcesRef.current.length > 0) && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  };

  const transcribeUserAudio = async () => {
    if (userAudioBufferRef.current.length === 0) {
      console.log('[Whisper] No audio to transcribe');
      return null;
    }

    try {
      // Merge all audio chunks
      const totalLength = userAudioBufferRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
      const durationSeconds = totalLength / 24000;
      
      // Skip if audio is too short (less than 0.3 seconds)
      if (durationSeconds < 0.3) {
        console.log(`[Whisper] Audio too short (${durationSeconds.toFixed(2)}s), skipping transcription`);
        return null;
      }
      
      const mergedAudio = new Int16Array(totalLength);
      let offset = 0;
      for (const chunk of userAudioBufferRef.current) {
        mergedAudio.set(chunk, offset);
        offset += chunk.length;
      }

      console.log(`[Whisper] Transcribing ${durationSeconds.toFixed(2)}s of audio (${totalLength} samples)...`);

      // Convert PCM16 to WAV format
      const wavBuffer = pcm16ToWav(mergedAudio, 24000);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });

      // Send to Whisper API (non-blocking)
      const formData = new FormData();
      formData.append('audio', blob, 'audio.wav');
      formData.append('language', 'ar'); // Arabic

      const response = await fetch('/api/whisper-transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error('[Whisper] API error:', errorData);
        throw new Error(`Whisper API error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('[Whisper] ✅ Transcription received:', data.text);
      return data.text;
    } catch (error: any) {
      console.error('[Whisper] ❌ Transcription failed:', error.message || error);
      return null;
    }
  };

  const pcm16ToWav = (pcm16: Int16Array, sampleRate: number): ArrayBuffer => {
    const numChannels = 1; // Mono
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcm16.length * 2;
    
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // Helper to write strings
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true); // File size - 8
    writeString(8, 'WAVE');

    // fmt sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, byteRate, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, bitsPerSample, true); // BitsPerSample

    // data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, dataSize, true); // Subchunk2Size

    // Write PCM samples
    for (let i = 0; i < pcm16.length; i++) {
      view.setInt16(44 + i * 2, pcm16[i], true);
    }

    return buffer;
  };

  const cleanup = () => {
    console.log('[Realtime] Cleanup called');

    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (audioStreamRef.current) {
      console.log('[Realtime] Stopping audio stream tracks');
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
      commitTimeoutRef.current = null;
    }

    if (speakingInactivityTimeoutRef.current) {
      clearTimeout(speakingInactivityTimeoutRef.current);
      speakingInactivityTimeoutRef.current = null;
    }

    // Stop all audio playback
    stopAllAudio();

    // Clear jitter buffer
    pendingPcmRef.current = null;

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      console.log('[Realtime] Closing audio context');
      audioContextRef.current.close();
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('[Realtime] Closing WebSocket');
      wsRef.current.close(1000, 'User closed modal');
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;

    // Disable/enable audio tracks properly
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState; // ✅ Correct: if muted (true), disable track (false)
      });
    }

    setIsMuted(newMutedState);
    console.log('[Realtime] Mute toggled:', newMutedState ? 'MUTED' : 'UNMUTED');
  };

  const handleEndCall = () => {
    cleanup();
    onClose();
  };

  const getStatusText = () => {
    const isArabic = language === 'ar';
    switch (callStatus) {
      case 'connecting':
        return isArabic ? 'جارٍ الاتصال...' : 'Connecting...';
      case 'connected':
        return isArabic ? 'جاهز للمحادثة' : 'Ready to talk';
      case 'listening':
        return isArabic ? 'أستمع إليك...' : 'Listening...';
      case 'speaking':
        return isArabic ? 'يتحدث...' : 'Speaking...';
      default:
        return '';
    }
  };

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center",
      isDarkMode ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" : "bg-gradient-to-br from-blue-50 via-white to-purple-50"
    )}>
      {/* Main content */}
      <div className="flex flex-col items-center justify-center space-y-8">
        {/* Voice wave visualization */}
        <div className="relative">
          <div className={cn(
            "w-48 h-48 rounded-full flex items-center justify-center",
            callStatus === 'listening' && "animate-pulse bg-blue-500/20",
            callStatus === 'speaking' && "animate-pulse bg-green-500/20",
            callStatus === 'connected' && "bg-gray-500/10",
            callStatus === 'connecting' && "bg-yellow-500/20 animate-pulse"
          )}>
            {/* Voice waves */}
            <div className="flex items-center justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 rounded-full transition-all",
                    isDarkMode ? "bg-blue-400" : "bg-blue-600",
                    callStatus === 'listening' && "animate-wave",
                    callStatus === 'speaking' && "animate-wave-reverse"
                  )}
                  style={{
                    height: callStatus === 'listening' || callStatus === 'speaking'
                      ? `${20 + i * 10}px`
                      : '20px',
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Status text */}
        <div className="text-center">
          <p className={cn(
            "text-2xl font-semibold mb-2",
            callStatus === 'connecting' && "text-yellow-400",
            callStatus === 'connected' && (isDarkMode ? "text-green-400" : "text-green-600"),
            callStatus === 'listening' && "text-blue-400",
            callStatus === 'speaking' && "text-purple-400"
          )}>
            {getStatusText()}
          </p>
        </div>

        {/* Control buttons - Glass morphism style */}
        <div className="flex items-center gap-6">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            disabled={callStatus === 'connecting'}
            className={cn(
              "p-6 rounded-full transition-all shadow-2xl backdrop-blur-xl border",
              isMuted
                ? "bg-red-500/90 hover:bg-red-600/90 text-white border-red-400/50"
                : isDarkMode
                  ? "bg-white/10 hover:bg-white/20 text-white border-white/20"
                  : "bg-white/60 hover:bg-white/80 text-gray-700 border-white/40",
              callStatus === 'connecting' && "opacity-50 cursor-not-allowed"
            )}
            aria-label={isMuted ? (language === 'ar' ? 'إلغاء كتم الصوت' : 'Unmute') : (language === 'ar' ? 'كتم الصوت' : 'Mute')}
          >
            <div className="relative">
              <MicrophoneIcon className="w-8 h-8" />
              {isMuted && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-0.5 bg-white transform rotate-45" />
                </div>
              )}
            </div>
          </button>

          {/* End call button */}
          <button
            onClick={handleEndCall}
            className={cn(
              "p-6 rounded-full transition-all shadow-2xl backdrop-blur-xl border",
              "bg-red-500/90 hover:bg-red-600/90 text-white border-red-400/50",
              "hover:scale-110 active:scale-95"
            )}
            aria-label={language === 'ar' ? 'إنهاء المكالمة' : 'End call'}
          >
            <PhoneIcon className="w-8 h-8 transform rotate-[135deg]" />
          </button>
        </div>

        {/* Transcript removed - conversations are saved to main chat instead */}
      </div>

      <style jsx>{`
        @keyframes wave {
          0%, 100% { height: 20px; }
          50% { height: 60px; }
        }
        @keyframes wave-reverse {
          0%, 100% { height: 60px; }
          50% { height: 20px; }
        }
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }
        .animate-wave-reverse {
          animation: wave-reverse 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default VoiceCallRealtime;
