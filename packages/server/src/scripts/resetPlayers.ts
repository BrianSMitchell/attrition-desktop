import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase } from '../config/database';
import { User } from '../models/User';
import { Empire } from '../models/Empire';
import { Colony } from '../models/Colony';
import { ResearchProject } from '../models/ResearchProject';
import { Location } from '../models/Location';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Resets all player-related data while preserving the generated universe (Locations).
 * - Deletes: Users, Empires, Colonies, Buildings, ResearchProjects
 * - Resets: Location.owner = null for all locations
 * - Keeps: Location documents (the generated universe)
 */
export async function resetPlayers(): Promise<void> {
  console.log('🧹 Starting player reset (preserve universe)...');

  try {
    // Pre-counts
    const [
      usersBefore,
      empiresBefore,
      coloniesBefore,
      researchBefore,
      ownedLocationsBefore
    ] = await Promise.all([
      User.countDocuments(),
      Empire.countDocuments(),
      Colony.countDocuments(),
      ResearchProject.countDocuments(),
      Location.countDocuments({ owner: { $ne: null } })
    ]);

    console.log('📊 Current player data state:');
    console.log(`  - Users: ${usersBefore.toLocaleString()}`);
    console.log(`  - Empires: ${empiresBefore.toLocaleString()}`);
    console.log(`  - Colonies: ${coloniesBefore.toLocaleString()}`);
    console.log(`  - Research Projects: ${researchBefore.toLocaleString()}`);
    console.log(`  - Owned Locations: ${ownedLocationsBefore.toLocaleString()}`);

    // Delete player-related collections
    console.log('🗑️  Deleting player-related documents...');
    await Promise.all([
      ResearchProject.deleteMany({}),
      Colony.deleteMany({}),
      Empire.deleteMany({}),
      User.deleteMany({})
    ]);

    // Reset ownership on all locations
    console.log('🌌 Resetting universe ownership (Location.owner = null)...');
    const ownershipReset = await Location.updateMany(
      { owner: { $ne: null } },
      { $set: { owner: null } }
    );
    console.log(`   - Updated Locations: ${ownershipReset.modifiedCount.toLocaleString()}`);

    // Post-counts
    const [
      usersAfter,
      empiresAfter,
      coloniesAfter,
      researchAfter,
      ownedLocationsAfter
    ] = await Promise.all([
      User.countDocuments(),
      Empire.countDocuments(),
      Colony.countDocuments(),
      ResearchProject.countDocuments(),
      Location.countDocuments({ owner: { $ne: null } })
    ]);

    console.log('✅ Player reset completed successfully!');
    console.log('📊 New player data state:');
    console.log(`  - Users: ${usersAfter.toLocaleString()}`);
    console.log(`  - Empires: ${empiresAfter.toLocaleString()}`);
    console.log(`  - Colonies: ${coloniesAfter.toLocaleString()}`);
    console.log(`  - Research Projects: ${researchAfter.toLocaleString()}`);
    console.log(`  - Owned Locations: ${ownedLocationsAfter.toLocaleString()}`);
  } catch (error) {
    console.error('❌ Error during player reset:', error);
    throw error;
  }
}

/**
 * CLI script runner
 */
async function runScript() {
  try {
    console.log('🚀 Player Reset Script (Preserve Universe)');
    console.log('==========================================');

    // Connect to database
    await connectDatabase();
    // Verify connection (1 = connected)
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected. Ensure MONGODB_URI is set and reachable.');
    }
    console.log('✅ Connected to database');

    // Run reset
    await resetPlayers();

    console.log('\n🎉 Player reset completed successfully!');
    console.log('You can now allow new players to register and receive starter planets automatically.');
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
