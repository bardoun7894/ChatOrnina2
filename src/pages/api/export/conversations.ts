import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { ConversationModel } from '@/models/Conversation';
import { UserModel } from '@/models/User';

export default async function handler(
  req: NextApiRequest,  
  res: NextApiResponse
) {
  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user?.id || session.user?.email || '';
  const { format, conversationId } = req.query;

  try {
    // Get user
    const user = await UserModel.findOne({ email: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get conversations
    let conversations;
    
    if (conversationId) {
      // Export specific conversation
      const conversation = await ConversationModel.findById(conversationId as string);
      
      if (!conversation || conversation.userId !== user._id?.toString()) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      conversations = [conversation];
    } else {
      // Export all conversations
      conversations = await ConversationModel.findByUserId(user._id?.toString() || '');
    }

    // Format based on requested format
    let exportData;
    let contentType;
    let filename;

    switch (format) {
      case 'json':
        exportData = JSON.stringify(conversations, null, 2);
        contentType = 'application/json';
        filename = `conversations-${new Date().toISOString().split('T')[0]}.json`;
        break;
      
      case 'txt':
        exportData = conversations.map(conv => {
          let text = `# ${conv.title}\n\n`;
          
          if (conv.messages && conv.messages.length > 0) {
            conv.messages.forEach(msg => {
              const role = msg.role === 'user' ? 'You' : 'Assistant';
              text += `**${role}**: ${msg.content}\n\n`;
            });
          }
          
          text += `---\n\n`;
          return text;
        }).join('');
        
        contentType = 'text/plain';
        filename = `conversations-${new Date().toISOString().split('T')[0]}.txt`;
        break;
      
      case 'csv':
        // Create CSV header
        exportData = 'Conversation ID,Title,Message Role,Message Content,Timestamp\n';
        
        // Add each message as a row
        conversations.forEach(conv => {
          if (conv.messages && conv.messages.length > 0) {
            conv.messages.forEach(msg => {
              const content = msg.content.replace(/"/g, '""'); // Escape quotes for CSV
              exportData += `"${conv.id}","${conv.title}","${msg.role}","${content}","${msg.timestamp}"\n`;
            });
          }
        });
        
        contentType = 'text/csv';
        filename = `conversations-${new Date().toISOString().split('T')[0]}.csv`;
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid format. Supported formats: json, txt, csv' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    return res.status(200).send(exportData);
  } catch (error) {
    console.error('Export conversations API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}