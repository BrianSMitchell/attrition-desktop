import { ENV_VARS } from '../../../shared/src/constants/env-vars';

require('dotenv').config();
const mongoose = require('mongoose');

async function checkBuildings() {
  try {
    await mongoose.connect(process.env[ENV_VARS.MONGODB_URI]);
    console.log('=== YOUR EMPIRE BUILDINGS ===');
    
    const empireId = '68c21deb375bbf773d02005e'; // razgak
    const buildings = await mongoose.connection.db.collection('buildings').find({
      empireId: new mongoose.Types.ObjectId(empireId)
    }).toArray();
    
    console.log(`Found ${buildings.length} buildings for empire ${empireId}:`);
    buildings.forEach(b => {
      console.log(`- ${b.type} (Level ${b.level}) at ${b.locationCoord} - Active: ${b.isActive}`);
    });
    
    // Check if there are metal refineries
    const metalRefineries = buildings.filter(b => b.type === 'metal_refineries');
    console.log(`\nMetal refineries found: ${metalRefineries.length}`);
    metalRefineries.forEach(b => {
      console.log(`  - Level ${b.level} at ${b.locationCoord}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBuildings();