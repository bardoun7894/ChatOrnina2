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

    const { image, mimeType } = req.body;

    if (!image || !mimeType) {
      return res.status(400).json({ error: 'Image and mimeType are required' });
    }

    const systemPrompt = `You are a helpful assistant that analyzes designs and generates detailed prompts for recreating them. Focus on layout, colors, typography, spacing, and overall visual hierarchy. Provide a comprehensive description that would allow someone to recreate this design.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this design and provide a detailed prompt for recreating it.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${image}`
              }
            }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });

    const analysis = completion.choices[0]?.message?.content || '';

    return res.status(200).json({
      analysis,
    });
  } catch (error) {
    console.error('Design analysis API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}