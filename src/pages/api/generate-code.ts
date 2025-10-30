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

    const { prompt, language = 'javascript' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const systemPrompt = `You are a helpful assistant that generates clean, well-commented, and efficient ${language} code. Provide only the code without explanations unless specifically requested.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const code = completion.choices[0]?.message?.content || '';

    return res.status(200).json({
      code,
      language,
    });
  } catch (error) {
    console.error('Code generation API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}