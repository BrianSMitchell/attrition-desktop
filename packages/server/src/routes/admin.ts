import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ERROR_MESSAGES } from '../constants/response-formats';
import { ENV_VARS } from '@game/shared';
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';
import { supabase } from '../config/supabase';

import { HTTP_STATUS } from '@game/shared';
import { GAME_CONSTANTS } from '@game/shared';
const router: Router = Router();

function requireAdminSecret(req: Request, res: Response): boolean {
  const secret = process.env[ENV_VARS.ADMIN_MAINTENANCE_SECRET];
  const provided = req.get('x-admin-maintenance-secret') || req.query.secret;
  if (!secret || !provided || secret !== String(provided)) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: ERROR_MESSAGES.UNAUTHORIZED_ACCESS });
    return false;
  }
  return true;
}

// Seed a small universe of unowned planets in Supabase
router.post('/seed-supabase', asyncHandler(async (req: Request, res: Response) => {
  if (!requireAdminSecret(req, res)) return;

  const count = Math.min(Number(req.body?.count || 100), 2000);
  const serverId = 'A';
  const galaxy = 0; // A00

  const rows: any[] = [];
  for (let i = 1; i <= count; i++) {
    const region = Math.floor((i - 1) / 10); // arbitrary grouping
    const local = (i - 1) % 10;
    const coord = `${serverId}${galaxy.toString().padStart(2, '0')}:${region
      .toString()
      .padStart(2, '0')}:${local.toString().padStart(2, '0')}`;
    rows.push({ coord, type: 'planet', owner_id: null });
  }

  const { data, error } = await supabase
    .from(DB_TABLES.LOCATIONS)
    .upsert(rows, { onConflict: 'coord' })
    .select('coord');

  if (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: error.message });
  }

  res.json({ success: true, inserted: data?.length ?? 0 });
}));

// Backfill starter empire/colony/building for users without empire_id
router.post('/backfill-starters', asyncHandler(async (req: Request, res: Response) => {
  if (!requireAdminSecret(req, res)) return;

  // Fetch users with missing empire_id
  const { data: users, error: usersErr } = await supabase
    .from(DB_TABLES.USERS)
    .select('id, email, username, empire_id, starting_coordinate')
    .is(DB_FIELDS.BUILDINGS.EMPIRE_ID, null)
    .limit(200);

  if (usersErr) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: usersErr.message });
  }

  let processed = 0;
  for (const u of users || []) {
    // Find an unowned planet
    const { data: planet, error: pickErr } = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select('coord')
      .eq(DB_FIELDS.CREDIT_TRANSACTIONS.TYPE, 'planet')
      .is(DB_FIELDS.LOCATIONS.OWNER_ID, null)
      .limit(1)
      .single();

    if (pickErr || !planet) {
      break; // no more planets
    }

    const coord = planet.coord as string;

    // Claim planet
    const { error: claimErr } = await supabase
      .from(DB_TABLES.LOCATIONS)
      .update({ owner_id: u.id })
      .eq('coord', coord)
      .is(DB_FIELDS.LOCATIONS.OWNER_ID, null);
    if (claimErr) continue;

    // Create empire
    const { data: empireRow, error: empErr } = await supabase
      .from(DB_TABLES.EMPIRES)
      .insert({
        user_id: u.id,
        name: u.username || 'Commander',
        home_system: coord,
        territories: [coord],
        credits: GAME_CONSTANTS.STARTING_CREDITS,
        energy: 0,
      })
      .select(DB_FIELDS.BUILDINGS.ID)
      .single();
    if (empErr || !empireRow) continue;

    // Create colony
    await supabase
      .from(DB_TABLES.COLONIES)
      .insert({ empire_id: empireRow.id, location_coord: coord, name: 'Home Base' });

    // Starter building
    await supabase
      .from(DB_TABLES.BUILDINGS)
      .insert({
        empire_id: empireRow.id,
        location_coord: coord,
        catalog_key: 'urban_structures',
        level: 1,
        is_active: true,
        construction_completed: new Date().toISOString(),
        credits_cost: 0,
      });

    // Update user
    await supabase
      .from(DB_TABLES.USERS)
      .update({ empire_id: empireRow.id, starting_coordinate: coord })
      .eq(DB_FIELDS.BUILDINGS.ID, u.id);

    processed++;
  }

  res.json({ success: true, processed });
}));

export default router;


