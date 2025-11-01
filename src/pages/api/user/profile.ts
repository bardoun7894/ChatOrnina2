import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
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

  try {
    switch (req.method) {
      case 'GET':
        // Get user profile
        const user = await UserModel.findOne({ email: userId });
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Return user profile without sensitive information
        const userProfile = {
          id: user._id?.toString(),
          name: user.name,
          email: user.email,
          avatar: '',
          role: user.role,
          subscription: user.subscription,
          createdAt: user.createdAt,
        };

        return res.status(200).json({ user: userProfile });

      case 'PUT':
        // Update user profile
        const { name, avatar } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Name is required' });
        }

        // Get current user to preserve existing avatar if not provided
        const currentUser = await UserModel.findOne({ email: userId });

        const updatedUser = await UserModel.update(userId, {
          name,
          avatar: avatar || currentUser?.avatar || '',
        });
        
        if (!updatedUser) {
          return res.status(500).json({ error: 'Failed to update profile' });
        }

        // Return updated user profile without sensitive information
        const updatedProfile = {
          id: updatedUser._id?.toString(),
          name: updatedUser.name,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
          role: updatedUser.role,
          subscription: updatedUser.subscription,
          createdAt: updatedUser.createdAt,
        };

        return res.status(200).json({ user: updatedProfile });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('User profile API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}