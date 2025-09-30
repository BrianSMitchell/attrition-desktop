import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { EconomyService } from '../src/services/economyService';

dotenv.config();

async function debugMetalRefineries() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('=== DEBUGGING METAL REFINERIES ECONOMY ===');
    
    const empireId = '68c21deb375bbf773d02005e'; // razgak
    
    console.log('\nTesting structures economy calculation...');
    const structuresEconomy = await EconomyService.computeStructuresEconomy(empireId);
    
    console.log(`\nFinal structures economy: ${structuresEconomy} credits/hour`);
    
    // Also test the full economy breakdown
    console.log('\n=== FULL ECONOMY BREAKDOWN ===');
    const fullEconomy = await EconomyService.computeEmpireEconomy(empireId);
    console.log('Full economy breakdown:', fullEconomy);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugMetalRefineries();