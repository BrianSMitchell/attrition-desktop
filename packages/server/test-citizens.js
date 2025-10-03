/**
 * Simple Citizens Per Hour Test
 * 
 * This script tests the citizens per hour functionality with existing game data.
 * Usage: node scripts/test-citizens.js
 */

const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config({ path: './.env' });

// Import services and models
const { CapacityService } = require('./src/services/capacityService');
const { BaseCitizenService } = require('./src/services/baseCitizenService');
const { Empire } = require('./src/models/Empire');
const { Colony } = require('./src/models/Colony');
const { Building } = require('./src/models/Building');

async function connectToDatabase() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/space-empire-mmo';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

async function findTestableEmpires() {
  console.log('🔍 Looking for empires with citizen-generating buildings...');
  
  try {
    // Find empires that have urban structures, command centers, orbital bases, etc.
    const citizenBuildings = [
      'urban_structures',
      'command_centers', 
      'orbital_base',
      'capital',
      'biosphere_modification'
    ];

    const empiresWithCitizenBuildings = await Building.aggregate([
      { $match: { catalogKey: { $in: citizenBuildings }, isActive: true } },
      { $group: { 
          _id: '$empireId',
          buildingCount: { $sum: 1 },
          locations: { $addToSet: '$locationCoord' }
      }},
      { $match: { buildingCount: { $gte: 1 } } },
      { $limit: 5 }
    ]);

    console.log(`Found ${empiresWithCitizenBuildings.length} empires with citizen-generating buildings:`);
    
    for (const empire of empiresWithCitizenBuildings) {
      const empireDoc = await Empire.findById(empire._id).select('name');
      console.log(`  - ${empireDoc?.name || 'Unnamed'} (${empire._id}): ${empire.buildingCount} citizen buildings across ${empire.locations.length} locations`);
    }

    return empiresWithCitizenBuildings.slice(0, 3); // Test up to 3 empires
  } catch (error) {
    console.error('❌ Error finding empires:', error.message);
    return [];
  }
}

async function testEmpireCitizens(empireData) {
  const empireId = empireData._id.toString();
  
  try {
    const empire = await Empire.findById(empireId).select('name');
    console.log(`\n🏛️  Testing Empire: ${empire?.name || 'Unnamed'} (${empireId})`);

    let totalExpectedCitizens = 0;
    let locationsWithCitizens = 0;

    for (const locationCoord of empireData.locations) {
      console.log(`\n  📍 Location: ${locationCoord}`);
      
      // Get buildings at this location
      const buildings = await Building.find({
        empireId: new mongoose.Types.ObjectId(empireId),
        locationCoord,
        isActive: true
      }).select('catalogKey level');

      // Calculate expected citizen generation
      const citizenBuildings = buildings.filter(b => [
        'urban_structures', 'command_centers', 'orbital_base', 'capital', 'biosphere_modification'
      ].includes(b.catalogKey));

      if (citizenBuildings.length > 0) {
        console.log('     Buildings generating citizens:');
        let locationExpected = 0;
        
        for (const building of citizenBuildings) {
          const rates = {
            'urban_structures': 3,
            'command_centers': 1,
            'orbital_base': 5,
            'capital': 8,
            'biosphere_modification': 10
          };
          
          const rate = rates[building.catalogKey] || 0;
          const contribution = building.level * rate;
          locationExpected += contribution;
          
          console.log(`       - ${building.catalogKey} (level ${building.level}): +${contribution} citizens/hour`);
        }

        // Test capacity calculation
        try {
          const capacities = await CapacityService.getBaseCapacities(empireId, locationCoord);
          console.log(`     🧮 Calculated capacity: ${capacities.citizen.value} citizens/hour`);
          
          if (capacities.citizen.value === locationExpected) {
            console.log('     ✅ Citizen generation calculation correct');
          } else {
            console.log(`     ⚠️  Mismatch: expected ${locationExpected}, got ${capacities.citizen.value}`);
          }

          totalExpectedCitizens += capacities.citizen.value;
          locationsWithCitizens++;

        } catch (error) {
          console.log(`     ❌ Failed to calculate capacities: ${error.message}`);
        }

        // Check current colony state
        try {
          const colony = await Colony.findOne({ empireId: new mongoose.Types.ObjectId(empireId), locationCoord });
          if (colony) {
            console.log(`     👥 Current citizens: ${colony.citizens} (remainder: ${colony.citizenRemainderMilli})`);
            if (colony.lastCitizenUpdate) {
              const timeSinceUpdate = Date.now() - colony.lastCitizenUpdate.getTime();
              const minutesSinceUpdate = Math.floor(timeSinceUpdate / (60 * 1000));
              console.log(`     ⏰ Last update: ${minutesSinceUpdate} minutes ago`);
            }
          } else {
            console.log('     ❌ No colony found at this location');
          }
        } catch (error) {
          console.log(`     ⚠️  Could not check colony: ${error.message}`);
        }
      } else {
        console.log('     📋 No citizen-generating buildings at this location');
      }
    }

    console.log(`\n  📊 Empire Summary:`);
    console.log(`     Total expected citizen generation: ${totalExpectedCitizens} citizens/hour`);
    console.log(`     Locations with citizen buildings: ${locationsWithCitizens}`);

    return { empireId, totalExpected: totalExpectedCitizens };
    
  } catch (error) {
    console.error(`❌ Error testing empire ${empireId}:`, error.message);
    return { empireId, totalExpected: 0 };
  }
}

