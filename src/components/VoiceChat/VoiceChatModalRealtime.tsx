import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VoiceChatModalRealtime: React.FC<VoiceChatModalProps> = ({ isOpen, onClose }) => {
  const [voiceState, setVoiceState] = useState<'idle' | 'connecting' | 'connected' | 'listening' | 'speaking'>('idle');
  const [selectedVoice, setSelectedVoice] = useState<string>('alloy');
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const voiceStateRef = useRef<'idle' | 'connecting' | 'connected' | 'listening' | 'speaking'>('idle');
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const isMutedRef = useRef(false);

  // Available OpenAI voices
  const voices = [
    { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
    { id: 'echo', name: 'Echo', description: 'Warm and friendly' },
    { id: 'fable', name: 'Fable', description: 'Expressive and dynamic' },
    { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
    { id: 'nova', name: 'Nova', description: 'Bright and energetic' },
    { id: 'shimmer', name: 'Shimmer', description: 'Soft and gentle' },
  ];

  // Connect to OpenAI Realtime API via our WebSocket proxy
  const connect = useCallback(async () => {
    try {
      setVoiceState('connecting');
      console.log('[Realtime] Connecting to WebSocket...');

      // Determine WebSocket URL based on current protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/voice-realtime`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Realtime] WebSocket connected');
        setVoiceState('connected');
        voiceStateRef.current = 'connected';

        // Start heartbeat to keep connection alive
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            // Send a ping event to keep the connection alive
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000); // Send ping every 15 seconds
      };

      ws.onmessage = async (event) => {
        try {
          // Check if the message is binary (audio data) or text (JSON)
          if (event.data instanceof Blob) {
            // Handle binary audio data from server
            console.log('[Realtime] Received binary audio data:', event.data.size, 'bytes');
            // Convert Blob to ArrayBuffer and play directly
            const arrayBuffer = await event.data.arrayBuffer();
            await playAudioFromBuffer(arrayBuffer);
            return;
          }

          // Parse JSON messages
          const message = JSON.parse(event.data);
          console.log('[Realtime] Received:', message.type);

          switch (message.type) {
            case 'session.ready':
              console.log('[Realtime] Session ready');
              setVoiceState('connected');
              voiceStateRef.current = 'connected';
              await startAudioCapture();
              break;

            case 'session.updated':
              console.log('[Realtime] Session updated');
              break;

            case 'conversation.item.input_audio_transcription.completed':
              console.log('[Realtime] Transcription:', message.transcript);
              setLastTranscript(message.transcript);
              break;

            case 'response.audio_transcript.delta':
              setLastResponse(prev => prev + (message.delta || ''));
              break;

            case 'response.audio.delta':
              // Play audio chunk and mute microphone to prevent feedback
              if (message.delta) {
                await playAudioChunk(message.delta);
              }
              // Temporarily disable mic to prevent feedback (only if not manually muted)
              if (!isMutedRef.current && audioStreamRef.current) {
                audioStreamRef.current.getAudioTracks().forEach(track => {
                  track.enabled = false;
                });
              }
              console.log('[Realtime] AI speaking - microphone muted');
              setVoiceState('speaking');
              voiceStateRef.current = 'speaking';
              break;

            case 'response.audio.done':
              console.log('[Realtime] AI finished speaking - microphone unmuted');
              // Only unmute if not manually muted by user
              if (!isMutedRef.current && audioStreamRef.current) {
                audioStreamRef.current.getAudioTracks().forEach(track => {
                  track.enabled = true;
                });
              }
              setVoiceState('listening');
              voiceStateRef.current = 'listening';
              break;

            case 'input_audio_buffer.speech_started':
              console.log('[Realtime] Speech started');
              setVoiceState('listening');
              voiceStateRef.current = 'listening';
              break;

            case 'input_audio_buffer.speech_stopped':
              console.log('[Realtime] Speech stopped');
              break;

            case 'error':
              console.error('[Realtime] Error:', message.error);
              break;
          }
        } catch (error) {
          console.error('[Realtime] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[Realtime] WebSocket error:', error);
        console.error('[Realtime] Error details:', {
          type: error.type,
          target: error.target,
          currentTarget: error.currentTarget
        });
        setVoiceState('idle');
        voiceStateRef.current = 'idle';
      };

      ws.onclose = (event) => {
        console.log('[Realtime] WebSocket closed');
        console.log('[Realtime] Close details:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });

        // Clear heartbeat on close
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        setVoiceState('idle');
        voiceStateRef.current = 'idle';
        stopAudioCapture();
      };
    } catch (error) {
      console.error('[Realtime] Connection error:', error);
      setVoiceState('idle');
      voiceStateRef.current = 'idle';
    }
  }, []);

  // Start capturing audio from microphone
  const startAudioCapture = async () => {
    try {
      console.log('[Realtime] Starting audio capture...');

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000
        }
      });
      audioStreamRef.current = stream;

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      // Create media stream source
      const source = audioContext.createMediaStreamSource(stream);

      // Create script processor for audio data
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      scriptProcessor.onaudioprocess = (event) => {
        // CRITICAL: Mute microphone when AI is speaking to prevent feedback OR when manually muted
        if (voiceStateRef.current === 'speaking' || isMutedRef.current) {
          // Skip processing and sending audio while AI is speaking or muted
          return;
        }

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0);

          // Convert Float32Array to Int16Array (PCM16)
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Convert to base64 properly using Uint8Array chunks
          const bytes = new Uint8Array(pcm16.buffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
            binary += String.fromCharCode.apply(null, Array.from(chunk));
          }
          const base64 = btoa(binary);

          // Send audio to OpenAI
          try {
            wsRef.current.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64
            }));
          } catch (error) {
            console.error('[Realtime] Error sending audio:', error);
          }
        }
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      console.log('[Realtime] Audio capture started');
      setVoiceState('listening');
      voiceStateRef.current = 'listening';
    } catch (error) {
      console.error('[Realtime] Error starting audio capture:', error);
      setVoiceState('idle');
      voiceStateRef.current = 'idle';
    }
  };

  // Stop audio capture
  const stopAudioCapture = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Play audio chunk from OpenAI
  const playAudioChunk = async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) return;

      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to Float32
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
      }

      // Create audio buffer and play
      const audioBuffer = audioContextRef.current.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (error) {
      console.error('[Realtime] Error playing audio:', error);
    }
  };

  const playAudioFromBuffer = async (arrayBuffer: ArrayBuffer) => {
    try {
      if (!audioContextRef.current) return;

      // Convert PCM16 ArrayBuffer to Float32Array
      const int16Array = new Int16Array(arrayBuffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
      }

      // Create audio buffer and play
      const audioBuffer = audioContextRef.current.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (error) {
      console.error('[Realtime] Error playing audio from buffer:', error);
    }
  };

  // Disconnect from OpenAI Realtime API
  const disconnect = useCallback(() => {
    console.log('[Realtime] Disconnecting...');

    // Clear heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    stopAudioCapture();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setVoiceState('idle');
    voiceStateRef.current = 'idle';
  }, []);

  // Toggle connection
  const toggleConnection = () => {
    if (voiceState === 'idle') {
      connect();
    } else {
      disconnect();
    }
  };

  // Toggle mute
  const toggleMute = () => {
    const newMutedState = !isMuted;

    // Disable/enable audio tracks properly
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState; // ✅ Correct: if muted (true), disable track (false)
      });
    }

    setIsMuted(newMutedState);
    isMutedRef.current = newMutedState;
    console.log('[Realtime] Mute toggled:', newMutedState ? 'MUTED' : 'UNMUTED');
  };

  // Cleanup on unmount or modal close
  useEffect(() => {
    return () => {
      // Only disconnect on unmount, not when isOpen changes
      if (wsRef.current) {
        console.log('[Realtime] Component unmounting, cleaning up...');
        stopAudioCapture();
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  // Handle modal close separately
  useEffect(() => {
    if (!isOpen && voiceState !== 'idle') {
      console.log('[Realtime] Modal closed, disconnecting...');
      disconnect();
    }
  }, [isOpen, voiceState, disconnect]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            background: 'linear-gradient(135deg, var(--galileo-bg-gradient-start) 0%, var(--galileo-bg-gradient-end) 100%)'
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: 'rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(8px)'
            }}
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            className="relative w-full max-w-md flex flex-col galileo-glass p-8"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className={cn(
                "absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center",
                "galileo-glass-subtle hover:bg-white/20 text-gray-700"
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-2">Voice Chat</h2>
            <p className="text-sm text-gray-600 mb-6">Natural conversation with OpenAI</p>

            {/* Status */}
            <div className="mb-6">
              <div className={cn(
                "px-4 py-2 rounded-lg text-center",
                voiceState === 'idle' && "bg-gray-100 text-gray-600",
                voiceState === 'connecting' && "bg-blue-100 text-blue-600",
                voiceState === 'connected' && "bg-green-100 text-green-600",
                voiceState === 'listening' && "bg-purple-100 text-purple-600",
                voiceState === 'speaking' && "bg-orange-100 text-orange-600"
              )}>
                {voiceState === 'idle' && 'Not connected'}
                {voiceState === 'connecting' && 'Connecting...'}
                {voiceState === 'connected' && 'Connected'}
                {voiceState === 'listening' && 'Listening...'}
                {voiceState === 'speaking' && 'Speaking...'}
              </div>
            </div>

            {/* Voice Selection */}
            {voiceState === 'idle' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Voice</label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {voices.map(voice => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Transcript Display */}
            {(lastTranscript || lastResponse) && (
              <div className="mb-6 space-y-2">
                {lastTranscript && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 mb-1">You said:</p>
                    <p className="text-sm text-gray-800">{lastTranscript}</p>
                  </div>
                )}
                {lastResponse && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 mb-1">AI:</p>
                    <p className="text-sm text-gray-800">{lastResponse}</p>
                  </div>
                )}
              </div>
            )}

            {/* Mute Button (only show when connected) */}
            {voiceState !== 'idle' && voiceState !== 'connecting' && (
              <motion.button
                onClick={toggleMute}
                className={cn(
                  "w-full py-3 rounded-lg font-semibold text-white transition-colors mb-3",
                  isMuted ? "bg-orange-600 hover:bg-orange-700" : "bg-gray-600 hover:bg-gray-700"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-center space-x-2">
                  {isMuted ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <span>Unmute Microphone</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                      <span>Mute Microphone</span>
                    </>
                  )}
                </div>
              </motion.button>
            )}

            {/* Connect/Disconnect Button */}
            <motion.button
              onClick={toggleConnection}
              disabled={voiceState === 'connecting'}
              className={cn(
                "w-full py-4 rounded-lg font-semibold text-white transition-colors",
                voiceState === 'idle' && "bg-blue-600 hover:bg-blue-700",
                voiceState !== 'idle' && "bg-red-600 hover:bg-red-700",
                voiceState === 'connecting' && "opacity-50 cursor-not-allowed"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {voiceState === 'idle' && 'Start Conversation'}
              {voiceState === 'connecting' && 'Connecting...'}
              {voiceState !== 'idle' && voiceState !== 'connecting' && 'End Conversation'}
            </motion.button>

            <p className="mt-4 text-xs text-center text-gray-500">
              Click start to begin talking with OpenAI's natural voice
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceChatModalRealtime;
