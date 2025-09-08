import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { TechQueue } from '../../models/TechQueue';
import { connectDatabase, disconnectDatabase } from '../../config/database';

/**
 * Backfill identityKey for TechQueue documents created before identityKey was required.
 * Canonical key: `${empireId}:${techKey}:${level}`
 * - For pending items, handle potential duplicate-key (idempotent) conflicts:
 *   - On E11000 for pending, mark this doc as cancelled and still persist identityKey.
 * - For completed/cancelled items, uniqueness is not enforced by the partial index so direct save is fine.
 */
async function run() {
  await connectDatabase();

  const filter = {
    $or: [
      { identityKey: { $exists: false } },
      { identityKey: null },
      { identityKey: '' },
    ],
  } as any;

  const cursor = TechQueue.find(filter).cursor();

  let scanned = 0;
  let updated = 0;
  let cancelled = 0;
  let errors = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    scanned++;
    try {
      // Compute canonical identityKey
      const empireIdStr =
        (doc as any).empireId?.toString?.() || String((doc as any).empireId || '');
      const techKey = (doc as any).techKey as string;
      const level = Math.max(1, Number((doc as any).level || 1));
      const key = `${empireIdStr}:${techKey}:${level}`;

      (doc as any).identityKey = key;

      if ((doc as any).status === 'pending') {
        try {
          await doc.save();
          updated++;
        } catch (err: any) {
          const msg = String(err?.message || '');
          if (err?.code === 11000 || /E11000 duplicate key/i.test(msg)) {
            // Idempotency: a pending item with the same identityKey already exists.
            // Resolve by cancelling this duplicate and saving identityKey for auditability.
            (doc as any).status = 'cancelled';
            try {
              await doc.save();
              cancelled++;
              console.warn(
                `[backfillTechIdentityKey] cancelled duplicate pending identityKey=${key} _id=${(doc as any)._id}`
              );
            } catch (err2) {
              errors++;
              console.error(
                `[backfillTechIdentityKey] failed to cancel+save duplicate pending identityKey=${key} _id=${(doc as any)._id}`,
                err2
              );
            }
          } else {
            errors++;
            console.error(
              `[backfillTechIdentityKey] failed to save pending identityKey=${key} _id=${(doc as any)._id}`,
              err
            );
          }
        }
      } else {
        // completed/cancelled
        await doc.save();
        updated++;
      }
    } catch (err) {
      errors++;
      console.error('[backfillTechIdentityKey] error processing doc', (doc as any)?._id, err);
    }
  }

  console.log(
    `[backfillTechIdentityKey] scanned=${scanned} updated=${updated} cancelled=${cancelled} errors=${errors}`
  );

  await disconnectDatabase();
}

run().catch(async (err) => {
  console.error('[backfillTechIdentityKey] fatal error:', err);
  try {
    await disconnectDatabase();
  } catch {}
  process.exit(1);
});
