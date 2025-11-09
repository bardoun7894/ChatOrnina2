import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';
type MessageRole = 'user' | 'assistant';

interface VoiceMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

const VoiceChat: React.FC = () => {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      // Clean up recording on unmount
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported. Please use HTTPS or localhost.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setVoiceState('processing');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setVoiceState('listening');
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      setVoiceState('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('type', 'transcribe');

      const response = await fetch('/api/homechat', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.text) {
        const userMessage: VoiceMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: data.text,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        setCurrentTranscript(data.text);
        
        // Get AI response
        await getAIResponse(data.text);
      }
      setVoiceState('idle');
    } catch (error) {
      console.error('Transcription error:', error);
      setVoiceState('idle');
    }
  };

  const getAIResponse = async (userMessage: string) => {
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/homechat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId: 'voice-chat'
        }),
      });

      const data = await response.json();

      if (data.response) {
        const assistantMessage: VoiceMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Optional: Text-to-speech for the assistant's response
        // speakText(data.response);
      }
    } catch (error) {
      console.error('AI response error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceButtonClick = () => {
    if (voiceState === 'idle') {
      startRecording();
    } else if (voiceState === 'listening') {
      stopRecording();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Animation variants for the expanding rings
  const waveVariants = {
    idle: { height: 0 },
    listening: {
      height: [0, 20, 0],
      transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" as const }
    },
    processing: {
      height: [0, 15, 0],
      transition: { repeat: Infinity, duration: 1, ease: "easeInOut" as const }
    },
    speaking: {
      height: [0, 25, 0],
      transition: { repeat: Infinity, duration: 0.8, ease: "easeInOut" as const }
    }
  };

  // Animation variants for the voice button
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

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-300",
      "bg-gradient-to-br from-gray-50 to-gray-100"
    )}>
      {/* Header */}
      <header className={cn(
        "flex items-center justify-between p-4 border-b",
        "bg-white/70 galileo-glass border-gray-200/50 backdrop-blur-lg"
      )}>
        <button
          onClick={() => router.back()}
          className={cn(
            "p-2 rounded-lg transition-all duration-200",
            "hover:bg-gray-100/50 text-gray-700"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
        </button>
        
        <h1 className={cn(
          "text-xl font-semibold",
          "text-gray-800"
        )}>
          {t('voice.title') || 'Voice Assistant'}
        </h1>
        
        <div className="w-9 h-9"></div> {/* Placeholder to maintain layout */}
      </header>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex",
                message.role === 'user' 
                  ? (isRTL ? "justify-start" : "justify-end") 
                  : (isRTL ? "justify-end" : "justify-start")
              )}
            >
              <div className={cn(
                "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl",
                message.role === 'user'
                  ? "bg-blue-500/80 text-white galileo-glass"
                  : "bg-white/80 text-gray-800 galileo-glass border border-gray-200/50"
              )}>
                <p className="text-sm">{message.content}</p>
                <p className={cn(
                  "text-xs mt-1 opacity-70",
                  message.role === 'user' ? "text-blue-100" : "text-gray-500"
                )}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Current transcript indicator */}
        <AnimatePresence>
          {currentTranscript && voiceState === 'processing' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "flex",
                isRTL ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl",
                "bg-blue-500/80 text-white galileo-glass"
              )}>
                <p className="text-sm">{currentTranscript}</p>
                <div className="flex items-center mt-1 space-x-1">
                  <div className="w-2 h-2 bg-blue-200 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-100">
                    {t('voice.processing') || 'Processing...'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* AI processing indicator */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "flex",
                isRTL ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl",
                "bg-white/80 text-gray-800 galileo-glass border border-gray-200/50"
              )}>
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.1
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {t('voice.thinking') || 'Thinking...'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Voice Control Area */}
      <div className="p-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Voice waves visualization */}
          <AnimatePresence>
            {voiceState !== 'idle' && (
              <motion.div
                className="flex items-end space-x-1 h-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      "w-1 rounded-full",
                      voiceState === 'listening' 
                        ? "bg-blue-500/70"
                        : voiceState === 'processing'
                        ? "bg-amber-500/70"
                        : "bg-green-500/70"
                    )}
                    variants={waveVariants}
                    animate={voiceState}
                    style={{
                      height: `${4 + i * 2}px`,
                      animationDelay: `${i * 0.05}s`
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Voice button */}
          <motion.button
            onClick={handleVoiceButtonClick}
            className={cn(
              "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none",
              voiceState === 'listening' 
                ? "bg-red-500/20 text-red-500 border-2 border-red-500/30 galileo-glass" 
                : voiceState === 'processing'
                ? "bg-yellow-500/20 text-yellow-500 border-2 border-yellow-500/30 galileo-glass"
                : "bg-blue-500/20 text-blue-500 border-2 border-blue-500/30 galileo-glass hover:bg-blue-500/30"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            variants={pulseVariants}
            animate={voiceState}
          >
            {/* Icon */}
            {voiceState === 'listening' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ) : voiceState === 'processing' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
            
            {/* Animated rings around button when active */}
            <AnimatePresence>
              {voiceState !== 'idle' && (
                <>
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className={cn(
                        "absolute inset-0 rounded-full border",
                        voiceState === 'listening' 
                          ? "border-red-500/30"
                          : voiceState === 'processing'
                          ? "border-yellow-500/30"
                          : "border-blue-500/30"
                      )}
                      initial={{ scale: 1, opacity: 0.7 }}
                      animate={{ 
                        scale: [1, 1.5 + i * 0.2, 2 + i * 0.3], 
                        opacity: [0.7, 0.3, 0] 
                      }}
                      exit={{ scale: 1, opacity: 0 }}
                      transition={{ 
                        duration: 2 + i * 0.5, 
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeOut"
                      }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>
          </motion.button>
          
          {/* Status text */}
          <AnimatePresence>
            {voiceState !== 'idle' && (
              <motion.div
                className="text-sm font-medium text-gray-600"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                {voiceState === 'listening' && (
                  <span>{t('voice.listening') || 'Listening...'}</span>
                )}
                {voiceState === 'processing' && (
                  <span>{t('voice.processing') || 'Processing...'}</span>
                )}
                {voiceState === 'speaking' && (
                  <span>{t('voice.speaking') || 'Speaking...'}</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Instructions */}
          {voiceState === 'idle' && (
            <div className={cn(
              "p-4 rounded-xl text-center max-w-md",
              "galileo-glass"
            )}>
              <p className={cn(
                "text-sm mb-2",
                "text-gray-700"
              )}>
                {t('voice.instructions') || 'Tap the microphone to start speaking with your AI assistant.'}
              </p>
              <p className={cn(
                "text-xs",
                "text-gray-600"
              )}>
                {t('voice.privacy_note') || 'Your voice is processed securely for transcription.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;
