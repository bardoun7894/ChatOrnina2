import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { UserModel } from '../../../models/User';

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
        // Get user preferences
        const user = await UserModel.findById(userId as string);
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Return user preferences
        const preferences = {
          theme: user.preferences?.theme || 'system',
          language: user.preferences?.language || 'en',
        };

        return res.status(200).json({ preferences });

      case 'PUT':
        // Update user preferences
        const { theme, language } = req.body;
        
        if (!theme && !language) {
          return res.status(400).json({ error: 'At least one preference is required' });
        }

        // Get current user to merge preferences
        const currentUser = await UserModel.findById(userId as string);
        
        if (!currentUser) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Merge new preferences with existing ones
        const updatedPreferences = {
          ...currentUser.preferences,
          ...(theme && { theme }),
          ...(language && { language }),
        };

        const updatedUser = await UserModel.update(userId, {
          preferences: updatedPreferences,
        });
        
        if (!updatedUser) {
          return res.status(500).json({ error: 'Failed to update preferences' });
        }

        return res.status(200).json({ preferences: updatedPreferences });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('User preferences API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}