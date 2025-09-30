import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { Empire } from '../models/Empire';
import { Location } from '../models/Location';
import { BaseStatsService } from '../services/baseStatsService';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const coord = process.argv[2] || 'A00:00:12:02';
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000, socketTimeoutMS: 45000 });

  try {
    const loc = await Location.findOne({ coord }).lean();
    if (!loc) {
      console.log('Location not found');
      return;
    }
    const empire = await Empire.findOne({ userId: (loc as any).owner }).lean();
    if (!empire) {
      console.log('Empire not found for location owner');
      return;
    }

    const stats = await BaseStatsService.getBaseStats(String((empire as any)._id), coord);
    console.log(JSON.stringify({ coord, produced: stats.energy.produced, consumed: stats.energy.consumed, balance: stats.energy.balance, rawBalance: stats.energy.rawBalance, projectedBalance: stats.energy.projectedBalance }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}
