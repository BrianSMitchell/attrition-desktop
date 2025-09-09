// Script to completely wipe the Attrition database clean
// This will delete ALL data and give us a fresh start

console.log('🧹 CLEANING ATTRITION DATABASE - DELETING ALL DATA');
console.log('⚠️  This will permanently delete everything!\n');

const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://calmncollect:Elemnohpee11@cluster0.tglhx.mongodb.net/attrition?retryWrites=true&w=majority&appName=Cluster0";

async function cleanDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = mongoose.connection.db;
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📚 Found ${collections.length} collections to clean:`);
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    console.log('\n🗑️  Deleting all collections...');
    
    let deletedCount = 0;
    for (const collection of collections) {
      try {
        const result = await db.collection(collection.name).deleteMany({});
        console.log(`  ✅ ${collection.name}: ${result.deletedCount} documents deleted`);
        deletedCount += result.deletedCount;
      } catch (error) {
        console.log(`  ❌ ${collection.name}: Error - ${error.message}`);
      }
    }
    
    console.log(`\n🎯 CLEANUP COMPLETE!`);
    console.log(`📊 Total documents deleted: ${deletedCount}`);
    console.log('✨ Database is now completely clean and ready for fresh data');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
}

cleanDatabase();
