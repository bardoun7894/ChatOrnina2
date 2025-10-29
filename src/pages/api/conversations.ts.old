import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ConversationModel } from '@/models/Conversation';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user?.id || session.user?.email || '';

  try {
    switch (req.method) {
      case 'GET':
        // Get all conversations for the user
        const conversations = await ConversationModel.findByUserId(userId);
        return res.status(200).json({ conversations });

      case 'POST':
        // Create a new conversation
        const { title } = req.body;
        
        if (!title) {
          return res.status(400).json({ error: 'Title is required' });
        }

        const newConversation = await ConversationModel.create({
          id: `conv-${Date.now()}`,
          title,
          userId,
        });

        return res.status(201).json({ conversation: newConversation });

      case 'PUT':
        // Update a conversation
        const { id, ...updateData } = req.body;
        
        if (!id) {
          return res.status(400).json({ error: 'Conversation ID is required' });
        }

        // Check if the conversation belongs to the user
        const existingConversation = await ConversationModel.findById(id);
        
        if (!existingConversation || existingConversation.userId !== userId) {
          return res.status(404).json({ error: 'Conversation not found' });
        }

        const updatedConversation = await ConversationModel.update(id, updateData);
        
        if (!updatedConversation) {
          return res.status(500).json({ error: 'Failed to update conversation' });
        }

        return res.status(200).json({ conversation: updatedConversation });

      case 'DELETE':
        // Delete a conversation
        const { id: deleteId } = req.query;
        
        if (!deleteId || typeof deleteId !== 'string') {
          return res.status(400).json({ error: 'Conversation ID is required' });
        }

        // Check if the conversation belongs to the user
        const conversationToDelete = await ConversationModel.findById(deleteId);
        
        if (!conversationToDelete || conversationToDelete.userId !== userId) {
          return res.status(404).json({ error: 'Conversation not found' });
        }

        const deleted = await ConversationModel.delete(deleteId);
        
        if (!deleted) {
          return res.status(500).json({ error: 'Failed to delete conversation' });
        }

        return res.status(200).json({ success: true });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Conversations API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}