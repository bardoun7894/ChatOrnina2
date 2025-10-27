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
  const { title, model } = req.body;

  try {
    // Get user
    const user = await UserModel.findOne({ email: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create a new conversation
    const conversationData = {
      title: title || 'New Chat',
      userId: user._id?.toString() || '',
      model: model || 'gpt-3.5-turbo',
      messages: []
    };

    const newConversation = await ConversationModel.create(conversationData);

    if (!newConversation) {
      return res.status(500).json({ error: 'Failed to create conversation' });
    }

    return res.status(201).json(newConversation);
  } catch (error) {
    console.error('Create conversation API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}