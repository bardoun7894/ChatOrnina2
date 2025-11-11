import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';

type HealthStatus = {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: {
    status: 'connected' | 'disconnected' | 'error';
    message?: string;
  };
  environment: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatus>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'error',
        message: 'Method not allowed',
      },
      environment: process.env.NODE_ENV || 'development',
    });
  }

  try {
    // Check database connection
    let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
    let dbMessage: string | undefined;

    try {
      if (mongoose.connection.readyState === 1) {
        // 1 = connected
        if (mongoose.connection.db) {
          await mongoose.connection.db.admin().ping();
          dbStatus = 'connected';
        } else {
          dbStatus = 'error';
          dbMessage = 'Database connection object is undefined';
        }
      } else if (mongoose.connection.readyState === 2) {
        // 2 = connecting
        dbStatus = 'disconnected';
        dbMessage = 'Database is connecting';
      } else if (mongoose.connection.readyState === 0) {
        // 0 = disconnected
        dbStatus = 'disconnected';
        dbMessage = 'Database is disconnected';
      } else {
        // 3 = disconnecting
        dbStatus = 'error';
        dbMessage = 'Database is in an unstable state';
      }
    } catch (dbError) {
      dbStatus = 'error';
      dbMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
    }

    const healthStatus: HealthStatus = {
      status: dbStatus === 'connected' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        message: dbMessage,
      },
      environment: process.env.NODE_ENV || 'development',
    };

    // Return 200 if healthy, 503 if unhealthy
    const statusCode = healthStatus.status === 'ok' ? 200 : 503;
    return res.status(statusCode).json(healthStatus);
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      environment: process.env.NODE_ENV || 'development',
    });
  }
}
