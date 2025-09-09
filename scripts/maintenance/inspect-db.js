// Script to inspect current database state
// This will help us decide whether to clean or work with existing data

console.log('🔍 Inspecting Attrition database...\n');

// Use mongoose since we already have it
const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://calmncollect:Elemnohpee11@cluster0.tglhx.mongodb.net/attrition?retryWrites=true&w=majority&appName=Cluster0";

async function inspectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = mongoose.connection.db;
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📚 Collections found: ${collections.length}`);
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // Check key collections
    console.log('\n🔢 Document counts:');
    
    for (const collection of collections) {
      try {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`  ${collection.name}: ${count} documents`);
      } catch (e) {
        console.log(`  ${collection.name}: Error counting - ${e.message}`);
      }
    }
    
    // Check for locations (planets)
    if (collections.some(c => c.name === 'locations')) {
      console.log('\n🪐 Planet analysis:');
      const locations = db.collection('locations');
      
      const totalPlanets = await locations.countDocuments({ type: 'planet' });
      const ownedPlanets = await locations.countDocuments({ type: 'planet', owner: { $ne: null } });
      const freePlanets = totalPlanets - ownedPlanets;
      
      console.log(`  Total planets: ${totalPlanets}`);
      console.log(`  Owned planets: ${ownedPlanets}`);
      console.log(`  Free planets: ${freePlanets}`);
      
      if (freePlanets > 0) {
        // Show a sample free planet
        const sampleFreePlanet = await locations.findOne({ type: 'planet', owner: null });
        if (sampleFreePlanet) {
          console.log(`  Sample free planet: ${sampleFreePlanet.coord}`);
        }
      }
    }
    
    // Check users
    if (collections.some(c => c.name === 'users')) {
      console.log('\n👥 User analysis:');
      const users = db.collection('users');
      
      const totalUsers = await users.countDocuments();
      const adminUsers = await users.countDocuments({ role: 'admin' });
      
      console.log(`  Total users: ${totalUsers}`);
      console.log(`  Admin users: ${adminUsers}`);
      
      if (totalUsers > 0) {
        const userList = await users.find({}, { projection: { email: 1, username: 1, role: 1 } }).toArray();
        console.log('  Users:');
        userList.forEach(user => {
          console.log(`    - ${user.email} (${user.username}) [${user.role || 'user'}]`);
        });
      }
    }
    
    console.log('\n🎯 Recommendation:');
    const locations = db.collection('locations');
    const freePlanets = await locations.countDocuments({ type: 'planet', owner: null });
    
    if (freePlanets > 0) {
      console.log('✅ Free planets available - registration should work!');
      console.log('❓ Issue might be elsewhere. Let\'s investigate the registration logic.');
    } else {
      console.log('❌ No free planets - all are owned or universe needs regeneration');
      console.log('💡 Recommend: Clean slate and regenerate universe');
    }
    
  } catch (error) {
    console.error('❌ Database inspection failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
}

inspectDatabase();
