import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, MicrophoneIcon } from './icons';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface VoiceCallProps {
  onClose: () => void;
  isDarkMode?: boolean;
  onTranscript?: (userText: string, aiText: string) => void;
}

const VoiceCall: React.FC<VoiceCallProps> = ({ onClose, isDarkMode = false, onTranscript }) => {
  const { language } = useLanguage();
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'listening' | 'speaking'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<{ user: string; ai: string }[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitialized = useRef(false);
  const isClosing = useRef(false);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRecording = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isSpeakingRef = useRef(false);
  const currentMimeTypeRef = useRef<string>('audio/webm;codecs=opus');
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any pending cleanup from React StrictMode double-mount
    if (cleanupTimeoutRef.current) {
      console.log('[Voice Call] Clearing pending cleanup timeout');
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    // Prevent double initialization in React StrictMode
    if (isInitialized.current) {
      console.log('[Voice Call] Already initialized, skipping...');
      return;
    }
    isInitialized.current = true;

    console.log('[Voice Call] Component mounted, starting call...');
    startCall();

    return () => {
      console.log('[Voice Call] Component unmounting, scheduling cleanup...');

      // Set isClosing flag immediately to prevent reconnection attempts
      isClosing.current = true;

      // Delay cleanup by 100ms to avoid React StrictMode double-mount issue
      // If component remounts quickly (StrictMode), this timeout will be cleared
      cleanupTimeoutRef.current = setTimeout(() => {
        console.log('[Voice Call] Executing delayed cleanup...');
        cleanup();
      }, 100);
    };
  }, []);

  // Setup audio analysis for voice activity detection
  const setupAudioAnalyser = async (stream: MediaStream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    // Resume AudioContext if suspended (Chrome/Safari policy)
    if (audioContextRef.current.state === 'suspended') {
      console.log('[Voice Call] Resuming suspended AudioContext');
      await audioContextRef.current.resume();
    }

    const source = audioContextRef.current.createMediaStreamSource(stream);
    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = 256;

    source.connect(analyser);
    analyserRef.current = analyser;

    // Start monitoring audio levels
    monitorAudioLevels();
  };

  // Monitor audio levels for voice activity detection
  const monitorAudioLevels = () => {
    if (!analyserRef.current || isClosing.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkAudioLevel = () => {
      if (!analyserRef.current || isClosing.current) return;

      // Skip audio detection when AI is speaking
      if (callStatus === 'speaking') {
        requestAnimationFrame(checkAudioLevel);
        return;
      }

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;

      // Very sensitive threshold to catch speech early
      const isSpeaking = average > 3; // Lowered from 5 to 3 for better detection

      if (isSpeaking && !isSpeakingRef.current) {
        // Started speaking
        console.log('[Voice Call] Started speaking detected, audio level:', average);
        isSpeakingRef.current = true;
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
      } else if (!isSpeaking && isSpeakingRef.current) {
        // Stopped speaking - wait for shorter silence period
        isSpeakingRef.current = false;
        if (!silenceTimeoutRef.current && isRecording.current) {
          silenceTimeoutRef.current = setTimeout(() => {
            console.log('[Voice Call] Silence detected, sending audio...');
            sendAccumulatedAudio();
            silenceTimeoutRef.current = null;
          }, 1500); // Wait 1.5 seconds after silence - better for sentence completion
        }
      }

      requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();
  };

  const sendAccumulatedAudio = () => {
    console.log('[Voice Call] sendAccumulatedAudio called, chunks:', audioChunksRef.current.length);

    if (audioChunksRef.current.length === 0) {
      console.log('[Voice Call] No audio chunks to send');
      return;
    }

    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.log('[Voice Call] WebSocket not open, state:', wsRef.current?.readyState);
      return;
    }

    // Request final data from recorder before sending
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.requestData();
      // Small delay to ensure ondataavailable fires
      setTimeout(() => {
        sendAudioChunks();
      }, 50);
    } else {
      sendAudioChunks();
    }
  };

  const sendAudioChunks = () => {
    if (audioChunksRef.current.length === 0) return;

    const audioBlob = new Blob(audioChunksRef.current, { type: currentMimeTypeRef.current });
    console.log('[Voice Call] Sending complete audio segment, size:', audioBlob.size, 'bytes, mimeType:', currentMimeTypeRef.current);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(audioBlob);
    }

    // Clear chunks immediately after sending to prevent memory buildup
    audioChunksRef.current = [];

    // Restart recording for next segment with proper timing and state check
    if (isRecording.current) {
      stopRecording();
      setTimeout(() => {
        if (!isRecording.current && wsRef.current?.readyState === WebSocket.OPEN) {
          startRecording();
        }
      }, 300); // Increased delay to prevent race conditions
    }
  };

  const startRecording = () => {
    if (!audioStreamRef.current || !wsRef.current || isRecording.current) {
      console.log('[Voice Call] Cannot start recording - preconditions not met');
      return;
    }

    try {
      console.log('[Voice Call] Starting new recording session');

      audioChunksRef.current = [];

      // Determine the best supported mimeType
      let mimeType = 'audio/webm;codecs=opus';
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus'
      ];

      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          currentMimeTypeRef.current = type;
          console.log('[Voice Call] Using supported mimeType:', type);
          break;
        }
      }

      // Create a fresh MediaRecorder for new recording session
      const mediaRecorder = new MediaRecorder(audioStreamRef.current, {
        mimeType: mimeType
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && !isMuted) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('[Voice Call] MediaRecorder stopped');
        isRecording.current = false;
      };

      // Start recording with 250ms chunks for better memory management
      // Balanced between responsiveness and memory usage
      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      isRecording.current = true;
      setCallStatus('listening');
      console.log('[Voice Call] Recording started with mimeType:', mimeType);
    } catch (error) {
      console.error('[Voice Call] Error starting recording:', error);
      console.error('[Voice Call] Error details:', error);
    }
  };

  const stopRecording = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('[Voice Call] Stopping recording, current state:', mediaRecorderRef.current.state);
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      isRecording.current = false;
    }
  };

  const startCall = async () => {
    try {
      setCallStatus('connecting');

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported. Please use HTTPS or localhost.');
      }

      console.log('[Voice Call] Requesting microphone access...');

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      console.log('[Voice Call] Microphone access granted');

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      console.log('[Voice Call] Audio context created');

      // Setup audio analyser for voice activity detection
      await setupAudioAnalyser(stream);

      // Connect WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/voice-call`;
      console.log('[Voice Call] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Voice Call] Connected');
        setCallStatus('connected'); // WebSocket is now open, waiting for ready message
        // Reset reconnection counter on successful connection
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = async (event) => {
        try {
          console.log('[Voice Call] Received message, type:', typeof event.data);

          if (event.data instanceof Blob) {
            console.log('[Voice Call] Received audio blob, size:', event.data.size);
            // Audio response from AI - stop recording and mute mic while AI speaks
            stopRecording();

            // Mute the microphone to prevent echo
            if (audioStreamRef.current) {
              audioStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = false;
              });
              console.log('[Voice Call] Microphone muted during AI response');
            }

            setCallStatus('speaking');

            const audioBlob = event.data;
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            // Ensure audio plays at full volume and is not muted
            audio.volume = 1.0;
            audio.muted = false;

            audio.onended = () => {
              console.log('[Voice Call] Audio playback ended, unmuting and restarting recording');

              // Clean up the Blob URL to prevent memory leak
              URL.revokeObjectURL(audioUrl);

              // Unmute the microphone
              if (audioStreamRef.current) {
                audioStreamRef.current.getAudioTracks().forEach(track => {
                  track.enabled = true;
                });
                console.log('[Voice Call] Microphone unmuted');
              }

              setCallStatus('connected');
              // Add small delay before restarting to avoid race conditions
              setTimeout(() => {
                if (!isRecording.current && wsRef.current?.readyState === WebSocket.OPEN) {
                  startRecording();
                }
              }, 300);
            };

            audio.onerror = (error) => {
              console.error('[Voice Call] Audio playback error:', error);

              // Clean up the Blob URL even on error
              URL.revokeObjectURL(audioUrl);

              // Unmute the microphone even on error
              if (audioStreamRef.current) {
                audioStreamRef.current.getAudioTracks().forEach(track => {
                  track.enabled = true;
                });
                console.log('[Voice Call] Microphone unmuted after error');
              }

              setCallStatus('connected');
              // Add small delay before restarting to avoid race conditions
              setTimeout(() => {
                if (!isRecording.current && wsRef.current?.readyState === WebSocket.OPEN) {
                  startRecording();
                }
              }, 300);
            };

            console.log('[Voice Call] Starting audio playback...');
            try {
              await audio.play();
              console.log('[Voice Call] Audio playback started successfully');
            } catch (playError) {
              console.error('[Voice Call] Failed to play audio:', playError);
              // Trigger error handler
              audio.onerror(playError as any);
            }
          } else if (typeof event.data === 'string') {
            console.log('[Voice Call] Received text message:', event.data);

            try {
              const data = JSON.parse(event.data);
              console.log('[Voice Call] Parsed message:', data);

              if (data.type === 'ready') {
                console.log('[Voice Call] Server is ready:', data.message);
                setCallStatus('connected');
                // Start initial recording when server is ready
                startRecording();
              } else if (data.type === 'transcription') {
                console.log('[Voice Call] Transcription received:', data);
                // Limit transcript to last 20 entries to prevent unbounded growth
                setTranscript(prev => [...prev.slice(-19), { user: data.userText, ai: data.aiText }]);
                // Send transcript to the main chat
                if (onTranscript && data.userText && data.aiText) {
                  onTranscript(data.userText, data.aiText);
                }
              } else if (data.type === 'error') {
                console.error('[Voice Call] Server error:', data.message);
              }
            } catch (parseError) {
              console.error('[Voice Call] JSON parse error:', parseError);
              console.error('[Voice Call] Raw data:', event.data);
            }
          }
        } catch (error) {
          console.error('[Voice Call] Message handler error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[Voice Call] WebSocket error:', error);
        setCallStatus('connecting'); // Try to show it's having issues but don't close
      };

      ws.onclose = (event) => {
        console.log('[Voice Call] WebSocket closed:', event.code, event.reason);
        console.log('[Voice Call] isClosing flag:', isClosing.current);

        if (event.code !== 1000) { // 1000 = normal closure
          console.error('[Voice Call] Abnormal close, code:', event.code);
          console.error('[Voice Call] This might be due to SSL certificate or CORS issues');
        }

        // Attempt to reconnect if not intentionally closing
        if (!isClosing.current) {
          const maxAttempts = 5;
          const baseDelay = 1000; // Start with 1 second

          if (reconnectAttemptsRef.current < maxAttempts) {
            reconnectAttemptsRef.current++;
            const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);

            console.log(`[Voice Call] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxAttempts})...`);
            setCallStatus('connecting');

            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('[Voice Call] Attempting reconnection...');
              // Clean up previous connection state
              stopRecording();
              wsRef.current = null;
              // Retry connection
              startCall();
            }, delay);
          } else {
            console.error('[Voice Call] Max reconnection attempts reached');
            setCallStatus('connecting');
            alert('Connection lost. Please close and try again.');
          }
        }
      };

    } catch (error) {
      console.error('[Voice Call] Start error:', error);
      alert('Unable to start voice call. Please check microphone permissions.');
      onClose();
    }
  };

  const cleanup = () => {
    console.log('[Voice Call] Cleanup called');

    stopRecording();

    // Clear silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (audioStreamRef.current) {
      console.log('[Voice Call] Stopping audio stream tracks');
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      console.log('[Voice Call] Closing audio context');
      audioContextRef.current.close();
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('[Voice Call] Closing WebSocket');
      wsRef.current.close(1000, 'User closed modal');
    }
  };

  const toggleMute = () => {
    if (audioStreamRef.current) {
      const newMutedState = !isMuted;
      audioStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState; // When muted=true, disable track
      });
      setIsMuted(newMutedState);

      // If unmuting and we're connected, restart recording
      if (!newMutedState && callStatus === 'connected' && !isRecording.current) {
        startRecording();
      }
    }
  };

  const handleEndCall = () => {
    cleanup();
    onClose();
  };

  const getStatusText = () => {
    const isArabic = language === 'ar';
    switch (callStatus) {
      case 'connecting':
        return isArabic ? 'جاري الاتصال...' : 'Connecting...';
      case 'connected':
        return isArabic ? 'جاهز للمحادثة' : 'Ready to talk';
      case 'listening':
        return isArabic ? 'أستمع إليك...' : 'Listening...';
      case 'speaking':
        return isArabic ? 'الذكاء الاصطناعي يتحدث...' : 'AI is speaking...';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{
      background: 'linear-gradient(135deg, var(--galileo-bg-gradient-start) 0%, var(--galileo-bg-gradient-end) 100%)'
    }}>
      {/* Animated background elements for Apple-style effect */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-30"
          style={{
            background: 'var(--galileo-glass-refraction-bg)',
            filter: 'var(--galileo-glass-blur)',
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, 20, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-30"
          style={{
            background: 'var(--galileo-glass-refraction-bg)',
            filter: 'var(--galileo-glass-blur)',
          }}
          animate={{
            y: [0, 20, 0],
            x: [0, -20, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-20"
          style={{
            background: 'var(--galileo-glass-refraction-bg)',
            filter: 'blur(60px)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        />
      </div>
      
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to bottom, var(--galileo-glass-subtle-bg) 0%, var(--galileo-glass-bg) 100%)',
        backdropFilter: 'var(--galileo-glass-blur)'
      }} />

      {/* Close button */}
      <motion.button
        onClick={handleEndCall}
        className="absolute top-6 right-6 p-3 rounded-full transition-all z-10"
        style={{
          background: 'var(--galileo-glass-bg)',
          border: '1px solid var(--galileo-glass-border)',
          boxShadow: 'var(--galileo-glass-shadow)',
          backdropFilter: 'var(--galileo-glass-blur)',
          color: 'var(--galileo-text-secondary)'
        }}
        whileHover={{ 
          scale: 1.1,
          background: 'var(--galileo-glass-bg-hover)',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.15)'
        }}
        whileTap={{ scale: 0.95 }}
        aria-label="End call"
      >
        <XIcon className="w-6 h-6" />
      </motion.button>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center space-y-6 z-10">
        {/* Voice wave visualization */}
        <div className="relative">
          <motion.div 
            className="w-48 h-48 rounded-full flex items-center justify-center relative"
            style={{
              background: 'var(--galileo-glass-bg)',
              border: '1px solid var(--galileo-glass-border)',
              boxShadow: 'var(--galileo-glass-shadow)',
              backdropFilter: 'var(--galileo-glass-blur)',
            }}
            animate={{
              boxShadow: callStatus === 'listening' 
                ? '0 0 30px rgba(59, 130, 246, 0.4), var(--galileo-glass-shadow)'
                : callStatus === 'speaking'
                ? '0 0 30px rgba(34, 197, 94, 0.4), var(--galileo-glass-shadow)'
                : callStatus === 'connecting'
                ? '0 0 30px rgba(250, 204, 21, 0.4), var(--galileo-glass-shadow)'
                : 'var(--galileo-glass-shadow)'
            }}
            transition={{ duration: 0.5 }}
          >
            {/* Glowing ring effect */}
            <motion.div 
              className="absolute inset-0 rounded-full"
              style={{
                background: callStatus === 'listening' 
                  ? 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)'
                  : callStatus === 'speaking'
                  ? 'radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, transparent 70%)'
                  : callStatus === 'connecting'
                  ? 'radial-gradient(circle, rgba(250, 204, 21, 0.25) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
              }}
              animate={{
                scale: callStatus === 'listening' || callStatus === 'speaking' ? [1, 1.05, 1] : 1,
                opacity: callStatus === 'listening' || callStatus === 'speaking' ? [0.4, 0.6, 0.4] : 0.2,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
            />
            
            {/* Voice waves */}
            <div className="flex items-center justify-center space-x-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 rounded-full"
                  style={{
                    background: callStatus === 'listening' 
                      ? '#3B82F6'
                      : callStatus === 'speaking'
                      ? '#22C55E'
                      : callStatus === 'connecting'
                      ? '#FACC15'
                      : '#9CA3AF',
                    boxShadow: callStatus === 'listening' 
                      ? '0 0 8px rgba(59, 130, 246, 0.6)'
                      : callStatus === 'speaking'
                      ? '0 0 8px rgba(34, 197, 94, 0.6)'
                      : callStatus === 'connecting'
                      ? '0 0 8px rgba(250, 204, 21, 0.6)'
                      : 'none'
                  }}
                  animate={{
                    height: callStatus === 'listening' || callStatus === 'speaking'
                      ? [16, 16 + i * 10, 16]
                      : 16,
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: i * 0.1,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Status text */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-medium mb-1" style={{
            color: 'var(--galileo-text-primary)'
          }}>
            {language === 'ar' ? 'مكالمة صوتية بالذكاء الاصطناعي' : 'AI Voice Call'}
          </h2>
          <motion.p 
            className="text-base font-normal"
            style={{
              color: callStatus === 'connecting' 
                ? '#FACC15'
                : callStatus === 'connected'
                ? 'var(--galileo-text-secondary)'
                : callStatus === 'listening'
                ? '#3B82F6'
                : '#22C55E'
            }}
            animate={{
              scale: callStatus === 'listening' || callStatus === 'speaking' ? [1, 1.03, 1] : 1,
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          >
            {getStatusText()}
          </motion.p>
        </motion.div>

        {/* Mute button */}
        <motion.button
          onClick={toggleMute}
          disabled={callStatus === 'connecting'}
          className="p-4 rounded-full transition-all shadow-lg relative overflow-hidden"
          style={{
            background: isMuted
              ? 'linear-gradient(135deg, #EF4444, #DC2626)'
              : 'var(--galileo-glass-bg)',
            border: isMuted
              ? 'none'
              : '1px solid var(--galileo-glass-border)',
            boxShadow: isMuted
              ? '0 6px 24px rgba(239, 68, 68, 0.3)'
              : 'var(--galileo-glass-shadow)',
            backdropFilter: 'var(--galileo-glass-blur)',
            color: isMuted
              ? 'white'
              : 'var(--galileo-text-primary)',
          }}
          whileHover={{ 
            scale: 1.05,
            boxShadow: isMuted
              ? '0 8px 28px rgba(239, 68, 68, 0.4)'
              : '0 6px 28px rgba(0, 0, 0, 0.12)'
          }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: callStatus === 'listening' && !isMuted
              ? '0 0 20px rgba(59, 130, 246, 0.3), var(--galileo-glass-shadow)'
              : isMuted
              ? '0 6px 24px rgba(239, 68, 68, 0.3)'
              : 'var(--galileo-glass-shadow)'
          }}
          transition={{ duration: 0.3 }}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {/* Glowing effect for active listening */}
          {callStatus === 'listening' && !isMuted && (
            <motion.div 
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.4, 0.6, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
            />
          )}
          
          <div className="relative z-10">
            <motion.div
              animate={{
                rotate: isMuted ? [0, 8, -8, 0] : 0,
              }}
              transition={{
                duration: 0.5,
                repeat: isMuted ? Infinity : 0,
                repeatDelay: 2,
              }}
            >
              <MicrophoneIcon className="w-6 h-6" />
            </motion.div>
            {isMuted && (
              <motion.div 
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-8 h-0.5 bg-white transform rotate-45" />
              </motion.div>
            )}
          </div>
        </motion.button>

        {/* Transcript (optional) */}
        <AnimatePresence>
          {transcript.length > 0 && (
            <motion.div 
              className="max-w-lg max-h-40 overflow-y-auto p-3 rounded-lg space-y-2"
              style={{
                background: 'var(--galileo-glass-bg)',
                border: '1px solid var(--galileo-glass-border)',
                boxShadow: 'var(--galileo-glass-shadow)',
                backdropFilter: 'var(--galileo-glass-blur)',
              }}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              {transcript.slice(-3).map((item, index) => (
                <motion.div 
                  key={index} 
                  className="space-y-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <p className="text-xs" style={{ color: '#3B82F6' }}>
                    <strong>You:</strong> {item.user}
                  </p>
                  <p className="text-xs" style={{ color: '#22C55E' }}>
                    <strong>AI:</strong> {item.ai}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VoiceCall;
