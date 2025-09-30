/*
 Quick scan for buildings with missing/incorrect catalogKey and duplicate instances per base/key.
 Usage:
   node scan-buildings-catalog.js              # scan all bases
   node scan-buildings-catalog.js A00:00:12:02 # scan a specific base coord
*/

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/attrition';

const buildingSchema = new mongoose.Schema(
  {
    empireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empire', required: true },
    locationCoord: String,
    catalogKey: String,
    type: String,
    level: Number,
    isActive: Boolean,
    pendingUpgrade: Boolean,
    createdAt: Date,
    updatedAt: Date,
    constructionStarted: Date,
    constructionCompleted: Date,
  },
  { collection: 'buildings', strict: false }
);

const Building = mongoose.model('Building', buildingSchema);

async function main() {
  const baseCoord = (process.argv[2] || '').trim();

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  console.log('Connected.');

  const baseFilter = baseCoord ? { locationCoord: baseCoord } : {};

  // 1) Missing/invalid catalogKey
  const missingQuery = {
    ...baseFilter,
    $or: [
      { catalogKey: { $exists: false } },
      { catalogKey: null },
      { catalogKey: '' },
      { catalogKey: 'undefined' },
    ],
  };

  const missing = await Building.find(missingQuery)
    .select('locationCoord type level isActive pendingUpgrade createdAt _id')
    .lean();

  if (missing.length === 0) {
    console.log('\nNo buildings with missing/invalid catalogKey found' + (baseCoord ? ` at ${baseCoord}` : '') + '.');
  } else {
    console.log(`\nFound ${missing.length} building(s) with missing/invalid catalogKey${baseCoord ? ' at ' + baseCoord : ''}:`);
    const byCoord = new Map();
    for (const b of missing) {
      const arr = byCoord.get(b.locationCoord) || [];
      arr.push(b);
      byCoord.set(b.locationCoord, arr);
    }
    for (const [coord, arr] of byCoord.entries()) {
      console.log(`\n  Base ${coord}: ${arr.length} row(s)`);
      for (const b of arr) {
        console.log(
          `    - _id=${b._id} type="${b.type}" level=${b.level ?? '?'} active=${!!b.isActive} pendingUpgrade=${!!b.pendingUpgrade} createdAt=${b.createdAt ? new Date(b.createdAt).toISOString() : '—'}`
        );
      }
    }
  }

  // 2) Duplicate instances per (coord, catalogKey): show where multiple docs exist
  //    Report only interesting rows: count > 1 OR sumLevel > maxLevel
  const dupPipeline = [
    { $match: { ...baseFilter, catalogKey: { $type: 'string', $ne: '' } } },
    {
      $group: {
        _id: { coord: '$locationCoord', key: '$catalogKey' },
        count: { $sum: 1 },
        sumLevel: { $sum: { $ifNull: ['$level', 0] } },
        maxLevel: { $max: { $ifNull: ['$level', 0] } },
        activeCount: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
        pendingCount: { $sum: { $cond: [{ $eq: ['$pendingUpgrade', true] }, 1, 0] } },
      },
    },
    { $sort: { '_id.coord': 1, '_id.key': 1 } },
  ];

  const dupGroups = await Building.aggregate(dupPipeline);
  const anomalies = dupGroups.filter((g) => g.count > 1 || g.sumLevel > g.maxLevel);

  if (anomalies.length === 0) {
    console.log('\nNo duplicate catalogKey instances or level-sum anomalies found' + (baseCoord ? ` at ${baseCoord}` : '') + '.');
  } else {
    console.log(`\nDuplicate/Anomaly groups${baseCoord ? ' at ' + baseCoord : ''}: ${anomalies.length}`);
    for (const g of anomalies) {
      const { coord, key } = g._id;
      console.log(
        `  - ${coord} :: ${key}  docs=${g.count}  levels(sum=${g.sumLevel}, max=${g.maxLevel})  active=${g.activeCount} pending=${g.pendingCount}`
      );
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(async (err) => {
  console.error('Scan failed:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
