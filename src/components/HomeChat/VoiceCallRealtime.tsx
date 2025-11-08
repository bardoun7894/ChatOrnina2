import React, { useState, useRef, useEffect } from 'react';
import { XIcon, MicrophoneIcon } from './icons';
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
  const [transcript, setTranscript] = useState<{ user: string; ai: string }[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitialized = useRef(false);
  const isClosing = useRef(false);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Audio playback queue for streaming
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const currentUserTranscript = useRef<string>('');
  const currentAiResponse = useRef<string>('');

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

        // Start sending audio from microphone
        startAudioCapture();
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
      if (isMuted || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      // Get audio data
      const inputData = e.inputBuffer.getChannelData(0);

      // Convert Float32Array to Int16Array (PCM16)
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Convert to base64
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));

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
        break;

      case 'session.ready':
        console.log('[Realtime] Session ready');
        setCallStatus('listening');
        break;

      case 'input_audio_buffer.speech_started':
        console.log('[Realtime] User started speaking');
        currentUserTranscript.current = '';
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('[Realtime] User stopped speaking');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        console.log('[Realtime] User transcript:', message.transcript);
        currentUserTranscript.current = message.transcript || '';
        break;

      case 'response.audio_transcript.delta':
        // Accumulate AI response text
        if (message.delta) {
          currentAiResponse.current += message.delta;
        }
        break;

      case 'response.audio.delta':
        // Handle streaming audio from AI
        if (message.delta) {
          setCallStatus('speaking');
          playAudioDelta(message.delta);
        }
        break;

      case 'response.audio.done':
        console.log('[Realtime] AI finished speaking');

        // Update transcript
        if (currentUserTranscript.current || currentAiResponse.current) {
          setTranscript(prev => [
            ...prev.slice(-19),
            {
              user: currentUserTranscript.current,
              ai: currentAiResponse.current
            }
          ]);

          // Send to parent component
          if (onTranscript && currentUserTranscript.current && currentAiResponse.current) {
            onTranscript(currentUserTranscript.current, currentAiResponse.current);
          }

          // Reset for next interaction
          currentUserTranscript.current = '';
          currentAiResponse.current = '';
        }

        setCallStatus('listening');
        break;

      case 'error':
        console.error('[Realtime] Server error:', message.error);
        break;

      default:
        // Log unknown message types for debugging
        if (!message.type.includes('ping') && !message.type.includes('pong')) {
          console.log('[Realtime] Unknown message type:', message.type);
        }
    }
  };

  const playAudioDelta = async (base64Audio: string) => {
    if (!audioContextRef.current) return;

    try {
      // Decode base64 to PCM16
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);

      // Convert PCM16 to Float32 for Web Audio API
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
      }

      // Create audio buffer
      const audioBuffer = audioContextRef.current.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      // Play audio
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();

    } catch (error) {
      console.error('[Realtime] Error playing audio:', error);
    }
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
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center",
      isDarkMode ? "bg-gray-900" : "bg-white"
    )}>
      {/* Close button */}
      <button
        onClick={handleEndCall}
        className={cn(
          "absolute top-6 right-6 p-3 rounded-full hover:opacity-80 transition-all",
          isDarkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
        )}
        aria-label="End call"
      >
        <XIcon className="w-6 h-6" />
      </button>

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
          <h2 className={cn(
            "text-2xl font-semibold mb-2",
            isDarkMode ? "text-gray-100" : "text-gray-900"
          )}>
            {language === 'ar' ? 'مكالمة صوتية بالذكاء الاصطناعي (Real-time)' : 'AI Voice Call (Real-time)'}
          </h2>
          <p className={cn(
            "text-lg",
            callStatus === 'connecting' && "text-yellow-500",
            callStatus === 'connected' && (isDarkMode ? "text-gray-400" : "text-gray-600"),
            callStatus === 'listening' && "text-blue-500",
            callStatus === 'speaking' && "text-green-500"
          )}>
            {getStatusText()}
          </p>
          <p className="text-xs mt-2 text-gray-500">
            OpenAI Realtime API • ChatGPT-quality
          </p>
        </div>

        {/* Mute button */}
        <button
          onClick={toggleMute}
          disabled={callStatus === 'connecting'}
          className={cn(
            "p-6 rounded-full transition-all shadow-lg",
            isMuted
              ? isDarkMode
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"
              : isDarkMode
                ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700",
            callStatus === 'connecting' && "opacity-50 cursor-not-allowed"
          )}
          aria-label={isMuted ? "Unmute" : "Mute"}
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

        {/* Transcript (optional) */}
        {transcript.length > 0 && (
          <div className={cn(
            "max-w-2xl max-h-48 overflow-y-auto p-4 rounded-lg space-y-2",
            isDarkMode ? "bg-gray-800" : "bg-gray-100"
          )}>
            {transcript.slice(-3).map((item, index) => (
              <div key={index} className="space-y-1">
                <p className={cn("text-sm", isDarkMode ? "text-blue-400" : "text-blue-600")}>
                  <strong>You:</strong> {item.user}
                </p>
                <p className={cn("text-sm", isDarkMode ? "text-green-400" : "text-green-600")}>
                  <strong>AI:</strong> {item.ai}
                </p>
              </div>
            ))}
          </div>
        )}
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
