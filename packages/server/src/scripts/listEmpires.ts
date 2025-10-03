import mongoose from 'mongoose';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { connectDatabase } from '../config/database';
import { Empire } from '../models/Empire';
import { User } from '../models/User';

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  try {
    await connectDatabase();
    console.log('✅ Connected to MongoDB');

    const totalEmpires = await Empire.countDocuments({});
    console.log(`🏰 Total Empires: ${totalEmpires}`);

    if (totalEmpires === 0) {
      console.log('No empires found.');
      return;
    }

    const rows = await Empire.find({})
      .sort({ updatedAt: -1 })
      .limit(25)
      .lean();

    console.log('🔎 Sample Empires (latest 25):');
    for (const e of rows) {
      const owner = await User.findById(e.userId).select('email username').lean();
      const ownerLabel = owner ? `${owner.username || owner.email}` : 'unknown';
      const credits = e.resources?.credits ?? 0;
      const energy = e.resources?.energy ?? 0;
      console.log(`  - ${e._id} | ${e.name} | owner=${ownerLabel} | bases=${e.baseCount} | credits=${credits} | energy=${energy} | updated=${new Date(e.updatedAt as any).toISOString()}`);
    }
  } catch (err) {
    console.error('❌ Error listing empires:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}
