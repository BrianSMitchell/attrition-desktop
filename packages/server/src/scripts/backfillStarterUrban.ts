import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Empire } from '../models/Empire';
import { Building } from '../models/Building';
import { Location } from '../models/Location';

async function main() {
  await connectDatabase();

  const empires = await Empire.find({});
  let created = 0;
  let skipped = 0;
  let withoutHome = 0;

  for (const empire of empires) {
    // Determine starter/base coord: prefer homeSystem, otherwise first territory
    const coord = empire.homeSystem || (Array.isArray((empire as any).territories) ? (empire as any).territories[0] : undefined);
    if (!coord) {
      withoutHome++;
      continue;
    }

    // Verify location exists (best-effort)
    const loc = await Location.findOne({ coord });
    if (!loc) {
      console.warn(`⚠️  Empire ${empire._id} has missing Location for ${coord}, skipping`);
      skipped++;
      continue;
    }

    // Check if a habitat/urban_structures already exists at this coord
    const exists = await Building.findOne({
      empireId: empire._id as mongoose.Types.ObjectId,
      locationCoord: coord,
      type: 'habitat'
    });

    if (exists) {
      skipped++;
      continue;
    }

    // Create Level 1 Urban Structures, active immediately with zero cost
    await Building.create({
      locationCoord: coord,
      empireId: empire._id as mongoose.Types.ObjectId,
      type: 'habitat',              // maps to 'urban_structures'
      displayName: 'Urban Structures',
      catalogKey: 'urban_structures',
      level: 1,
      constructionStarted: new Date(),
      constructionCompleted: new Date(),
      isActive: true,
      creditsCost: 0
    });

    created++;
  }

  console.log(`✅ Backfill complete. Created: ${created}, Skipped (already present/missing location): ${skipped}, No home/territory: ${withoutHome}`);

  await disconnectDatabase();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Backfill failed:', err);
  try {
    await disconnectDatabase();
  } catch {}
  process.exit(1);
});
