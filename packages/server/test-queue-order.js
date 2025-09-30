const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/attrition_dev', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const BuildingSchema = new mongoose.Schema({
  locationCoord: String,
  empireId: mongoose.Schema.Types.ObjectId,
  type: String,
  displayName: String,
  catalogKey: String,
  level: Number,
  isActive: Boolean,
  creditsCost: Number,
  pendingUpgrade: Boolean,
  identityKey: String,
  constructionStarted: Date,
  constructionCompleted: Date,
}, {
  timestamps: true // This adds createdAt and updatedAt
});

const Building = mongoose.model('Building', BuildingSchema);

async function testQueueOrder() {
  try {
    console.log('🔍 Checking construction queue order...\n');
    
    // Find all queued items across all bases
    const queuedItems = await Building.find({
      isActive: false
    })
    .select('catalogKey displayName createdAt constructionCompleted identityKey locationCoord')
    .sort({ createdAt: 1 }) // Sort by creation time (FIFO)
    .lean();
    
    if (queuedItems.length === 0) {
      console.log('❌ No queued items found in any base');
      return;
    }
    
    console.log('📋 Construction Queue (FIFO order by createdAt):');
    console.log('=====================================');
    
    queuedItems.forEach((item, index) => {
      const scheduled = item.constructionCompleted ? '✓ Scheduled' : '⏳ Unscheduled';
      const createdTime = new Date(item.createdAt).toLocaleString();
      
      console.log(`${index + 1}. ${item.catalogKey} (${item.displayName}) @ ${item.locationCoord}`);
      console.log(`   Created: ${createdTime}`);
      console.log(`   Status: ${scheduled}`);
      if (item.constructionCompleted) {
        console.log(`   Completes: ${new Date(item.constructionCompleted).toLocaleString()}`);
      }
      console.log(`   Identity: ${item.identityKey}`);
      console.log('');
    });
    
    // Check if order matches expected FIFO
    const metalRefineries = queuedItems.filter(item => item.catalogKey === 'metalRefinery');
    const gasPlants = queuedItems.filter(item => item.catalogKey === 'gasPlant');
    const researchLabs = queuedItems.filter(item => item.catalogKey === 'researchLab');
    
    console.log('🔬 Analysis:');
    console.log('============');
    console.log(`Metal Refineries: ${metalRefineries.length} items`);
    console.log(`Gas Plants: ${gasPlants.length} items`);
    console.log(`Research Labs: ${researchLabs.length} items`);
    console.log('');
    
    // Find the earliest item of each type
    if (metalRefineries.length > 0) {
      const earliestMetal = metalRefineries[0];
      console.log(`Earliest Metal Refinery created at: ${new Date(earliestMetal.createdAt).toLocaleString()}`);
    }
    
    if (gasPlants.length > 0) {
      const earliestGas = gasPlants[0];
      console.log(`Earliest Gas Plant created at: ${new Date(earliestGas.createdAt).toLocaleString()}`);
    }
    
    if (researchLabs.length > 0) {
      const earliestLab = researchLabs[0];
      console.log(`Earliest Research Lab created at: ${new Date(earliestLab.createdAt).toLocaleString()}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testQueueOrder();
