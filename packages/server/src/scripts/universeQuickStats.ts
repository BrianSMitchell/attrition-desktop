import mongoose from 'mongoose';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { Location } from '../models/Location';
import { connectDatabase } from '../config/database';

dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

type CountRow = { _id: string; count: number };
type OrbitStatRow = { _id: number; avgSolar: number; avgFertility: number; count: number };

async function printStarKindDistribution() {
  const rows = await Location.aggregate<CountRow>([
    { $match: { type: 'star', 'starOverhaul.kind': { $exists: true } } },
    { $group: { _id: '$starOverhaul.kind', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  console.log('⭐ Star Kind Distribution:');
  if (rows.length === 0) {
    console.log('  (no starOverhaul.kind data found)');
    return;
  }
  rows.forEach(r => {
    console.log(`  - ${r._id}: ${r.count.toLocaleString()}`);
  });
}

async function printTerrainDistribution() {
  const rows = await Location.aggregate<CountRow>([
    { $match: { type: { $in: ['planet', 'asteroid'] }, 'terrain.type': { $exists: true } } },
    { $group: { _id: '$terrain.type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  console.log('🪨 Terrain Type Distribution (planets + asteroids):');
  if (rows.length === 0) {
    console.log('  (no terrain data found)');
    return;
  }
  rows.forEach(r => {
    console.log(`  - ${r._id}: ${r.count.toLocaleString()}`);
  });
}

async function printOrbitPositionAverages() {
  const rows = await Location.aggregate<OrbitStatRow>([
    {
      $match: {
        type: { $in: ['planet', 'asteroid'] },
        orbitPosition: { $gte: 1, $lte: 8 },
        'result.solarEnergy': { $exists: true },
        'result.fertility': { $exists: true }
      }
    },
    {
      $group: {
        _id: '$orbitPosition',
        avgSolar: { $avg: '$result.solarEnergy' },
        avgFertility: { $avg: '$result.fertility' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  console.log('🛰️ Orbit Position Averages (planets + asteroids):');
  if (rows.length === 0) {
    console.log('  (no orbitPosition/result data found)');
    return;
  }
  rows.forEach(r => {
    const pos = r._id;
    const avgSolar = Number(r.avgSolar.toFixed(2));
    const avgFert = Number(r.avgFertility.toFixed(2));
    console.log(`  - P${pos}: avgSolar=${avgSolar}, avgFertility=${avgFert}, count=${r.count.toLocaleString()}`);
  });
}

async function main() {
  try {
    await connectDatabase();
    console.log('✅ Connected to MongoDB');

    const [totalLocations, totalStars, totalPlanets, totalAsteroids] = await Promise.all([
      Location.countDocuments({}),
      Location.countDocuments({ type: 'star' }),
      Location.countDocuments({ type: 'planet' }),
      Location.countDocuments({ type: 'asteroid' }),
    ]);

    console.log('📊 Universe Quick Stats:');
    console.log(`  - Total Locations: ${totalLocations.toLocaleString()}`);
    console.log(`  - Stars: ${totalStars.toLocaleString()}`);
    console.log(`  - Planets: ${totalPlanets.toLocaleString()}`);
    console.log(`  - Asteroids: ${totalAsteroids.toLocaleString()}`);

    // New: distributions and orbit position stats
    console.log('');
    await printStarKindDistribution();
    console.log('');
    await printTerrainDistribution();
    console.log('');
    await printOrbitPositionAverages();

    // Keep a small sample of stars for quick visual reference
    console.log('');
    const sampleStars = await Location.find({ type: 'star' })
      .sort({ coord: 1 })
      .limit(10)
      .lean();

    if (sampleStars.length > 0) {
      console.log('🔎 Sample star coords (first 10):');
      for (const s of sampleStars) {
        console.log(`  - ${s.coord}`);
      }
    } else {
      console.log('🔎 No star documents found to sample.');
    }
  } catch (err) {
    console.error('❌ Error computing universe quick stats:', err);
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
