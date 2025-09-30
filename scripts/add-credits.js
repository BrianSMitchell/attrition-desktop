const { MongoClient } = require('mongodb');

async function addCreditsToAdmin() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Find the admin user
    const adminUser = await db.collection('users').findOne({ 
      email: 'admin@attrition.dev' 
    });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log(`📧 Found admin user: ${adminUser.email} (ID: ${adminUser._id})`);
    
    // Find the admin's empire
    const empire = await db.collection('empires').findOne({ 
      userId: adminUser._id 
    });
    
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
    
    const result = await db.collection('empires').updateOne(
      { _id: empire._id },
      { 
        $set: { 
          'resources.credits': newCredits,
          updatedAt: new Date()
        } 
      }
    );
    
    if (result.modifiedCount === 1) {
      console.log(`✅ Successfully added ${creditsToAdd.toLocaleString()} credits!`);
      console.log(`💰 New credit balance: ${newCredits.toLocaleString()}`);
    } else {
      console.log('❌ Failed to update credits');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addCreditsToAdmin().catch(console.error);
