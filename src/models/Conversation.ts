import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';

export interface Conversation {
  _id?: ObjectId;
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  conversationId: string;
  isEdited?: boolean;
}

export class ConversationModel {
  static async findOne(query: any): Promise<Conversation | null> {
    try {
      const db = await getDb();
      return await db.collection('conversations').findOne(query);
    } catch (error) {
      console.error('Error finding conversation:', error);
      return null;
    }
  }

  static async findById(id: string): Promise<Conversation | null> {
    try {
      const db = await getDb();
      return await db.collection('conversations').findOne({ id });
    } catch (error) {
      console.error('Error finding conversation by ID:', error);
      return null;
    }
  }

  static async create(data: Omit<Conversation, '_id' | 'createdAt' | 'updatedAt'>): Promise<Conversation> {
    try {
      const db = await getDb();
      const now = new Date();
      const conversation: Conversation = {
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      
      const result = await db.collection('conversations').insertOne(conversation);
      conversation._id = result.insertedId;
      
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  static async update(id: string, data: Partial<Conversation>): Promise<Conversation | null> {
    try {
      const db = await getDb();
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };
      
      await db.collection('conversations').updateOne(
        { id },
        { $set: updateData }
      );
      
      return await this.findById(id);
    } catch (error) {
      console.error('Error updating conversation:', error);
      return null;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const db = await getDb();
      const result = await db.collection('conversations').deleteOne({ id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  }

  static async findMany(query: any = {}, options: any = {}): Promise<Conversation[]> {
    try {
      const db = await getDb();
      return await db.collection('conversations')
        .find(query, options)
        .toArray();
    } catch (error) {
      console.error('Error finding conversations:', error);
      return [];
    }
  }

  static async findByUserId(userId: string): Promise<Conversation[]> {
    try {
      const db = await getDb();
      return await db.collection('conversations')
        .find({ userId })
        .sort({ updatedAt: -1 })
        .toArray();
    } catch (error) {
      console.error('Error finding conversations by user ID:', error);
      return [];
    }
  }
}