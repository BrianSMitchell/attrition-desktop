import mongoose from 'mongoose';
import { User } from '../models/User';
import { Empire } from '../models/Empire';
import { connectDatabase } from '../config/database';

async function verifyCreditsForPlayer(playerId: string): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to MongoDB');
    
    // Find the user by ID
    const user = await User.findById(playerId);
    
    if (!user) {
      console.log(`❌ User with ID ${playerId} not found`);
      return;
    }
    
    console.log(`📧 Found user: ${user.email} (ID: ${user._id})`);
    console.log(`👤 Username: ${user.username || 'N/A'}`);
    
    // Find the user's empire
    const empire = await Empire.findOne({ userId: user._id });
    
    if (!empire) {
      console.log('❌ No empire found for this user');
      return;
    }
    
    console.log(`🏰 Found empire: ${empire.name} (ID: ${empire._id})`);
    console.log(`💰 Current credits: ${empire.resources?.credits || 0}`);
    console.log(`📊 Other resources:`);
    console.log(`   ⚡ Energy: ${empire.resources?.energy || 0}`);
    console.log(`📈 Economy per hour: ${empire.economyPerHour || 0}`);
    console.log(`🏭 Base count: ${empire.baseCount || 0}`);
    console.log(`📅 Last updated: ${empire.updatedAt}`);
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Get player ID from command line argument or use the specified ID
const playerId = process.argv[2] || '68ded6351ea5d2a1488c08cf';

console.log(`🔍 Verifying credits for player ID: ${playerId}`);

// Run the script
verifyCreditsForPlayer(playerId).catch(console.error);