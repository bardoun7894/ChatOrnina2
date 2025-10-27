import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import UserModel from '@/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists
    try {
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ 
        message: 'Database connection failed. Please check if MongoDB is running.',
        error: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    try {
      await UserModel.create({
        name,
        email,
        password: hashedPassword,
        role: 'user',
        subscription: {
          plan: 'free',
          status: 'active',
        },
      });
    } catch (createError) {
      console.error('User creation error:', createError);
      return res.status(500).json({ 
        message: 'Failed to create user',
        error: createError instanceof Error ? createError.message : 'Unknown creation error'
      });
    }

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'An error occurred during registration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
