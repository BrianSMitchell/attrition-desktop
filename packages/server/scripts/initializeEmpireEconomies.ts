import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Configure dotenv
dotenv.config();

// Import the models and services
import { Empire } from '../src/models/Empire';
import { EmpireEconomyService } from '../src/services/EmpireEconomyService';

async function initializeEmpireEconomies() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to database');

    // Get all empires
    const empires = await Empire.find();
    console.log(`Found ${empires.length} empires`);

    if (empires.length === 0) {
      console.log('No empires found in database');
      return;
    }

    // Initialize cached economy for each empire
    for (const empire of empires) {
      console.log(`\nProcessing empire: ${empire.name} (${empire._id})`);
      
      try {
        // Update the cached economy
        await EmpireEconomyService.updateEmpireEconomy((empire._id as mongoose.Types.ObjectId).toString());
        console.log(`✓ Updated cached economy for ${empire.name}`);
        
        // Fetch the updated empire to see the results
        const updatedEmpire = await Empire.findById(empire._id);
        if (updatedEmpire) {
          console.log(`  Economy per hour: ${updatedEmpire.economyPerHour || 0} credits/hour`);
          
          // Initialize credits if they don't exist
          if (typeof updatedEmpire.resources.credits === 'undefined' || updatedEmpire.resources.credits === null) {
            updatedEmpire.resources.credits = 10000; // Starting credits
            await updatedEmpire.save();
            console.log(`  Initialized credits to ${updatedEmpire.resources.credits}`);
          } else {
            console.log(`  Current credits: ${updatedEmpire.resources.credits}`);
          }
        }
        
      } catch (error: any) {
        console.error(`✗ Failed to update empire ${empire.name}:`, error.message);
      }
    }

    console.log('\n✓ Empire economy initialization completed');

  } catch (error) {
    console.error('Initialization failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

if (require.main === module) {
  initializeEmpireEconomies().then(() => {
    console.log('Initialization script finished');
    process.exit(0);
  }).catch(error => {
    console.error('Initialization script error:', error);
    process.exit(1);
  });
}

export default initializeEmpireEconomies;