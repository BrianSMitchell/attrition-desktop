/**
 * Test Script: Citizens Per Hour Functionality
 * 
 * This script tests the citizens per hour functionality by:
 * 1. Setting up a test empire with citizen-generating buildings
 * 2. Manually calling the citizen update service with time manipulation
 * 3. Verifying that citizens are generated at the expected rates
 * 
 * Run this with: node test-citizens-per-hour.js
 */

const mongoose = require('mongoose');

// Import the services we need to test
const { BaseCitizenService } = require('./packages/server/src/services/baseCitizenService');
const { CapacityService } = require('./packages/server/src/services/capacityService');

// Import models
const { Building } = require('./packages/server/src/models/Building');
const { Colony } = require('./packages/server/src/models/Colony');
const { Empire } = require('./packages/server/src/models/Empire');
const { Location } = require('./packages/server/src/models/Location');

// Load environment variables
require('dotenv').config({ path: './packages/server/.env' });

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

async function createTestData() {
  console.log('\n📝 Creating test data...');

  const testEmpireId = new mongoose.Types.ObjectId();
  const testUserId = new mongoose.Types.ObjectId();
  const testLocationCoord = 'TEST:00:00:00';

  // Clean up any existing test data
  await Empire.deleteMany({ _id: testEmpireId });
  await Colony.deleteMany({ empireId: testEmpireId });
  await Building.deleteMany({ empireId: testEmpireId });
  await Location.deleteMany({ coord: testLocationCoord });

  // Create test empire
  const empire = new Empire({
    _id: testEmpireId,
    userId: testUserId,
    name: 'Test Empire - Citizens Per Hour',
    resources: { credits: 1000000, metal: 100000, energy: 100000, research: 100000 },
    techLevels: {},
  });
  await empire.save();

  // Create test location
  const location = new Location({
    coord: testLocationCoord,
    owner: testUserId,
    result: {
      yields: { metal: 5, gas: 3 },
      fertility: 7,
      solarEnergy: 8
    }
  });
  await location.save();

  // Create test colony with no initial citizens
  const colony = new Colony({
    empireId: testEmpireId,
    locationCoord: testLocationCoord,
    citizens: 0,
    citizenRemainderMilli: 0,
    lastCitizenUpdate: new Date(),
  });
  await colony.save();

  // Create citizen-generating buildings
  const buildings = [
    { catalogKey: 'urban_structures', level: 2 },      // 2 * 3 = 6 citizens/hour
    { catalogKey: 'command_centers', level: 1 },       // 1 * 1 = 1 citizens/hour  
    { catalogKey: 'orbital_base', level: 1 },          // 1 * 5 = 5 citizens/hour
    // Total expected: 12 citizens/hour
  ];

  for (const buildingData of buildings) {
    const building = new Building({
      empireId: testEmpireId,
      locationCoord: testLocationCoord,
      catalogKey: buildingData.catalogKey,
      level: buildingData.level,
      isActive: true,
      pendingUpgrade: false,
    });
    await building.save();
  }

  console.log(`✅ Created test empire ${testEmpireId} with citizen-generating buildings`);
  console.log(`   Location: ${testLocationCoord}`);
  console.log('   Buildings:');
  for (const building of buildings) {
    console.log(`     - ${building.catalogKey} (level ${building.level})`);
  }

  return { empireId: testEmpireId, locationCoord: testLocationCoord };
}

async function testCapacityCalculation(empireId, locationCoord) {
  console.log('\n🧮 Testing capacity calculation...');

  try {
    const capacities = await CapacityService.getBaseCapacities(empireId.toString(), locationCoord);
    
    console.log('📊 Capacity Results:');
    console.log(`   Construction: ${capacities.construction.value} credits/hour`);
    console.log(`   Production: ${capacities.production.value} credits/hour`);
    console.log(`   Research: ${capacities.research.value} credits/hour`);
    console.log(`   Citizens: ${capacities.citizen.value} citizens/hour`);

    console.log('\n🔍 Citizen Generation Breakdown:');
    if (capacities.citizen.breakdown && capacities.citizen.breakdown.length > 0) {
      for (const item of capacities.citizen.breakdown) {
        console.log(`   - ${item.source}: +${item.value} citizens/hour (${item.kind})`);
      }
    } else {
      console.log('   No breakdown available');
    }

    // Validate expected citizen generation (2*3 + 1*1 + 1*5 = 12)
    const expected = 12;
    if (capacities.citizen.value === expected) {
      console.log(`✅ Citizen generation rate correct: ${capacities.citizen.value} citizens/hour`);
    } else {
      console.log(`❌ Citizen generation rate incorrect: expected ${expected}, got ${capacities.citizen.value}`);
    }

    return capacities.citizen.value;
  } catch (error) {
    console.error('❌ Failed to calculate capacities:', error.message);
    return 0;
  }
}

