import { ENV_VARS } from '../../../shared/src/constants/env-vars';

require('dotenv').config();
const mongoose = require('mongoose');

async function migrateData() {
  console.log('Starting migration from space-empire-mmo to attrition database...');
  
  // Connect to legacy database
  const legacyConn = mongoose.createConnection('mongodb://localhost:27017/space-empire-mmo');
  
  // Connect to current database
  const currentConn = mongoose.createConnection(process.env[ENV_VARS.MONGODB_URI]);
  
  try {
    // Wait for connections
    await Promise.all([
      new Promise(resolve => legacyConn.once('open', resolve)),
      new Promise(resolve => currentConn.once('open', resolve))
    ]);
    
    console.log('Connected to both databases');
    
    // Get legacy empires
    const legacyEmpires = await legacyConn.db.collection('empires').find().toArray();
    console.log(`Found ${legacyEmpires.length} empires in legacy database`);
    
    // Get current empires
    const currentEmpires = await currentConn.db.collection('empires').find().toArray();
    console.log(`Found ${currentEmpires.length} empires in current database`);
    
    if (legacyEmpires.length > 0) {
      // Migrate empires if current database has fewer
      if (currentEmpires.length < legacyEmpires.length) {
        console.log('Migrating empires...');
        await currentConn.db.collection('empires').insertMany(legacyEmpires);
        console.log(`Migrated ${legacyEmpires.length} empires`);
      } else {
        console.log('Current database already has equal or more empires, skipping migration');
      }
    }
    
    // Also migrate other essential collections if they're missing
    const essentialCollections = ['colonies', 'fleets', 'fleetmovements', 'planets'];
    
    for (const collectionName of essentialCollections) {
      const legacyData = await legacyConn.db.collection(collectionName).find().toArray();
      const currentData = await currentConn.db.collection(collectionName).find().toArray();
      
      console.log(`${collectionName}: legacy=${legacyData.length}, current=${currentData.length}`);
      
      if (legacyData.length > 0 && currentData.length === 0) {
        console.log(`Migrating ${collectionName}...`);
        await currentConn.db.collection(collectionName).insertMany(legacyData);
        console.log(`Migrated ${legacyData.length} ${collectionName} records`);
      }
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
  migrateData().then(() => {
    console.log('Migration script finished');
    process.exit(0);
  }).catch(error => {
    console.error('Migration script error:', error);
    process.exit(1);
  });
}

module.exports = migrateData;