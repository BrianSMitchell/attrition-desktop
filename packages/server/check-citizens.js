const mongoose = require('mongoose');
require('dotenv').config();

async function checkCitizens() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const Building = require('./dist/models/Building').Building;
    const Colony = require('./dist/models/Colony').Colony;
    
    // Check for citizen-generating buildings
    const citizenBuildings = await Building.find({ 
      catalogKey: { 
        $in: ['urban_structures', 'command_centers', 'orbital_base', 'capital', 'biosphere_modification'] 
      }
    }).select('catalogKey level isActive locationCoord empireId').lean();
    
    console.log('\n=== Citizen-Generating Buildings ===');
    console.log(`Found ${citizenBuildings.length} buildings`);
    citizenBuildings.forEach(b => {
      console.log(`- ${b.catalogKey} Level ${b.level} (Active: ${b.isActive}) at ${b.locationCoord}`);
    });
    
    // Check colonies
    const colonies = await Colony.find({}).select('locationCoord citizens citizenRemainderMilli lastCitizenUpdate').lean();
    console.log('\n=== Colonies ===');
    console.log(`Found ${colonies.length} colonies`);
    colonies.forEach(c => {
      console.log(`- Location: ${c.locationCoord}`);
      console.log(`  Citizens: ${c.citizens || 0}`);
      console.log(`  Last Update: ${c.lastCitizenUpdate || 'Never'}`);
      console.log(`  Remainder: ${c.citizenRemainderMilli || 0} milli-citizens`);
    });
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCitizens();
