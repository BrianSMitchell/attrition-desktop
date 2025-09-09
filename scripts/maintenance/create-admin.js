// Script to create an admin user directly in the database
// This bypasses the registration endpoint that requires planets

console.log('👑 CREATING ADMIN USER');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const MONGODB_URI = "mongodb+srv://calmncollect:Elemnohpee11@cluster0.tglhx.mongodb.net/attrition?retryWrites=true&w=majority&appName=Cluster0";

async function createAdminUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = mongoose.connection.db;
    const users = db.collection('users');
    
    // Admin user data
    const adminEmail = 'admin@attrition.com';
    const adminUsername = 'AdminCommander';
    const adminPassword = 'AdminPassword123!';
    
    // Check if admin already exists
    const existingAdmin = await users.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:', adminEmail);
      return;
    }
    
    // Hash the password (using same method as the User model)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    // Create admin user document
    const adminUser = {
      email: adminEmail,
      username: adminUsername,
      passwordHash: hashedPassword,
      role: 'admin',  // This is the key part!
      gameProfile: {
        credits: 100,
        experience: 0
      },
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert admin user
    const result = await users.insertOne(adminUser);
    
    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`👤 Username: ${adminUsername}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`👑 Role: admin`);
    console.log(`🆔 ID: ${result.insertedId}`);
    
    console.log('\\n🎯 You can now use this admin account to:');
    console.log('  1. Login via /api/auth/login');
    console.log('  2. Generate universe via /api/universe/generate');
    console.log('  3. Create regular player accounts');
    
  } catch (error) {
    console.error('❌ Admin creation failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\\n✅ Database connection closed');
  }
}

createAdminUser();
