import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VoiceChatModal: React.FC<VoiceChatModalProps> = ({ isOpen, onClose }) => {
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const [lastAssistantMessage, setLastAssistantMessage] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const shouldContinueListeningRef = useRef<boolean>(false);
  const isTogglingRef = useRef<boolean>(false);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  }, []);

  // Cleanup on modal close
  useEffect(() => {
    if (!isOpen) {
      // Stop session
      shouldContinueListeningRef.current = false;
      setIsSessionActive(false);
      // Stop recording
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
      // Release audio stream
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      // Cancel speech synthesis
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
      // Reset state
      setVoiceState('idle');
    }
  }, [isOpen, isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording]);

  // Text-to-speech function
  const speakText = useCallback((text: string) => {
    if (!speechSynthesisRef.current || isMuted) return;

    // Cancel any ongoing speech gracefully
    if (speechSynthesisRef.current.speaking) {
      speechSynthesisRef.current.cancel();
      // Small delay to ensure cancellation completes
      setTimeout(() => {
        startSpeaking(text);
      }, 100);
    } else {
      startSpeaking(text);
    }

    function startSpeaking(textToSpeak: string) {
      if (!speechSynthesisRef.current) return;

      // Create a new utterance
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = volume;

      utterance.onstart = () => {
        setVoiceState('speaking');
        setLastAssistantMessage(textToSpeak);
      };

      utterance.onend = () => {
        // After speaking, automatically start listening again if session is active
        if (shouldContinueListeningRef.current) {
          console.log('Speech ended, preparing to listen again...');
          // Give user 1 second to prepare before starting next recording
          setVoiceState('idle'); // Show idle state briefly
          setTimeout(() => {
            if (shouldContinueListeningRef.current) {
              console.log('Starting next recording...');
              startRecording();
            }
          }, 1000);
        } else {
          setVoiceState('idle');
        }
      };

      utterance.onerror = (event) => {
        // Only log non-interrupted errors
        if (event.error !== 'interrupted') {
          console.error('Speech synthesis error:', event);
        }
        setVoiceState('listening');
      };

      currentUtteranceRef.current = utterance;
      speechSynthesisRef.current.speak(utterance);
    }
  }, [isMuted, volume]);

  // Get AI response
  const getAIResponse = useCallback(async (transcript: string) => {
    try {
      const response = await fetch('/api/homechat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: transcript
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiResponse = data.message || "I'm sorry, I couldn't process that.";

      console.log('AI Response received:', aiResponse);

      // Speak the response
      speakText(aiResponse);

    } catch (error) {
      console.error('Error getting AI response:', error);
      speakText("I'm sorry, I encountered an error. Please try again.");
      setVoiceState('idle');
    }
  }, [speakText]);

  // Transcribe audio using Whisper API
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    try {
      setVoiceState('processing');

      console.log('Transcribing audio blob:', {
        size: audioBlob.size,
        type: audioBlob.type
      });

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('type', 'transcribe');

      console.log('Sending transcription request to /api/homechat');

      const response = await fetch('/api/homechat', {
        method: 'POST',
        body: formData,
      });

      console.log('Transcription response status:', response.status);

      const data = await response.json();
      console.log('Transcription response data:', data);

      if (data.success && data.text) {
        console.log('Transcription successful:', data.text);
        setLastUserMessage(data.text);
        // Get AI response
        await getAIResponse(data.text);
      } else {
        console.error('Transcription failed:', data);
        throw new Error(data.error || 'Transcription failed');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      speakText("I'm sorry, I couldn't understand that. Please try again.");
      setVoiceState('idle');
    }
  }, [getAIResponse, speakText]);

  // Start recording function
  const startRecording = async () => {
    try {
      // If already recording, don't start again
      if (isRecording) {
        console.log('Already recording, skipping...');
        return;
      }

      // Always get a fresh stream for each recording to avoid MediaRecorder errors
      // Clean up any existing stream first
      if (audioStreamRef.current) {
        const tracks = audioStreamRef.current.getTracks();
        const isActive = tracks.length > 0 && tracks[0].readyState === 'live';
        console.log('Existing stream status:', { tracksCount: tracks.length, readyState: tracks[0]?.readyState });

        // Always stop and get fresh stream to avoid issues
        tracks.forEach(track => track.stop());
        audioStreamRef.current = null;
      }

      // Request fresh microphone access
      console.log('Requesting fresh microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      audioStreamRef.current = stream;

      // Create media recorder with the fresh stream
      // Try to use opus codec, fall back to default if not supported
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn('opus codec not supported, using default');
        mimeType = 'audio/webm';
      }

      const mediaRecorder = new MediaRecorder(audioStreamRef.current, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      console.log('MediaRecorder created with mimeType:', mimeType);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const recordingDuration = Date.now() - recordingStartTimeRef.current;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        console.log('Audio blob created:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: audioChunksRef.current.length,
          duration: `${recordingDuration}ms`
        });

        // Check if recording is too short (less than 500ms)
        if (recordingDuration < 500) {
          console.warn('Recording too short:', recordingDuration, 'ms - retrying...');
          if (shouldContinueListeningRef.current) {
            // Automatically retry with longer delay for stream stabilization
            setVoiceState('idle');
            setTimeout(() => {
              if (shouldContinueListeningRef.current) {
                startRecording();
              }
            }, 1000);
          } else {
            speakText("Recording was too short. Please speak for at least half a second.");
            setVoiceState('idle');
          }
          return;
        }

        if (audioBlob.size === 0) {
          console.error('Audio blob is empty - retrying...');
          if (shouldContinueListeningRef.current) {
            // Automatically retry with longer delay
            setVoiceState('idle');
            setTimeout(() => {
              if (shouldContinueListeningRef.current) {
                startRecording();
              }
            }, 1000);
          } else {
            speakText("I'm sorry, no audio was recorded. Please try again.");
            setVoiceState('idle');
          }
          return;
        }

        await transcribeAudio(audioBlob);
      };

      // Start recording with auto-stop after 30 seconds
      // Request data in larger chunks (every 1 second) to prevent premature stops
      mediaRecorder.start(1000);
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setVoiceState('listening');

      console.log('Recording started successfully');

      // Auto-stop recording after 30 seconds to prevent infinite recording
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          console.log('Auto-stopping recording after 30 seconds');
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 30000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      speakText("I'm sorry, I couldn't access your microphone. Please check your permissions.");
      shouldContinueListeningRef.current = false;
      setIsSessionActive(false);
      setVoiceState('idle');
    }
  };

  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Toggle recording (simple mode - single recording at a time)
  const toggleRecording = async () => {
    // Prevent double-clicks
    if (isTogglingRef.current) {
      console.log('Toggle already in progress, ignoring...');
      return;
    }

    console.log('toggleRecording called, current isRecording:', isRecording, 'mediaRecorder state:', mediaRecorderRef.current?.state);
    isTogglingRef.current = true;

    try {
      // Check the actual MediaRecorder state instead of just the React state
      const isActuallyRecording = mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording';

      if (isActuallyRecording || isRecording) {
        // Stop current recording
        console.log('User manually stopping recording');
        stopRecording();
      } else {
        // Start new recording
        console.log('User starting new recording');
        await startRecording();
      }
    } finally {
      // Release the lock after a small delay
      setTimeout(() => {
        isTogglingRef.current = false;
      }, 500);
    }
  };

  // Toggle session (start/stop continuous conversation)
  const toggleSession = async () => {
    if (isSessionActive) {
      // Stop session
      console.log('Stopping conversation session...');
      shouldContinueListeningRef.current = false;
      setIsSessionActive(false);

      // Stop current recording if any
      if (isRecording) {
        stopRecording();
      }

      // Stop any ongoing speech
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }

      // Release audio stream
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }

      setVoiceState('idle');
    } else {
      // Start session
      console.log('Starting conversation session...');
      shouldContinueListeningRef.current = true;
      setIsSessionActive(true);

      // Start first recording
      await startRecording();
    }
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted && speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }
  };

  // Adjust volume
  const adjustVolume = (newVolume: number) => {
    setVolume(newVolume);
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }
    setVoiceState('listening');
  };

  // Animation variants for voice button
  const pulseVariants = {
    idle: { scale: 1, opacity: 0.7 },
    listening: { 
      scale: [1, 1.1, 1], 
      opacity: [0.7, 1, 0.7],
      transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" as const }
    },
    processing: { 
      scale: [1, 1.05, 1], 
      opacity: [0.7, 0.9, 0.7],
      transition: { repeat: Infinity, duration: 1, ease: "easeInOut" as const }
    },
    speaking: { 
      scale: [1, 1.15, 1], 
      opacity: [0.7, 1, 0.7],
      transition: { repeat: Infinity, duration: 0.8, ease: "easeInOut" as const }
    }
  };

  // Animation variants for expanding rings
  const waveVariants = {
    idle: { opacity: 0, scale: 0.8 },
    listening: {
      opacity: [0.6, 0],
      scale: [1, 2],
      transition: { repeat: Infinity, duration: 2, ease: "easeInOut" as const }
    },
    processing: {
      opacity: [0.4, 0],
      scale: [1, 1.5],
      transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" as const }
    },
    speaking: {
      opacity: [0.8, 0],
      scale: [1, 2.5],
      transition: { repeat: Infinity, duration: 1.2, ease: "easeInOut" as const }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 galileo-modal-backdrop">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-full max-w-lg p-8 rounded-3xl shadow-2xl galileo-glass-elevated overflow-hidden"
            >
              {/* Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center galileo-btn-depth transition-colors hover:bg-white/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 galileo-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold galileo-text-primary">Voice Assistant</h2>
                <p className="galileo-text-secondary">Ready to listen</p>
              </div>

              {/* Voice Status Display */}
              <div className={cn(
                "flex-1 flex flex-col items-center justify-center p-8",
                "galileo-glass-frosted"
              )}>
                {/* Voice Assistant Icon */}
                <div className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center mb-6",
                  "galileo-glass-elevated"
                )}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                
                {/* Status Messages */}
                <div className="text-center space-y-4">
                  {voiceState === 'idle' && (
                    <div>
                      <p className={cn(
                        "text-lg font-medium mb-2",
                        "galileo-text-primary"
                      )}>
                        Voice Assistant
                      </p>
                      <p className={cn(
                        "text-sm mb-4",
                        "galileo-text-secondary"
                      )}>
                        Click microphone button to start recording
                      </p>
                      <p className={cn(
                        "text-xs",
                        "galileo-text-tertiary"
                      )}>
                        I'll listen to what you say and respond with voice
                      </p>
                    </div>
                  )}
                  
                  {voiceState === 'listening' && (
                    <div>
                      <p className={cn(
                        "text-lg font-medium mb-2",
                        "galileo-text-primary"
                      )}>
                        Listening...
                      </p>
                      <p className={cn(
                        "text-sm",
                        "galileo-text-secondary"
                      )}>
                        I'm ready to hear what you have to say
                      </p>
                    </div>
                  )}
                  
                  {voiceState === 'processing' && (
                    <div>
                      <p className={cn(
                        "text-lg font-medium mb-2",
                        "galileo-text-primary"
                      )}>
                        Processing...
                      </p>
                      <p className={cn(
                        "text-sm",
                        "galileo-text-secondary"
                      )}>
                        Thinking of a response
                      </p>
                    </div>
                  )}
                  
                  {voiceState === 'speaking' && (
                    <div>
                      <p className={cn(
                        "text-lg font-medium mb-2",
                        "galileo-text-primary"
                      )}>
                        Speaking...
                      </p>
                      <p className={cn(
                        "text-sm",
                        "galileo-text-secondary"
                      )}>
                        Responding to your message
                      </p>
                    </div>
                  )}
                  
                  {/* Last Messages Display */}
                  {(lastUserMessage || lastAssistantMessage) && (
                    <div className="mt-8 space-y-4">
                      {lastUserMessage && (
                        <div className="text-center">
                          <p className={cn(
                            "text-sm px-4 py-2 rounded-full inline-block",
                            "galileo-glass-subtle text-gray-700"
                          )}>
                            You: {lastUserMessage}
                          </p>
                        </div>
                      )}
                      
                      {lastAssistantMessage && (
                        <div className="text-center">
                          <p className={cn(
                            "text-sm px-4 py-2 rounded-full inline-block",
                            "galileo-glass-subtle text-gray-700"
                          )}>
                            Assistant: {lastAssistantMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Voice Button */}
                <div className="flex items-center justify-center mt-8">
                  <div className="relative">
                    {/* Expanding rings animation */}
                    {voiceState !== 'idle' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          className="absolute w-16 h-16 rounded-full"
                          style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            filter: 'blur(1px)',
                            animationDelay: '0.5s'
                          }}
                          variants={waveVariants}
                          animate={voiceState}
                        />
                      </div>
                    )}
                    
                    {/* Voice button */}
                    <motion.button
                      onClick={toggleRecording}
                      disabled={voiceState === 'processing' || voiceState === 'speaking'}
                      className={cn(
                        "relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200",
                        "galileo-glass-elevated text-gray-700",
                        (voiceState === 'processing' || voiceState === 'speaking') && "opacity-50 cursor-not-allowed"
                      )}
                      variants={pulseVariants}
                      animate={voiceState}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isRecording ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      )}
                    </motion.button>
                  </div>
                </div>
                
                {/* Voice Controls */}
                <div className="flex items-center justify-center mt-6 space-x-4">
                  {/* Microphone Button */}
                  <button 
                    onClick={toggleRecording}
                    className={cn(
                      "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4",
                      "galileo-btn-depth",
                      isRecording ? "bg-red-500/50 ring-red-500/50" : "bg-blue-500/50 ring-blue-500/50",
                      "hover:bg-opacity-70"
                    )}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>

                  {/* Mute/Unmute Button */}
                  <button
                    onClick={toggleMute}
                    className={cn(
                      "p-2 rounded-full transition-all duration-200",
                      "galileo-btn galileo-btn-depth galileo-text-secondary"
                  )}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2v6" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
                
                {/* Volume Slider */}
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-24 h-1 galileo-slider"
                  />
                </div>
                
                {/* Stop Speaking Button */}
                {voiceState === 'speaking' && (
                  <button
                    onClick={stopSpeaking}
                    className={cn(
                      "p-2 rounded-full transition-all duration-200",
                      "bg-white/20 text-gray-600 hover:bg-white/30"
                    )}
                    title="Stop Speaking"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceChatModal;
