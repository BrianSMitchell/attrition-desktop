import { ENV_VARS } from '../../../shared/src/constants/env-vars';

require('dotenv').config();
const mongoose = require('mongoose');

async function checkAllBuildings() {
  try {
    await mongoose.connect(process.env[ENV_VARS.MONGODB_URI]);
    console.log('=== ALL EMPIRE BUILDINGS ===');
    
    const empires = [
      { id: '68c21deb375bbf773d02005e', name: 'razgak' },
      { id: '68c2ea103b75344a55ea62cc', name: 'adminuser' }
    ];
    
    for (const empire of empires) {
      console.log(`\n--- Empire: ${empire.name} (${empire.id}) ---`);
      
      const buildings = await mongoose.connection.db.collection('buildings').find({
        empireId: new mongoose.Types.ObjectId(empire.id)
      }).toArray();
      
      console.log(`Found ${buildings.length} buildings:`);
      buildings.forEach(b => {
        console.log(`- ${b.type} (Level ${b.level}) at ${b.locationCoord} - Active: ${b.isActive}`);
      });
      
      // Check specifically for metal refineries
      const metalRefineries = buildings.filter(b => b.type === 'metal_refineries');
      if (metalRefineries.length > 0) {
        console.log(`\nMetal refineries for ${empire.name}: ${metalRefineries.length}`);
        metalRefineries.forEach(b => {
          console.log(`  - Level ${b.level} at ${b.locationCoord} (Active: ${b.isActive})`);
        });
      } else {
        console.log(`\n❌ No metal refineries found for ${empire.name}`);
      }
    }
    
    // Show all building types in database
    console.log('\n=== ALL BUILDING TYPES IN DATABASE ===');
    const allBuildings = await mongoose.connection.db.collection('buildings').find().toArray();
    const buildingTypes = [...new Set(allBuildings.map(b => b.type))];
    console.log('Building types found:', buildingTypes.sort());
    
    // Count metal refineries across all empires
    const allMetalRefineries = allBuildings.filter(b => b.type === 'metal_refineries');
    console.log(`\nTotal metal refineries in database: ${allMetalRefineries.length}`);
    allMetalRefineries.forEach(b => {
      console.log(`  - Empire ${b.empireId} - Level ${b.level} at ${b.locationCoord}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllBuildings();