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
    // For development, bypass auth if no session exists
    const session = await getSession({ req });

    if (!session && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messages, model = 'GPT-5' } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages are required and must be an array' });
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    const userPrompt = lastMessage?.content || '';

    // Check if user is requesting image generation
    const isImageRequest = /\b(generate|create|make|draw|design|show me|give me).*(image|picture|photo|illustration|drawing|artwork|visual|graphic)/i.test(userPrompt) ||
                          /\b(image|picture|photo|illustration|drawing|artwork|visual|graphic).*(of|for|about|showing)/i.test(userPrompt);

    // Check if user is requesting video generation
    const isVideoRequest = /\b(generate|create|make|produce|show me|give me).*(video|clip|animation|movie|footage)/i.test(userPrompt) ||
                          /\b(video|clip|animation|movie|footage).*(of|for|about|showing)/i.test(userPrompt);

    // Handle image generation
    if (isImageRequest) {
      console.log('Image generation request detected:', userPrompt);

      try {
        const imageResponse = await openai.images.generate({
          model: 'dall-e-3',
          prompt: userPrompt,
          size: '1024x1024',
          quality: 'standard',
          n: 1,
        });

        const imageUrl = imageResponse.data?.[0]?.url || '';

        if (imageUrl) {
          return res.status(200).json({
            message: `![Generated Image](${imageUrl})\n\nI've generated an image based on your request.`,
            role: 'assistant',
            content: `![Generated Image](${imageUrl})\n\nI've generated an image based on your request.`,
            imageUrl,
          });
        }
      } catch (error: any) {
        console.error('Image generation error:', error);
        // Fall back to text response if image generation fails
        return res.status(200).json({
          message: `I apologize, but I encountered an error while generating the image: ${error.message || 'Unknown error'}. Please try rephrasing your request.`,
          role: 'assistant',
          content: `I apologize, but I encountered an error while generating the image: ${error.message || 'Unknown error'}. Please try rephrasing your request.`,
        });
      }
    }

    // Handle video generation (placeholder - OpenAI doesn't support video generation yet)
    if (isVideoRequest) {
      return res.status(200).json({
        message: `I apologize, but video generation is not currently available through this interface. However, I can help you with:\n\n1. **Image Generation**: Create stunning images using DALL-E 3\n2. **Text & Code**: Answer questions, write code, analyze data\n3. **Creative Writing**: Stories, scripts, and content creation\n\nWould you like me to generate an image instead, or help you with something else?`,
        role: 'assistant',
        content: `I apologize, but video generation is not currently available through this interface. However, I can help you with:\n\n1. **Image Generation**: Create stunning images using DALL-E 3\n2. **Text & Code**: Answer questions, write code, analyze data\n3. **Creative Writing**: Stories, scripts, and content creation\n\nWould you like me to generate an image instead, or help you with something else?`,
      });
    }

    // Format messages for OpenAI API (only role and content)
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    console.log('Making OpenAI API call with:', {
      model,
      messagesCount: formattedMessages.length,
      apiKey: process.env.OPENAI_API_KEY ? 'Set' : 'Not set'
    });

    const completion = await openai.chat.completions.create({
      model,
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content || '';

    console.log('OpenAI API response received:', { responseLength: response.length });

    return res.status(200).json({
      message: response,
      role: 'assistant',
      content: response,
    });
  } catch (error: any) {
    console.error('Chat API error:', error);

    // Handle OpenAI-specific errors
    if (error?.error?.message) {
      console.error('OpenAI API error:', error.error.message);
      return res.status(error.status || 500).json({
        error: 'OpenAI API error',
        details: error.error.message,
      });
    }

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}