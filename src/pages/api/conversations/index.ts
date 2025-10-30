import { NextApiRequest, NextApiResponse } from 'next';
import { ConversationModel } from '@/models/Conversation';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      // Get all conversations for a user
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const conversations = await ConversationModel.findByUserId(userId);
      return res.status(200).json({ success: true, conversations });

    } else if (req.method === 'POST') {
      // Create or update a conversation
      const { id, title, userId, messages } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // If conversation ID provided, update existing conversation
      if (id) {
        const existingConversation = await ConversationModel.findById(id);

        if (!existingConversation) {
          return res.status(404).json({ error: 'Conversation not found' });
        }

        // Check if user owns this conversation
        if (existingConversation.userId !== userId) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Always use the provided title if given, otherwise keep existing
        const updatedTitle = title !== undefined ? title : existingConversation.title;

        const updated = await ConversationModel.update(id, {
          title: updatedTitle,
          messages: messages || existingConversation.messages,
        });

        return res.status(200).json({ success: true, conversation: updated });
      }

      // Create new conversation
      const newConversation = await ConversationModel.create({
        id: uuidv4(),
        title: title || 'New Conversation',
        userId,
        messages: messages || [],
      });

      return res.status(201).json({ success: true, conversation: newConversation });

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
