import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ConversationModel } from '@/models/Conversation';
import { UserModel } from '@/models/User';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user?.id || session.user?.email || '';
  const { conversationId } = req.query;

  if (!conversationId) {
    return res.status(400).json({ error: 'Conversation ID is required' });
  }

  try {
    // Get user
    const user = await UserModel.findOne({ email: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get conversation
    const conversation = await ConversationModel.findById(conversationId as string);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if user owns the conversation
    if (conversation.userId !== user._id?.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete conversation
    const deleted = await ConversationModel.delete(conversationId as string);
    
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete conversation' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete conversation API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}