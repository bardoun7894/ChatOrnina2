import React, { useState, useRef, useEffect } from 'react';
import { SparklesIcon, PaperAirplaneIcon, MenuIcon, PhotoIcon, MicrophoneIcon, SoundWaveIcon } from './icons';
import type { Message } from './types';
import CodeBlock from './CodeBlock';
import { MessageContent } from '@/components/message/MessageContent';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import VoiceInteraction from './VoiceInteraction';
import VoiceCall from './VoiceCall';
import VoiceCallRealtime from './VoiceCallRealtime';
import VoiceChatModal from '../VoiceChat/VoiceChatModalRealtime';
import { FileAttachmentPreview } from '@/components/message/FileAttachmentPreview';

// Define FileAttachment interface
interface FileAttachment {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size?: number;
}

interface ChatProps {
  onMenuClick: () => void;
  conversationId?: string | null;
  userId?: string;
  userName?: string;
  onConversationSaved?: () => void;
}

const Chat: React.FC<ChatProps> = ({
  onMenuClick,
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
  const [generationMode, setGenerationMode] = useState<'chat' | 'image' | 'video' | 'code' | 'figma'>('chat');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [useRealtimeAPI, setUseRealtimeAPI] = useState(false); // true = Realtime API (gpt-4o-realtime-preview), false = Legacy (Whisper+GPT-4o+TTS) - Legacy is more stable
  const [welcomeMessageIndex, setWelcomeMessageIndex] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileAttachment[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeConversationIdRef = useRef<string | null>(conversationId || null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // loadConversation is stable, no need to include

  const loadConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`);
      const data = await response.json();
      
      if (response.status === 404) {
        // Conversation doesn't exist, clear it from localStorage and reset state
        console.log('Conversation not found, clearing from localStorage');
        localStorage.removeItem('lastActiveConversation');
        setMessages([]);
        return;
      }
      
      if (data.success && data.conversation.messages) {
        // Convert saved messages to UI format - SUPPORTS ALL MESSAGE TYPES
        const loadedMessages: Message[] = data.conversation.messages.map((msg: any) => {
          let content: any;

          // Check if content is an object (new format) or string (old format)
          if (typeof msg.content === 'object' && msg.content !== null) {
            content = msg.content;
            
            // Handle old image messages that only have a single URL
            if (content.type === 'image' && content.url && !content.urls) {
              // Try to fetch additional URLs for this image if it's from Midjourney
              // This is a fallback for old messages - in a real implementation,
              // you might want to store all URLs when first generated
              content = {
                ...content,
                urls: [content.url] // Convert single URL to array for consistency
              };
            }
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
      // Also clear localStorage on error to prevent repeated attempts
      localStorage.removeItem('lastActiveConversation');
      setMessages([]);
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
      if (data.success && (data.imageUrl || data.imageUrls)) {
        // Handle both single image (imageUrl) and multiple images (imageUrls) from Midjourney
        if (data.imageUrls && data.imageUrls.length > 0) {
          updateMessage(messageId, { status: 'done', urls: data.imageUrls });
          
          // Save updated conversation
          const updatedMessages = messages.map(m =>
            m.id === messageId
              ? { ...m, content: { ...m.content, status: 'done' as const, urls: data.imageUrls } }
              : m
          );
          await saveConversation(updatedMessages as Message[]);
        } else if (data.imageUrl) {
          updateMessage(messageId, { status: 'done', url: data.imageUrl });
          
          // Save updated conversation
          const updatedMessages = messages.map(m =>
            m.id === messageId
              ? { ...m, content: { ...m.content, status: 'done' as const, url: data.imageUrl } }
              : m
          );
          await saveConversation(updatedMessages as Message[]);
        }
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
              text: m.content.text,
              images: m.content.images // Include images array if present
            };
            break;
          case 'image':
            content = {
              type: 'image' as const,
              url: m.content.url,
              urls: m.content.urls,
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
              code: m.content.type === 'code' ? m.content.code : '',
              image: m.content.type === 'code' ? m.content.image : undefined
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

          // Always notify parent to refresh the conversation list
          onConversationSaved?.();

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

  const handleCreateCode = () => {
    setShowAttachMenu(false);
    setGenerationMode('code');
    setInput('');
    inputRef.current?.focus();
  };

  const handleCreateFigmaToCode = () => {
    setShowAttachMenu(false);
    setGenerationMode('figma');
    // Trigger file input click for Figma files
    const figmaInput = document.createElement('input');
    figmaInput.type = 'file';
    figmaInput.accept = 'image/png,image/jpeg,image/jpg';
    figmaInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFigmaFileUpload(file);
      }
    };
    figmaInput.click();
  };

  const handleAddFiles = () => {
    setShowAttachMenu(false);
    fileInputRef.current?.click();
  };

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

    // Save to conversation if we have a userId
    if (userId) {
      saveConversation([...messages, userMessage, aiMessage]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    setError(null);

    try {
      // Upload files and get base64 data URLs
      const formData = new FormData();
      Array.from(files).forEach((file, index) => {
        formData.append('files', file);
      });
      formData.append('type', 'file-upload');

      const response = await fetch('/api/homechat', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.files) {
        // Store uploaded files
        const newFiles: FileAttachment[] = data.files.map((file: any, index: number) => ({
          id: `file-${Date.now()}-${index}`,
          url: file.url,
          name: file.name || files[index].name,
          mimeType: file.mimeType || files[index].type,
          size: file.size || files[index].size,
        }));
        
        setUploadedFiles(prev => [...prev, ...newFiles]);
        
        // If there are images, also add them to uploadedImages for backward compatibility
        const imageFiles = newFiles.filter(file => file.mimeType.startsWith('image/'));
        if (imageFiles.length > 0) {
          setUploadedImages(prev => [...prev, ...imageFiles.map(file => file.url)]);
        }
        
        setError(null);
      } else {
        throw new Error(data.details || 'File upload failed');
      }
    } catch (error: any) {
      console.error('File upload error:', error);
      setError(error?.message || 'Failed to upload files');
    } finally {
      setIsUploadingImages(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFigmaFileUpload = async (file: File) => {
    setIsUploadingImages(true);
    setError(null);
    console.log('[Figma Upload Client] Starting upload for file:', file.name, file.type, file.size);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'figma-upload');

      console.log('[Figma Upload Client] Sending request to /api/homechat');

      const response = await fetch('/api/homechat', {
        method: 'POST',
        body: formData,
      });

      console.log('[Figma Upload Client] Response status:', response.status);

      const data = await response.json();
      console.log('[Figma Upload Client] Response data:', data);

      if (data.success && data.file) {
        const newFile: FileAttachment = {
          id: `figma-${Date.now()}`,
          url: data.file.url,
          name: data.file.name,
          mimeType: data.file.mimeType,
          size: data.file.size,
        };
        setUploadedFiles(prev => [...prev, newFile]);
        setUploadedImages(prev => [...prev, newFile.url]);
        setError(null);
        console.log('[Figma Upload Client] Upload successful');
        
        // Don't set input text, let placeholder show instead
        // setInput('What programming language? (e.g., React, HTML, Vue)');
      } else {
        console.error('[Figma Upload Client] Upload failed:', data);
        throw new Error(data.details || data.error || 'Figma file upload failed');
      }
    } catch (error: any) {
      console.error('[Figma file upload error]:', error);
      setError(error?.message || 'Failed to upload Figma file');
    } finally {
      setIsUploadingImages(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const updateMessage = (id: string, newContent: { status: 'done' | 'error'; url?: string; urls?: string[] }) => {
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

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(file => file.id === fileId);
      if (fileToRemove && fileToRemove.mimeType.startsWith('image/')) {
        // Also remove from uploadedImages for backward compatibility
        setUploadedImages(images => images.filter(url => url !== fileToRemove.url));
      }
      return prev.filter(file => file.id !== fileId);
    });
  };

  const handleClearAllFiles = () => {
    // Clear all files from uploadedFiles
    setUploadedFiles([]);
    // Also clear uploadedImages for backward compatibility
    setUploadedImages([]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();

    // Allow sending if there are uploaded images even without text
    if (!trimmedInput && uploadedImages.length === 0) return;
    if (isLoading || isUploadingImages) return;

    const currentMode = generationMode;

    // Create user message with text and optional images
    const userMessage: Message = {
      id: Date.now().toString(),
      content: {
        type: 'text',
        text: trimmedInput || 'What do you see in this image?',
        images: uploadedImages.length > 0 ? [...uploadedImages] : undefined
      },
      sender: 'user',
    };

    // Clear uploaded files and images immediately when sending
    setUploadedFiles([]);
    setUploadedImages([]);

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
        if (data.success && (data.imageUrl || data.imageUrls)) {
          // Handle both single image (imageUrl) and multiple images (imageUrls) from Midjourney
          if (data.imageUrls && data.imageUrls.length > 0) {
            updateMessage(aiMessageId, { status: 'done', urls: data.imageUrls });
            // Update saved conversation with completed images
            setMessages(currentMessages => {
              const updatedMessages = currentMessages.map(m =>
                m.id === aiMessageId
                  ? { ...m, content: { type: 'image' as const, status: 'done' as const, urls: data.imageUrls } }
                  : m
              );
              saveConversation(updatedMessages);
              return updatedMessages;
            });
          } else if (data.imageUrl) {
            updateMessage(aiMessageId, { status: 'done', url: data.imageUrl });
            // Update saved conversation with completed image
            setMessages(currentMessages => {
              const updatedMessages = currentMessages.map(m =>
                m.id === aiMessageId
                  ? { ...m, content: { type: 'image' as const, status: 'done' as const, url: data.imageUrl } }
                  : m
              );
              saveConversation(updatedMessages);
              return updatedMessages;
            });
          }
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

        if (!response.ok) {
          // Handle API errors
          const errorMsg = data.error || data.details || 'Video generation failed';
          updateMessage(aiMessageId, { status: 'error' });

          // Show error message in UI
          setMessages(currentMessages => {
            const updatedMessages = currentMessages.map(m =>
              m.id === aiMessageId
                ? { ...m, content: { type: 'video' as const, status: 'error' as const, prompt } }
                : m
            );
            saveConversation(updatedMessages);
            return updatedMessages;
          });

          setError(errorMsg);
          return;
        }

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
      } else if (currentMode === 'code') {
        // Code Generation
        const prompt = trimmedInput;

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
      } else if (currentMode === 'figma') {
        // Figma to Code Conversion
        const prompt = trimmedInput;

        // Check if we have an uploaded image
        if (uploadedImages.length === 0) {
          setError('Please upload a Figma screenshot first');
          setIsLoading(false);
          return;
        }

        // Extract base64 directly from the data URL (already in base64 format)
        const imageUrl = uploadedImages[0];
        const base64Image = imageUrl.includes(',') ? imageUrl.split(',')[1] : imageUrl;

        try {
          const response = await fetch('/api/homechat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'figma',
              prompt,
              image: base64Image
            }),
          });

          const data = await response.json();
          if (data.success) {
            const codeMatch = data.code.match(/```(?:\w+\n)?([\s\S]*?)```/);
            const code = codeMatch ? codeMatch[1].trim() : data.code;
            const aiMessage: Message = {
              id: aiMessageId,
              sender: 'ai',
              content: {
                type: 'code',
                code,
                // Include the original image for reference
                image: imageUrl
              }
            };
            const updatedMessages = [...messages, userMessage, aiMessage];
            setMessages(updatedMessages);
            // Save conversation after figma to code conversion
            await saveConversation(updatedMessages);
          } else {
            throw new Error(data.details || 'Figma to Code conversion failed');
          }
        } catch (error: any) {
          console.error('Figma to Code error:', error);
          setError(error?.message || 'Failed to convert Figma design to code');
        } finally {
          setIsLoading(false);
        }
      } else {
        // Regular Chat (with vision support if images are present)
        const chatMessages = messages
          .filter(m => m.content.type === 'text')
          .map(m => {
            const msg: any = {
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.content.type === 'text' ? m.content.text : ''
            };
            // Include images if present
            if (m.content.type === 'text' && m.content.images) {
              msg.images = m.content.images;
            }
            return msg;
          });

        // Add current message with images if present
        const currentMessage: any = {
          role: 'user',
          content: trimmedInput || 'What do you see in this image?'
        };
        if (userMessage.content.type === 'text' && userMessage.content.images) {
          currentMessage.images = userMessage.content.images;
        }
        chatMessages.push(currentMessage);

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
      console.log('[STT] Starting recording...');

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported. Please use HTTPS or localhost.');
      }

      console.log('[STT] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[STT] Microphone access granted');

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('[STT] Data available, size:', event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('[STT] Recording stopped, total chunks:', audioChunksRef.current.length);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('[STT] Audio blob created, size:', audioBlob.size);
        await transcribeAudio(audioBlob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        console.log('[STT] Microphone released');
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log('[STT] MediaRecorder started, state:', mediaRecorder.state);
    } catch (error: any) {
      console.error('[STT] Error accessing microphone:', error);
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
      console.log('[STT] Starting transcription...');
      setIsTranscribing(true);

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('type', 'transcribe');
      console.log('[STT] FormData created with audio blob');

      console.log('[STT] Sending request to /api/homechat...');
      const response = await fetch('/api/homechat', {
        method: 'POST',
        body: formData,
      });

      console.log('[STT] Response status:', response.status);
      const data = await response.json();
      console.log('[STT] Response data:', data);

      if (data.success && data.text) {
        console.log('[STT] Transcription successful:', data.text);
        setInput(data.text);
        inputRef.current?.focus();
      } else {
        throw new Error(data.details || 'Transcription failed');
      }
    } catch (error: any) {
      console.error('[STT] Transcription error:', error);
      setError(error?.message || 'Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleMicClick = () => {
    console.log('[STT] Microphone clicked, isRecording:', isRecording);
    if (isRecording) {
      console.log('[STT] Stopping recording...');
      stopRecording();
    } else {
      console.log('[STT] Starting recording...');
      startRecording();
    }
  };

  const handleOpenImage = (url: string) => {
    window.open(url, '_blank');
  };

  const handleVoiceClick = () => {
    // Open voice modal instead of navigating to a new page
    setIsVoiceModalOpen(true);
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
              "hover:bg-gray-100 text-gray-600 hover:text-gray-800"
            )}
            title={t('homechat.copy_message')}
          >
            {isCopied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{t('homechat.message_copied')}</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>{t('homechat.copy')}</span>
              </>
            )}
          </button>
        )}

        {/* Download button for images */}
        {message.content.type === 'image' && message.content.status === 'done' && (
          <>
            {message.content.urls && message.content.urls.length > 0 && (
              <div className="flex items-center gap-1">
                {message.content.urls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => handleDownloadImage(url, `${message.id}-${index + 1}`)}
                    className={cn(
                      "p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center text-xs w-8 h-8",
                      "hover:bg-gray-100 text-gray-600 hover:text-gray-800"
                    )}
                    title={t('homechat.download')}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            )}
            {message.content.url && (
              <button
                onClick={() => {
                  const content = message.content;
                  if (content.type === 'image' && content.url) {
                    handleDownloadImage(content.url, message.id);
                  }
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-all duration-200 flex items-center gap-1 text-xs",
                  "hover:bg-gray-100 text-gray-600 hover:text-gray-800"
                )}
                title="Download"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download</span>
              </button>
            )}
          </>
        )}

        {/* Download button for videos */}
        {message.content.type === 'video' && message.content.status === 'done' && (
          <button
            onClick={() => {
              const content = message.content;
              if (content.type === 'video' && content.url) {
                handleDownloadVideo(content.url, message.id);
              }
            }}
            className={cn(
              "p-1.5 rounded-lg transition-all duration-200 flex items-center gap-1 text-xs",
              "hover:bg-gray-100 text-gray-600 hover:text-gray-800"
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
        return (
          <MessageContent
            content={message.content.text || ''}
            attachments={message.attachments}
          />
        );
      case 'image':
        if (message.content.status === 'loading') {
          return <div className="flex flex-col items-center justify-center bg-gray-200/50 w-64 h-64 rounded-xl animate-pulse"><PhotoIcon className="w-12 h-12 text-gray-400" /><p className="mt-2 text-sm text-gray-500">{t('homechat.generating_image')}</p></div>;
        }
        if (message.content.status === 'done') {
          if (message.content.urls && message.content.urls.length > 0) {
            return (
              <div className="grid grid-cols-2 gap-2 max-w-md">
                {message.content.urls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt="Generated content"
                    className="rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleOpenImage(url)}
                    title="Click to open in new tab"
                  />
                ))}
              </div>
            );
          } else if (message.content.url) {
            const imageUrl = message.content.url;
            return (
              <img
                src={imageUrl}
                alt="Generated content"
                className="rounded-xl max-w-sm cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleOpenImage(imageUrl)}
                title="Click to open in new tab"
              />
            );
          }
        }
        return (
          <div className={cn(
            "flex flex-col items-center justify-center p-6 rounded-2xl w-64 min-h-[16rem]",
            "backdrop-blur-xl border shadow-lg",
            "bg-red-500/10 border-red-500/20"
          )}>
            <svg className="w-16 h-16 mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className={cn(
              "text-sm font-medium text-center",
              "text-red-400"
            )}>
              {error || t('homechat.image_error')}
            </p>
            {message.content.prompt && (
              <p className={cn(
                "text-xs mt-2 text-center opacity-70",
                "text-gray-400"
              )}>
                Prompt: {message.content.prompt}
              </p>
            )}
          </div>
        );
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
        return (
          <div className={cn(
            "flex flex-col items-center justify-center p-6 rounded-2xl w-96 min-h-[16rem]",
            "backdrop-blur-xl border shadow-lg",
            "bg-red-500/10 border-red-500/20"
          )}>
            <svg className="w-16 h-16 mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className={cn(
              "text-sm font-medium text-center",
              "text-red-400"
            )}>
              {error || 'Video generation failed'}
            </p>
            {message.content.prompt && (
              <p className={cn(
                "text-xs mt-2 text-center opacity-70",
                "text-gray-400"
              )}>
                Prompt: {message.content.prompt}
              </p>
            )}
          </div>
        );
      case 'code':
        return (
          <div className="space-y-4 sm:space-y-6 w-full">
            {message.content.type === 'code' && message.content.image && (
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  {isRTL ? 'التصميم الأصلي من Figma:' : 'Original Figma Design:'}
                </p>
                <div className="relative group">
                  <img
                    src={message.content.image}
                    alt="Original Figma design"
                    className="w-full h-auto max-h-48 sm:max-h-64 md:max-h-80 rounded-xl cursor-pointer hover:opacity-90 transition-opacity border border-gray-200 object-contain"
                    title="Click to view original Figma design"
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1.5 rounded-lg bg-white/80 backdrop-blur-sm shadow-lg"
                      onClick={() => message.content.type === 'code' && message.content.image && handleOpenImage(message.content.image)}
                      title="View full size"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4h16M4 4v4m0 0h4m-4 4h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                {isRTL ? 'الكود المُنشأ:' : 'Generated Code:'}
              </p>
              <div className="max-w-full overflow-x-auto">
                <CodeBlock code={message.content.code} />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("flex flex-col h-screen transition-colors relative", "bg-white/30 galileo-glass rounded-none")}>
      {/* Mobile Menu Button - Glassy Circle */}
      <button
        onClick={onMenuClick}
        className={cn(
          "lg:hidden fixed top-4 right-4 z-[60] w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg",
          "galileo-glass-glow text-gray-300"
        )}
        aria-label="Open menu"
      >
        <MenuIcon className="w-6 h-6" />
      </button>

      <div className="flex-1 flex flex-col p-2 sm:p-3 md:p-4 lg:p-6 overflow-hidden pt-20 sm:pt-20 lg:pt-6 min-h-0">
        {/* Mobile padding top for menu button - removed spacer div */}
        
        <header className={cn("hidden items-center justify-between px-2 sm:px-4 py-2 sm:py-3.5 flex-shrink-0", "bg-white/50 galileo-glass")}>
          <div className="flex-1"></div>
        </header>

        <div className="flex-1 overflow-y-auto py-2 sm:py-4 space-y-3 sm:space-y-4 scrollbar-hide">
          {messages.length === 0 && !isLoading && (
            <div className="text-center flex-1 flex flex-col justify-center items-center h-full px-2 sm:px-4">
              <h2 className={cn(
                "text-base sm:text-lg font-semibold mt-3 transition-all duration-1000 ease-out transform",
                welcomeMessageIndex === 0 
                  ? "opacity-100 translate-y-0" 
                  : "opacity-0 -translate-y-2",
                "text-gray-800"
              )}>
                {isRTL ? "ما الذي يدور في ذهنك اليوم؟" : "What's on your mind today?"}
              </h2>
              <p className={cn(
                "text-sm sm:text-base text-gray-600 mt-2 transition-all duration-1000 ease-out transform",
                welcomeMessageIndex === 0 
                  ? "opacity-0 -translate-y-2" 
                  : "opacity-100 translate-y-0",
              )}>
                {isRTL ? "اسألني أي شيء، سأحاول المساعدة." : "Ask me anything, I'll try to help."}
              </p>
              <div className={cn(
                "flex flex-wrap justify-center gap-2 sm:gap-3 mt-4 sm:mt-6 transition-all duration-1000 ease-out transform",
                welcomeMessageIndex === 0 
                  ? "opacity-0 -translate-y-2" 
                  : "opacity-100 translate-y-0"
              )}>
                <div className="text-xs sm:text-sm bg-gray-100/80 galileo-glass px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-gray-600">
                  💡 {t('homechat.commandsHelp')}
                </div>
                <div className="text-xs sm:text-sm bg-gray-100/80 galileo-glass px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-gray-600">
                  📝 /image - {t('homechat.create_image')}
                </div>
                <div className="text-xs sm:text-sm bg-gray-100/80 galileo-glass px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-gray-600">
                  🎥 /video - {t('homechat.create_video')}
                </div>
                <div className="text-xs sm:text-sm bg-gray-100/80 galileo-glass px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-gray-600">
                  💻 /code - {t('homechat.create_code')}
                </div>
                <div className="text-xs sm:text-sm bg-gray-100/80 galileo-glass px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-gray-600">
                  🎨 /figma - {t('homechat.create_figma_to_code')}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn(
              "flex items-start gap-2 sm:gap-3 group w-full",
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            )}>
              <div className="flex flex-col max-w-full sm:max-w-[80%] lg:max-w-[70%]">
                <div className={cn(
                  msg.content.type === 'text' && "max-w-full p-2 sm:p-3 text-xs sm:text-sm rounded-2xl",
                  msg.sender === 'user' && `bg-gray-700/60 galileo-glass text-gray-100 ${isRTL ? 'rounded-br-none' : 'rounded-bl-none'}`,
                  msg.sender === 'user' && `bg-gray-100/60 galileo-glass text-gray-800 ${isRTL ? 'rounded-br-none' : 'rounded-bl-none'}`,
                  msg.sender === 'ai' && `bg-gray-800/60 galileo-glass border border-gray-700/60 text-gray-100 ${isRTL ? 'rounded-bl-none' : 'rounded-br-none'}`,
                  msg.sender === 'ai' && `bg-white/60 galileo-glass border border-gray-200/60 text-gray-800 ${isRTL ? 'rounded-bl-none' : 'rounded-br-none'}`
                )}>
                  {renderMessageContent(msg)}
                </div>
                {msg.sender === 'ai' && renderActionButtons(msg)}
              </div>
            </div>
          ))}

          {isLoading && !messages.some(m => (m.content.type === 'image' || m.content.type === 'video') && m.content.status === 'loading') && (
            <div className="flex items-start gap-3">
              <div className="max-w-xl p-3 rounded-2xl bg-white/60 galileo-glass border border-gray-200/60">
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
          {/* File Attachment Preview */}
          <FileAttachmentPreview
            files={uploadedFiles}
            onRemoveFile={handleRemoveFile}
            onClearAll={handleClearAllFiles}
          />

          {/* Upload progress indicator */}
          {isUploadingImages && (
            <div className={cn(
              "mb-3 p-3 rounded-xl text-center",
              "bg-white/60 galileo-glass border border-gray-200/60"
            )}>
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-sm text-gray-600">Uploading files...</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="relative">
            {/* Hidden file input - accept all file types */}
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              onChange={handleFileChange}
              className="hidden"
              multiple
            />

            {/* Attachment Menu Button */}
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 hover:opacity-80 z-20",
                isRTL ? 'right-2.5' : 'left-2.5',
                "text-gray-500"
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
                  "absolute bottom-full mb-2 w-52 rounded-xl shadow-xl border py-2 z-20 transition-all duration-300 ease-in-out transform galileo-glass",
                  isRTL ? 'right-2.5' : 'left-2.5',
                  "bg-white/60 border-gray-200/60",
                  showAttachMenu ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'
                )}
              >
                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('homechat.ai_generation')}
                </div>
                <button
                  type="button"
                  onClick={handleCreateImage}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 rounded-lg transition-all duration-200",
                    "text-gray-700 hover:text-gray-900 hover:backdrop-blur-sm"
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <PhotoIcon className="w-5 h-5" />
                  </div>
                  <span className="font-medium">{t('homechat.create_image')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateVideo}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 rounded-lg transition-all duration-200",
                    "text-gray-700 hover:text-gray-900 hover:backdrop-blur-sm"
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="font-medium">{t('homechat.create_video')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateCode}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 rounded-lg transition-all duration-200",
                    "text-gray-700 hover:text-gray-900 hover:backdrop-blur-sm"
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <span className="font-medium">{t('homechat.create_code')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateFigmaToCode}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 rounded-lg transition-all duration-200",
                    "text-gray-700 hover:text-gray-900 hover:backdrop-blur-sm"
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="font-medium">{t('homechat.create_figma_to_code')}</span>
                </button>
                
                <div className={cn(
                  "my-1 mx-3 h-px",
                  "bg-gray-200/50"
                )}></div>
                
                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('homechat.files')}
                </div>
                <button
                  type="button"
                  onClick={handleAddFiles}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 rounded-lg transition-all duration-200",
                    "text-gray-700 hover:text-gray-900 hover:backdrop-blur-sm"
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="font-medium">{t('homechat.add_files')}</span>
                </button>
              </div>
            )}

            {/* Microphone Icon - Only show if mediaDevices is supported */}
            {(typeof window !== 'undefined' && navigator.mediaDevices) && (
              <div className={cn(
                "absolute top-1/2 -translate-y-1/2 z-20",
                isRTL ? 'left-10' : 'right-10'
              )}>
                <VoiceInteraction
                  onTranscript={(text) => {
                    setInput(text);
                    inputRef.current?.focus();
                  }}
                  isLoading={isLoading || isTranscribing}
                  isRTL={isRTL}
                />
              </div>
            )}

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                uploadedImages.length > 0 && generationMode === 'figma'
                  ? t('homechat.figma_prompt') || 'What programming language? (e.g., React, HTML, Vue)'
                  : uploadedImages.length > 0
                  ? 'Ask me about these images...'
                  : generationMode === 'image'
                  ? t('homechat.image_prompt') || 'Describe the image you want to create...'
                  : generationMode === 'video'
                  ? t('homechat.video_prompt') || 'Describe the video you want to create...'
                  : generationMode === 'code'
                  ? t('homechat.code_prompt') || 'What code would you like me to generate?'
                  : generationMode === 'figma'
                  ? t('homechat.figma_prompt') || 'What programming language? (e.g., React, HTML, Vue)'
                  : t('homechat.placeholder')
              }
              className={cn(
                "w-full py-3 text-sm rounded-xl focus:outline-none focus:ring-2 transition-colors galileo-input",
                "bg-gray-100/60 galileo-glass border border-gray-200/60 text-gray-800 placeholder-gray-500 focus:ring-gray-300"
              )}
              style={{
                paddingInlineStart: '2.5rem',
                paddingInlineEnd: '5rem'
              }}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handlePhoneClick}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-200 z-20 p-1 galileo-text-secondary",
                isRTL ? 'left-2.5' : 'right-2.5',
                "text-gray-600"
              )}
              aria-label="Voice call"
              title="Start AI voice call"
            >
              <SoundWaveIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Voice Chat Modal (Realtime API) */}
      <VoiceChatModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />

      {/* Voice Call Modal - Realtime API or Legacy */}
      {showVoiceCall && (
        useRealtimeAPI ? (
          <VoiceCallRealtime
            onClose={handleCloseVoiceCall}
            onTranscript={handleVoiceTranscript}
          />
        ) : (
          <VoiceCall
            onClose={handleCloseVoiceCall}
            onTranscript={handleVoiceTranscript}
          />
        )
      )}
    </div>
  );
};

export default Chat;
