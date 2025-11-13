import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Warmup endpoint for Thesys API
 * Makes a minimal request to wake up the API and avoid cold start on first real request
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const THESYS_API_KEY = process.env.THESYS_API_KEY;
  const USE_MOCK_MODE = process.env.THESYS_MOCK_MODE !== 'false' || !THESYS_API_KEY;

  if (USE_MOCK_MODE || !THESYS_API_KEY) {
    // In mock mode, just return success
    return res.status(200).json({ status: 'ok', mode: 'mock' });
  }

  try {
    console.log('[Thesys Warmup] Sending warmup request to Thesys API...');
    
    // Send minimal request to wake up the API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for warmup
    
    const response = await fetch('https://api.thesys.dev/v1/embed/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${THESYS_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'c1/anthropic/claude-sonnet-4/v-20250930',
        messages: [
          {
            role: 'system',
            content: 'You are a UI assistant.'
          },
          {
            role: 'user',
            content: 'ping'
          }
        ],
        stream: false,
        max_tokens: 10
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (response.ok) {
      console.log('[Thesys Warmup] ✅ Warmup successful');
      return res.status(200).json({ 
        status: 'ok', 
        mode: 'live',
        warmed: true 
      });
    } else {
      console.warn('[Thesys Warmup] ⚠️ Warmup request failed:', response.status);
      return res.status(200).json({ 
        status: 'ok', 
        mode: 'live',
        warmed: false,
        statusCode: response.status
      });
    }
  } catch (error: any) {
    console.error('[Thesys Warmup] ❌ Warmup error:', error.message);
    // Don't fail the warmup - just log it
    return res.status(200).json({ 
      status: 'ok', 
      mode: 'live',
      warmed: false,
      error: error.message
    });
  }
}
