#!/usr/bin/env node
/**
 * Purge StructuresQueue Collection Script
 * 
 * This script removes all documents from the StructuresQueue collection
 * as part of the structures construction queue decommission.
 * 
 * Usage:
 *   CONFIRM_PURGE=1 ts-node src/scripts/purgeStructuresQueue.ts
 * 
 * Environment Variables:
 *   CONFIRM_PURGE=1 - Required confirmation flag to execute purge
 *   MONGODB_URI - MongoDB connection string (defaults from config)
 */

import mongoose from 'mongoose';

// Define a minimal StructuresQueue schema just for deletion
const StructuresQueueSchema = new mongoose.Schema({}, { collection: 'structuresqueues' });
const StructuresQueueModel = mongoose.model('StructuresQueue', StructuresQueueSchema);

async function purgeStructuresQueue(): Promise<void> {
  try {
    // Require confirmation to prevent accidental execution
    if (process.env.CONFIRM_PURGE !== '1') {
      console.error('❌ CONFIRM_PURGE=1 environment variable is required to execute this script');
      console.log('Example: CONFIRM_PURGE=1 ts-node src/scripts/purgeStructuresQueue.ts');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB...');
    
    // Use MongoDB URI from environment or default development URI
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition-dev';
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Purging StructuresQueue collection...');
    
    // Count documents before deletion
    const countBefore = await StructuresQueueModel.countDocuments({});
    console.log(`📊 Found ${countBefore} documents in StructuresQueue collection`);

    if (countBefore === 0) {
      console.log('✨ Collection is already empty, nothing to purge');
      return;
    }

    // Delete all documents in the collection
    const result = await StructuresQueueModel.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.deletedCount} documents from StructuresQueue collection`);
    
    // Verify deletion
    const countAfter = await StructuresQueueModel.countDocuments({});
    if (countAfter === 0) {
      console.log('🎉 Purge completed successfully - StructuresQueue collection is now empty');
    } else {
      console.warn(`⚠️  Warning: ${countAfter} documents remain after purge`);
    }

  } catch (error) {
    console.error('❌ Error during StructuresQueue purge:', error);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    } catch (disconnectError) {
      console.error('❌ Error disconnecting from MongoDB:', disconnectError);
    }
  }
}

// Execute if called directly
if (require.main === module) {
  purgeStructuresQueue()
    .then(() => {
      console.log('✨ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { purgeStructuresQueue };