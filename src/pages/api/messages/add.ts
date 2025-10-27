import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ConversationModel } from '@/models/Conversation';
import { UserModel } from '@/models/User';

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
  const { conversationId, role, content } = req.body;

  if (!conversationId || !role || !content) {
    return res.status(400).json({ error: 'Conversation ID, role, and content are required' });
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

    // Create a new message
    const newMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date().toISOString(),
      edited: false
    };

    // Add the message to the conversation
    const updatedMessages = [...(conversation.messages || []), newMessage];

    // Update the conversation
    const updated = await ConversationModel.update(conversationId, {
      messages: updatedMessages
    });

    if (!updated) {
      return res.status(500).json({ error: 'Failed to add message' });
    }

    return res.status(201).json(newMessage);
  } catch (error) {
    console.error('Add message API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}