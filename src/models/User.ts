import { ObjectId } from 'mongodb';
import clientPromise, { getDb } from '@/lib/mongodb';

export interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  password?: string;
  role: 'user' | 'admin';
  subscription?: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'inactive' | 'cancelled';
    expiresAt?: Date;
  };
  preferences?: {
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

class UserModel {
  static async findOne(query: Partial<User>): Promise<User | null> {
    const db = await getDb();
    return db.collection<User>('users').findOne(query);
  }

  static async findById(id: string): Promise<User | null> {
    const db = await getDb();
    return db.collection<User>('users').findOne({ _id: new ObjectId(id) });
  }

  static async create(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const db = await getDb();
    const now = new Date();
    const newUser = {
      ...userData,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection<User>('users').insertOne(newUser as any);
    return { ...newUser, _id: result.insertedId };
  }

  static async update(id: string, userData: Partial<User>): Promise<User | null> {
    const db = await getDb();
    const updateData = { ...userData, updatedAt: new Date() };
    await db.collection<User>('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.collection<User>('users').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }

  static async findMany(query: Partial<User> = {}, options: {
    limit?: number;
    skip?: number;
    sort?: Record<string, 1 | -1>;
  } = {}): Promise<User[]> {
    const db = await getDb();
    let cursor = db.collection<User>('users').find(query);
    
    if (options.sort) {
      cursor = cursor.sort(options.sort);
    }
    
    if (options.skip) {
      cursor = cursor.skip(options.skip);
    }
    
    if (options.limit) {
      cursor = cursor.limit(options.limit);
    }
    
    return cursor.toArray();
  }
}

export { UserModel };
export default UserModel;
