/**
 * Check Citizens Database Script
 * 
 * This script connects directly to the database to check citizen counts
 * and see if they're being updated properly.
 */

const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config({ path: './packages/server/.env' });

async function connectToDatabase() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/space-empire-mmo';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return false;
  }
}

async function checkCitizenCounts() {
  try {
    // Get collection references directly
    const db = mongoose.connection.db;
    const coloniesCollection = db.collection('colonies');
    const buildingsCollection = db.collection('buildings');
    const empiresCollection = db.collection('empires');

    console.log('\n🔍 Checking colonies with citizen data...\n');

    // Find colonies with citizen data
    const colonies = await coloniesCollection.find({
      citizens: { $exists: true }
    }).limit(10).toArray();

    if (colonies.length === 0) {
      console.log('❌ No colonies found with citizen data');
      return;
    }

    for (const colony of colonies) {
      console.log(`📍 Colony at ${colony.locationCoord}:`);
      console.log(`   Empire ID: ${colony.empireId}`);
      console.log(`   Citizens: ${colony.citizens || 0}`);
      console.log(`   Citizen Remainder: ${colony.citizenRemainderMilli || 0} milli`);
      
      if (colony.lastCitizenUpdate) {
        const timeSinceUpdate = Date.now() - new Date(colony.lastCitizenUpdate).getTime();
        const minutesSinceUpdate = Math.floor(timeSinceUpdate / (60 * 1000));
        console.log(`   Last Citizen Update: ${minutesSinceUpdate} minutes ago`);
      } else {
        console.log(`   Last Citizen Update: Never`);
      }

      // Check for citizen-generating buildings at this location
      const citizenBuildings = await buildingsCollection.find({
        empireId: colony.empireId,
        locationCoord: colony.locationCoord,
        catalogKey: { 
          $in: ['urban_structures', 'command_centers', 'orbital_base', 'capital', 'biosphere_modification'] 
        },
        isActive: true
      }).toArray();

      if (citizenBuildings.length > 0) {
        console.log(`   👥 Citizen-generating buildings:`);
        let expectedRate = 0;
        const rates = {
          'urban_structures': 3,
          'command_centers': 1,
          'orbital_base': 5,
          'capital': 8,
          'biosphere_modification': 10
        };

        for (const building of citizenBuildings) {
          const rate = rates[building.catalogKey] || 0;
          const contribution = building.level * rate;
          expectedRate += contribution;
          console.log(`     - ${building.catalogKey} (Level ${building.level}): +${contribution} citizens/hour`);
        }
        console.log(`   📊 Total Expected Rate: ${expectedRate} citizens/hour`);
      } else {
        console.log(`   📋 No citizen-generating buildings found`);
      }

      // Get empire name for context
      try {
        const empire = await empiresCollection.findOne({ _id: colony.empireId });
        console.log(`   🏛️  Empire: ${empire?.name || 'Unknown'}`);
      } catch (e) {
        console.log(`   🏛️  Empire: Could not fetch name`);
      }

      console.log(''); // Empty line between colonies
    }

    // Check if there are any recent citizen updates
    console.log('\n⏰ Checking for recent citizen updates...');
    
    const recentUpdates = await coloniesCollection.find({
      lastCitizenUpdate: { 
        $gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
      }
    }).toArray();

    console.log(`Found ${recentUpdates.length} colonies updated in the last 30 minutes`);

    if (recentUpdates.length > 0) {
      console.log('✅ Citizens are being updated recently!');
      for (const update of recentUpdates.slice(0, 5)) {
        const timeSinceUpdate = Date.now() - new Date(update.lastCitizenUpdate).getTime();
        const minutesAgo = Math.floor(timeSinceUpdate / (60 * 1000));
        console.log(`   - ${update.locationCoord}: ${update.citizens} citizens (updated ${minutesAgo}m ago)`);
      }
    } else {
      console.log('⚠️  No recent citizen updates found in the last 30 minutes');
      console.log('   This could mean:');
      console.log('   - The game loop is not running');
      console.log('   - BaseCitizenService is not being called');
      console.log('   - No empires have citizen-generating buildings');
    }

  } catch (error) {
    console.error('❌ Error checking citizen data:', error.message);
  }
}

async function testCitizenUpdate() {
  console.log('\n🔧 Testing manual citizen update...');
  
  try {
    // Find an empire with citizen buildings
    const db = mongoose.connection.db;
    const buildingsCollection = db.collection('buildings');
    
    const empiresWithCitizenBuildings = await buildingsCollection.aggregate([
      { 
        $match: { 
          catalogKey: { 
            $in: ['urban_structures', 'command_centers', 'orbital_base', 'capital', 'biosphere_modification'] 
          },
          isActive: true 
        } 
      },
      { 
        $group: { 
          _id: '$empireId',
          buildingCount: { $sum: 1 }
        } 
      },
      { $limit: 1 }
    ]).toArray();

    if (empiresWithCitizenBuildings.length === 0) {
      console.log('❌ No empires found with citizen-generating buildings');
      return;
    }

    const empireId = empiresWithCitizenBuildings[0]._id;
    console.log(`🧪 Testing citizen update for empire: ${empireId}`);

    // Import the service (this might not work due to TypeScript compilation)
    try {
      // Try to dynamically import if the service is available
      const path = require('path');
      const serviceExists = require('fs').existsSync(path.join(__dirname, 'packages/server/dist/services/baseCitizenService.js'));
      
      if (serviceExists) {
        const { BaseCitizenService } = require('./packages/server/dist/services/baseCitizenService');
        const result = await BaseCitizenService.updateEmpireBases(empireId.toString());
        console.log(`✅ Manual update result: ${result.updated} updated, ${result.errors} errors`);
      } else {
        console.log('⚠️  Cannot run manual update - service not compiled to JavaScript');
        console.log('   The service exists in TypeScript but needs to be compiled first');
      }
    } catch (importError) {
      console.log('⚠️  Cannot import BaseCitizenService:', importError.message);
      console.log('   This is normal if the TypeScript hasn\'t been compiled to JavaScript');
    }

  } catch (error) {
    console.error('❌ Error testing citizen update:', error.message);
  }
}

async function main() {
  console.log('🔍 Checking Citizens Database Status\n');

  const connected = await connectToDatabase();
  if (!connected) {
    return;
  }

  await checkCitizenCounts();
  await testCitizenUpdate();

  console.log('\n📋 Summary:');
  console.log('   If you see citizens with recent updates, the system is working');
  console.log('   If no recent updates, the game loop may not be calling citizen updates');
  console.log('   Check your game server console for any citizen-related errors');

  await mongoose.disconnect();
  console.log('\n👋 Database check completed.');
}

// Run the check
if (require.main === module) {
  main().catch(console.error);
}