async function testCitizenUpdate(empireId) {
  console.log(`\n⚡ Testing citizen update for empire ${empireId}...`);
  
  try {
    const result = await BaseCitizenService.updateEmpireBases(empireId);
    console.log(`   Update result: ${result.updated} colonies updated, ${result.errors} errors`);
    
    if (result.errors > 0) {
      console.log('   ⚠️  Some errors occurred during update');
    } else if (result.updated > 0) {
      console.log('   ✅ Citizen update completed successfully');
    } else {
      console.log('   ℹ️  No colonies needed updates (possibly updated recently)');
    }

    return result.updated > 0;
  } catch (error) {
    console.error(`   ❌ Failed to update citizens: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🧪 Citizens Per Hour Functionality Test\n');

  try {
    await connectToDatabase();

    const empires = await findTestableEmpires();
    
    if (empires.length === 0) {
      console.log('❌ No empires with citizen-generating buildings found.');
      console.log('   To test this functionality, create some Urban Structures, Command Centers, or Orbital Bases in the game first.');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('                     CAPACITY TESTS');
    console.log('='.repeat(60));

    const testedEmpires = [];
    for (const empire of empires) {
      const result = await testEmpireCitizens(empire);
      testedEmpires.push(result);
    }

    console.log('\n' + '='.repeat(60));
    console.log('                     UPDATE TESTS');
    console.log('='.repeat(60));

    for (const empire of testedEmpires) {
      if (empire.totalExpected > 0) {
        await testCitizenUpdate(empire.empireId);
      }
    }

    console.log('\n📋 Test Summary:');
    const workingEmpires = testedEmpires.filter(e => e.totalExpected > 0);
    
    if (workingEmpires.length > 0) {
      console.log(`✅ Found ${workingEmpires.length} empires with working citizen generation`);
      console.log('🎉 Citizens per hour functionality appears to be working!');
      
      console.log('\n💡 To see citizens accumulate over time:');
      console.log('   1. Wait for the game loop to run (usually every few minutes)');
      console.log('   2. Or manually run the citizen update again');
      console.log('   3. Check the colony citizens count in the game UI');
    } else {
      console.log('⚠️  No empires had citizen generation set up correctly');
      console.log('   Try building Urban Structures, Command Centers, or Orbital Bases first');
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Test completed.');
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}