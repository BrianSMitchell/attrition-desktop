const mongoose = require('mongoose');
require('dotenv').config();

async function checkGameLoop() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const Empire = require('./dist/models/Empire').Empire;
    
    // Check empire resource updates
    const empires = await Empire.find({}).select('name lastResourceUpdate lastCreditUpdate').lean();
    
    console.log('\n=== Empire Update Status ===');
    empires.forEach(e => {
      console.log(`\nEmpire: ${e.name}`);
      console.log(`  Last Resource Update: ${e.lastResourceUpdate || 'Never'}`);
      console.log(`  Last Credit Update: ${e.lastCreditUpdate || 'Never'}`);
      if (e.lastResourceUpdate) {
        const minutesAgo = (Date.now() - e.lastResourceUpdate.getTime()) / 60000;
        console.log(`  Minutes since resource update: ${minutesAgo.toFixed(1)}`);
      }
    });
    
    // Try to manually trigger citizen update
    console.log('\n=== Triggering Manual Citizen Update ===');
    const BaseCitizenService = require('./dist/services/baseCitizenService').BaseCitizenService;
    
    for (const empire of empires) {
      const result = await BaseCitizenService.updateEmpireBases(empire._id.toString());
      console.log(`\nEmpire ${empire.name}:`);
      console.log(`  Updated: ${result.updated} bases`);
      console.log(`  Errors: ${result.errors} bases`);
    }
    
    // Check colony again after update
    const Colony = require('./dist/models/Colony').Colony;
    const colonies = await Colony.find({}).select('locationCoord citizens citizenRemainderMilli lastCitizenUpdate').lean();
    
    console.log('\n=== Colonies After Update ===');
    colonies.forEach(c => {
      console.log(`\nLocation: ${c.locationCoord}`);
      console.log(`  Citizens: ${c.citizens || 0}`);
      console.log(`  Last Update: ${c.lastCitizenUpdate || 'Never'}`);
      console.log(`  Remainder: ${c.citizenRemainderMilli || 0} milli-citizens`);
    });
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkGameLoop();
