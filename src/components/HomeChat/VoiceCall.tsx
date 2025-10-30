import React, { useState, useRef, useEffect } from 'react';
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

      // Delay cleanup by 100ms to avoid React StrictMode double-mount issue
      // If component remounts quickly (StrictMode), this timeout will be cleared
      cleanupTimeoutRef.current = setTimeout(() => {
        console.log('[Voice Call] Executing delayed cleanup...');
        isClosing.current = true;
        cleanup();
      }, 100);
    };
  }, []);

  // Setup audio analysis for voice activity detection
  const setupAudioAnalyser = (stream: MediaStream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
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

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;

      // Lower threshold for more sensitive voice detection
      const isSpeaking = average > 5;

      if (isSpeaking && !isSpeakingRef.current) {
        // Started speaking
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
            sendAccumulatedAudio();
            silenceTimeoutRef.current = null;
          }, 500); // Wait only 0.5 seconds after silence for faster response
        }
      }

      requestAnimationFrame(checkAudioLevel);
    };

    checkAudioLevel();
  };

  const sendAccumulatedAudio = () => {
    if (audioChunksRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
      console.log('[Voice Call] Sending complete audio segment, size:', audioBlob.size);
      wsRef.current.send(audioBlob);
      audioChunksRef.current = [];

      // Restart recording for next segment
      if (isRecording.current) {
        stopRecording();
        setTimeout(() => startRecording(), 100);
      }
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

      // Create a fresh MediaRecorder for new recording session
      const mediaRecorder = new MediaRecorder(audioStreamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
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

      mediaRecorder.start(100); // Record in 100ms chunks
      mediaRecorderRef.current = mediaRecorder;
      isRecording.current = true;
      setCallStatus('listening');
      console.log('[Voice Call] Recording started');
    } catch (error) {
      console.error('[Voice Call] Error starting recording:', error);
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
      setupAudioAnalyser(stream);

      // Connect WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/voice-call`;
      console.log('[Voice Call] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Voice Call] Connected');
        setCallStatus('connecting'); // Wait for ready message
      };

      ws.onmessage = async (event) => {
        try {
          console.log('[Voice Call] Received message, type:', typeof event.data);

          if (event.data instanceof Blob) {
            console.log('[Voice Call] Received audio blob, size:', event.data.size);
            // Audio response from AI - stop recording while AI speaks
            stopRecording();
            setCallStatus('speaking');

            const audioBlob = event.data;
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audio.onended = () => {
              console.log('[Voice Call] Audio playback ended, restarting recording');
              setCallStatus('connected');
              // Restart recording immediately after AI finishes speaking
              startRecording();
            };

            audio.onerror = (error) => {
              console.error('[Voice Call] Audio playback error:', error);
              setCallStatus('connected');
              // Try to restart recording even on error
              startRecording();
            };

            await audio.play();
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
                setTranscript(prev => [...prev, { user: data.userText, ai: data.aiText }]);
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

        // Show disconnected state but don't auto-reconnect (causes infinite loop)
        if (!isClosing.current) {
          console.log('[Voice Call] Connection lost. Please try again.');
          setCallStatus('connecting');
          // Note: Auto-reconnect disabled due to certificate/CORS issues
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

    if (audioStreamRef.current) {
      console.log('[Voice Call] Stopping audio stream tracks');
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current) {
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
      audioStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted; // Toggle enabled state
      });
      setIsMuted(!isMuted);

      // If unmuting and we're connected, restart recording
      if (isMuted && callStatus === 'connected' && !isRecording.current) {
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
            {language === 'ar' ? 'مكالمة صوتية بالذكاء الاصطناعي' : 'AI Voice Call'}
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

export default VoiceCall;
