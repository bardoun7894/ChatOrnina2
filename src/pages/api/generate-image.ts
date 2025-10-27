import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, size = '1024x1024', quality = 'standard', n = 1 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size,
      quality,
      n,
    });

    const imageUrl = response.data[0]?.url || '';

    return res.status(200).json({
      imageUrl,
    });
  } catch (error) {
    console.error('Image generation API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}