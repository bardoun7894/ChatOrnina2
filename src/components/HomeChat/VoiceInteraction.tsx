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

      // Request high-quality audio with noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000, // Higher sample rate for better quality
        }
      });

      // Use higher bitrate for WebM to improve quality
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000, // 128 kbps for better quality
      };

      // Fallback if browser doesn't support opus
      const mediaRecorder = MediaRecorder.isTypeSupported(options.mimeType || '')
        ? new MediaRecorder(stream, options)
        : new MediaRecorder(stream);

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

        console.log('[VoiceInteraction] Recording stopped, blob size:', audioBlob.size);

        await transcribeAudio(audioBlob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      // Record with timeslices for better data capture
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setVoiceState('listening');

      console.log('[VoiceInteraction] Recording started with high quality settings');
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      setVoiceState('idle');
      setIsClicked(false);
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

  // Convert WebM to WAV using the EXACT same format as VoiceCallRealtime
  const webmToWav = async (webmBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();
      
      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Get audio data and convert to Int16Array (same as VoiceCallRealtime)
          const channelData = audioBuffer.getChannelData(0);
          const pcm16 = new Int16Array(channelData.length);
          
          for (let i = 0; i < channelData.length; i++) {
            const sample = Math.max(-1, Math.min(1, channelData[i]));
            pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          }
          
          // Use the EXACT same WAV creation logic as VoiceCallRealtime
          const sampleRate = audioBuffer.sampleRate;
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
          
          const wavBlob = new Blob([buffer], { type: 'audio/wav' });
          
          // Detailed WAV validation
          const headerView = new DataView(buffer, 0, 44);
          const riff = String.fromCharCode(headerView.getUint8(0), headerView.getUint8(1), headerView.getUint8(2), headerView.getUint8(3));
          const wave = String.fromCharCode(headerView.getUint8(8), headerView.getUint8(9), headerView.getUint8(10), headerView.getUint8(11));
          const fmt = String.fromCharCode(headerView.getUint8(12), headerView.getUint8(13), headerView.getUint8(14), headerView.getUint8(15));
          
          console.log('[VoiceInteraction] WAV created with exact VoiceCallRealtime format:', {
            sampleRate,
            byteRate,
            blockAlign,
            dataSize,
            totalSize: buffer.byteLength,
            validation: {
              riff: riff === 'RIFF' ? '✅' : `❌ ${riff}`,
              wave: wave === 'WAVE' ? '✅' : `❌ ${wave}`,
              fmt: fmt === 'fmt ' ? '✅' : `❌ ${fmt}`,
              audioFormat: headerView.getUint16(20, true),
              channels: headerView.getUint16(22, true),
              sampleRateHeader: headerView.getUint32(24, true),
              byteRateHeader: headerView.getUint32(28, true),
              blockAlignHeader: headerView.getUint16(32, true),
              bitsPerSample: headerView.getUint16(34, true)
            }
          });
          resolve(wavBlob);
        } catch (error) {
          console.error('[VoiceInteraction] WAV conversion error:', error);
          reject(error);
        }
      };
      
      fileReader.onerror = () => reject(new Error('Failed to read audio file'));
      fileReader.readAsArrayBuffer(webmBlob);
    });
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      console.log('[VoiceInteraction] Starting transcription...', {
        size: audioBlob.size,
        type: audioBlob.type
      });

      // Check minimum audio size (WebM has ~44 byte header, so 1000 bytes = ~0.1s of audio)
      if (audioBlob.size < 1000) {
        console.warn('[VoiceInteraction] Audio too short, skipping transcription');
        setVoiceState('idle');
        setIsClicked(false);
        return;
      }

      // Use WebM directly - it's more reliable and in OpenAI's supported formats
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', 'ar'); // Arabic
      // Add prompt to reduce hallucinations and guide Whisper for Syrian Arabic
      formData.append('prompt', 'محادثة عربية سورية. الكلمات الشائعة: مرحبا، أهلاً، كيفك، شو، شلونك، يعطيك العافية، مبسوط، تمام، الحمدلله');

      const response = await fetch('/api/whisper-transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error('[VoiceInteraction] Whisper API error:', errorData);

        // Try legacy homechat API as fallback
        console.log('[VoiceInteraction] Trying legacy homechat API as fallback...');
        try {
          const legacyFormData = new FormData();
          legacyFormData.append('audio', audioBlob, 'recording.webm');
          legacyFormData.append('type', 'transcribe');

          const legacyResponse = await fetch('/api/homechat', {
            method: 'POST',
            body: legacyFormData,
          });

          if (legacyResponse.ok) {
            const legacyData = await legacyResponse.json();
            if (legacyData.success && legacyData.text) {
              console.log('[VoiceInteraction] ✅ Legacy API succeeded:', legacyData.text);
              setTranscript(legacyData.text);
              if (onTranscript) {
                onTranscript(legacyData.text);
              }
              setVoiceState('idle');
              setIsClicked(false);
              return;
            }
          }
        } catch (legacyError) {
          console.error('[VoiceInteraction] Legacy API also failed:', legacyError);
        }

        throw new Error(`Whisper API error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('[VoiceInteraction] ✅ Transcription received:', data.text);

      if (data.text) {
        setTranscript(data.text);
        if (onTranscript) {
          onTranscript(data.text);
        }
      }
      // Reset to idle state after processing is complete
      setVoiceState('idle');
      // Reset clicked state to return to original appearance
      setIsClicked(false);
    } catch (error: any) {
      console.error('[VoiceInteraction] ❌ Transcription failed:', error.message || error);
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
                "text-gray-600"
              )}>
                {t('voice.processing', 'Processing...')}
              </span>
            )}
            {voiceState === 'speaking' && (
              <span className={cn(
                "text-gray-600"
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
