#!/usr/bin/env ts-node

import mongoose from 'mongoose';
import { EmpireEconomyService } from '../services/empireEconomyService';

async function initializeEmpireEconomies() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Recalculate all empire economies
    console.log('🚀 Initializing empire economy caches...');
    await EmpireEconomyService.recalculateAllEmpires();
    
    console.log('✅ Empire economy initialization complete!');
    
  } catch (error) {
    console.error('❌ Error initializing empire economies:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  initializeEmpireEconomies();
}