import { ENV_VARS } from '../../../shared/src/constants/env-vars';

/*
 Merge duplicate building documents into a single doc per (empireId, locationCoord, catalogKey).

 Usage:
   node merge-duplicate-buildings.js A00:00:12:02 --apply
   node merge-duplicate-buildings.js A00:00:12:02         # dry run

 Behavior:
   - For each (coord, key) group with multiple docs:
     * If any doc is an active construction (isActive=false AND constructionCompleted in the future), skip and warn.
     * Otherwise, pick the primary doc (highest level, then oldest createdAt) and set its level to sum(levels of all docs).
     * Force primary isActive=true, pendingUpgrade=false, clear construction timestamps/credits.
     * Delete the other docs.
   - Prints a summary. Only writes when --apply is passed.
*/

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const MONGO_URI = process.env[ENV_VARS.MONGODB_URI] || process.env.MONGO_URI || 'mongodb://localhost:27017/attrition';

const buildingSchema = new mongoose.Schema(
  {
    empireId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empire', required: true },
    locationCoord: String,
    catalogKey: String,
    level: Number,
    isActive: Boolean,
    pendingUpgrade: Boolean,
    createdAt: Date,
    updatedAt: Date,
    constructionStarted: Date,
    constructionCompleted: Date,
    creditsCost: Number,
  },
  { collection: 'buildings', strict: false }
);

const Building = mongoose.model('Building', buildingSchema);

function argHas(flag){ return process.argv.includes(flag); }

async function main(){
  const baseCoord = (process.argv[2] || '').trim();
  const apply = argHas('--apply');

  console.log(`Connecting to MongoDB ${MONGO_URI} ...`);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  console.log('Connected.');

  const match = baseCoord
    ? { locationCoord: baseCoord, catalogKey: { $type: 'string', $ne: '' } }
    : { catalogKey: { $type: 'string', $ne: '' } };

  // Find duplicate groups
  const dupGroups = await Building.aggregate([
    { $match: match },
    { $group: { _id: { coord: '$locationCoord', key: '$catalogKey', empireId: '$empireId' }, count: { $sum: 1 }, sumLevel: { $sum: { $ifNull: ['$level', 0] } } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { '_id.coord': 1, '_id.key': 1 } }
  ]);

  if (dupGroups.length === 0){
    console.log(baseCoord ? `No duplicate groups found at ${baseCoord}. Nothing to do.` : 'No duplicate groups found. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log(baseCoord ? `Found ${dupGroups.length} duplicate group(s) at ${baseCoord}.` : `Found ${dupGroups.length} duplicate group(s) across all bases.` );
  const now = Date.now();
  let mergedGroups = 0;

  for (const g of dupGroups){
    const { coord, key, empireId } = g._id;
    const docs = await Building.find({ locationCoord: coord, catalogKey: key, empireId }).sort({ level: -1, createdAt: 1 }).lean();

    const inProgress = docs.some(d => d.isActive === false && d.constructionCompleted && new Date(d.constructionCompleted).getTime() > now);
    if (inProgress){
      console.warn(`- SKIP ${coord} key=${key}: active construction in progress; merge aborted for safety.`);
      continue;
    }

    const sumLevel = docs.reduce((s,d) => s + Math.max(0, d.level || 0), 0);
    const primary = docs[0];
    const others = docs.slice(1);

    console.log(`- MERGE ${coord} key=${key}: docs=${docs.length} => primary=${primary._id} level=${primary.level} -> ${sumLevel}, delete ${others.length}`);

    if (apply){
      // Update primary
      await Building.updateOne(
        { _id: primary._id },
        {
          $set: {
            level: sumLevel,
            isActive: true,
            pendingUpgrade: false,
          },
          $unset: { constructionStarted: '', constructionCompleted: '', creditsCost: '' },
        }
      );
      // Delete others
      const otherIds = others.map(o => o._id);
      if (otherIds.length > 0){
        await Building.deleteMany({ _id: { $in: otherIds } });
      }
      mergedGroups++;
    }
  }

  if (apply){
    console.log(`\nApplied merge to ${mergedGroups} group(s).`);
  }else{
    console.log(`\nDry run complete. Re-run with --apply to write changes.`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(async (err) => {
  console.error('Merge failed:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
