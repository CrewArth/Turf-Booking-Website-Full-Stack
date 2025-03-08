import mongoose from 'mongoose';

interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: GlobalMongoose | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Log the MongoDB URI format (without credentials)
const uriFormat = MONGODB_URI.replace(
  /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/,
  'mongodb$1://[username]:[password]@'
);
console.log('MongoDB URI format:', uriFormat);

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

async function dbConnect(): Promise<typeof mongoose> {
  const CONNECT_TIMEOUT = 10000; // 10 seconds
  
  if (cached?.conn) {
    // Check if the connection is still valid
    if (mongoose.connection.readyState === 1) {
      console.log('Using existing database connection');
      return cached.conn;
    } else {
      console.log('Existing connection is not valid, creating new connection');
      cached.conn = null;
      cached.promise = null;
    }
  }

  if (!cached?.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: CONNECT_TIMEOUT,
      socketTimeoutMS: 30000,
      connectTimeoutMS: CONNECT_TIMEOUT,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 10000,
      heartbeatFrequencyMS: 1000,
    };

    console.log('Creating new database connection...');
    cached!.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    const startTime = Date.now();
    
    const timeoutPromise = new Promise<typeof mongoose>((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), CONNECT_TIMEOUT)
    );

    const conn = await Promise.race([
      cached!.promise,
      timeoutPromise
    ]);

    const connectionTime = Date.now() - startTime;
    console.log(`Successfully connected to MongoDB in ${connectionTime}ms`);

    cached!.conn = conn;

    // Add connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      // Reset cache on error
      cached!.conn = null;
      cached!.promise = null;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      cached!.conn = null;
      cached!.promise = null;
    });

    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected');
    });

    return conn;
  } catch (e) {
    console.error('MongoDB connection error:', e);
    // Reset cache on error
    cached!.promise = null;
    cached!.conn = null;
    throw e;
  }
}

export default dbConnect; 