/**
 * Clear Token Mismatch Users Script
 * 
 * This script helps identify users who might have device fingerprint mismatches
 * causing authentication issues. Run this to force re-authentication for affected users.
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Define User schema inline since we can't easily import TypeScript models
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  gameProfile: mongoose.Schema.Types.Mixed,
  lastTokenInvalidation: Date
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function connectDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition';
  await mongoose.connect(uri);
}

async function clearTokenMismatchUsers() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();
    console.log('Connected to database');

    // The problematic user from the logs
    const problematicUserId = '68ded6351ea5d2a1488c08cf';
    
    console.log(`Looking for user with ID: ${problematicUserId}`);
    
    const user = await User.findById(problematicUserId);
    
    if (user) {
      console.log(`Found user: ${user.username} (${user.email})`);
      console.log('Current gameProfile:', user.gameProfile);
      
      // Option 1: Force logout by updating user document (triggers token invalidation on next request)
      user.lastTokenInvalidation = new Date();
      await user.save();
      
      console.log(`✅ User ${user.username} has been flagged for token refresh`);
      console.log('They will need to log in again on their next request');
    } else {
      console.log('❌ User not found');
    }

    // Optional: Clear all user tokens if you want everyone to re-authenticate
    console.log('\nTo clear ALL user tokens, uncomment the section below');
    /*
    const result = await User.updateMany(
      {}, 
      { $set: { lastTokenInvalidation: new Date() } }
    );
    console.log(`✅ Forced re-authentication for ${result.modifiedCount} users`);
    */

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  clearTokenMismatchUsers();
}

module.exports = { clearTokenMismatchUsers };