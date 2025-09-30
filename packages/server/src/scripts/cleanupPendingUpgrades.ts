import mongoose from 'mongoose';
import { Building } from '../models/Building';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function cleanupPendingUpgrades() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition');
    console.log('Connected to database');
    
    // Find buildings with pendingUpgrade flag but completed construction
    const staleUpgrades = await Building.find({ 
      pendingUpgrade: true,
      $or: [
        // Case 1: Construction completed in the past
        { constructionCompleted: { $lt: new Date() } },
        // Case 2: No construction dates at all (orphaned flag)
        { 
          constructionStarted: { $exists: false },
          constructionCompleted: { $exists: false }
        }
      ]
    }).lean();
    
    console.log(`\nFound ${staleUpgrades.length} buildings with stale pendingUpgrade flags:`);
    
    for (const building of staleUpgrades) {
      console.log({
        id: building._id.toString(),
        catalogKey: building.catalogKey,
        level: building.level,
        locationCoord: building.locationCoord,
        constructionCompleted: building.constructionCompleted
      });
    }
    
    if (staleUpgrades.length === 0) {
      console.log('No stale pendingUpgrade flags found. Database is clean!');
      return;
    }
    
    // Ask for confirmation
    console.log('\nThis will clear pendingUpgrade flags for the above buildings.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Perform cleanup
    const updateResult = await Building.updateMany(
      {
        _id: { $in: staleUpgrades.map(b => b._id) }
      },
      {
        $set: { pendingUpgrade: false },
        $unset: { 
          constructionStarted: 1,
          constructionCompleted: 1
        }
      }
    );
    
    console.log(`\nCleanup completed:`);
    console.log(`- Updated ${updateResult.modifiedCount} buildings`);
    console.log(`- Cleared pendingUpgrade flags`);
    console.log(`- Removed stale construction timestamps`);
    
    // Verify cleanup
    const remainingIssues = await Building.countDocuments({ pendingUpgrade: true });
    console.log(`\nRemaining buildings with pendingUpgrade=true: ${remainingIssues}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

// Run the cleanup
cleanupPendingUpgrades();