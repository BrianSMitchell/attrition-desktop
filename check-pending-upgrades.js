// Quick script to check for buildings with pendingUpgrade flag
const mongoose = require('mongoose');
require('dotenv').config();

async function checkPendingUpgrades() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition');
    
    const Building = mongoose.model('Building', new mongoose.Schema({
      empireId: mongoose.Schema.Types.ObjectId,
      locationCoord: String,
      catalogKey: String,
      level: Number,
      isActive: Boolean,
      pendingUpgrade: Boolean,
      constructionStarted: Date,
      constructionCompleted: Date
    }));
    
    const pendingBuildings = await Building.find({ pendingUpgrade: true });
    
    console.log(`Found ${pendingBuildings.length} buildings with pendingUpgrade flag:`);
    
    for (const building of pendingBuildings) {
      console.log({
        id: building._id,
        catalogKey: building.catalogKey,
        level: building.level,
        isActive: building.isActive,
        pendingUpgrade: building.pendingUpgrade,
        constructionStarted: building.constructionStarted,
        constructionCompleted: building.constructionCompleted,
        locationCoord: building.locationCoord
      });
    }
    
    // Also check for any buildings with constructionCompleted but still inactive
    const inProgressBuildings = await Building.find({ 
      constructionCompleted: { $exists: true, $ne: null },
      isActive: false
    });
    
    console.log(`\nFound ${inProgressBuildings.length} buildings with constructionCompleted but inactive:`);
    
    for (const building of inProgressBuildings) {
      console.log({
        id: building._id,
        catalogKey: building.catalogKey,
        constructionCompleted: building.constructionCompleted,
        isActive: building.isActive
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkPendingUpgrades();