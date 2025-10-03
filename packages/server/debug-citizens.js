const mongoose = require('mongoose');
require('dotenv').config();

async function debugCitizens() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const Empire = require('./dist/models/Empire').Empire;
    const Colony = require('./dist/models/Colony').Colony;
    const CapacityService = require('./dist/services/capacityService').CapacityService;
    
    // Find empire
    const empire = await Empire.findOne({}).lean();
    const empireId = empire._id.toString();
    console.log(`\nEmpire: ${empire.name} (${empireId})`);
    
    // Find colonies
    const colonies = await Colony.find({ empireId: new mongoose.Types.ObjectId(empireId) })
      .select('_id locationCoord citizens lastCitizenUpdate citizenRemainderMilli createdAt')
      .lean();
    
    console.log(`\nFound ${colonies.length} colonies for this empire`);
    
    for (const c of colonies) {
      console.log(`\n=== Colony ${c.locationCoord} ===`);
      console.log(`  _id: ${c._id}`);
      console.log(`  citizens: ${c.citizens || 0}`);
      console.log(`  lastCitizenUpdate: ${c.lastCitizenUpdate || 'Never'}`);
      console.log(`  createdAt: ${c.createdAt || 'Unknown'}`);
      console.log(`  citizenRemainderMilli: ${c.citizenRemainderMilli || 0}`);
      
      // Check capacity
      console.log(`\n  Checking citizen capacity...`);
      const caps = await CapacityService.getBaseCapacities(empireId, c.locationCoord);
      console.log(`  Citizen capacity: ${JSON.stringify(caps.citizen)}`);
      
      // Calculate periods
      const periodMinutes = parseInt(process.env.CITIZEN_PAYOUT_PERIOD_MINUTES || '1', 10);
      const periodMs = Math.max(60000, periodMinutes * 60 * 1000);
      console.log(`\n  Period settings:`);
      console.log(`    Period minutes: ${periodMinutes}`);
      console.log(`    Period ms: ${periodMs}`);
      
      const now = new Date();
      const getBoundary = (date) => new Date(Math.floor(date.getTime() / periodMs) * periodMs);
      
      const lastUpdate = c.lastCitizenUpdate || c.createdAt || now;
      const lastBoundary = getBoundary(lastUpdate);
      const currentBoundary = getBoundary(now);
      const periodsElapsed = Math.floor((currentBoundary.getTime() - lastBoundary.getTime()) / periodMs);
      
      console.log(`\n  Time calculations:`);
      console.log(`    Now: ${now}`);
      console.log(`    Last update: ${lastUpdate}`);
      console.log(`    Last boundary: ${lastBoundary}`);
      console.log(`    Current boundary: ${currentBoundary}`);
      console.log(`    Periods elapsed: ${periodsElapsed}`);
      
      if (periodsElapsed > 0) {
        const perHour = Math.max(0, Number(caps.citizen?.value || 0));
        console.log(`\n  Citizen generation:`);
        console.log(`    Per hour: ${perHour}`);
        
        if (perHour > 0) {
          const microPerPeriod = Math.round(perHour * (periodMs / (60 * 60 * 1000)) * 1000);
          const totalMicro = microPerPeriod * periodsElapsed;
          const prevRema = Math.max(0, Number(c.citizenRemainderMilli || 0));
          const newMicroWithRema = prevRema + totalMicro;
          const wholeCitizens = Math.floor(newMicroWithRema / 1000);
          const newRema = newMicroWithRema % 1000;
          const newCount = Math.max(0, Number(c.citizens || 0)) + wholeCitizens;
          
          console.log(`    Micro per period: ${microPerPeriod}`);
          console.log(`    Total micro: ${totalMicro}`);
          console.log(`    Previous remainder: ${prevRema}`);
          console.log(`    New micro with remainder: ${newMicroWithRema}`);
          console.log(`    Whole citizens to add: ${wholeCitizens}`);
          console.log(`    New remainder: ${newRema}`);
          console.log(`    New citizen count: ${newCount}`);
        }
      }
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

debugCitizens();
