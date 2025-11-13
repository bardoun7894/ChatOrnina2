import { useState, useEffect, useCallback, useRef } from 'react';

interface UseC1StreamOptions {
  onComplete?: (fullResponse: string) => void;
  onError?: (error: string) => void;
  onChunk?: (chunk: string) => void;
}

interface UseC1StreamReturn {
  streamedResponse: string;
  isStreaming: boolean;
  error: string | null;
  isRetrying: boolean;
  startStream: (messages: any[], language?: string, sessionContext?: any) => void;
  cancelStream: () => void;
}

export const useC1Stream = (options: UseC1StreamOptions = {}): UseC1StreamReturn => {
  const [streamedResponse, setStreamedResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(async (
    messages: any[], 
    language: string = 'en', 
    sessionContext: any = null,
    retryCount = 0
  ) => {
     // Cancel any existing stream
    cancelStream();

    // Reset state
    setStreamedResponse('');
    setError(null);
    setIsStreaming(true);

    try {
      // Use fetch with streaming for POST requests (EventSource only supports GET)
      abortControllerRef.current = new AbortController();
      
      // Build request body with optional session context
      const requestBody: any = {
        messages,
        language,
      };
      
      // Include session context if provided (for thread updates)
      if (sessionContext) {
        requestBody.sessionId = sessionContext.sessionId;
        requestBody.previousState = sessionContext.previousState;
        requestBody.messageId = sessionContext.messageId;
        console.log('[useC1Stream] Including session context:', sessionContext.sessionId);
      }
      
      const response = await fetch('/api/thesys-chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        console.error('[useC1Stream] Request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          retryCount
        });
        
        // Retry once on first failure (cold start issue)
        if (retryCount === 0 && (response.status === 500 || response.status === 503)) {
          console.warn('[useC1Stream] 🔄 First request failed, retrying in 3s...', response.status);
          setIsRetrying(true);
          setError(null); // Clear error during retry
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s for API to warm up
          setIsRetrying(false);
          return startStream(messages, language, sessionContext, 1); // Retry once with session context
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText || 'Request failed'}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let accumulatedResponse = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[useC1Stream] Stream complete');
          setIsStreaming(false);
          if (options.onComplete) {
            options.onComplete(accumulatedResponse);
          }
          break;
        }

        // Decode chunk
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              console.log('[useC1Stream] Received [DONE]');
              setIsStreaming(false);
              if (options.onComplete) {
                options.onComplete(accumulatedResponse);
              }
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                setError(parsed.error);
                setIsStreaming(false);
                if (options.onError) {
                  options.onError(parsed.error);
                }
                return;
              }

              if (parsed.chunk) {
                accumulatedResponse += parsed.chunk;
                setStreamedResponse(accumulatedResponse);
                
                if (options.onChunk) {
                  options.onChunk(parsed.chunk);
                }
              }
            } catch (e) {
              console.warn('[useC1Stream] Failed to parse SSE data:', data);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[useC1Stream] Stream cancelled');
      } else {
        console.error('[useC1Stream] Error:', err);
        setError(err.message || 'Stream failed');
        setIsStreaming(false);
        if (options.onError) {
          options.onError(err.message || 'Stream failed');
        }
      }
    }
  }, [cancelStream, options]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelStream();
    };
  }, [cancelStream]);

  return {
    streamedResponse,
    isStreaming,
    error,
    isRetrying,
    startStream,
    cancelStream,
  };
};

export default useC1Stream;
