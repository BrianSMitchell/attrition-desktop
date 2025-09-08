import mongoose from 'mongoose';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { Location } from '../models/Location';
import { connectDatabase } from '../config/database';
import { pickStarKindFromCoord, getStarKindModifiers } from '@game/shared';

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

/**
 * This script repairs a universe that has planets/asteroids but no stars by:
 * - Enumerating distinct system prefixes (Sgg:rr:ss) from existing Location docs
 * - Inserting a star document (body 00) for each system that lacks one
 *
 * It avoids wiping existing data and only adds missing stars.
 */
async function main() {
  try {
    console.log('🛠️  Repair Missing Stars Script');
    console.log('===============================');

    await connectDatabase();
    console.log('✅ Connected to MongoDB');

    // Quick check: if stars already exist, report and exit unless user wants to continue
    const existingStars = await Location.countDocuments({ type: 'star' });
    console.log(`🔎 Existing stars found: ${existingStars.toLocaleString()}`);

    // Aggregate distinct system prefixes "Sgg:rr:ss"
    console.log('📦 Enumerating distinct systems from existing locations...');
    const systems = await Location.aggregate<{ _id: string }>([
      // Project the system prefix: first 9 chars e.g. "A00:13:45"
      { $project: { prefix: { $substrBytes: ['$coord', 0, 9] } } },
      { $group: { _id: '$prefix' } },
      { $sort: { _id: 1 } },
    ]).option({ allowDiskUse: true }).exec();

    const batchSize = 2000;
    let pending: any[] = [];
    let systemsProcessed = 0;
    let starsInserted = 0;

    for (const doc of systems) {
      const systemPrefix = doc._id; // e.g. "A00:13:45"
      systemsProcessed++;

      const starCoord = `${systemPrefix}:00`;

      // Prepare star doc using Overhaul starKind
      const starKind = pickStarKindFromCoord(starCoord, 101);
      const orbitModifiers = Array.from({ length: 8 }, (_, i) => {
        const pos = i + 1;
        const mods = getStarKindModifiers(starKind as any, pos);
        return {
          position: pos,
          solarEnergyDelta: mods.solarEnergyDelta,
          fertilityDelta: mods.fertilityDelta,
          resourceDelta: {
            metal: mods.resourceDelta?.metal ?? 0,
            gas: mods.resourceDelta?.gas ?? 0,
            crystals: mods.resourceDelta?.crystals ?? 0,
          },
        };
      });

      pending.push({
        insertOne: {
          document: {
            coord: starCoord,
            type: 'star',
            starOverhaul: {
              kind: starKind as any,
              orbitModifiers,
            },
            owner: null,
          },
        },
      });

      if (pending.length >= batchSize) {
        try {
          const result = await (Location as any).bulkWrite(pending, { ordered: false });
          starsInserted += (result.insertedCount || 0);
        } catch (err: any) {
          // Ignore duplicate key errors if star already exists for some systems
          // Other errors will be thrown below
          const msg = (err && err.message) || '';
          if (!msg.includes('E11000 duplicate key error')) {
            console.error('❌ Bulk insert error:', err);
            throw err;
          }
        } finally {
          pending = [];
        }

        if (systemsProcessed % 20000 === 0) {
          console.log(`  📊 Processed systems: ${systemsProcessed.toLocaleString()}, stars inserted so far: ${starsInserted.toLocaleString()}`);
        }
      }
    }

    // Flush remaining
    if (pending.length > 0) {
      try {
        const result = await (Location as any).bulkWrite(pending, { ordered: false });
        starsInserted += (result.insertedCount || 0);
      } catch (err: any) {
        const msg = (err && err.message) || '';
        if (!msg.includes('E11000 duplicate key error')) {
          console.error('❌ Bulk insert error (final batch):', err);
          throw err;
        }
      }
    }

    console.log('✅ Repair completed!');
    console.log(`   - Systems processed: ${systemsProcessed.toLocaleString()}`);
    console.log(`   - Stars inserted:    ${starsInserted.toLocaleString()}`);

    const finalStarCount = await Location.countDocuments({ type: 'star' });
    console.log(`🌟 Final star count: ${finalStarCount.toLocaleString()}`);
  } catch (err) {
    console.error('💥 Script failed:', err);
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
