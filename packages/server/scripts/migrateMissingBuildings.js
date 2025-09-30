require('dotenv').config();
const mongoose = require('mongoose');

async function migrateMissingBuildings() {
  console.log('=== EMERGENCY BUILDINGS MIGRATION ===');
  
  // Connect to legacy database
  const legacyConn = mongoose.createConnection('mongodb://localhost:27017/space-empire-mmo');
  
  // Connect to current database
  const currentConn = mongoose.createConnection(process.env.MONGODB_URI);
  
  try {
    // Wait for connections
    await Promise.all([
      new Promise(resolve => legacyConn.once('open', resolve)),
      new Promise(resolve => currentConn.once('open', resolve))
    ]);
    
    console.log('Connected to both databases');
    
    // Get buildings from legacy
    const legacyBuildings = await legacyConn.db.collection('buildings').find().toArray();
    console.log(`Found ${legacyBuildings.length} buildings in legacy database`);
    
    // Check current buildings
    const currentBuildings = await currentConn.db.collection('buildings').find().toArray();
    console.log(`Found ${currentBuildings.length} buildings in current database`);
    
    if (legacyBuildings.length > 0 && currentBuildings.length === 0) {
      console.log('Migrating buildings...');
      await currentConn.db.collection('buildings').insertMany(legacyBuildings);
      console.log(`✅ Successfully migrated ${legacyBuildings.length} buildings!`);
      
      // Show building types migrated
      const buildingTypes = [...new Set(legacyBuildings.map(b => b.type))];
      console.log('Building types migrated:', buildingTypes);
      
      // Show empire ownership
      const empireIds = [...new Set(legacyBuildings.map(b => b.empireId.toString()))];
      console.log('Buildings for empires:', empireIds);
      
    } else if (currentBuildings.length > 0) {
      console.log('Buildings already exist in current database - no migration needed');
    } else {
      console.log('No buildings to migrate');
    }
    
    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await legacyConn.close();
    await currentConn.close();
  }
}

if (require.main === module) {
  migrateMissingBuildings().then(() => {
    console.log('Buildings migration script finished');
    process.exit(0);
  }).catch(error => {
    console.error('Migration script error:', error);
    process.exit(1);
  });
}

module.exports = migrateMissingBuildings;