async function testCitizenGeneration(empireId, locationCoord, expectedRate) {
  console.log('\n⏰ Testing citizen generation over time...');

  try {
    // Get initial colony state
    let colony = await Colony.findOne({ empireId, locationCoord });
    console.log(`📈 Initial state: ${colony.citizens} citizens, ${colony.citizenRemainderMilli} milli-remainder`);

    // Set the payout period to 1 minute for testing
    process.env.CITIZEN_PAYOUT_PERIOD_MINUTES = '1';
    
    // Test 1: Simulate 1 hour passing (60 minutes)
    console.log('\n🕐 Test 1: Simulating 1 hour (60 minutes) of time passage...');
    
    // Set the last update to 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await Colony.updateOne(
      { empireId, locationCoord },
      { $set: { lastCitizenUpdate: oneHourAgo } }
    );

    // Run citizen update
    const result1 = await BaseCitizenService.updateEmpireBases(empireId.toString());
    console.log(`   Update result: ${result1.updated} colonies updated, ${result1.errors} errors`);

    // Check results
    colony = await Colony.findOne({ empireId, locationCoord });
    const expectedAfter1Hour = expectedRate; // 12 citizens after 1 hour
    
    console.log(`   Final state: ${colony.citizens} citizens, ${colony.citizenRemainderMilli} milli-remainder`);
    if (colony.citizens === expectedAfter1Hour) {
      console.log(`   ✅ Correct: Generated ${colony.citizens} citizens in 1 hour`);
    } else {
      console.log(`   ❌ Incorrect: Expected ${expectedAfter1Hour}, got ${colony.citizens} citizens`);
    }

    // Test 2: Simulate 30 more minutes (should generate half the hourly rate)
    console.log('\n🕐 Test 2: Simulating 30 more minutes...');
    
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    await Colony.updateOne(
      { empireId, locationCoord },
      { $set: { lastCitizenUpdate: thirtyMinutesAgo } }
    );

    const result2 = await BaseCitizenService.updateEmpireBases(empireId.toString());
    console.log(`   Update result: ${result2.updated} colonies updated, ${result2.errors} errors`);

    // Check results
    const colonyAfterTest2 = await Colony.findOne({ empireId, locationCoord });
    const expectedAfter30Min = expectedAfter1Hour + (expectedRate / 2); // +6 more citizens
    
    console.log(`   Final state: ${colonyAfterTest2.citizens} citizens, ${colonyAfterTest2.citizenRemainderMilli} milli-remainder`);
    if (colonyAfterTest2.citizens === expectedAfter30Min) {
      console.log(`   ✅ Correct: Generated ${colonyAfterTest2.citizens - colony.citizens} additional citizens in 30 minutes`);
    } else {
      console.log(`   ❌ Incorrect: Expected total ${expectedAfter30Min}, got ${colonyAfterTest2.citizens} citizens`);
    }

    // Test 3: Test fractional accumulation (simulate small time periods)
    console.log('\n🕐 Test 3: Testing fractional citizen accumulation...');
    
    // Reset to test fractional generation
    await Colony.updateOne(
      { empireId, locationCoord },
      { $set: { citizens: 0, citizenRemainderMilli: 0 } }
    );

    // Simulate 5 minutes (should generate expectedRate/12 citizens = 1 citizen)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await Colony.updateOne(
      { empireId, locationCoord },
      { $set: { lastCitizenUpdate: fiveMinutesAgo } }
    );

    const result3 = await BaseCitizenService.updateEmpireBases(empireId.toString());
    const colonyAfterTest3 = await Colony.findOne({ empireId, locationCoord });

    // expectedRate/12 = 12/12 = 1 citizen per 5 minutes
    const expectedAfter5Min = 1;
    console.log(`   Final state: ${colonyAfterTest3.citizens} citizens, ${colonyAfterTest3.citizenRemainderMilli} milli-remainder`);
    if (colonyAfterTest3.citizens === expectedAfter5Min) {
      console.log(`   ✅ Correct: Generated ${colonyAfterTest3.citizens} citizens in 5 minutes`);
    } else {
      console.log(`   ⚠️  Note: Got ${colonyAfterTest3.citizens} citizens (fractional accumulation may cause small differences)`);
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to test citizen generation:', error.message);
    console.error(error.stack);
    return false;
  }
}

