import { ENV_VARS } from '../../../shared/src/constants/env-vars';

require('dotenv').config();
const mongoose = require('mongoose');

async function inspectMetalRefineries() {
  try {
    await mongoose.connect(process.env[ENV_VARS.MONGODB_URI]);
    console.log('=== METAL REFINERIES DETAILED INSPECTION ===');
    
    const empireId = new mongoose.Types.ObjectId('68c21deb375bbf773d02005e'); // razgak
    
    const metalRefineries = await mongoose.connection.db.collection('buildings').find({
      type: 'metal_refineries',
      empireId: empireId
    }).toArray();
    
    console.log(`Found ${metalRefineries.length} metal refineries for razgak:`);
    metalRefineries.forEach(refinery => {
      console.log('\n--- Metal Refinery Details ---');
      console.log('ID:', refinery._id);
      console.log('Type:', refinery.type);
      console.log('CatalogKey:', refinery.catalogKey);
      console.log('Level:', refinery.level);
      console.log('IsActive:', refinery.isActive);
      console.log('PendingUpgrade:', refinery.pendingUpgrade);
      console.log('ConstructionCompleted:', refinery.constructionCompleted);
      console.log('ConstructionStarted:', refinery.constructionStarted);
      console.log('CreatedAt:', refinery.createdAt);
      console.log('UpdatedAt:', refinery.updatedAt);
    });
    
    // Now let's check what the Building model query returns
    console.log('\n=== TESTING BUILDING MODEL QUERY ===');
    const Building = require('../src/models/Building').Building;
    
    const queryResult = await Building.find({
      empireId: empireId,
      $or: [
        { isActive: true },
        { pendingUpgrade: true }
      ],
      constructionCompleted: { $exists: true, $ne: null }
    });
    
    console.log(`Building model query returned ${queryResult.length} buildings:`);
    queryResult.forEach(building => {
      console.log(`- ${building.type} (Level ${building.level}) - ConstructionCompleted: ${building.constructionCompleted}`);
    });
    
    // Check without constructionCompleted filter
    console.log('\n=== QUERY WITHOUT CONSTRUCTION COMPLETED FILTER ===');
    const allBuildings = await Building.find({
      empireId: empireId,
      $or: [
        { isActive: true },
        { pendingUpgrade: true }
      ]
    });
    
    console.log(`Query without constructionCompleted filter returned ${allBuildings.length} buildings:`);
    allBuildings.forEach(building => {
      console.log(`- ${building.type} (Level ${building.level}) - ConstructionCompleted: ${building.constructionCompleted}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

inspectMetalRefineries();