import mongoose from 'mongoose';
import { Building } from '../models/Building';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkPendingUpgrades() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition');
    console.log('Connected to database');
    
    // Find buildings with pendingUpgrade flag
    const pendingBuildings = await Building.find({ pendingUpgrade: true }).lean();
    
    console.log(`\nFound ${pendingBuildings.length} buildings with pendingUpgrade flag:`);
    
    for (const building of pendingBuildings) {
      console.log({
        id: building._id.toString(),
        catalogKey: building.catalogKey,
        level: building.level,
        isActive: building.isActive,
        pendingUpgrade: building.pendingUpgrade,
        constructionStarted: building.constructionStarted,
        constructionCompleted: building.constructionCompleted,
        locationCoord: building.locationCoord
      });
    }
    
    // Check for buildings with constructionCompleted but still inactive
    const inProgressBuildings = await Building.find({ 
      constructionCompleted: { $exists: true, $ne: null },
      isActive: false
    }).lean();
    
    console.log(`\nFound ${inProgressBuildings.length} buildings with constructionCompleted but inactive:`);
    
    for (const building of inProgressBuildings) {
      const completedAt = building.constructionCompleted ? new Date(building.constructionCompleted) : null;
      const isOverdue = completedAt && completedAt < new Date();
      
      console.log({
        id: building._id.toString(),
        catalogKey: building.catalogKey,
        constructionCompleted: building.constructionCompleted,
        isActive: building.isActive,
        isOverdue,
        pendingUpgrade: building.pendingUpgrade
      });
    }
    
    // Summary of potential issues
    const overdueConstructions = inProgressBuildings.filter(b => {
      const completedAt = b.constructionCompleted ? new Date(b.constructionCompleted) : null;
      return completedAt && completedAt < new Date();
    });
    
    console.log('\n=== SUMMARY ===');
    console.log(`Buildings with pendingUpgrade=true: ${pendingBuildings.length}`);
    console.log(`Buildings with completed construction but still inactive: ${overdueConstructions.length}`);
    console.log(`Total potential issues: ${pendingBuildings.length + overdueConstructions.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

// Run the check
checkPendingUpgrades();