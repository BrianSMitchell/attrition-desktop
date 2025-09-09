// Test admin login by directly using the User model and auth logic

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const MONGODB_URI = "mongodb+srv://calmncollect:Elemnohpee11@cluster0.tglhx.mongodb.net/attrition?retryWrites=true&w=majority&appName=Cluster0";

// Copy the User schema from your codebase
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  gameProfile: {
    empireId: String,
    credits: { type: Number, default: 100 },
    experience: { type: Number, default: 0 },
    startingCoordinate: String
  },
  lastLogin: { type: Date, default: Date.now }
}, { timestamps: true });

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  return userObject;
};

const User = mongoose.model('User', userSchema);

async function testAdminLogin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find admin user
    const admin = await User.findOne({ email: 'admin@attrition.com' }).select('+passwordHash');
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('👤 Admin found:', admin.username, '| Role:', admin.role);
    
    // Test password
    const isValidPassword = await admin.comparePassword('AdminPassword123!');
    console.log('🔑 Password valid:', isValidPassword);
    
    if (isValidPassword) {
      // Update last login
      admin.lastLogin = new Date();
      await admin.save();
      
      // Generate token (copy from your auth middleware)
      const payload = {
        userId: admin._id.toString(),
        email: admin.email,
        role: admin.role,
        type: 'access'
      };
      
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
        expiresIn: '1h'
      });
      
      console.log('✅ LOGIN SIMULATION SUCCESSFUL');
      console.log('🔑 Generated token (first 50 chars):', token.substring(0, 50) + '...');
      
      // Test the token by making a request
      return token;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testAdminLogin();
