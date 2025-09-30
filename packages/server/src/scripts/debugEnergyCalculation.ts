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

async function debugEnergyCalculation() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition');
    console.log('Connected to database\n');
    
    // Get the specific base you're looking at
    const locationCoord = 'A00:00:12:02';
    
    // Find the empire that owns this location
    const location = await Location.findOne({ coord: locationCoord }).lean();
    if (!location) {
      console.log('Location not found');
      return;
    }
    
    const empire = await Empire.findOne({ userId: location.owner }).lean();
    if (!empire) {
      console.log('Empire not found');
      return;
    }
    
    console.log(`Debugging energy calculation for base: ${locationCoord}`);
    console.log(`Empire ID: ${empire._id}`);
    console.log(`Solar Energy: ${(location as any).result?.solarEnergy}`);
    console.log(`Gas Yield: ${(location as any).result?.yields?.gas}`);
    
    // Get all buildings at this base
    const buildings = await Building.find({
      empireId: empire._id,
      locationCoord
    }).lean();
    
    console.log(`\nBuildings at base (${buildings.length} total):`);
    for (const b of buildings) {
      const spec = getBuildingSpec((b as any).catalogKey as BuildingKey);
      console.log(`- ${(b as any).catalogKey}: Level ${b.level}, Active: ${b.isActive}, Energy Delta: ${spec?.energyDelta || 0}`);
    }
    
    // Calculate using the shared helper
    const activeBuildings = buildings
      .filter(b => b.isActive)
      .map(b => ({
        key: (b as any).catalogKey as string,
        level: b.level || 1,
        isActive: true
      }));
    
    const energyCalc = computeEnergyBalance({
      buildingsAtBase: activeBuildings,
      location: {
        solarEnergy: (location as any).result?.solarEnergy || 0,
        gasYield: (location as any).result?.yields?.gas || 0
      },
      includeQueuedReservations: false
    });
    
    console.log('\nShared Helper Calculation:');
    console.log(`- Baseline: +2`);
    console.log(`- Produced: ${energyCalc.produced}`);
    console.log(`- Consumed: ${energyCalc.consumed}`);
    console.log(`- Balance: ${energyCalc.balance}`);
    console.log(`- Reserved: ${energyCalc.reservedNegative}`);
    
    // Get the base stats from the service
    const baseStats = await BaseStatsService.getBaseStats(empire._id.toString(), locationCoord);
    
    console.log('\nBaseStatsService Response:');
    console.log(`- Produced: ${baseStats.energy.produced}`);
    console.log(`- Consumed: ${baseStats.energy.consumed}`);
    console.log(`- Balance: ${baseStats.energy.balance}`);
    console.log(`- Raw Balance: ${baseStats.energy.rawBalance}`);
    console.log(`- Projected Balance: ${baseStats.energy.projectedBalance}`);
    
    // Check for discrepancies
    if (baseStats.energy.balance !== energyCalc.balance) {
      console.log('\n⚠️ DISCREPANCY DETECTED!');
      console.log(`Server balance (${baseStats.energy.balance}) != Calculated balance (${energyCalc.balance})`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

// Run the debug
debugEnergyCalculation();