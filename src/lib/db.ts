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
  if (cached?.conn) {
    console.log('Using cached database connection');
    return cached.conn;
  }

  if (!cached?.promise) {
    console.log('Creating new database connection...');
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds
      heartbeatFrequencyMS: 1000,      // Check server status every second
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    const conn = await cached!.promise;
    console.log('Successfully connected to MongoDB.');
    cached!.conn = conn;

    // Add connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      cached!.conn = null;
      cached!.promise = null;
    });

    return conn;
  } catch (e) {
    console.error('MongoDB connection error:', e);
    cached!.promise = null;
    throw e;
  }
}

export default dbConnect; 