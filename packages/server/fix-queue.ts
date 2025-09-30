import { connectDatabase } from './src/database/connection';
import { StructuresQueue } from './src/models/StructuresQueue';
import { Empire } from './src/models/Empire';
import { CapacityService } from './src/services/capacityService';

async function fixStuckQueueItems() {
  try {
    await connectDatabase();
    console.log('🔧 Fixing stuck queue items...');
    
    // Find items that should be active but don't have completesAt
    const stuckItems = await StructuresQueue.find({
      status: 'pending',
      charged: true,
      $or: [
        { completesAt: { $exists: false } },
        { completesAt: null }
      ]
    });
    
    console.log(`Found ${stuckItems.length} stuck queue items`);
    
    for (const item of stuckItems) {
      console.log(`Fixing: ${item.buildingKey} at ${item.locationCoord}`);
      
      // Get empire and capacity
      const empire = await Empire.findById(item.empireId);
      if (!empire) {
        console.log(`  Empire not found, cancelling item`);
        item.status = 'cancelled';
        await item.save();
        continue;
      }
      
      const empireIdStr = empire._id.toString();
      const { construction } = await CapacityService.getBaseCapacities(empireIdStr, item.locationCoord);
      const cap = Math.max(0, Number(construction?.value || 0));
      
      if (cap <= 0) {
        console.log(`  No capacity, keeping as waiting`);
        item.charged = false;
        await item.save();
        continue;
      }
      
      // Calculate proper completion time
      const creditsCost = item.creditsCost;
      const hours = creditsCost / cap;
      const etaMinutes = Math.max(1, Math.ceil(hours * 60));
      const now = new Date();
      
      item.completesAt = new Date(now.getTime() + etaMinutes * 60 * 1000);
      await item.save();
      
      console.log(`  ✅ Fixed! Will complete in ${etaMinutes} minutes`);
    }
    
    console.log('✅ All stuck items fixed!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixStuckQueueItems();
