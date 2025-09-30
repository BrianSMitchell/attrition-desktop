import mongoose from 'mongoose';
import { BuildingValidation } from '../services/buildingValidation';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * This script demonstrates how to add building validation to your game loop
 * You should integrate the BuildingValidation.validatePendingUpgrades() call
 * into your existing game loop or cron job
 */
async function runValidation() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition');
    console.log('Connected to database');
    
    console.log('Running building validation...');
    
    // Run validation for all buildings
    const result = await BuildingValidation.validatePendingUpgrades();
    
    console.log(`\nValidation Results:`);
    console.log(`- Issues found: ${result.issues.length}`);
    console.log(`- Issues fixed: ${result.fixed}`);
    
    if (result.issues.length > 0) {
      console.log('\nIssues fixed:');
      for (const issue of result.issues) {
        console.log(`  - Building ${issue.id}: ${issue.issue}`);
      }
    }
    
    console.log('\n✓ Building validation complete');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

// Run the validation
runValidation();

/**
 * Integration Guide:
 * 
 * Add this to your game loop (e.g., in gameLoop.ts):
 * 
 * import { BuildingValidation } from './services/buildingValidation';
 * 
 * // In your game loop tick function:
 * async function gameLoopTick() {
 *   // ... existing code ...
 *   
 *   // Run building validation every 10 ticks (adjust as needed)
 *   if (tickCount % 10 === 0) {
 *     try {
 *       await BuildingValidation.validatePendingUpgrades();
 *     } catch (error) {
 *       console.error('[GameLoop] Building validation error:', error);
 *     }
 *   }
 *   
 *   // ... rest of game loop ...
 * }
 */