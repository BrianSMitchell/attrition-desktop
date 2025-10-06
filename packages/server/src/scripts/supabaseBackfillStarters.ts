import 'dotenv/config';
import { supabase } from '../config/supabase';
import { getDatabaseType } from '../config/database';

interface UserRow {
  id: string;
  email?: string | null;
  username?: string | null;
  empire_id?: string | null;
  starting_coordinate?: string | null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out: { limit?: number } = {};
  for (const a of args) {
    if (a.startsWith('--limit=')) {
      const n = Number(a.split('=')[1]);
      if (!Number.isNaN(n)) out.limit = n;
    }
  }
  return out;
}

async function claimStarterForUser(u: UserRow): Promise<boolean> {
  // Find an unowned planet
  const { data: planet, error: pickErr } = await supabase
    .from('locations')
    .select('coord')
    .eq('type', 'planet')
    .is('owner_id', null)
    .limit(1)
    .single();

  if (pickErr || !planet) {
    console.warn(`[backfill] No available unowned planets (user ${u.id}).`);
    return false;
  }

  const coord = planet.coord as string;

  // Claim planet (owner_id null guard prevents races)
  const { error: claimErr } = await supabase
    .from('locations')
    .update({ owner_id: u.id })
    .eq('coord', coord)
    .is('owner_id', null);
  if (claimErr) {
    console.warn(`[backfill] Failed to claim ${coord} for user ${u.id}: ${claimErr.message}`);
    return false;
  }

  // Create empire
  const { data: empireRow, error: empErr } = await supabase
    .from('empires')
    .insert({
      user_id: u.id,
      name: u.username || 'Commander',
      home_system: coord,
      territories: [coord],
      credits: 100,
      energy: 0,
    })
    .select('id')
    .single();

  if (empErr || !empireRow) {
    console.warn(`[backfill] Failed to create empire for user ${u.id}: ${empErr?.message}`);
    return false;
  }

  // Create colony
  const { error: colonyErr } = await supabase
    .from('colonies')
    .insert({ empire_id: empireRow.id, location_coord: coord, name: 'Home Base' });
  if (colonyErr) {
    console.warn(`[backfill] Failed colony for user ${u.id}: ${colonyErr.message}`);
  }

  // Starter building
  const { error: bldgErr } = await supabase
    .from('buildings')
    .insert({
      empire_id: empireRow.id,
      location_coord: coord,
      catalog_key: 'urban_structures',
      level: 1,
      is_active: true,
      construction_completed: new Date().toISOString(),
      credits_cost: 0,
    });
  if (bldgErr) {
    console.warn(`[backfill] Failed starter building for user ${u.id}: ${bldgErr.message}`);
  }

  // Update user
  const { error: userErr } = await supabase
    .from('users')
    .update({ empire_id: empireRow.id, starting_coordinate: coord })
    .eq('id', u.id);
  if (userErr) {
    console.warn(`[backfill] Failed to update user ${u.id}: ${userErr.message}`);
  }

  console.log(`[backfill] Starter assigned: user=${u.id} coord=${coord} empire=${empireRow.id}`);
  return true;
}

async function main() {
  if (getDatabaseType() !== 'supabase') {
    console.error('ERROR: DB_TYPE is not supabase. Aborting.');
    process.exit(1);
  }

  const { limit } = parseArgs();
  const max = Math.min(limit ?? 200, 2000);

  // Fetch users without empire_id
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, email, username, empire_id, starting_coordinate')
    .is('empire_id', null)
    .limit(max);

  if (usersErr) {
    console.error('ERROR: Failed to fetch users:', usersErr.message);
    process.exit(1);
  }

  let processed = 0;
  for (const u of users ?? []) {
    const ok = await claimStarterForUser(u as UserRow);
    if (ok) processed++;
  }

  console.log(`[backfill] Finished. Users processed: ${processed}`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});