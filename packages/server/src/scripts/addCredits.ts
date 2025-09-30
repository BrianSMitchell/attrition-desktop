import mongoose from 'mongoose';
import { User } from '../models/User';
import { Empire } from '../models/Empire';
import { connectDatabase } from '../config/database';

async function addCreditsToAdmin(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to MongoDB');
    
    // Find the admin user
    const adminUser = await User.findOne({ email: 'admin@attrition.dev' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log(`📧 Found admin user: ${adminUser.email} (ID: ${adminUser._id})`);
    
    // Find the admin's empire
    const empire = await Empire.findOne({ userId: adminUser._id });
    
    if (!empire) {
      console.log('❌ Admin empire not found');
      return;
    }
    
    console.log(`🏰 Found admin empire: ${empire.name} (ID: ${empire._id})`);
    console.log(`💰 Current credits: ${empire.resources?.credits || 0}`);
    
    // Add 10,000 credits
    const creditsToAdd = 10000;
    const currentCredits = empire.resources?.credits || 0;
    const newCredits = currentCredits + creditsToAdd;
    
    // Update the empire's credits
    empire.resources.credits = newCredits;
    empire.updatedAt = new Date();
    
    await empire.save();
    
    console.log(`✅ Successfully added ${creditsToAdd.toLocaleString()} credits!`);
    console.log(`💰 New credit balance: ${newCredits.toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addCreditsToAdmin().catch(console.error);
