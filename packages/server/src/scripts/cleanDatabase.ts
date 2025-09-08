import mongoose from 'mongoose';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { Location } from '../models/Location';
import { User } from '../models/User';
import { Empire } from '../models/Empire';
import { connectDatabase } from '../config/database';

// Load environment variables
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

/**
 * Clean all data from the database for a fresh start
 */
export async function cleanDatabase(): Promise<void> {
  console.log('🧹 Starting database cleanup...');
  
  try {
    // Get counts before deletion
    const [locationCount, userCount, empireCount] = await Promise.all([
      Location.countDocuments(),
      User.countDocuments(),
      Empire.countDocuments()
    ]);
    
    console.log('📊 Current database state:');
    console.log(`  - Locations: ${locationCount.toLocaleString()}`);
    console.log(`  - Users: ${userCount.toLocaleString()}`);
    console.log(`  - Empires: ${empireCount.toLocaleString()}`);
    
    if (locationCount === 0 && userCount === 0 && empireCount === 0) {
      console.log('✅ Database is already clean!');
      return;
    }
    
    console.log('🗑️  Dropping entire database...');
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('MongoDB connection not initialized');
      }
      await db.dropDatabase();
      console.log('✅ Database drop completed successfully!');
      console.log('📊 All collections dropped; database is empty and ready for fresh data.');
    } catch (dropErr) {
      console.warn('⚠️ dropDatabase failed, falling back to collection deletes:', dropErr);
      console.log('🗑️  Deleting all data from collections...');
      await Promise.all([
        Location.deleteMany({}),
        User.deleteMany({}),
        Empire.deleteMany({})
      ]);
      console.log('✅ Collection-level cleanup completed successfully!');
      console.log('📊 All targeted collections are now empty and ready for fresh data.');
    }
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  }
}

/**
 * CLI script runner
 */
async function runScript() {
  try {
    console.log('🚀 Database Cleanup Script');
    console.log('==========================');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database');
    
    // Clean database
    await cleanDatabase();
    
    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('You can now run the universe generation script.');
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run script if called directly
if (require.main === module) {
  runScript();
}
