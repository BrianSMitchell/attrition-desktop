/**
 * Migration: Backfill catalogKey on legacy Building documents
 *
 * Usage:
 *   npx --yes ts-node packages/server/src/scripts/migrations/backfillCatalogKey.ts --dry
 *   npx --yes ts-node packages/server/src/scripts/migrations/backfillCatalogKey.ts
 *
 * Notes:
 * - This script is designed to be SAFE by default (dry run). Remove --dry to apply updates.
 * - It will NOT attempt to "guess" catalog keys from legacy type names unless you explicitly define a mapping below.
 * - Aligns with:
 *   .clinerules/catalog-key-source-of-truth.md
 *   .clinerules/dto-error-schema-and-logging.md
 *
 * Behavior:
 * - Finds Building docs missing catalogKey (undefined, null, or empty string)
 * - If a deterministic mapping exists for the legacy "type" string, applies it
 * - Otherwise logs for manual review without modifying the document
 *
 * IMPORTANT:
 * - Do NOT add ad-hoc mappings here unless they reflect the current, explicit catalogs in @game/shared.
 * - Prefer to leave unmapped rows as-is and fix upstream data where appropriate.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import path from 'path';

// Local import of Building model
// Path is relative to this script's location: packages/server/src/scripts/migrations/ -> ../../models/Building
import { Building as BuildingModel } from '../../models/Building';

// Keep typing minimal and safe for migration purposes
type ObjectIdLike = mongoose.Types.ObjectId | string;
type BuildingDoc = {
  _id: ObjectIdLike;
  catalogKey?: string | null;
  type?: string | null; // legacy field
};

// DRY-RUN flag
const isDryRun = process.argv.includes('--dry');

// OPTIONAL deterministic mapping from legacy "type" -> modern catalog key
// Leave empty unless you have verified, canonical mappings that reflect current @game/shared catalogs.
// Example placeholders (commented out) shown for reference only; DO NOT enable without confirmation.
// const LEGACY_TYPE_TO_KEY: Record<string, string> = {
//   // "habitat": "urban_structures",
//   // "factory": "robotic_factories",
//   // "defense_station": "orbital_base",
//   // "shipyard": "shipyards",
//   // "research_lab": "research_labs",
//   // "metal_mine": "crystal_mines",
//   // "energy_plant": "solar_plants", // Ambiguous (could be gas_plants); do not set unless verified
// };
const LEGACY_TYPE_TO_KEY: Record<string, string> = {};

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI (or MONGO_URI) is not set. Aborting.');
    process.exit(1);
  }

  // Connect
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log(`[BackfillCatalogKey] Connected to MongoDB. Dry run: ${isDryRun ? 'YES' : 'NO'}`);

  const query = {
    $or: [
      { catalogKey: { $exists: false } },
      { catalogKey: null },
      { catalogKey: '' },
    ],
  };

  // Using lean() increases safety/perf but we want to update documents; fetch as docs
  const cursor = (BuildingModel as any).find(query).cursor();

  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let unmapped = 0;

  for await (const doc of cursor as AsyncIterable<BuildingDoc>) {
    scanned++;
    const legacyType = (doc.type || '').trim();

    // If we have a canonical mapping, use it
    const mapped = legacyType ? LEGACY_TYPE_TO_KEY[legacyType] : undefined;

    if (mapped) {
      if (isDryRun) {
        console.log(
          `[BackfillCatalogKey][DRY] would update _id=${doc._id} type="${legacyType}" -> catalogKey="${mapped}"`
        );
        updated++;
      } else {
        await (BuildingModel as any).updateOne(
          { _id: doc._id },
          { $set: { catalogKey: mapped } }
        );
        console.log(
          `[BackfillCatalogKey] updated _id=${doc._id} type="${legacyType}" -> catalogKey="${mapped}"`
        );
        updated++;
      }
    } else {
      // No mapping available — log once for visibility, then count
      console.warn(
        `[BackfillCatalogKey] skip: missing deterministic mapping _id=${doc._id} type="${legacyType}"`
      );
      unmapped++;
      skipped++;
    }
  }

  console.log(
    `[BackfillCatalogKey] Completed. Scanned=${scanned} Updated=${updated} Unmapped=${unmapped} Skipped=${skipped} DryRun=${isDryRun}`
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('[BackfillCatalogKey] ERROR:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
