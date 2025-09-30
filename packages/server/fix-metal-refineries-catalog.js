const mongoose = require('mongoose');
require('dotenv').config({ path: './packages/server/.env' });

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/attrition';

// Define the Building schema
const buildingSchema = new mongoose.Schema({
  empireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empire', required: true },
  locationCoord: { type: String, required: true },
  catalogKey: { type: String },
  buildingType: { type: String },
  level: { type: Number, default: 1 },
  isActive: { type: Boolean, default: false },
  pendingUpgrade: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'buildings' });

const Building = mongoose.model('Building', buildingSchema);

async function fixMetalRefineries() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const baseCoord = '2:2:11:7'; // Your base coordinate

    // Find buildings that are likely metal refineries but have no catalogKey
    const results = await Building.updateMany(
      {
        locationCoord: baseCoord,
        catalogKey: { $exists: false },
        $or: [
          { buildingType: 'Metal Refineries' },
          { buildingType: 'metal_refineries' },
          { buildingType: { $regex: /metal.*refiner/i } }
        ]
      },
      { 
        $set: { catalogKey: 'metal_refineries' },
        $currentDate: { updatedAt: true } 
      }
    );

    console.log(`\nUpdate operation completed for base ${baseCoord}.`);
    console.log(`- Matched: ${results.matchedCount}`);
    console.log(`- Modified: ${results.modifiedCount}`);

    if (results.modifiedCount > 0) {
      console.log('\nSuccessfully updated catalogKey for orphaned metal refineries.');
    } else if (results.matchedCount > 0) {
      console.log('\nFound matching buildings, but they already had the correct catalogKey.');
    } else {
      console.log('\nNo orphaned metal refineries found for this base.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixMetalRefineries();