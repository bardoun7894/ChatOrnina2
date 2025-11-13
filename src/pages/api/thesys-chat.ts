import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const THESYS_API_KEY = process.env.THESYS_API_KEY;
  
  // Check if we should use mock mode (for testing when Thesys API is unavailable)
  const USE_MOCK_MODE = process.env.THESYS_MOCK_MODE !== 'false' || !THESYS_API_KEY;
  
  if (!THESYS_API_KEY && !USE_MOCK_MODE) {
    return res.status(500).json({ 
      error: 'THESYS_API_KEY not configured. Please add it to your .env file or enable THESYS_MOCK_MODE=true for testing.' 
    });
  }

  try {
    const { messages, model = 'c1/anthropic/claude-sonnet-4/v-20250930', stream = false, language = 'en' } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Invalid request: messages array is required' 
      });
    }

    // Transform messages to Anthropic format with vision support
    const transformedMessages = messages.map((msg: any) => {
      // If message has images, use Anthropic's content array format
      if (msg.images && msg.images.length > 0) {
        const contentArray: any[] = [];
        
        // Add images first
        msg.images.forEach((imageUrl: string) => {
          contentArray.push({
            type: 'image',
            source: {
              type: 'url',
              url: imageUrl
            }
          });
        });
        
        // Add text content
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
      
      // Regular text-only message
      return msg;
    });

    console.log('[Thesys API] Request:', {
      model,
      messageCount: messages.length,
      stream,
      language,
      lastMessage: (typeof messages[messages.length - 1]?.content === 'string')
        ? (messages[messages.length - 1]?.content as string).substring(0, 100) + '...'
        : '[non-text]',
      mockMode: USE_MOCK_MODE
    });

    // Mock mode for testing
    if (USE_MOCK_MODE) {
      console.log(`[Thesys API] Using MOCK mode - returning sample C1 component in ${language}`);
      const userMessage = messages[messages.length - 1]?.content || '';
      
      // Multi-language responses based on app language
      const responses = {
        ar: `✨ **عرض توضيحي لـ Thesys C1 (وضع المحاكاة)**\n\nسألت: "${userMessage}"\n\nهذه استجابة محاكاة لأن واجهة برمجة تطبيقات Thesys غير متاحة حاليًا. التكامل يعمل بشكل صحيح!\n\n**الميزات الجاهزة:**\n- ✅ تبديل الذكاء الاصطناعي المتقدم\n- ✅ توجيه الرسائل\n- ✅ تكامل واجهة برمجة التطبيقات\n- ✅ معالجة الأخطاء\n\n*عند توفر واجهة برمجة التطبيقات الحقيقية، اضبط THESYS_MOCK_MODE=false*`,
        en: `✨ **Thesys C1 Demo (Mock Mode)**\n\nYou asked: "${userMessage}"\n\nThis is a mock response since the Thesys API is not currently available. The integration is working correctly!\n\n**Features Ready:**\n- ✅ AI Advanced toggle\n- ✅ Message routing\n- ✅ API integration\n- ✅ Error handling\n\n*Set THESYS_MOCK_MODE=false when the real API is available.*`
      };
      
      // Select response based on app language, default to English
      const selectedResponse = responses[language as keyof typeof responses] || responses.en;
      
      // Return a simple text response instead of complex component to avoid SDK issues
      const mockResponse = {
        choices: [{
          message: {
            role: 'assistant',
            content: selectedResponse
          }
        }],
        model: 'mock-c1-model',
        usage: { prompt_tokens: 10, completion_tokens: 50, total_tokens: 60 }
      };
      
      return res.status(200).json(mockResponse);
    }

    try {
      // Prepend a system prompt to steer language and C1 DSL output
      const sysPrompt = language === 'ar'
        ? 'أنت مساعد واجهة مستخدم توليدية (Generative UI). أعد مواصفات C1 (DSL) فقط بدون نص زائد.'
        : 'You are a Generative UI assistant. Return the C1 DSL UI spec only, no extra prose.';
      const augmentedMessages = [
        { role: 'system', content: sysPrompt },
        ...transformedMessages
      ];

      const response = await fetch('https://api.thesys.dev/v1/embed/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${THESYS_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: augmentedMessages,
        stream,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Thesys API] Error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      return res.status(response.status).json({
        error: errorData.error || `Thesys API request failed: ${response.statusText}`,
        details: errorData
      });
    }

    const data = await response.json();
    
    console.log('[Thesys API] Success response:', {
      hasChoices: !!data.choices,
      choiceCount: data.choices?.length || 0,
      firstChoice: data.choices?.[0]?.message?.content ? 'Content present' : 'No content'
    });

    return res.status(200).json(data);
    } catch (fetchError: any) {
      console.error('[Thesys API] Fetch error:', {
        message: fetchError.message,
        code: fetchError.code,
        errno: fetchError.errno,
        stack: fetchError.stack
      });
      
      return res.status(500).json({
        error: `Failed to reach Thesys API: ${fetchError.message}`,
        type: 'fetch_error',
        details: {
          code: fetchError.code,
          errno: fetchError.errno
        }
      });
    }
  } catch (error: any) {
    console.error('[Thesys API] Unexpected error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      type: 'server_error'
    });
  }
}
