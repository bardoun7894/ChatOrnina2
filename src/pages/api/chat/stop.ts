import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';

// Store active generation requests
const activeGenerations = new Map<string, AbortController>();

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
  const { conversationId } = req.body;

  if (!conversationId) {
    return res.status(400).json({ error: 'Conversation ID is required' });
  }

  try {
    // Create a unique key for this generation
    const generationKey = `${userId}-${conversationId}`;

    // Check if there's an active generation for this conversation
    if (activeGenerations.has(generationKey)) {
      // Get the abort controller for this generation
      const controller = activeGenerations.get(generationKey);
      
      if (controller) {
        // Abort the generation
        controller.abort();
        
        // Remove from active generations
        activeGenerations.delete(generationKey);
        
        return res.status(200).json({ success: true });
      }
    }

    return res.status(404).json({ error: 'No active generation found' });
  } catch (error) {
    console.error('Stop generation API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Export function to register a new generation
export function registerGeneration(userId: string, conversationId: string, controller: AbortController) {
  const generationKey = `${userId}-${conversationId}`;
  activeGenerations.set(generationKey, controller);
}

// Export function to unregister a generation
export function unregisterGeneration(userId: string, conversationId: string) {
  const generationKey = `${userId}-${conversationId}`;
  activeGenerations.delete(generationKey);
}