// Temporary script to promote user to admin
// Run this with: node temp-admin-script.js

const { MongoClient } = require('mongodb');

const MONGODB_URI = "mongodb+srv://calmncollect:Elemnohpee11@cluster0.tglhx.mongodb.net/attrition?retryWrites=true&w=majority&appName=Cluster0";

async function promoteToAdmin() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('attrition');
    const users = db.collection('users');
    
    // Find and promote the admin user
    const result = await users.updateOne(
      { email: 'admin@attrition.com' },
      { $set: { role: 'admin' } }
    );
    
    if (result.matchedCount > 0) {
      console.log('✅ Successfully promoted admin@attrition.com to admin role');
      
      // Verify the change
      const adminUser = await users.findOne({ email: 'admin@attrition.com' });
      console.log('✅ Verification - User role:', adminUser?.role);
    } else {
      console.log('❌ User not found: admin@attrition.com');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('✅ Connection closed');
  }
}

promoteToAdmin();
