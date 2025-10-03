/**
 * Advanced Citizens Database Diagnostic
 * 
 * This script connects directly to MongoDB to check citizen generation
 * Run from packages/server directory: node check-citizens-db.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Colony schema (simplified)
const ColonySchema = new mongoose.Schema({
  empireId: mongoose.Schema.Types.ObjectId,
  name: String,
  population: { type: Number, default: 0 },
  milliCitizens: { type: Number, default: 0 },
  lastCitizenUpdate: { type: Date, default: Date.now },
  buildings: [{
    type: String,
    level: Number,
    isActive: { type: Boolean, default: true },
    completedAt: Date
  }]
}, { timestamps: true });

const Colony = mongoose.model('Colony', ColonySchema);

// Empire schema (simplified)
const EmpireSchema = new mongoose.Schema({
  name: String,
  userId: mongoose.Schema.Types.ObjectId,
  population: { type: Number, default: 0 }
}, { timestamps: true });

const Empire = mongoose.model('Empire', EmpireSchema);

async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition';
  console.log('🔌 Connecting to MongoDB:', mongoUri);
  
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

function getBuildingCitizenGeneration(buildingType, level) {
  const citizenBuildings = {
    'Urban Structures': 3,    // 3 citizens per hour per level
    'Command Center': 2,      // 2 citizens per hour per level
    'Orbital Base': 1,        // 1 citizen per hour per level
    'Research Facility': 1    // 1 citizen per hour per level (if implemented)
  };
  
  return (citizenBuildings[buildingType] || 0) * level;
}

async function checkCitizenData() {
  console.log('\n🏛️ Checking citizen generation data...\n');
  
  try {
    // Get all empires
    const empires = await Empire.find({}).select('name population').lean();
    console.log(`📊 Found ${empires.length} empires`);
    
    for (const empire of empires) {
      console.log(`\n🏰 Empire: ${empire.name} (ID: ${empire._id})`);
      console.log(`   Empire Population: ${empire.population}`);
      
      // Get colonies for this empire
      const colonies = await Colony.find({ empireId: empire._id }).lean();
      console.log(`   Colonies: ${colonies.length}`);
      
      let totalExpectedGeneration = 0;
      
      for (const colony of colonies) {
        console.log(`\n   🏙️  Colony: ${colony.name}`);
        console.log(`        Population: ${colony.population}`);
        console.log(`        Milli-citizens: ${colony.milliCitizens}`);
        console.log(`        Last update: ${colony.lastCitizenUpdate}`);
        
        // Calculate time since last update
        const timeSinceUpdate = Date.now() - new Date(colony.lastCitizenUpdate).getTime();
        const minutesSinceUpdate = Math.floor(timeSinceUpdate / (1000 * 60));
        console.log(`        Minutes since update: ${minutesSinceUpdate}`);
        
        // Analyze buildings
        let colonyGeneration = 0;
        const activeBuildings = colony.buildings?.filter(b => b.isActive && b.completedAt) || [];
        
        console.log(`        Active Buildings: ${activeBuildings.length}`);
        for (const building of activeBuildings) {
          const generation = getBuildingCitizenGeneration(building.type, building.level);
          colonyGeneration += generation;
          
          if (generation > 0) {
            console.log(`          ${building.type} L${building.level}: ${generation} citizens/hour`);
          }
        }
        
        totalExpectedGeneration += colonyGeneration;
        console.log(`        Total generation: ${colonyGeneration} citizens/hour`);
        
        // Check if update is recent
        const isRecentlyUpdated = minutesSinceUpdate < 5;
        const statusIcon = isRecentlyUpdated ? '🟢' : '🟡';
        console.log(`        Status: ${statusIcon} ${isRecentlyUpdated ? 'Recently updated' : 'May need update'}`);
      }
      
      console.log(`\n   📈 Total expected generation: ${totalExpectedGeneration} citizens/hour`);
      
      // Check for recent colonies
      const recentColonies = await Colony.find({ 
        empireId: empire._id, 
        lastCitizenUpdate: { 
          $gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      }).lean();
      
      console.log(`   🔄 Recently updated colonies: ${recentColonies.length}/${colonies.length}`);
      
      if (recentColonies.length > 0) {
        console.log(`   ✅ Game loop appears to be working!`);
      } else if (colonies.length > 0) {
        console.log(`   ⚠️  No recent citizen updates detected`);
        console.log(`       Check if game loop is running and processing citizen updates`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error checking citizen data:', error.message);
  }
}

async function checkGameLoopStatus() {
  console.log('\n🔄 Checking for game loop activity...');
  
  try {
    // Look for colonies updated in the last 10 minutes
    const recentUpdates = await Colony.find({
      lastCitizenUpdate: {
        $gte: new Date(Date.now() - 10 * 60 * 1000)
      }
    }).select('name lastCitizenUpdate empireId').populate('empireId', 'name').lean();
    
    if (recentUpdates.length > 0) {
      console.log(`✅ Found ${recentUpdates.length} colonies with recent citizen updates:`);
      recentUpdates.forEach(colony => {
        const minutesAgo = Math.floor((Date.now() - new Date(colony.lastCitizenUpdate)) / (1000 * 60));
        console.log(`   ${colony.name}: ${minutesAgo} minutes ago`);
      });
    } else {
      console.log('⚠️  No recent citizen updates found in the last 10 minutes');
      console.log('   This could mean:');
      console.log('   1. Game loop is not running');
      console.log('   2. No colonies have citizen-generating buildings');
      console.log('   3. Database is not being updated');
    }
    
  } catch (error) {
    console.log('❌ Error checking game loop status:', error.message);
  }
}

async function main() {
  console.log('🎮 Advanced Citizens Database Diagnostic\n');
  
  const connected = await connectToDatabase();
  if (!connected) {
    console.log('\n💡 Make sure MongoDB is running and connection details are correct');
    process.exit(1);
  }
  
  await checkCitizenData();
  await checkGameLoopStatus();
  
  console.log('\n🔍 Diagnostic Summary:');
  console.log('1. If colonies show recent updates → Game loop is working');
  console.log('2. If population is 0 but milli-citizens > 1000 → Citizens should appear soon');
  console.log('3. If no recent updates → Check game server and game loop');
  console.log('4. If expected generation > 0 but no changes → Check building activation');
  
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from database');
}

// Run the main function
main().catch(console.error);
