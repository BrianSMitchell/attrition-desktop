import mongoose from 'mongoose';
import { Building } from '../models/Building';
import { Location } from '../models/Location';
import { Empire } from '../models/Empire';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function fixUndefinedBuildings() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition');
    console.log('Connected to database\n');
    
    // Find all buildings with undefined catalogKey
    const undefinedBuildings = await Building.find({
      $or: [
        { catalogKey: { $exists: false } },
        { catalogKey: null },
        { catalogKey: undefined },
        { catalogKey: 'undefined' }
      ]
    }).lean();
    
    console.log(`Found ${undefinedBuildings.length} buildings with undefined catalogKey:\n`);
    
    for (const building of undefinedBuildings) {
      console.log({
        id: building._id.toString(),
        type: (building as any).type,
        displayName: (building as any).displayName,
        catalogKey: (building as any).catalogKey,
        level: building.level,
        isActive: building.isActive,
        locationCoord: building.locationCoord,
        createdAt: (building as any).createdAt
      });
    }
    
    // Check if these are causing energy discrepancies
    const locationCoord = 'A00:00:12:02';
    const baseUndefined = undefinedBuildings.filter(b => b.locationCoord === locationCoord);
    
    if (baseUndefined.length > 0) {
      console.log(`\n⚠️ Found ${baseUndefined.length} undefined buildings at base ${locationCoord}`);
      console.log('These buildings are being counted by the shared energy calculator but skipped by BaseStatsService!');
      
      // Calculate the energy impact
      let energyImpact = 0;
      for (const b of baseUndefined) {
        if (b.isActive) {
          // These undefined buildings have energyDelta = 0, but they're still being counted
          // in the total building count which might affect calculations
          energyImpact += 0; // They have 0 delta, but the counting itself might be the issue
        }
      }
      
      console.log(`\nDo you want to delete these undefined buildings? They appear to be corrupted data.`);
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Delete the undefined buildings
      const deleteResult = await Building.deleteMany({
        _id: { $in: baseUndefined.map(b => b._id) }
      });
      
      console.log(`\n✓ Deleted ${deleteResult.deletedCount} undefined buildings`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

// Run the fix
fixUndefinedBuildings();