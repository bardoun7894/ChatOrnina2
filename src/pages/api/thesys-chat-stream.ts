import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const THESYS_API_KEY = process.env.THESYS_API_KEY;
  
  // Check if we should use mock mode
  const USE_MOCK_MODE = process.env.THESYS_MOCK_MODE !== 'false' || !THESYS_API_KEY;
  
  if (!THESYS_API_KEY && !USE_MOCK_MODE) {
    return res.status(500).json({ 
      error: 'THESYS_API_KEY not configured' 
    });
  }

  try {
    const { 
      messages, 
      model = 'c1/anthropic/claude-sonnet-4/v-20250930', 
      language = 'en',
      sessionId,
      previousState,
      messageId
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      console.error('[Thesys Stream] Invalid request: messages missing or not array');
      return res.status(400).json({ 
        error: 'Invalid request: messages array is required' 
      });
    }
    
    if (messages.length === 0) {
      console.error('[Thesys Stream] Invalid request: messages array is empty');
      return res.status(400).json({ 
        error: 'Invalid request: messages array cannot be empty' 
      });
    }

    // Transform messages to Anthropic format with vision support
    const transformedMessages = messages.map((msg: any) => {
      if (msg.images && msg.images.length > 0) {
        const contentArray: any[] = [];
        
        msg.images.forEach((imageUrl: string) => {
          contentArray.push({
            type: 'image',
            source: {
              type: 'url',
              url: imageUrl
            }
          });
        });
        
        if (msg.content) {
          contentArray.push({
            type: 'text',
            text: msg.content
          });
        }
        
        return {
          role: msg.role,
          content: contentArray
        };
      }
      
      return msg;
    });

    console.log('[Thesys Stream] Request:', {
      model,
      messageCount: messages.length,
      language,
      mockMode: USE_MOCK_MODE
    });

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Mock mode for testing
    if (USE_MOCK_MODE) {
      console.log('[Thesys Stream] Using MOCK mode - simulating streaming');
      
      const mockChunks = [
        '{"type":"card","title":"',
        'Mock Streaming',
        '","content":"',
        'This is a simulated ',
        'streaming response. ',
        'Each chunk arrives ',
        'progressively!',
        '"}',
      ];

      for (const chunk of mockChunks) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    try {
      // Prepend system prompt with optional session context
      let sysPrompt = language === 'ar'
        ? 'أنت مساعد واجهة مستخدم توليدية (Generative UI). أعد مواصفات C1 (DSL) بصيغة JSON صحيحة فقط. اجعل الواجهة مختصرة وعملية، وتجنب البيانات الكبيرة أو المحتوى المطول. لا تضمن مكونات Image إلا إذا كان لديك URL حقيقي للصورة.'
        : 'You are a Generative UI assistant. Return a valid C1 DSL JSON spec only. Keep UIs concise and practical, avoid large datasets or verbose content. Do not include Image components unless you have a real image URL.';
      
      // Add session context to prompt if updating an existing component
      if (sessionId && previousState) {
        const contextNote = language === 'ar'
          ? `\n\nملاحظة: أنت تقوم بتحديث واجهة مستخدم موجودة. الحالة السابقة: ${JSON.stringify(previousState, null, 2)}\nقم بتعديل هذه الواجهة بناءً على طلب المستخدم، مع الحفاظ على البنية العامة إلا إذا طلب المستخدم تغييرها بشكل جذري.`
          : `\n\nContext: You are updating an existing UI component. Previous state: ${JSON.stringify(previousState, null, 2)}\nModify this UI based on the user's request, maintaining the overall structure unless the user asks for a radical change.`;
        
        sysPrompt += contextNote;
        console.log('[Thesys Stream] Using session context:', { sessionId, messageId });
      }
      
      const augmentedMessages = [
        { role: 'system', content: sysPrompt },
        ...transformedMessages
      ];

      // Create abort controller with 5 minute timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

      console.log('[Thesys Stream] 🚀 Starting API request:', {
        model,
        messageCount: augmentedMessages.length,
        hasSession: !!sessionId,
        language
      });

      const response = await fetch('https://api.thesys.dev/v1/embed/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${THESYS_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: augmentedMessages,
          stream: true, // Enable streaming
          max_tokens: 16000, // Increase token limit for longer responses
          temperature: 0.3, // Lower temperature for consistent UI generation
          top_p: 0.9, // Nucleus sampling for better quality
          frequency_penalty: 0.0,
          presence_penalty: 0.0,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Thesys Stream] Error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        // Provide more helpful error messages
        let errorMessage = 'API request failed';
        if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (response.status === 500 || response.status === 503) {
          errorMessage = 'API temporarily unavailable. Retrying automatically...';
        } else if (response.status === 401) {
          errorMessage = 'API authentication failed. Please check configuration.';
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let totalChunks = 0;
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('[Thesys Stream] Stream complete -', {
            totalChunks,
            totalBytes,
            bufferRemaining: buffer.length
          });
          res.write('data: [DONE]\n\n');
          res.end();
          break;
        }

        // Decode chunk
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        totalChunks++;
        totalBytes += chunk.length;

        // Process SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              res.write('data: [DONE]\n\n');
              res.end();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                // Forward the chunk to client
                res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (fetchError: any) {
      console.error('[Thesys Stream] Fetch error:', fetchError);
      
      const errorMessage = fetchError.name === 'AbortError'
        ? 'Request timed out. The response was too large or took too long.'
        : `Failed to reach Thesys API: ${fetchError.message}`;
      
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error: any) {
    console.error('[Thesys Stream] Unexpected error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Internal server error' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
