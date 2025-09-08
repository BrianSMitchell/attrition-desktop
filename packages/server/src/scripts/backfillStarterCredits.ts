import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/User';
import { Empire } from '../models/Empire';

/**
 * Ensure all existing users/empires start with at least 100 credits:
 * - user.gameProfile.credits >= 100
 * - empire.resources.credits >= 100
 */
async function main() {
  await connectDatabase();

  const MIN_CREDITS = 100;

  // Backfill Users
  const usersToUpdate = await User.find({ 'gameProfile.credits': { $lt: MIN_CREDITS } });
  let usersUpdated = 0;
  for (const u of usersToUpdate) {
    (u as any).gameProfile.credits = MIN_CREDITS;
    await u.save();
    usersUpdated++;
  }

  // Backfill Empires
  const empiresToUpdate = await Empire.find({ 'resources.credits': { $lt: MIN_CREDITS } });
  let empiresUpdated = 0;
  for (const e of empiresToUpdate) {
    (e as any).resources.credits = MIN_CREDITS;
    await e.save();
    empiresUpdated++;
  }

  console.log(`✅ Backfill complete. Users updated: ${usersUpdated}, Empires updated: ${empiresUpdated}`);

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
