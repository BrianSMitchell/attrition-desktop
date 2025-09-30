import mongoose from 'mongoose';
import { User } from '../models/User';
import { Empire } from '../models/Empire';
import { Colony } from '../models/Colony';

async function fixDataInconsistencies() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');

    console.log('\n=== ANALYZING DATA INCONSISTENCIES ===');
    
    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to check`);

    for (const user of users) {
      console.log(`\n--- Checking user: ${user.email} (${user.username}) ---`);
      
      // Find their empire
      const empire = await Empire.findOne({ userId: user._id });
      if (!empire) {
        console.log('❌ No empire found for user');
        continue;
      }

      let needsUserUpdate = false;
      let needsEmpireUpdate = false;

      // Issue 1: User gameProfile credits vs Empire credits mismatch
      if (user.gameProfile?.credits !== empire.resources.credits) {
        console.log(`🔧 FIXING: User gameProfile credits (${user.gameProfile?.credits}) -> Empire credits (${empire.resources.credits})`);
        if (!user.gameProfile) {
          user.gameProfile = {
            credits: empire.resources.credits,
            experience: 0
          };
        } else {
          user.gameProfile.credits = empire.resources.credits;
        }
        needsUserUpdate = true;
      }

      // Issue 2: Remove legacy empire energy field
      if (empire.resources.energy !== undefined) {
        console.log(`🔧 REMOVING: Legacy empire energy field (${empire.resources.energy})`);
        // @ts-ignore - removing legacy field
        delete empire.resources.energy;
        needsEmpireUpdate = true;
      }

      // Issue 3: Fix empire baseCount (colonies are what we call bases)
      const actualBaseCount = await Colony.countDocuments({ empireId: empire._id });
      if (empire.baseCount !== actualBaseCount) {
        console.log(`🔧 FIXING: Empire baseCount (${empire.baseCount}) -> Actual bases/colonies (${actualBaseCount})`);
        empire.baseCount = actualBaseCount;
        needsEmpireUpdate = true;
      }

      // Save changes
      if (needsUserUpdate) {
        await user.save();
        console.log('✅ User updated');
      }

      if (needsEmpireUpdate) {
        await empire.save();
        console.log('✅ Empire updated');
      }

      if (!needsUserUpdate && !needsEmpireUpdate) {
        console.log('✅ No issues found');
      }
    }

    console.log('\n=== DATA CONSISTENCY CHECK COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Error fixing data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run the script
if (require.main === module) {
  fixDataInconsistencies().catch(console.error);
}

export { fixDataInconsistencies };