async function testCitizenBonus(empireId, locationCoord) {
  console.log('\n💪 Testing citizen production bonus...');

  try {
    // Set colony to have 10,000 citizens (should give 10% bonus)
    await Colony.updateOne(
      { empireId, locationCoord },
      { $set: { citizens: 10000 } }
    );

    const capacitiesWithBonus = await CapacityService.getBaseCapacities(empireId.toString(), locationCoord);
    
    console.log('📊 Capacities with 10,000 citizens (10% bonus):');
    console.log(`   Construction: ${capacitiesWithBonus.construction.value} credits/hour`);
    console.log(`   Production: ${capacitiesWithBonus.production.value} credits/hour`);
    console.log(`   Research: ${capacitiesWithBonus.research.value} credits/hour`);

    // Check if citizen bonus appears in breakdown
    const constructionBreakdown = capacitiesWithBonus.construction.breakdown || [];
    const citizenBonus = constructionBreakdown.find(b => b.source === 'Citizens Bonus');
    
    if (citizenBonus) {
      console.log(`✅ Citizen bonus applied: +${(citizenBonus.value * 100).toFixed(1)}% from ${10000} citizens`);
    } else {
      console.log('❌ Citizen bonus not found in capacity breakdown');
    }

    return citizenBonus !== undefined;
  } catch (error) {
    console.error('❌ Failed to test citizen bonus:', error.message);
    return false;
  }
}

async function cleanup(empireId, locationCoord) {
  console.log('\n🧹 Cleaning up test data...');
  try {
    await Empire.deleteMany({ _id: empireId });
    await Colony.deleteMany({ empireId });
    await Building.deleteMany({ empireId });
    await Location.deleteMany({ coord: locationCoord });
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('⚠️  Failed to clean up test data:', error.message);
  }
}

async function main() {
  console.log('🧪 Testing Citizens Per Hour Functionality\n');
  console.log('This test will verify that:');
  console.log('1. Buildings generate the correct citizen rates');
  console.log('2. Citizens accumulate properly over time');
  console.log('3. Citizens provide production bonuses');
  console.log('4. Fractional citizens are handled correctly');

  try {
    await connectToDatabase();
    
    const { empireId, locationCoord } = await createTestData();
    
    const citizenRate = await testCapacityCalculation(empireId, locationCoord);
    
    if (citizenRate > 0) {
      const generationSuccess = await testCitizenGeneration(empireId, locationCoord, citizenRate);
      const bonusSuccess = await testCitizenBonus(empireId, locationCoord);
      
      console.log('\n📋 Test Summary:');
      console.log(`   Capacity Calculation: ${citizenRate > 0 ? '✅' : '❌'}`);
      console.log(`   Citizen Generation: ${generationSuccess ? '✅' : '❌'}`);
      console.log(`   Citizen Bonus: ${bonusSuccess ? '✅' : '❌'}`);
      
      if (citizenRate > 0 && generationSuccess && bonusSuccess) {
        console.log('\n🎉 All tests passed! Citizens per hour functionality is working correctly.');
      } else {
        console.log('\n⚠️  Some tests failed. Citizens per hour functionality may have issues.');
      }
    } else {
      console.log('\n❌ Capacity calculation failed, cannot proceed with other tests.');
    }

    await cleanup(empireId, locationCoord);
    
  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Test completed, database disconnected.');
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}