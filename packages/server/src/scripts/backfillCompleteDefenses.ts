import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { DefenseQueue } from '../models/DefenseQueue';

// Load .env from server package
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Backfill: Convert any in-progress DefenseQueue (pending with completesAt <= now)
 * into completed status, so BaseStats can count them.
 */
async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition';
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000, socketTimeoutMS: 45000 });

  try {
    const now = new Date();
    const result = await DefenseQueue.updateMany(
      { status: 'pending', completesAt: { $lte: now } },
      { $set: { status: 'completed' } }
    );
    console.log(JSON.stringify({ matched: result.matchedCount ?? (result as any).matched, modified: result.modifiedCount ?? (result as any).modified }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}
