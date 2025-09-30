import mongoose from 'mongoose';
import { BaseStatsService } from '../services/baseStatsService';
import { Building } from '../models/Building';
import { Location } from '../models/Location';
import { Empire } from '../models/Empire';
import { computeEnergyBalance, getBuildingSpec, type BuildingKey } from '@game/shared';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function analyzeEnergyDiscrepancy() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition');
    console.log('Connected to database\n');
    
    const locationCoord = 'A00:00:12:02';
    
    // Find the empire that owns this location
    const location = await Location.findOne({ coord: locationCoord }).lean();
    const empire = await Empire.findOne({ userId: location!.owner }).lean();
    
    console.log(`Analyzing energy for base: ${locationCoord}`);
    
    // Get all buildings at this base
    const buildings = await Building.find({
      empireId: empire!._id,
      locationCoord
    }).lean();
    
    // Separate analysis
    console.log('\n=== ENERGY PRODUCTION BREAKDOWN ===');
    console.log('Baseline: +2');
    
    let manualProduced = 2; // baseline
    let manualConsumed = 0;
    
    const solarEnergy = (location as any).result?.solarEnergy || 0;
    const gasYield = (location as any).result?.yields?.gas || 0;
    
    // Count each building's contribution
    for (const b of buildings) {
      if (!b.isActive) continue;
      
      const catalogKey = (b as any).catalogKey;
      if (!catalogKey || catalogKey === 'undefined') {
        console.log(`- SKIPPED: ${b._id} (no catalogKey)`);
        continue;
      }
      
      const spec = getBuildingSpec(catalogKey as BuildingKey);
      const delta = spec?.energyDelta || 0;
      const level = b.level || 1;
      
      if (catalogKey === 'solar_plants') {
        const contribution = level * solarEnergy;
        manualProduced += contribution;
        console.log(`- Solar Plants L${level}: +${contribution} (${level} × ${solarEnergy} solarEnergy)`);
      } else if (catalogKey === 'gas_plants') {
        const contribution = level * gasYield;
        manualProduced += contribution;
        console.log(`- Gas Plants L${level}: +${contribution} (${level} × ${gasYield} gasYield)`);
      } else if (delta > 0) {
        const contribution = level * delta;
        manualProduced += contribution;
        console.log(`- ${catalogKey} L${level}: +${contribution}`);
      } else if (delta < 0) {
        const contribution = level * Math.abs(delta);
        manualConsumed += contribution;
        console.log(`- ${catalogKey} L${level}: -${contribution}`);
      }
    }
    
    console.log(`\nMANUAL TOTALS:`);
    console.log(`- Produced: ${manualProduced}`);
    console.log(`- Consumed: ${manualConsumed}`);
    console.log(`- Balance: ${manualProduced - manualConsumed}`);
    
    // Now check what the modal would show
    console.log('\n=== MODAL CALCULATION (via basesService.getBaseStructures) ===');
    
    // This is what the modal uses - it filters out undefined catalogKeys
    const validBuildings = buildings.filter(b => {
      const catalogKey = (b as any).catalogKey;
      return b.isActive && catalogKey && catalogKey !== 'undefined';
    });
    
    console.log(`Valid buildings for modal: ${validBuildings.length}`);
    console.log(`Total buildings in DB: ${buildings.filter(b => b.isActive).length}`);
    console.log(`Difference: ${buildings.filter(b => b.isActive).length - validBuildings.length} buildings excluded`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

// Run the analysis
analyzeEnergyDiscrepancy();