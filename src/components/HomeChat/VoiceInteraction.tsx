import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MicrophoneIcon, SoundWaveIcon } from './icons';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

interface VoiceInteractionProps {
  isRTL?: boolean;
  isLoading?: boolean;
  onTranscript?: (text: string) => void;
  className?: string;
}

export const VoiceInteraction: React.FC<VoiceInteractionProps> = ({
  isRTL = false,
  isLoading = false,
  onTranscript,
  className
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isClicked, setIsClicked] = useState(false);
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
      // Reset clicked state immediately when stopping to remove animations
      setIsClicked(false);
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
        setTranscript(data.text);
        if (onTranscript) {
          onTranscript(data.text);
        }
      }
      // Reset to idle state after processing is complete
      setVoiceState('idle');
      // Reset clicked state to return to original appearance
      setIsClicked(false);
    } catch (error) {
      console.error('Transcription error:', error);
      // Reset to idle state on error as well
      setVoiceState('idle');
      // Reset clicked state on error as well
      setIsClicked(false);
    }
  };

  const handleClick = () => {
    setIsClicked(true);
    
    if (voiceState === 'idle' && !isLoading) {
      startRecording();
    } else if (voiceState === 'listening') {
      stopRecording();
    }
    
    // Don't reset clicked state immediately - let it reset when processing completes
  };

  // Animation variants for different states
  const circleVariants = {
    idle: {
      scale: 1,
      opacity: 1,
    },
    listening: {
      scale: [1, 1.1, 1],
      opacity: 1,
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    },
    processing: {
      scale: [1, 1.2, 0.9, 1.2, 1],
      opacity: 0.7,
      transition: {
        duration: 1.8,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    },
    speaking: {
      scale: [1, 1.3, 0.8, 1.3, 1],
      opacity: 1,
      transition: {
        duration: 1.2,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  };

  const waveVariants = {
    idle: { opacity: 0 },
    listening: {
      opacity: 1,
      transition: { duration: 0.3 }
    },
    processing: {
      opacity: 0.5,
      transition: { duration: 0.3 }
    },
    speaking: {
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  const { t } = useLanguage();

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <button
        onClick={handleClick}
        disabled={voiceState === 'processing' || isLoading}
        className={cn(
          "relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2",
          voiceState === 'listening' 
            ? "bg-red-500/20 text-red-500 border border-red-500/30 galileo-glass" 
            : voiceState === 'processing'
            ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 galileo-glass"
            : "text-gray-700 hover:bg-gray-100/60",
          (voiceState === 'processing' || isLoading) && "cursor-not-allowed opacity-70"
        )}
      >
        
        {/* Main circle with animation - only shows gradient when clicked or in active state */}
        {(isClicked || voiceState !== 'idle') && (
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full",
              voiceState === 'listening' 
                ? "bg-gradient-to-br from-gray-500/20 to-gray-600/20" 
                : voiceState === 'processing'
                ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                : "bg-gradient-to-br from-purple-500/20 to-pink-500/20"
            )}
            variants={circleVariants}
            animate={voiceState}
            style={{ zIndex: 1 }}
          />
        )}
        
        {/* Icon */}
        <div className="relative z-10">
          {voiceState === 'listening' ? (
            <SoundWaveIcon className="w-5 h-5" />
          ) : (
            <MicrophoneIcon className="w-5 h-5" />
          )}
        </div>
        
        {/* Animated waves around circle - only show when in active state */}
        <AnimatePresence>
          {isClicked && voiceState === 'listening' && (
            <>
              {[1, 2, 3].map((index) => (
                <motion.div
                  key={index}
                  className={cn(
                    "absolute inset-0 rounded-full border",
                    "border-gray-500/30"
                  )}
                  initial={{ scale: 1, opacity: 0.7 }}
                  animate={{ 
                    scale: [1, 1.5 + index * 0.2, 2 + index * 0.3], 
                    opacity: [0.7, 0.3, 0] 
                  }}
                  exit={{ scale: 1, opacity: 0 }}
                  transition={{ 
                    duration: 2 + index * 0.5, 
                    repeat: Infinity,
                    delay: index * 0.2,
                    ease: "easeOut"
                  }}
                  style={{ zIndex: 0 }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
        
        {/* Processing indicator - only show when processing */}
        <AnimatePresence>
          {voiceState === 'processing' && (
            <motion.div
              className={cn(
                "absolute inset-0 rounded-full border-2 border-t-transparent",
                "border-amber-500/50"
              )}
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ zIndex: 0 }}
            />
          )}
        </AnimatePresence>
      </button>
      
      {/* Voice wave visualization - only show when in active state */}
      <AnimatePresence>
        {voiceState !== 'idle' && (
          <motion.div
            className={cn(
              "flex items-end space-x-1 h-6",
              isRTL ? "mr-4" : "ml-4"
            )}
            variants={waveVariants}
            animate={voiceState}
            initial="idle"
            exit="idle"
          >
            {[1, 2, 3, 4, 5].map((height) => (
              <motion.div
                key={height}
                className={cn(
                  "w-1 rounded-full",
                  voiceState === 'listening' 
                    ? "bg-gray-500/70"
                    : voiceState === 'processing'
                    ? "bg-amber-500/70"
                    : "bg-green-500/70"
                )}
                animate={{ 
                  height: [4, 12 + height * 3, 4] 
                }}
                transition={{ 
                  duration: 1.2, 
                  repeat: Infinity, 
                  delay: height * 0.1,
                  ease: "easeInOut" 
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Status text - only show when in active state */}
      <AnimatePresence>
        {voiceState !== 'idle' && (
          <motion.div
            className={cn(
              "text-xs font-medium",
              isRTL ? "mr-3" : "ml-3"
            )}
            initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 10 : -10 }}
            transition={{ duration: 0.3 }}
          >
            {voiceState === 'listening' && (
              <span className={cn(
                "text-gray-600"
              )}>
                {t('voice.listening', 'Listening...')}
              </span>
            )}
            {voiceState === 'processing' && (
              <span className={cn(
                "text-amber-600"
              )}>
                {t('voice.processing', 'Processing...')}
              </span>
            )}
            {voiceState === 'speaking' && (
              <span className={cn(
                "text-green-600"
              )}>
                {t('voice.speaking', 'Speaking...')}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceInteraction;
