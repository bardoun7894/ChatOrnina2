import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ConversationModel, Message } from '@/models/Conversation';

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
        // Get messages for a conversation
        const { conversationId } = req.query;
        
        if (!conversationId || typeof conversationId !== 'string') {
          return res.status(400).json({ error: 'Conversation ID is required' });
        }

        // Check if the conversation belongs to the user
        const conversation = await ConversationModel.findById(conversationId);
        
        if (!conversation || conversation.userId !== userId) {
          return res.status(404).json({ error: 'Conversation not found' });
        }

        // In a real implementation, messages would be stored in a separate collection
        // For simplicity, we're storing them as an array in the conversation document
        const messages = conversation.messages || [];
        
        return res.status(200).json({ messages });

      case 'POST':
        // Add a new message to a conversation
        const { conversationId: convId, content, role } = req.body;
        
        if (!convId || !content || !role) {
          return res.status(400).json({ error: 'Conversation ID, content, and role are required' });
        }

        // Check if the conversation belongs to the user
        const targetConversation = await ConversationModel.findById(convId);
        
        if (!targetConversation || targetConversation.userId !== userId) {
          return res.status(404).json({ error: 'Conversation not found' });
        }

        const newMessage: Message = {
          id: `msg-${Date.now()}`,
          content,
          role,
          timestamp: new Date(),
          conversationId: convId,
        };

        // Add the message to the conversation
        const updatedMessages = [...(targetConversation.messages || []), newMessage];
        
        const updatedConversation = await ConversationModel.update(convId, {
          messages: updatedMessages,
        });
        
        if (!updatedConversation) {
          return res.status(500).json({ error: 'Failed to add message' });
        }

        return res.status(201).json({ message: newMessage });

      case 'PUT':
        // Update a message
        const { id: messageId, content: newContent } = req.body;
        
        if (!messageId || !newContent) {
          return res.status(400).json({ error: 'Message ID and content are required' });
        }

        // Find the conversation that contains this message
        const conversations = await ConversationModel.findByUserId(userId);
        let targetConv = null;
        let targetMsgIndex = -1;
        
        for (const conv of conversations) {
          if (conv.messages) {
            const msgIndex = conv.messages.findIndex(msg => msg.id === messageId);
            if (msgIndex !== -1) {
              targetConv = conv;
              targetMsgIndex = msgIndex;
              break;
            }
          }
        }
        
        if (!targetConv || targetMsgIndex === -1) {
          return res.status(404).json({ error: 'Message not found' });
        }

        // Update the message
        const updatedMessages = [...(targetConv.messages || [])];
        updatedMessages[targetMsgIndex] = {
          ...updatedMessages[targetMsgIndex],
          content: newContent,
          isEdited: true,
        };
        
        const updatedConv = await ConversationModel.update(targetConv.id, {
          messages: updatedMessages,
        });
        
        if (!updatedConv) {
          return res.status(500).json({ error: 'Failed to update message' });
        }

        return res.status(200).json({ message: updatedMessages[targetMsgIndex] });

      case 'DELETE':
        // Delete a message
        const { id: deleteMessageId } = req.query;
        
        if (!deleteMessageId || typeof deleteMessageId !== 'string') {
          return res.status(400).json({ error: 'Message ID is required' });
        }

        // Find the conversation that contains this message
        const userConversations = await ConversationModel.findByUserId(userId);
        let conversationWithMessage = null;
        let messageIndex = -1;
        
        for (const conv of userConversations) {
          if (conv.messages) {
            const msgIndex = conv.messages.findIndex(msg => msg.id === deleteMessageId);
            if (msgIndex !== -1) {
              conversationWithMessage = conv;
              messageIndex = msgIndex;
              break;
            }
          }
        }
        
        if (!conversationWithMessage || messageIndex === -1) {
          return res.status(404).json({ error: 'Message not found' });
        }

        // Remove the message
        const messagesAfterDelete = [...(conversationWithMessage.messages || [])];
        messagesAfterDelete.splice(messageIndex, 1);
        
        const convAfterDelete = await ConversationModel.update(conversationWithMessage.id, {
          messages: messagesAfterDelete,
        });
        
        if (!convAfterDelete) {
          return res.status(500).json({ error: 'Failed to delete message' });
        }

        return res.status(200).json({ success: true });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Messages API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}