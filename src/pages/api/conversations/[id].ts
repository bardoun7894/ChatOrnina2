import { NextApiRequest, NextApiResponse } from 'next';
import { ConversationModel } from '@/models/Conversation';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try { 
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    if (req.method === 'GET') {
      // Get specific conversation
      const conversation = await ConversationModel.findById(id);

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      return res.status(200).json({ success: true, conversation });

    } else if (req.method === 'PUT') {
      // Update conversation
      const { title, messages, userId } = req.body;

      const existingConversation = await ConversationModel.findById(id);

      if (!existingConversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Check if user owns this conversation
      if (userId && existingConversation.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updated = await ConversationModel.update(id, {
        title,
        messages,
      });

      return res.status(200).json({ success: true, conversation: updated });

    } else if (req.method === 'DELETE') {
      // Delete conversation
      const { userId } = req.body;

      const existingConversation = await ConversationModel.findById(id);

      if (!existingConversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Check if user owns this conversation
      if (userId && existingConversation.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const deleted = await ConversationModel.delete(id);

      if (!deleted) {
        return res.status(500).json({ error: 'Failed to delete conversation' });
      }

      return res.status(200).json({ success: true, message: 'Conversation deleted' });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Conversation API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
