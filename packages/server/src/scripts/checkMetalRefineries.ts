import mongoose from 'mongoose';
import { Building } from '../models/Building';
import { Location } from '../models/Location';
import { Empire } from '../models/Empire';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkMetalRefineries() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition');
    console.log('Connected to database\n');
    
    const locationCoord = 'A00:00:12:02';
    
    // Find the empire that owns this location
    const location = await Location.findOne({ coord: locationCoord }).lean();
    const empire = await Empire.findOne({ userId: location!.owner }).lean();
    
    // Get all metal refineries at this base
    const metalRefineries = await Building.find({
      empireId: empire!._id,
      locationCoord,
      catalogKey: 'metal_refineries',
      isActive: true
    }).lean();
    
    console.log(`Found ${metalRefineries.length} active metal refineries at ${locationCoord}:\n`);
    
    let totalMetalRefineryConsumption = 0;
    for (const mr of metalRefineries) {
      console.log(`- Metal Refinery: Level ${mr.level}, Energy: -${mr.level}`);
      totalMetalRefineryConsumption += mr.level;
    }
    
    console.log(`\nTotal Metal Refinery Energy Consumption: -${totalMetalRefineryConsumption}`);
    
    // Check all energy consumers
    console.log('\n=== ALL ENERGY CONSUMERS ===');
    const allBuildings = await Building.find({
      empireId: empire!._id,
      locationCoord,
      isActive: true
    }).lean();
    
    let totalConsumption = 0;
    for (const b of allBuildings) {
      const catalogKey = (b as any).catalogKey;
      if (!catalogKey || catalogKey === 'undefined') continue;
      
      // Manual check for energy consumers
      if (catalogKey === 'metal_refineries') {
        totalConsumption += b.level * 1;
        console.log(`- ${catalogKey} L${b.level}: -${b.level}`);
      } else if (catalogKey === 'research_labs') {
        totalConsumption += b.level * 1;
        console.log(`- ${catalogKey} L${b.level}: -${b.level}`);
      } else if (catalogKey === 'shipyards') {
        totalConsumption += b.level * 1;
        console.log(`- ${catalogKey} L${b.level}: -${b.level}`);
      } else if (catalogKey === 'robotic_factories') {
        totalConsumption += b.level * 1;
        console.log(`- ${catalogKey} L${b.level}: -${b.level}`);
      }
    }
    
    console.log(`\nTotal Energy Consumption: -${totalConsumption}`);
    console.log(`Expected from screenshot: -28`);
    console.log(`Discrepancy: ${totalConsumption - 28}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

// Run the check
checkMetalRefineries();