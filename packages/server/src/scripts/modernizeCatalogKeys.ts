import mongoose from 'mongoose';
import { Building } from '../models/Building';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function modernizeCatalogKeys() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition');
    console.log('Connected to database\n');
    
    console.log('=== CATALOG KEY MODERNIZATION ===\n');
    
    // Step 1: Find all unique type values currently in use
    console.log('Step 1: Analyzing current building types...');
    const uniqueTypes = await Building.distinct('type');
    console.log(`Found ${uniqueTypes.length} unique type values:`);
    for (const type of uniqueTypes) {
      const count = await Building.countDocuments({ type });
      console.log(`  - ${type}: ${count} buildings`);
    }
    
    // Step 2: Check for buildings without catalogKey
    console.log('\nStep 2: Checking for buildings without catalogKey...');
    const missingCatalogKey = await Building.find({
      $or: [
        { catalogKey: { $exists: false } },
        { catalogKey: null },
        { catalogKey: '' }
      ]
    }).lean();
    
    console.log(`Found ${missingCatalogKey.length} buildings without catalogKey`);
    if (missingCatalogKey.length > 0) {
      console.log('These would need manual mapping or deletion');
    }
    
    // Step 3: Show the mapping from old type to catalogKey
    console.log('\nStep 3: Current type → catalogKey mappings:');
    const mappings = await Building.aggregate([
      {
        $match: {
          catalogKey: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: { type: '$type', catalogKey: '$catalogKey' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.type': 1, '_id.catalogKey': 1 }
      }
    ]);
    
    for (const mapping of mappings) {
      console.log(`  ${mapping._id.type} → ${mapping._id.catalogKey} (${mapping.count} buildings)`);
    }
    
    // Step 4: Migration preview
    console.log('\nStep 4: Migration Preview');
    console.log('The following changes will be made:');
    console.log('1. Set type = catalogKey for all buildings with valid catalogKey');
    console.log('2. This will replace legacy types like "defense_station", "habitat" with proper catalog keys');
    
    const toUpdate = await Building.countDocuments({
      catalogKey: { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`\nWill update ${toUpdate} buildings`);
    
    console.log('\nProceed with migration? (Ctrl+C to cancel, wait 5 seconds to proceed)');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 5: Perform migration
    console.log('\nStep 5: Performing migration...');
    
    const updateResult = await Building.updateMany(
      { catalogKey: { $exists: true, $ne: null, $ne: '' } },
      [{ $set: { type: '$catalogKey' } }]
    );
    
    console.log(`✓ Updated ${updateResult.modifiedCount} buildings`);
    
    // Step 6: Verify results
    console.log('\nStep 6: Verifying results...');
    const newUniqueTypes = await Building.distinct('type');
    console.log(`\nNew unique type values (${newUniqueTypes.length} total):`);
    for (const type of newUniqueTypes) {
      const count = await Building.countDocuments({ type });
      console.log(`  - ${type}: ${count} buildings`);
    }
    
    // Step 7: Check consistency
    console.log('\nStep 7: Checking consistency...');
    const inconsistent = await Building.find({
      $and: [
        { catalogKey: { $exists: true, $ne: null, $ne: '' } },
        { $expr: { $ne: ['$type', '$catalogKey'] } }
      ]
    }).lean();
    
    if (inconsistent.length > 0) {
      console.log(`⚠️ Found ${inconsistent.length} inconsistent buildings where type != catalogKey`);
    } else {
      console.log('✓ All buildings with catalogKey now have matching type field');
    }
    
    console.log('\n✓ Migration complete!');
    console.log('\nNext steps:');
    console.log('1. Update code to use catalogKey instead of type');
    console.log('2. Remove mappedType from BuildingSpec in shared/buildings.ts');
    console.log('3. Eventually deprecate and remove the type field entirely');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

// Run the modernization
modernizeCatalogKeys();