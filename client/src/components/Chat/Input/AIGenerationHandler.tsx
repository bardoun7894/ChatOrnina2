import React, { useState, useEffect, useRef } from 'react';
import { useRecoilValue } from 'recoil';
import { useChatContext } from '~/Providers';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface AIGenerationHandlerProps {
  conversation: any;
  textAreaRef: React.RefObject<HTMLTextAreaElement>;
  onGeneratedContent: (content: any, type: string) => void;
}

interface GenerationRequest {
  type: 'image' | 'video' | 'audio' | 'text' | 'design'; // Removed 'code' as it's handled by CodeInterpreter
  prompt: string;
  options?: any;
}

export default function AIGenerationHandler({
  conversation,
  textAreaRef,
  onGeneratedContent
}: AIGenerationHandlerProps) {
  const localize = useLocalize();
  const { getMessages } = useChatContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<GenerationRequest | null>(null);
  const generationTimeoutRef = useRef<NodeJS.Timeout>();

  // Detect AI generation commands in messages
  const detectGenerationCommand = (text: string): GenerationRequest | null => {
    const lowerText = text.toLowerCase().trim();

    // Image generation commands
    if (lowerText.includes('generate image') || lowerText.includes('create image') ||
        lowerText.includes('make image') || lowerText.includes('draw') ||
        lowerText.startsWith('/image') || lowerText.startsWith('/img')) {
      return {
        type: 'image',
        prompt: text.replace(/\/(image|img)\s*/i, '').trim(),
        options: {
          model: 'dall-e-3', // Will be overridden by KIE.ai
          size: '1024x1024',
          quality: 'standard'
        }
      };
    }

    // Video generation commands
    if (lowerText.includes('generate video') || lowerText.includes('create video') ||
        lowerText.includes('make video') || lowerText.includes('animate') ||
        lowerText.startsWith('/video') || lowerText.startsWith('/vid')) {
      return {
        type: 'video',
        prompt: text.replace(/\/(video|vid)\s*/i, '').trim(),
        options: {
          model: 'sora-2', // Will be overridden by KIE.ai
          duration: '10s',
          quality: '720p'
        }
      };
    }

    // Audio generation commands
    if (lowerText.includes('generate audio') || lowerText.includes('create audio') ||
        lowerText.includes('make audio') || lowerText.includes('speak') ||
        lowerText.startsWith('/audio') || lowerText.startsWith('/aud')) {
      return {
        type: 'audio',
        prompt: text.replace(/\/(audio|aud)\s*/i, '').trim(),
        options: {
          voice: 'default',
          format: 'mp3'
        }
      };
    }

    // Text generation commands
    if (lowerText.includes('generate text') || lowerText.includes('create text') ||
        lowerText.includes('write') || lowerText.includes('compose') ||
        lowerText.startsWith('/text') || lowerText.startsWith('/txt')) {
      return {
        type: 'text',
        prompt: text.replace(/\/(text|txt)\s*/i, '').trim(),
        options: {
          tone: 'professional',
          length: 'medium'
        }
      };
    }

    // Design analysis commands
    if (lowerText.includes('analyze design') || lowerText.includes('review design') ||
        lowerText.includes('design analysis') || lowerText.includes('figma') ||
        lowerText.startsWith('/design') || lowerText.startsWith('/des')) {
      return {
        type: 'design',
        prompt: text.replace(/\/(design|des)\s*/i, '').trim(),
        options: {
          analysis_type: 'comprehensive'
        }
      };
    }

    return null;
  };

  // Call KIE.ai API for generation
  const callKIEApi = async (request: GenerationRequest): Promise<any> => {
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'kie.ai',
          type: request.type,
          prompt: request.prompt,
          options: request.options
        })
      });

      if (!response.ok) {
        throw new Error(`KIE.ai API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling KIE.ai:', error);
      throw error;
    }
  };

  // Handle generation
  const handleGeneration = async (request: GenerationRequest) => {
    setIsGenerating(true);
    setCurrentGeneration(request);

    try {
      // Show loading indicator in textarea
      if (textAreaRef.current) {
        const originalPlaceholder = textAreaRef.current.placeholder;
        textAreaRef.current.placeholder = `${localize('com_ui_generating')} ${request.type}...`;

        generationTimeoutRef.current = setTimeout(() => {
          if (textAreaRef.current) {
            textAreaRef.current.placeholder = originalPlaceholder;
          }
        }, 10000); // Reset after 10 seconds
      }

      // Call KIE.ai API
      const result = await callKIEApi(request);

      // Handle the generated content
      onGeneratedContent(result, request.type);

      // Add generation result to conversation
      if (result && result.content) {
        // This would typically add the generated content as a message
        // Implementation depends on your conversation management system
        console.log('Generated content:', result);
      }

    } catch (error) {
      console.error('Generation failed:', error);
      // Show error message
      if (textAreaRef.current) {
        textAreaRef.current.placeholder = `${localize('com_ui_generation_failed')}`;
        setTimeout(() => {
          if (textAreaRef.current) {
            textAreaRef.current.placeholder = '';
          }
        }, 3000);
      }
    } finally {
      setIsGenerating(false);
      setCurrentGeneration(null);
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
      }
    }
  };

  // Monitor for generation commands in conversation
  useEffect(() => {
    const messages = getMessages();
    if (!messages || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.sender === 'user' && lastMessage?.content) {
      // Extract text from content parts
      let textContent = '';
      if (Array.isArray(lastMessage.content)) {
        textContent = lastMessage.content
          .filter(part => part.type === 'text')
          .map(part => part.text || '')
          .join(' ');
      } else if (typeof lastMessage.content === 'string') {
        textContent = lastMessage.content;
      } else if (lastMessage.text) {
        textContent = lastMessage.text;
      }

      if (textContent) {
        const request = detectGenerationCommand(textContent);
        if (request && !isGenerating) {
          handleGeneration(request);
        }
      }
    }
  }, [getMessages, isGenerating]);

  // Monitor textarea for real-time command detection
  useEffect(() => {
    const textArea = textAreaRef.current;
    if (!textArea) return;

    const handleInput = (event: Event) => {
      const target = event.target as HTMLTextAreaElement;
      const text = target.value;

      // Check for generation commands as user types
      if (text.includes('/')) {
        const request = detectGenerationCommand(text);
        if (request && text.endsWith(' ')) {
          // Auto-trigger on space after command
          setTimeout(() => {
            handleGeneration(request);
            // Clear the command from textarea
            target.value = '';
          }, 500);
        }
      }
    };

    textArea.addEventListener('input', handleInput);

    return () => {
      textArea.removeEventListener('input', handleInput);
    };
  }, [textAreaRef]);

  return (
    <div className="ai-generation-handler">
      {isGenerating && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 mb-2 bg-blue-50 border border-blue-200 rounded-lg",
          "animate-pulse"
        )}>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
          <span className="text-sm text-blue-700">
            {localize('com_ui_generating')} {currentGeneration?.type}...
          </span>
        </div>
      )}
    </div>
  );
}
