require('dotenv').config();
const mongoose = require('mongoose');

async function fixMissingConstructionCompleted() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('=== FINDING BUILDINGS MISSING CONSTRUCTION COMPLETED ===');
    
    // Find all active buildings missing constructionCompleted field
    const buildingsMissingField = await mongoose.connection.db.collection('buildings').find({
      isActive: true,
      $or: [
        { constructionCompleted: { $exists: false } },
        { constructionCompleted: null },
        { constructionCompleted: undefined }
      ]
    }).toArray();
    
    console.log(`Found ${buildingsMissingField.length} active buildings missing constructionCompleted field:`);
    
    buildingsMissingField.forEach(building => {
      console.log(`- ${building.type} (Level ${building.level}) for Empire ${building.empireId}`);
      console.log(`  Created: ${building.createdAt}`);
      console.log(`  Updated: ${building.updatedAt}`);
      console.log(`  Construction Started: ${building.constructionStarted || 'undefined'}`);
      console.log(`  Construction Completed: ${building.constructionCompleted || 'undefined'}`);
      console.log('');
    });
    
    if (buildingsMissingField.length === 0) {
      console.log('✅ No buildings found missing constructionCompleted field!');
      process.exit(0);
    }
    
    console.log('=== PROPOSED FIX ===');
    console.log('For active buildings missing constructionCompleted, we will:');
    console.log('1. Set constructionCompleted = constructionStarted (if it exists)');
    console.log('2. Or set constructionCompleted = createdAt (as fallback)');
    console.log('3. This assumes they were completed since they are isActive: true');
    
    // Ask for confirmation (in a real script, but we'll auto-proceed for this demo)
    console.log('\n=== APPLYING FIX ===');
    
    let fixedCount = 0;
    
    for (const building of buildingsMissingField) {
      // Determine the completion date
      let completionDate;
      
      if (building.constructionStarted) {
        // Use construction started date if available
        completionDate = building.constructionStarted;
        console.log(`Setting constructionCompleted = constructionStarted (${completionDate}) for ${building.type} ${building._id}`);
      } else {
        // Fallback to creation date
        completionDate = building.createdAt;
        console.log(`Setting constructionCompleted = createdAt (${completionDate}) for ${building.type} ${building._id}`);
      }
      
      // Update the building
      const result = await mongoose.connection.db.collection('buildings').updateOne(
        { _id: building._id },
        { 
          $set: { 
            constructionCompleted: completionDate 
          } 
        }
      );
      
      if (result.modifiedCount === 1) {
        fixedCount++;
        console.log(`✅ Fixed ${building.type} ${building._id}`);
      } else {
        console.log(`❌ Failed to fix ${building.type} ${building._id}`);
      }
    }
    
    console.log(`\n=== FIX COMPLETED ===`);
    console.log(`Successfully fixed ${fixedCount} out of ${buildingsMissingField.length} buildings`);
    
    // Verify the fix worked
    console.log('\n=== VERIFICATION ===');
    const remainingIssues = await mongoose.connection.db.collection('buildings').find({
      isActive: true,
      $or: [
        { constructionCompleted: { $exists: false } },
        { constructionCompleted: null },
        { constructionCompleted: undefined }
      ]
    }).toArray();
    
    console.log(`Buildings still missing constructionCompleted: ${remainingIssues.length}`);
    
    if (remainingIssues.length === 0) {
      console.log('✅ All active buildings now have constructionCompleted field!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixMissingConstructionCompleted();