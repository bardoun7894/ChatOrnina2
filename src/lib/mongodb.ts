import { MongoClient, Db, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/orninachat';
const dbName = process.env.DB_NAME || 'orninachat';
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  // Add connection timeouts and retry logic
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 20000,
  retryWrites: true,
  w: 'majority' as const,
  // TLS configuration - disabled for local development
  tls: false,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
  // Add max pool size
  maxPoolSize: 10
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof global & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect().catch(err => {
      console.error('[MongoDB] Development connection failed:', err.message);
      // Return a mock client that allows the app to continue
      return client;
    });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect().catch(err => {
    console.error('[MongoDB] Production connection failed:', err.message);
    // Return a mock client that allows the app to continue
    return client;
  });
}

// Connection diagnostics
clientPromise
  .then(() => {
    console.log('[MongoDB] Connected successfully');
  })
  .catch((err) => {
    console.error('[MongoDB] Connection error:', err && err.message);
    if (err && (err as any).reason) {
      console.error('[MongoDB] Error reason:', (err as any).reason);
    }
  });

// Get the database instance
export const getDb = async (): Promise<Db> => {
  try {
    const client = await clientPromise;
    return client.db(dbName);
  } catch (error) {
    console.error('[MongoDB] Failed to get database:', error);
    throw new Error('Database connection failed');
  }
};

// Connection diagnostics
clientPromise
  .then(() => {
    console.log('[MongoDB] Connected successfully');
  })
  .catch((err) => {
    console.error('[MongoDB] Connection error:', (err as any)?.message || err);
    const anyErr = err as any;
    if (anyErr?.reason) {
      console.error('[MongoDB] Error reason:', anyErr.reason);
    }
  });

export default clientPromise;
