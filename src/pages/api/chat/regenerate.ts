import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ConversationModel } from '@/models/Conversation';
import { UserModel } from '@/models/User';
import { OpenAIService } from '@/services/openai';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user?.id || session.user?.email || '';
  const { conversationId, messageId, model } = req.body;

  if (!conversationId || !messageId) {
    return res.status(400).json({ error: 'Conversation ID and message ID are required' });
  }

  try {
    // Get user
    const user = await UserModel.findOne({ email: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get conversation
    const conversation = await ConversationModel.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if user owns the conversation
    if (conversation.userId !== user._id?.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Find the message to regenerate
    const messageIndex = conversation.messages.findIndex(
      (msg: any) => msg.id === messageId
    );

    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Get all messages before the one to regenerate
    const messagesToUse = conversation.messages.slice(0, messageIndex);

    // Convert to OpenAI format
    const openaiMessages = messagesToUse.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }));

    // Initialize OpenAI service
    const openaiService = new OpenAIService();

    // Generate a new response
    const response = await openaiService.chatCompletion({
      model: model || 'gpt-3.5-turbo',
      messages: openaiMessages
    });

    if (!response || !response.choices || response.choices.length === 0) {
      return res.status(500).json({ error: 'Failed to generate response' });
    }

    const newContent = response.choices[0].message?.content || '';

    // Update the message
    const updatedMessages = [...conversation.messages];
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      content: newContent,
      edited: true,
      timestamp: new Date().toISOString()
    };

    // Update the conversation
    const updated = await ConversationModel.update(conversationId, {
      messages: updatedMessages
    });

    if (!updated) {
      return res.status(500).json({ error: 'Failed to update message' });
    }

    return res.status(200).json({
      id: messageId,
      content: newContent,
      edited: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Regenerate response API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}