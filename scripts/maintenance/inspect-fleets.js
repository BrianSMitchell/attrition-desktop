// Script to inspect fleets in database
console.log('🚢 Inspecting fleets in Attrition database...\n');

const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://calmncollect:Elemnohpee11@cluster0.tglhx.mongodb.net/attrition?retryWrites=true&w=majority&appName=Cluster0";

async function inspectFleets() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = mongoose.connection.db;
    
    // Check if fleets collection exists
    const collections = await db.listCollections().toArray();
    const fleetsExists = collections.some(c => c.name === 'fleets');
    
    if (!fleetsExists) {
      console.log('❌ No fleets collection found in database');
      return;
    }
    
    const fleets = db.collection('fleets');
    const totalFleets = await fleets.countDocuments();
    
    console.log(`\n📊 Fleet Statistics:`);
    console.log(`  Total fleets: ${totalFleets}`);
    
    if (totalFleets > 0) {
      // Get sample fleets
      const sampleFleets = await fleets.find({}).limit(5).toArray();
      
      console.log('\n🚢 Sample Fleets:');
      for (const fleet of sampleFleets) {
        console.log(`\n  Fleet ID: ${fleet._id}`);
        console.log(`  Name: ${fleet.name || 'Unnamed'}`);
        console.log(`  Location: ${fleet.locationCoord || 'No location'}`);
        console.log(`  Empire ID: ${fleet.empireId || 'No empire'}`);
        console.log(`  Size: ${fleet.sizeCredits || 0} credits`);
        
        // Check if fleet has units
        if (fleet.units && Array.isArray(fleet.units)) {
          console.log(`  Units: ${fleet.units.length} types`);
          fleet.units.forEach(u => {
            console.log(`    - ${u.unitKey}: ${u.count || 0}`);
          });
        } else {
          console.log(`  Units: None or invalid format`);
        }
      }
      
      // Check for empires
      const empires = db.collection('empires');
      const empireCount = await empires.countDocuments();
      console.log(`\n🏰 Empire count: ${empireCount}`);
      
      if (empireCount > 0) {
        const sampleEmpires = await empires.find({}).limit(3).toArray();
        console.log('\n🏰 Sample Empires:');
        for (const empire of sampleEmpires) {
          console.log(`  Empire ID: ${empire._id}`);
          console.log(`  Name: ${empire.name || 'Unnamed'}`);
          
          // Count fleets for this empire
          const empireFleetCount = await fleets.countDocuments({ empireId: empire._id });
          console.log(`  Fleets: ${empireFleetCount}\n`);
        }
      }
      
      // Check for fleet movements
      const fleetMovements = db.collection('fleetmovements');
      const movementCount = await fleetMovements.countDocuments();
      console.log(`\n✈️ Fleet movements: ${movementCount}`);
      
      if (movementCount > 0) {
        const sampleMovements = await fleetMovements.find({}).limit(3).toArray();
        console.log('\n✈️ Sample Fleet Movements:');
        for (const movement of sampleMovements) {
          console.log(`\n  Movement ID: ${movement._id}`);
          console.log(`  Fleet ID: ${movement.fleetId}`);
          console.log(`  Status: ${movement.status}`);
          console.log(`  Origin: ${movement.originCoord}`);
          console.log(`  Destination: ${movement.destinationCoord}`);
          console.log(`  ETA: ${movement.estimatedArrivalTime}`);
        }
      }
    } else {
      console.log('\n❌ No fleets found in database');
      console.log('💡 You may need to create fleets first through the unit production system');
    }
    
  } catch (error) {
    console.error('❌ Fleet inspection failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
}

inspectFleets();