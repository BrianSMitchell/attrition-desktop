const mongoose = require('mongoose');
require('dotenv').config({ path: './packages/server/.env' });

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/attrition';

// Define the Building schema
const buildingSchema = new mongoose.Schema({
  empireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empire', required: true },
  locationCoord: { type: String, required: true },
  catalogKey: { type: String },
  buildingType: { type: String },
  level: { type: Number, default: 1 },
  isActive: { type: Boolean, default: false },
  pendingUpgrade: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'buildings' });

const Building = mongoose.model('Building', buildingSchema);

async function checkMetalRefineries() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all buildings at the specific base
    const baseCoord = '2:2:11:7'; // Your base coordinate
    
    console.log(`\nChecking all buildings at base ${baseCoord}...`);
    
    const allBuildings = await Building.find({ locationCoord: baseCoord }).lean();
    
    console.log(`\nTotal buildings at base: ${allBuildings.length}`);
    
    // Group by catalogKey and buildingType
    const byType = {};
    const noCatalogKey = [];
    
    for (const building of allBuildings) {
      const key = building.catalogKey || building.buildingType || 'UNKNOWN';
      
      if (!building.catalogKey) {
        noCatalogKey.push(building);
      }
      
      if (!byType[key]) {
        byType[key] = [];
      }
      byType[key].push(building);
    }
    
    console.log('\nBuildings grouped by type:');
    for (const [type, buildings] of Object.entries(byType)) {
      console.log(`\n${type}: ${buildings.length} building(s)`);
      for (const b of buildings) {
        console.log(`  - Level ${b.level}, catalogKey: "${b.catalogKey}", buildingType: "${b.buildingType}", active: ${b.isActive}, ID: ${b._id}`);
      }
    }
    
    if (noCatalogKey.length > 0) {
      console.log(`\n⚠️  Found ${noCatalogKey.length} buildings without catalogKey:`);
      for (const b of noCatalogKey) {
        console.log(`  - buildingType: "${b.buildingType}", level: ${b.level}, ID: ${b._id}`);
      }
    }
    
    // Specifically look for metal refineries
    console.log('\n=== METAL REFINERIES CHECK ===');
    
    // Check by catalogKey
    const byKey = await Building.find({ 
      locationCoord: baseCoord,
      catalogKey: 'metal_refineries'
    }).lean();
    
    console.log(`\nMetal refineries by catalogKey='metal_refineries': ${byKey.length}`);
    let totalLevelByKey = 0;
    for (const b of byKey) {
      totalLevelByKey += b.level || 1;
      console.log(`  - Level ${b.level}, ID: ${b._id}`);
    }
    console.log(`Total levels (by catalogKey): ${totalLevelByKey}`);
    
    // Check by buildingType
    const byBuildingType = await Building.find({ 
      locationCoord: baseCoord,
      buildingType: { $regex: /metal.*refiner/i }
    }).lean();
    
    console.log(`\nMetal refineries by buildingType (regex): ${byBuildingType.length}`);
    let totalLevelByType = 0;
    for (const b of byBuildingType) {
      totalLevelByType += b.level || 1;
      console.log(`  - Level ${b.level}, catalogKey: "${b.catalogKey}", buildingType: "${b.buildingType}", ID: ${b._id}`);
    }
    console.log(`Total levels (by buildingType): ${totalLevelByType}`);
    
    // Check for any building that might be a metal refinery
    const possibleMetalRefineries = await Building.find({
      locationCoord: baseCoord,
      $or: [
        { catalogKey: 'metal_refineries' },
        { catalogKey: { $regex: /metal/i } },
        { buildingType: { $regex: /metal/i } },
        { buildingType: 'Metal Refineries' },
        { buildingType: 'metal_refineries' }
      ]
    }).lean();
    
    console.log(`\nAll possible metal refineries (broad search): ${possibleMetalRefineries.length}`);
    let totalLevelAll = 0;
    for (const b of possibleMetalRefineries) {
      totalLevelAll += b.level || 1;
      console.log(`  - Level ${b.level}, catalogKey: "${b.catalogKey}", buildingType: "${b.buildingType}", ID: ${b._id}`);
    }
    console.log(`Total levels (all possible): ${totalLevelAll}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkMetalRefineries();