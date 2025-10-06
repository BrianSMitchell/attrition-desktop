import mongoose from 'mongoose';
import { supabase } from './supabase';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

export { supabase };

/**
 * Database configuration
 *
 * Default behavior (no env override):
 * - Development: MongoDB
 * - Production: Supabase
 *
 * Override with environment variable:
 * - DB_TYPE=mongodb | supabase
 */
const DB_TYPE = (process.env.DB_TYPE || (isProduction ? 'supabase' : 'mongodb')).toLowerCase();

export const dbConfig = {
  isProduction,
  isDevelopment,
  useSupabase: DB_TYPE === 'supabase',
  useMongoDB: DB_TYPE === 'mongodb',
};

/**
 * Initialize database connection based on environment
 */
export async function connectDatabase(): Promise<void> {
  console.log('\n═══════════════════════════════════════');
  console.log('  DATABASE CONFIGURATION');
  console.log('═══════════════════════════════════════');
  console.log(`  Environment:     ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Database Type:   ${dbConfig.useSupabase ? 'SUPABASE' : 'MONGODB'}`);
  if (process.env.DB_TYPE) {
    console.log(`  DB_TYPE override: ${process.env.DB_TYPE}`);
  }
  console.log('═══════════════════════════════════════\n');

  if (dbConfig.useMongoDB) {
    await connectMongoDB();
  }
  
  if (dbConfig.useSupabase) {
    await verifySupabaseConnection();
  }
}

/**
 * Connect to MongoDB (Development/Test)
 */
async function connectMongoDB(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition';
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB (Development)');
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    console.log('⚠️  Server will continue without database connection for testing');
  }
}

/**
 * Verify Supabase connection (Production)
 */
async function verifySupabaseConnection(): Promise<void> {
  try {
    // Simple query to verify connection
    const { error } = await supabase.from('users').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = empty table, which is OK
      throw error;
    }
    
    console.log('✅ Connected to Supabase (Production)');
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    throw error;
  }
}

/**
 * Close database connections
 */
export async function disconnectDatabase(): Promise<void> {
  if (dbConfig.useMongoDB) {
    try {
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }
  
  // Supabase doesn't need explicit closing
  if (dbConfig.useSupabase) {
    console.log('✅ Supabase session closed');
  }
}

/**
 * Get current database type
 */
export function getDatabaseType(): 'mongodb' | 'supabase' {
  return dbConfig.useSupabase ? 'supabase' : 'mongodb';
}
