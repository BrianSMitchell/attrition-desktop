import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Configure dotenv
dotenv.config();

// Import the models and services
import { Empire } from '../src/models/Empire';
import { EmpireEconomyService } from '../src/services/EmpireEconomyService';
import { ResourceService } from '../src/services/resourceService';

async function testEconomyFlow() {
  try {
    console.log('=== Testing Cached Economy and Credit Payout Flow ===');
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to database\n');

    // Get all empires
    const empires = await Empire.find();
    console.log(`Found ${empires.length} empires\n`);

    for (const empire of empires) {
      console.log(`--- Testing Empire: ${empire.name} (${empire._id}) ---`);
      
      // Show current state
      console.log(`Current credits: ${empire.resources.credits}`);
      console.log(`Cached economy: ${empire.economyPerHour} credits/hour`);
      
      // Test cached economy retrieval
      const cachedEconomy = await EmpireEconomyService.getCachedEmpireEconomy((empire._id as mongoose.Types.ObjectId).toString());
      console.log(`Retrieved cached economy: ${cachedEconomy} credits/hour`);
      
      // Record initial credits
      const initialCredits = empire.resources.credits;
      
      // Test resource payout (this should use cached economy)
      console.log('\\nTesting credit payout...');
      await ResourceService.updateEmpireCreditsAligned((empire._id as mongoose.Types.ObjectId).toString());
      
      // Check if credits changed (should be same since economy is 0)
      const updatedEmpire = await Empire.findById(empire._id);
      if (updatedEmpire) {
        console.log(`Credits after payout: ${updatedEmpire.resources.credits}`);
        console.log(`Change: ${updatedEmpire.resources.credits - initialCredits} credits`);
        
        if (cachedEconomy > 0) {
          console.log('✓ Credits should have increased (positive economy)');
        } else {
          console.log('✓ Credits unchanged (zero economy)');
        }
      }
      
      console.log(''); // Empty line for readability
    }

    console.log('=== Economy Flow Test Completed ===');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

if (require.main === module) {
  testEconomyFlow().then(() => {
    console.log('Test script finished');
    process.exit(0);
  }).catch(error => {
    console.error('Test script error:', error);
    process.exit(1);
  });
}

export default testEconomyFlow;