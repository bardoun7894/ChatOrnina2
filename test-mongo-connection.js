const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/orninachat';

async function testConnection() {
  console.log('Testing MongoDB connection...');
  console.log('URI:', uri.replace(/:([^@]+)@/, ':****@')); // Hide password in logs
  
  const client = new MongoClient(uri, {
    serverApi: {
      version: '1',
      strict: true,
      deprecationErrors: true,
    },
    tls: true,
    tlsAllowInvalidCertificates: false,
    retryWrites: true,
    w: 'majority'
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully to MongoDB');
    
    // Test basic operations
    const db = client.db('test');
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    await client.close();
    console.log('✅ Connection test completed successfully');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
    if (error.reason) {
      console.error('Error reason:', error.reason);
    }
  }
}

testConnection();