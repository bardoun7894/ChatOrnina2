import React, { useState, useRef, useEffect } from 'react';
import { SparklesIcon, PaperAirplaneIcon, MenuIcon, PhotoIcon, MicrophoneIcon, SoundWaveIcon } from './icons';
import type { Message } from './types';
import CodeBlock from './CodeBlock';
import VoiceCall from './VoiceCall';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ChatProps {
  onMenuClick: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  conversationId?: string | null;
  userId?: string;
  userName?: string;
  onConversationSaved?: () => void;
}

const Chat: React.FC<ChatProps> = ({
  onMenuClick,
  isDarkMode = false,
  onToggleDarkMode,
  conversationId,
  userId,
  userName,
  onConversationSaved
}) => {
  const { t, isRTL } = useLanguage();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [generationMode, setGenerationMode] = useState<'chat' | 'image' | 'video'>('chat');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [welcomeMessageIndex, setWelcomeMessageIndex] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeConversationIdRef = useRef<string | null>(conversationId || null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // Close attachment menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Welcome messages animation (runs only once)
  useEffect(() => {
    if (animationComplete) return;
    
    const timer = setTimeout(() => {
      setWelcomeMessageIndex(1);
      setAnimationComplete(true);
    }, 2000); // Change to second message after 2 seconds

    return () => clearTimeout(timer);
  }, [animationComplete]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Load conversation when conversationId changes
  useEffect(() => {
    if (conversationId) {
      activeConversationIdRef.current = conversationId; // Update ref when prop changes
      loadConversation(conversationId);
    } else {
      activeConversationIdRef.current = null; // Reset ref for new conversation
      setMessages([]);
    }
  }, [conversationId]);

  const loadConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`);
      const data = await response.json();
      if (data.success && data.conversation.messages) {
        // Convert saved messages to UI format - SUPPORTS ALL MESSAGE TYPES
        const loadedMessages: Message[] = data.conversation.messages.map((msg: any) => {
          let content: any;

          // Check if content is an object (new format) or string (old format)
          if (typeof msg.content === 'object' && msg.content !== null) {
            content = msg.content;
          } else {
            // Old format - plain text
            content = { type: 'text', text: msg.content };
          }

          return {
            id: msg.id || Date.now().toString(),
            content: content,
            sender: msg.role === 'user' ? 'user' : 'ai',
          };
        });
        setMessages(loadedMessages);

        // ✅ RESUME PENDING GENERATIONS after page refresh
        resumePendingGenerations(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  // Resume any pending image/video generations after page refresh
  const resumePendingGenerations = async (messages: Message[]) => {
    for (const msg of messages) {
      if (msg.sender === 'ai' && msg.content.type === 'image' && msg.content.status === 'loading') {
        // Resume image generation
        if (msg.content.prompt && msg.content.requestId) {
          resumeImageGeneration(msg.id, msg.content.prompt, msg.content.requestId);
        }
      } else if (msg.sender === 'ai' && msg.content.type === 'video' && msg.content.status === 'loading') {
        // Resume video generation
        if (msg.content.prompt && msg.content.requestId) {
          resumeVideoGeneration(msg.id, msg.content.prompt, msg.content.requestId);
        }
      }
    }
  };

  const resumeImageGeneration = async (messageId: string, prompt: string, requestId: string) => {
    try {
      console.log(`Resuming image generation for message ${messageId}`);

      // Re-send the request (it's idempotent - will return existing result if done)
      const response = await fetch('/api/homechat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'image', prompt, requestId }),
      });

      const data = await response.json();
      if (data.success && data.imageUrl) {
        // Update the message with the completed image
        updateMessage(messageId, { status: 'done', url: data.imageUrl });

        // Save updated conversation
        const updatedMessages = messages.map(m =>
          m.id === messageId
            ? { ...m, content: { ...m.content, status: 'done' as const, url: data.imageUrl } }
            : m
        );
        await saveConversation(updatedMessages as Message[]);
      }
    } catch (error) {
      console.error('Error resuming image generation:', error);
      updateMessage(messageId, { status: 'error' });
    }
  };

  const resumeVideoGeneration = async (messageId: string, prompt: string, requestId: string) => {
    try {
      console.log(`Resuming video generation for message ${messageId}`);

      const response = await fetch('/api/homechat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'video', prompt, requestId }),
      });

      const data = await response.json();
      if (data.success && data.videoUrl) {
        updateMessage(messageId, { status: 'done', url: data.videoUrl });

        const updatedMessages = messages.map(m =>
          m.id === messageId
            ? { ...m, content: { ...m.content, status: 'done' as const, url: data.videoUrl } }
            : m
        );
        await saveConversation(updatedMessages as Message[]);
      }
    } catch (error) {
      console.error('Error resuming video generation:', error);
      updateMessage(messageId, { status: 'error' });
    }
  };

  const saveConversation = async (newMessages: Message[]) => {
    if (!userId) return activeConversationIdRef.current;

    // Use the ref value which persists across renders
    const currentConvId = activeConversationIdRef.current || conversationId;

    try {
      // Convert UI messages to API format - NOW SAVES ALL MESSAGE TYPES
      const apiMessages = newMessages.map(m => {
        let content: any;

        // Handle different message types
        switch (m.content.type) {
          case 'text':
            content = {
              type: 'text',
              text: m.content.text
            };
            break;
          case 'image':
            content = {
              type: 'image' as const,
              url: m.content.url,
              status: m.content.status,
              prompt: m.content.type === 'image' ? m.content.prompt : undefined,
              requestId: m.content.type === 'image' ? m.content.requestId : undefined,
              startedAt: m.content.type === 'image' ? m.content.startedAt : undefined
            };
            break;
          case 'video':
            content = {
              type: 'video' as const,
              url: m.content.url,
              status: m.content.status,
              prompt: m.content.type === 'video' ? m.content.prompt : undefined,
              requestId: m.content.type === 'video' ? m.content.requestId : undefined,
              startedAt: m.content.type === 'video' ? m.content.startedAt : undefined
            };
            break;
          case 'code':
            content = {
              type: 'code' as const,
              code: m.content.type === 'code' ? m.content.code : ''
            };
            break;
          default:
            // Fallback for any unexpected types
            content = {
              type: 'text' as const,
              text: ''
            };
        }

        return {
          id: m.id,
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: content,
          timestamp: new Date(),
          conversationId: currentConvId || '',
          type: m.content.type,
        };
      });

      // Generate title from first user text message
      const firstUserMessage = apiMessages.find(m =>
        m.role === 'user' &&
        m.content &&
        typeof m.content === 'object' &&
        m.content.type === 'text' &&
        m.content.text
      );
      const title = firstUserMessage?.content?.text
        ? (firstUserMessage.content.text.substring(0, 50) + (firstUserMessage.content.text.length > 50 ? '...' : ''))
        : 'New Conversation';

      const payload = currentConvId
        ? { id: currentConvId, title, userId, messages: apiMessages }
        : { title, userId, messages: apiMessages };

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        // If this was a new conversation, we need to update the conversationId for future saves
        if (data.success && data.conversation && data.conversation.id) {
          // Store the conversation ID in a ref so it persists across renders and closures
          activeConversationIdRef.current = data.conversation.id;

          // Notify parent to update the conversation ID in the URL/state
          if (!currentConvId) {
            onConversationSaved?.();
          }
          return data.conversation.id; // Return the ID for use in subsequent saves
        }
        onConversationSaved?.();
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
    return activeConversationIdRef.current; // Return current ID if save failed
  };

  const handleCreateImage = () => {
    setShowAttachMenu(false);
    setGenerationMode('image');
    setInput('');
    inputRef.current?.focus();
  };

  const handleCreateVideo = () => {
    setShowAttachMenu(false);
    setGenerationMode('video');
    setInput('');
    inputRef.current?.focus();
  };

  const handleAddFiles = () => {
    setShowAttachMenu(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // For now, just show a message that file upload is coming soon
    const userMessage: Message = {
      id: Date.now().toString(),
      content: { type: 'text', text: `Uploaded: ${files[0].name}` },
      sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: { type: 'text', text: 'File upload feature coming soon!' },
      sender: 'ai',
    };
    setMessages(prev => [...prev, aiMessage]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateMessage = (id: string, newContent: { status: 'done' | 'error'; url?: string }) => {
    setMessages(prev =>
      prev.map(msg => {
        if (msg.id === id && (msg.content.type === 'image' || msg.content.type === 'video')) {
          return { ...msg, content: { ...msg.content, ...newContent } };
        }
        return msg;
      })
    );
  };

  // Function to parse markdown code blocks from text
  const parseCodeBlocks = (text: string): Array<{ type: 'text' | 'code', content: string, language?: string }> => {
    const parts: Array<{ type: 'text' | 'code', content: string, language?: string }> = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block if exists
      if (match.index > lastIndex) {
        const textContent = text.substring(lastIndex, match.index).trim();
        if (textContent) {
          parts.push({ type: 'text', content: textContent });
        }
      }

      // Add code block
      const language = match[1] || 'plaintext';
      const code = match[2].trim();
      parts.push({ type: 'code', content: code, language });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last code block
    if (lastIndex < text.length) {
      const textContent = text.substring(lastIndex).trim();
      if (textContent) {
        parts.push({ type: 'text', content: textContent });
      }
    }

    // If no code blocks found, return original text
    if (parts.length === 0) {
      parts.push({ type: 'text', content: text });
    }

    return parts;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const currentMode = generationMode;
    const userMessage: Message = {
      id: Date.now().toString(),
      content: { type: 'text', text: trimmedInput },
      sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setGenerationMode('chat'); // Reset to chat mode after sending
    setIsLoading(true);
    setError(null);

    const aiMessageId = (Date.now() + 1).toString();

    try {
      if (currentMode === 'image' || trimmedInput.startsWith('/image')) {
        // Image Generation
        const prompt = currentMode === 'image' ? trimmedInput : trimmedInput.replace('/image', '').trim();
        const requestId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const loadingImageMessage: Message = {
          id: aiMessageId,
          sender: 'ai' as const,
          content: {
            type: 'image',
            status: 'loading',
            prompt,
            requestId,
            startedAt: new Date().toISOString()
          }
        };
        setMessages(prev => [...prev, loadingImageMessage]);

        // SAVE IMMEDIATELY with loading state so it survives refresh
        const messagesWithLoading = [...messages, userMessage, loadingImageMessage];
        await saveConversation(messagesWithLoading as Message[]);

        const response = await fetch('/api/homechat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'image', prompt }),
        });

        const data = await response.json();
        if (data.success && data.imageUrl) {
          updateMessage(aiMessageId, { status: 'done', url: data.imageUrl });
          // Update saved conversation with completed image
          // Use setMessages callback to get current state
          setMessages(currentMessages => {
            const updatedMessages = currentMessages.map(m =>
              m.id === aiMessageId
                ? { ...m, content: { type: 'image' as const, status: 'done' as const, url: data.imageUrl } }
                : m
            );
            // Save to database with updated messages
            saveConversation(updatedMessages);
            return updatedMessages;
          });
        } else {
          throw new Error(data.details || 'Image generation failed');
        }
      } else if (currentMode === 'video' || trimmedInput.startsWith('/video')) {
        // Video Generation
        const prompt = currentMode === 'video' ? trimmedInput : trimmedInput.replace('/video', '').trim();
        const requestId = `vid-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const loadingVideoMessage: Message = {
          id: aiMessageId,
          sender: 'ai' as const,
          content: {
            type: 'video',
            status: 'loading',
            prompt,
            requestId,
            startedAt: new Date().toISOString()
          }
        };
        setMessages(prev => [...prev, loadingVideoMessage]);

        // SAVE IMMEDIATELY with loading state so it survives refresh
        const messagesWithLoading = [...messages, userMessage, loadingVideoMessage];
        await saveConversation(messagesWithLoading as Message[]);

        const response = await fetch('/api/homechat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'video', prompt }),
        });

        const data = await response.json();
        if (data.success && data.videoUrl) {
          updateMessage(aiMessageId, { status: 'done', url: data.videoUrl });
          // Update saved conversation with completed video
          // Use setMessages callback to get current state
          setMessages(currentMessages => {
            const updatedMessages = currentMessages.map(m =>
              m.id === aiMessageId
                ? { ...m, content: { type: 'video' as const, status: 'done' as const, url: data.videoUrl } }
                : m
            );
            // Save to database with updated messages
            saveConversation(updatedMessages);
            return updatedMessages;
          });
        } else {
          throw new Error(data.details || 'Video generation failed');
        }
      } else if (trimmedInput.startsWith('/code')) {
        // Code Generation
        const prompt = trimmedInput.replace('/code', '').trim();

        const response = await fetch('/api/homechat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'code', prompt }),
        });

        const data = await response.json();
        if (data.success) {
          const codeMatch = data.code.match(/```(?:\w+\n)?([\s\S]*?)```/);
          const code = codeMatch ? codeMatch[1].trim() : data.code;
          const aiMessage: Message = { id: aiMessageId, sender: 'ai', content: { type: 'code', code } };
          const updatedMessages = [...messages, userMessage, aiMessage];
          setMessages(updatedMessages);
          // Save conversation after code generation
          await saveConversation(updatedMessages);
        } else {
          throw new Error(data.details || 'Code generation failed');
        }
      } else {
        // Regular Chat
        const chatMessages = messages
          .filter(m => m.content.type === 'text')
          .map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.content.type === 'text' ? m.content.text : ''
          }));

        chatMessages.push({ role: 'user', content: trimmedInput });

        const response = await fetch('/api/homechat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'chat', messages: chatMessages, userName }),
        });

        const data = await response.json();
        if (data.success) {
          // Parse the response for code blocks
          const parsedParts = parseCodeBlocks(data.message);

          // Create messages for each part
          const aiMessages: Message[] = parsedParts.map((part, index) => ({
            id: `${aiMessageId}-${index}`,
            content: part.type === 'code'
              ? { type: 'code', code: part.content, language: part.language || 'plaintext' }
              : { type: 'text', text: part.content },
            sender: 'ai' as const,
          }));

          const updatedMessages = [...messages, userMessage, ...aiMessages];
          setMessages(updatedMessages);
          // Save conversation after successful response
          await saveConversation(updatedMessages);
        } else {
          throw new Error(data.details || 'Chat failed');
        }
      }
    } catch (e: any) {
      console.error(e);
      const errorMessage = e?.message || 'Sorry, something went wrong. Please try again.';
      setError(errorMessage);
      const pendingMessage = messages.find(m => m.id === aiMessageId);
      if (pendingMessage && (pendingMessage.content.type === 'image' || pendingMessage.content.type === 'video')) {
        updateMessage(aiMessageId, { status: 'error' });
      } else {
        setMessages(prev => [...prev.filter(m => m.id !== aiMessageId), { id: aiMessageId, sender: 'ai', content: { type: 'text', text: errorMessage }}]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleCopyMessage = (message: Message) => {
    let textToCopy = '';
    if (message.content.type === 'text') {
      textToCopy = message.content.text;
    } else if (message.content.type === 'code') {
      textToCopy = message.content.code;
    }

    // Try modern clipboard API first, fallback to textarea method
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopiedMessageId(message.id);
        setTimeout(() => setCopiedMessageId(null), 2000);
      }).catch(() => {
        // Fallback if clipboard API fails
        fallbackCopyToClipboard(textToCopy);
      });
    } else {
      fallbackCopyToClipboard(textToCopy);
    }
  };

  const fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedMessageId(text.substring(0, 10)); // Use text substring as temp ID
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    document.body.removeChild(textArea);
  };

  const handleDownloadImage = async (url: string, messageId: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `ornina-image-${messageId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  const handleDownloadVideo = async (url: string, messageId: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `ornina-video-${messageId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      // Check if mediaDevices is available
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      const errorMessage = error?.message || 'Unable to access microphone. Please check permissions.';
      setError(errorMessage);
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
      setIsTranscribing(true);

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('type', 'transcribe');

      const response = await fetch('/api/homechat', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.text) {
        setInput(data.text);
        inputRef.current?.focus();
      } else {
        throw new Error(data.details || 'Transcription failed');
      }
    } catch (error: any) {
      console.error('Transcription error:', error);
      setError(error?.message || 'Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Voice Call Functions
  const handlePhoneClick = () => {
    setShowVoiceCall(true);
  };

  const handleCloseVoiceCall = () => {
    setShowVoiceCall(false);
  };

  const handleVoiceTranscript = (userText: string, aiText: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: { type: 'text', text: userText },
      sender: 'user',
      timestamp: Date.now(),
    };

    // Add AI response
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: { type: 'text', text: aiText },
      sender: 'assistant',
      timestamp: Date.now() + 1,
    };

    // Add both messages to the chat
    setMessages(prev => [...prev, userMessage, aiMessage]);

    // Save to conversation
    const updatedMessages = [...messages, userMessage, aiMessage];
    saveConversation(updatedMessages);
  };

  const handleOpenImage = (url: string) => {
    window.open(url, '_blank');
  };

  const renderActionButtons = (message: Message) => {
    const isCopied = copiedMessageId === message.id;

    return (
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Copy button for text and code */}
        {(message.content.type === 'text' || message.content.type === 'code') && message.sender === 'ai' && (
          <button
            onClick={() => handleCopyMessage(message)}
            className={cn(
              "p-1.5 rounded-lg transition-all duration-200 flex items-center gap-1 text-xs",
              isDarkMode
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-100 text-gray-600 hover:text-gray-800"
            )}
            title="Copy"
          >
            {isCopied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        )}

        {/* Download button for images */}
        {message.content.type === 'image' && message.content.status === 'done' && message.content.url && (
          <button
            onClick={() => handleDownloadImage(message.content.url!, message.id)}
            className={cn(
              "p-1.5 rounded-lg transition-all duration-200 flex items-center gap-1 text-xs",
              isDarkMode
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-100 text-gray-600 hover:text-gray-800"
            )}
            title="Download"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download</span>
          </button>
        )}

        {/* Download button for videos */}
        {message.content.type === 'video' && message.content.status === 'done' && message.content.url && (
          <button
            onClick={() => handleDownloadVideo(message.content.url!, message.id)}
            className={cn(
              "p-1.5 rounded-lg transition-all duration-200 flex items-center gap-1 text-xs",
              isDarkMode
                ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                : "hover:bg-gray-100 text-gray-600 hover:text-gray-800"
            )}
            title="Download"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download</span>
          </button>
        )}
      </div>
    );
  };

  const renderMessageContent = (message: Message) => {
    switch (message.content.type) {
      case 'text':
        return <p className="whitespace-pre-wrap text-sm" dir="auto">{message.content.text}</p>;
      case 'image':
        if (message.content.status === 'loading') {
          return <div className="flex flex-col items-center justify-center bg-gray-200/50 w-64 h-64 rounded-xl animate-pulse"><PhotoIcon className="w-12 h-12 text-gray-400" /><p className="mt-2 text-sm text-gray-500">{t('homechat.generatingImage')}</p></div>;
        }
        if (message.content.status === 'done' && message.content.url) {
          return (
            <img
              src={message.content.url}
              alt="Generated content"
              className="rounded-xl max-w-sm cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handleOpenImage(message.content.url!)}
              title="Click to open in new tab"
            />
          );
        }
        return <div className="text-red-500 text-sm">{t('homechat.imageError')}</div>;
      case 'video':
        if (message.content.status === 'loading') {
          return <div className="flex flex-col items-center justify-center bg-gray-200/50 w-96 h-64 rounded-xl animate-pulse"><PhotoIcon className="w-12 h-12 text-gray-400" /><p className="mt-2 text-sm text-gray-500">Generating video...</p></div>;
        }
        if (message.content.status === 'done' && message.content.url) {
          return (
            <video
              src={message.content.url}
              controls
              className="rounded-xl max-w-lg w-full"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          );
        }
        return <div className="text-red-500 text-sm">Video generation failed</div>;
      case 'code':
        return <CodeBlock code={message.content.code} />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("flex flex-col h-full transition-colors", isDarkMode ? "bg-gray-900" : "bg-white")}>
      <header className={cn("flex lg:hidden items-center justify-between p-3 border-b flex-shrink-0", isDarkMode ? "border-gray-700" : "border-gray-200")}>
        <button onClick={onMenuClick} className={cn("hover:opacity-80", isDarkMode ? "text-gray-300" : "text-gray-600")} aria-label="Open menu">
          <MenuIcon className="w-5 h-5" />
        </button>
        <div className="flex-1"></div>
        <button
          onClick={handlePhoneClick}
          className={cn(
            "hover:opacity-80 transition-all",
            isDarkMode ? "text-gray-300" : "text-gray-600"
          )}
          aria-label="Start voice call"
          title="Start AI voice call"
        >
          <SoundWaveIcon className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 flex flex-col p-3 sm:p-4 lg:p-6 overflow-hidden">
        <header className={cn("hidden lg:flex items-center justify-between pb-4 border-b", isDarkMode ? "border-gray-700" : "border-gray-200")}>
          <div>
            <p className={cn("text-sm mt-1", isDarkMode ? "text-gray-400" : "text-gray-500")}>{t('homechat.subtitle')}</p>
          </div>
          <button
            onClick={handlePhoneClick}
            className={cn(
              "hover:opacity-80 p-2 rounded-lg transition-all",
              isDarkMode ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-100"
            )}
            aria-label="Start voice call"
            title="Start AI voice call"
          >
            <SoundWaveIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center flex-1 flex flex-col justify-center items-center h-full">
              <h2 className={cn(
                "text-lg font-semibold mt-3 transition-all duration-1000 ease-out transform",
                welcomeMessageIndex === 0 
                  ? "opacity-100 translate-y-0" 
                  : "opacity-0 -translate-y-2",
                isDarkMode ? "text-gray-100" : "text-gray-800"
              )}>
                {isRTL ? "ما الذي يدور في ذهنك اليوم؟" : "What's on your mind today?"}
              </h2>
              <h2 className={cn(
                "text-lg font-semibold mt-3 absolute transition-all duration-1000 ease-out transform",
                welcomeMessageIndex === 1 
                  ? "opacity-100 translate-y-0" 
                  : "opacity-0 translate-y-2",
                isDarkMode ? "text-gray-100" : "text-gray-800"
              )}>
                {isRTL ? "كيف يمكنني مساعدتك اليوم؟" : "How can I help you today?"}
              </h2>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn(
              "flex items-start gap-3 group",
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            )}>
              <div className="flex flex-col">
                <div className={cn(
                  msg.content.type === 'text' && "max-w-xl p-3 text-sm rounded-2xl",
                  msg.sender === 'user' && isDarkMode && `bg-gray-700 text-gray-100 ${isRTL ? 'rounded-br-none' : 'rounded-bl-none'}`,
                  msg.sender === 'user' && !isDarkMode && `bg-gray-100 text-gray-800 ${isRTL ? 'rounded-br-none' : 'rounded-bl-none'}`,
                  msg.sender === 'ai' && isDarkMode && `bg-gray-800 border border-gray-700 text-gray-100 ${isRTL ? 'rounded-bl-none' : 'rounded-br-none'}`,
                  msg.sender === 'ai' && !isDarkMode && `bg-white border border-gray-200/80 text-gray-800 ${isRTL ? 'rounded-bl-none' : 'rounded-br-none'}`
                )}>
                  {renderMessageContent(msg)}
                </div>
                {msg.sender === 'ai' && renderActionButtons(msg)}
              </div>
            </div>
          ))}

          {isLoading && !messages.some(m => (m.content.type === 'image' || m.content.type === 'video') && m.content.status === 'loading') && (
            <div className="flex items-start gap-3">
              <div className="max-w-xl p-3 rounded-2xl bg-white border border-gray-200/80">
                <div className="flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-center text-sm">{error}</p>}
          <div ref={messagesEndRef} />
        </div>

        <div className="mt-auto pt-3">
          <form onSubmit={handleSendMessage} className="relative">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              multiple
            />

            {/* Attachment Menu Button */}
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 hover:opacity-80 z-10",
                isRTL ? 'right-2.5' : 'left-2.5',
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              )}
              disabled={isLoading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Attachment Menu Dropdown */}
            {showAttachMenu && (
              <div
                ref={attachMenuRef}
                className={cn(
                  "absolute bottom-full mb-2 w-52 rounded-xl shadow-xl border py-2 z-20 transition-all duration-300 ease-in-out transform",
                  isRTL ? 'right-2.5' : 'left-2.5',
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
                  showAttachMenu ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'
                )}
              >
                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('attachmenu.ai_generation')}
                </div>
                <button
                  type="button"
                  onClick={handleCreateImage}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 rounded-lg transition-all duration-200",
                    isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <PhotoIcon className="w-5 h-5" />
                  </div>
                  <span className="font-medium">{t('attachmenu.create_image')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateVideo}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 rounded-lg transition-all duration-200",
                    isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="font-medium">{t('attachmenu.create_video')}</span>
                </button>
                
                <div className={cn(
                  "my-1 mx-3 h-px",
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                )}></div>
                
                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('attachmenu.files')}
                </div>
                <button
                  type="button"
                  onClick={handleAddFiles}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 rounded-lg transition-all duration-200",
                    isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="font-medium">{t('attachmenu.add_files')}</span>
                </button>
              </div>
            )}

            {/* Microphone Icon - Only show if mediaDevices is supported */}
            {(typeof window !== 'undefined' && navigator.mediaDevices) && (
              <button
                type="button"
                onClick={handleMicClick}
                disabled={isLoading || isTranscribing}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 hover:opacity-80 transition-all",
                  isRTL ? 'left-14' : 'right-14',
                  isRecording
                    ? 'text-red-500 animate-pulse'
                    : isDarkMode ? 'text-gray-400' : 'text-gray-500',
                  (isLoading || isTranscribing) && 'opacity-50 cursor-not-allowed'
                )}
                title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing...' : 'Start voice input (requires HTTPS or localhost)'}
              >
                {isRecording ? (
                  <SoundWaveIcon className="w-5 h-5" />
                ) : (
                  <MicrophoneIcon className="w-5 h-5" />
                )}
              </button>
            )}

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                generationMode === 'image'
                  ? t('homechat.imagePrompt') || 'Describe the image you want to create...'
                  : generationMode === 'video'
                  ? t('homechat.videoPrompt') || 'Describe the video you want to create...'
                  : t('homechat.placeholder')
              }
              className={cn(
                "w-full py-3 text-sm rounded-xl focus:outline-none focus:ring-2 transition-colors",
                isDarkMode
                  ? "bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 focus:ring-gray-600"
                  : "bg-gray-100 border border-gray-200/80 text-gray-800 placeholder-gray-500 focus:ring-gray-300",
                isRTL ? 'pr-10 pl-20' : 'pl-10 pr-20'
              )}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={cn(
                "absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                isDarkMode
                  ? "bg-gray-700 text-gray-100 hover:bg-gray-600 disabled:bg-gray-800"
                  : "bg-gray-800 text-white hover:bg-gray-900 disabled:bg-gray-300",
                isRTL ? 'left-2.5' : 'right-2.5'
              )}
              disabled={isLoading || !input.trim()}
            >
              <PaperAirplaneIcon className={cn("w-4 h-4", isRTL && "rotate-180")} />
            </button>
          </form>
        </div>
      </div>

      {/* Voice Call Modal */}
      {showVoiceCall && (
        <VoiceCall
          onClose={handleCloseVoiceCall}
          isDarkMode={isDarkMode}
          onTranscript={handleVoiceTranscript}
        />
      )}
    </div>
  );
};

export default Chat;
