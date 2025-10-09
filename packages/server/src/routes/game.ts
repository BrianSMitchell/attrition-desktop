import { Router, Response } from 'express';
import { FleetMovementService } from '../services/fleets/FleetMovementService';
import { supabase } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getOnlineUniqueUsersCount } from '../services/socketService';
import { 
  getTechnologyList,
  TechnologyKey,
  getBuildingsList,
  BuildingKey,
  getDefensesList,
  DefenseKey,
  getUnitsList,
  UnitKey,
  getUnitSpec,
  getTechSpec,
  getStructureCreditCostForLevel,
  getBuildingSpec,
  computeEnergyBalance,
  getTechCreditCostForLevel
} from '@game/shared';
import { EconomyService } from '../services/economy/EconomyService';

const router: Router = Router();

// Helper function to compute technology score from researched technologies
function computeTechnologyScore(empire: any): number {
  const techLevels = empire.techLevels as Map<string, number> | undefined;
  if (!techLevels) return 0;

  let totalScore = 0;
  for (const [techKey, level] of techLevels.entries()) {
    if (level >= 1) {
      try {
        const spec = getTechSpec(techKey as TechnologyKey);
        totalScore += spec.creditsCost;
      } catch (error) {
        // Skip unknown tech keys
        console.warn(`Unknown tech key: ${techKey}`);
      }
    }
  }
  return totalScore;
}

// All game routes require authentication
router.use(authenticate);

// Helper (temporary): compute economy per hour using a simple catalog mapping
function computeEconomyPerHourFromBuildings(buildings: Array<{ catalog_key?: string; level?: number; is_active?: boolean }>): number {
  let total = 0;
  for (const b of buildings) {
    if (!b.is_active) continue;
    const key = (b.catalog_key || '').toLowerCase();
    const lvl = Number(b.level || 1);
    // Simple mapping (can be refined later or loaded from shared catalog)
    switch (key) {
      case 'urban_structures':
      case 'habitat':
        total += 50 * lvl; // placeholder yield per hour per level
        break;
      default:
        break;
    }
  }
  return total;
}

// Get game dashboard data
router.get('/dashboard', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Supabase implementation
  const userId = user?._id || user?.id;

  // Read authoritative user row to discover empire_id
  const { data: userRow } = await supabase
    .from('users')
    .select('id, username, email, empire_id, starting_coordinate')
    .eq('id', userId)
    .single();

  // Try to fetch empire by user_id first
  let { data: empireRow } = await supabase
    .from('empires')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // Fallback: if user has an explicit empire_id, read by id
  if (!empireRow && userRow?.empire_id) {
    const byId = await supabase
      .from('empires')
      .select('*')
      .eq('id', userRow.empire_id)
      .maybeSingle();
    empireRow = byId.data as any;
  }

  // If still no empire, auto-bootstrap one to prevent client crashes
  if (!empireRow) {
    // Pick an unowned planet
    const pick = await supabase
      .from('locations')
      .select('coord')
      .eq('type', 'planet')
      .is('owner_id', null)
      .limit(1)
      .single();

    if (pick.data?.coord) {
      const coord = pick.data.coord as string;

      // Claim the planet
      await supabase
        .from('locations')
        .update({ owner_id: userId })
        .eq('coord', coord)
        .is('owner_id', null);

      // Create empire
      const displayName = (userRow?.username || userRow?.email?.split?.('@')?.[0] || 'Commander') as string;
      const insertEmpire = await supabase
        .from('empires')
        .insert({
          user_id: userId,
          name: `${displayName}`,
          home_system: coord,
          territories: [coord],
          credits: 100,
          energy: 0,
        })
        .select('*')
        .single();

      if (insertEmpire.data) {
        empireRow = insertEmpire.data as any;

        // Create colony and starter building (best-effort)
        await supabase
          .from('colonies')
          .insert({ empire_id: empireRow.id, location_coord: coord, name: 'Home Base' });

        await supabase
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

        // Update user linkage
        await supabase
          .from('users')
          .update({ empire_id: empireRow.id, starting_coordinate: coord })
          .eq('id', userId);
      }
    }
  }

  if (!empireRow) {
    // Could not create or find; return new-player payload but avoid crashes client-side
    return res.json({
      success: true,
      data: {
        user,
        empire: null,
        isNewPlayer: true,
        serverInfo: {
          name: 'Alpha Server',
          version: '1.0.0',
          playersOnline: getOnlineUniqueUsersCount(),
          universeSize: { width: 100, height: 100 }
        }
      }
    });
  }

  // Compute credits/hour from Supabase buildings via catalog yields
const creditsPerHour = await EconomyService.sumCreditsPerHourForEmpire(String((empireRow as any).id));

  // 1.2 On-read accrual of credits
  let resourcesGained = 0;
  try {
    const nowTs = Date.now();
    const lastUpdateRaw = (empireRow as any).last_resource_update as string | null | undefined;
    const lastTs = lastUpdateRaw ? new Date(lastUpdateRaw).getTime() : nowTs;
    let elapsedMs = Math.max(0, nowTs - (Number.isFinite(lastTs) ? lastTs : nowTs));

    // Carry remainder milli
    let carryMs = Math.max(0, Number((empireRow as any).credits_remainder_milli || 0));

    if (creditsPerHour > 0) {
      const totalMs = elapsedMs + carryMs;
      const fractional = creditsPerHour * (totalMs / 3600000);
      const increment = Math.floor(fractional);
      const remainderMs = totalMs % 3600000;

      if (increment > 0 || elapsedMs > 0 || carryMs !== remainderMs) {
        const oldCredits = Math.max(0, Number((empireRow as any).credits || 0));
        const newCredits = Math.max(0, oldCredits + increment);
        resourcesGained = increment;

        const t0 = Date.now();
        const upd = await supabase
          .from('empires')
          .update({
            credits: newCredits,
            last_resource_update: new Date(nowTs).toISOString(),
            credits_remainder_milli: remainderMs,
          })
          .eq('id', (empireRow as any).id)
          .select('id, credits, last_resource_update, credits_remainder_milli')
          .single();
        const dt = Date.now() - t0;

        if (!upd.error && upd.data) {
          (empireRow as any).credits = upd.data.credits;
          (empireRow as any).last_resource_update = upd.data.last_resource_update;
          (empireRow as any).credits_remainder_milli = upd.data.credits_remainder_milli;
        }

        if (process.env.ECONOMY_DEBUG === 'true') {
          console.log('[ACCRUAL]', {
            empireId: String((empireRow as any).id),
            creditsPerHour,
            elapsedMs,
            carryMs,
            increment,
            remainderMs,
            oldCredits,
            newCredits,
            updateMs: dt,
          });
        }
      }
    } else {
      // No economy rate; still advance the timestamp and clear remainder to avoid unbounded carry
      if (elapsedMs > 0 || carryMs !== 0 || !(empireRow as any).last_resource_update) {
        await supabase
          .from('empires')
          .update({
            last_resource_update: new Date(nowTs).toISOString(),
            credits_remainder_milli: 0,
          })
          .eq('id', (empireRow as any).id);
        (empireRow as any).last_resource_update = new Date(nowTs).toISOString();
        (empireRow as any).credits_remainder_milli = 0;
      }
    }
  } catch {
    // Non-fatal: leave credits unchanged
  }
  const technologyScore = 0; // placeholder until research tables are integrated
  const fleetScore = 0;
  const level = Math.pow(creditsPerHour * 100 + fleetScore + technologyScore, 0.25);

  const profile = {
    economyPerHour: creditsPerHour,
    fleetScore,
    technologyScore,
    level,
  };

  return res.json({
    success: true,
    data: {
      user,
      empire: empireRow,
      resourcesGained,
      creditsPerHour,
      profile,
      isNewPlayer: false,
      serverInfo: {
        name: 'Alpha Server',
        version: '1.0.0',
        playersOnline: getOnlineUniqueUsersCount(),
        universeSize: { width: 100, height: 100 }
      }
    }
  });

  // Dashboard route now uses only Supabase implementation above
}));

/**
 * Create new empire (deprecated)
 * Empire creation is now automatic during registration.
 */
router.post('/empire', asyncHandler(async (req: AuthRequest, res: Response) => {
  return res.status(410).json({
    success: false,
    error: 'Empire creation is automatic. This endpoint is deprecated.'
  });
}));

// Get empire details
router.get('/empire', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire by user_id, fallback to users.empire_id
  let empireRow: any = null;
  let byUser = await supabase.from('empires').select('id, name, territories, credits').eq('user_id', userId).maybeSingle();
  if (byUser.data) {
    empireRow = byUser.data;
  } else {
    const userRes = await supabase.from('users').select('empire_id').eq('id', userId).maybeSingle();
    if (userRes.data?.empire_id) {
      const byId = await supabase.from('empires').select('id, name, territories, credits, energy').eq('id', userRes.data.empire_id).maybeSingle();
      if (byId.data) empireRow = byId.data;
    }
  }

  if (!empireRow) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  return res.json({
    success: true,
    data: {
      empire: {
        id: empireRow.id,
        name: empireRow.name,
        territories: Array.isArray(empireRow.territories) ? empireRow.territories : [],
        resources: {
          credits: Math.max(0, Number(empireRow.credits || 0)),
          energy: Math.max(0, Number(empireRow.energy || 0)),
        },
      },
      creditsPerHour: 0,
      resourcesGained: 0,
    },
  });
}));

// Update empire resources manually
router.post('/empire/update-resources', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Update empire resources route now uses only Supabase implementation above
}));


// Credit history for current empire
router.get('/credits/history', asyncHandler(async (req: AuthRequest, res: Response) => {
  const limitRaw = Number(req.query.limit || 50);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 200) : 50;

  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  // Fetch credit transactions from Supabase
  const { data: txns, error } = await supabase
    .from('credit_transactions')
    .select('id, amount, type, note, balance_after, created_at')
    .eq('empire_id', empireId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching credit history:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch credit history' });
  }

  return res.json({
    success: true,
    data: {
      history: (txns || []).map(t => ({
        _id: t.id,
        amount: t.amount,
        type: t.type,
        note: t.note || null,
        balanceAfter: typeof t.balance_after === 'number' ? t.balance_after : null,
        createdAt: t.created_at,
      }))
    }
  });
}));

// Territory Management Routes

// Get empire territories
router.get('/territories', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id via empires.user_id or users.empire_id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  // Prefer colonies (name + coord). If none, fall back to empires.territories and fetch locations.
  const coloniesRes = await supabase
    .from('colonies')
    .select('location_coord, name')
    .eq('empire_id', empireId);

  let territories: Array<{ coord: string; name?: string }> = [];
  if ((coloniesRes.data || []).length > 0) {
    territories = (coloniesRes.data as any[]).map((c) => ({ coord: String(c.location_coord), name: c.name || undefined }));
  } else {
    const emp = await supabase.from('empires').select('territories').eq('id', empireId).maybeSingle();
    const coords: string[] = Array.isArray(emp.data?.territories) ? emp.data!.territories : [];
    if (coords.length > 0) {
      const locs = await supabase.from('locations').select('coord').in('coord', coords);
      territories = (locs.data || []).map((l: any) => ({ coord: String(l.coord) }));
    }
  }

  return res.json({ success: true, data: { territories } });
}));

// List buildings at a specific owned location
router.get('/buildings/location/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;
  const { coord } = req.params;
  if (!coord) {
    return res.status(400).json({ success: false, error: 'Missing coord' });
  }

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

  // Ownership check via locations.owner_id
  const loc = await supabase.from('locations').select('owner_id').eq('coord', coord).maybeSingle();
  if (!loc.data) return res.status(404).json({ success: false, error: 'Location not found' });
  if (String(loc.data.owner_id || '') !== String(userId)) {
    return res.status(403).json({ success: false, error: 'You do not own this location' });
  }

  // Fetch buildings at this location for this empire
  const bRes = await supabase
    .from('buildings')
    .select('catalog_key, level, is_active, pending_upgrade, construction_started, construction_completed, credits_cost')
    .eq('empire_id', empireId)
    .eq('location_coord', coord);

  const buildings = (bRes.data || []).map((b: any) => ({
    catalogKey: String(b.catalog_key || ''),
    level: Number(b.level || 0),
    isActive: b.is_active === true,
    pendingUpgrade: b.pending_upgrade === true,
    constructionStarted: b.construction_started ? new Date(b.construction_started) : null,
    constructionCompleted: b.construction_completed ? new Date(b.construction_completed) : null,
    creditsCost: typeof b.credits_cost === 'number' ? b.credits_cost : null,
  }));

  return res.json({ success: true, data: { buildings } });
}));

// Colonization route needs Supabase implementation

/**
 * Test-only seeding endpoint to make Research Start deterministic in E2E.
 * - Ensures the authenticated user's empire has sufficient credits
 * - Ensures the specified (or first) base has at least one active research_lab (level 1)
 * Guarded by NODE_ENV === 'test'
 *
 * DTO (success):
 * {
 *   "success": true,
 *   "data": { "baseCoord": "...", "credits": 50000, "baseLabTotal": 1 },
 *   "message": "Seeded test research lab and credits"
 * }
 */
router.post('/test/seed-research', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(403).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Test-only endpoint disabled (NODE_ENV !== "test")',
      details: { env: process.env.NODE_ENV }
    });
  }

  // Test seed research endpoint now uses only Supabase implementation above
}));

/**
 * Test-only seeding endpoint to make Defenses Start deterministic in E2E.
 * - Tops up credits
 * - Ensures tech prereqs for jump_gate (warp_drive 12, energy 20)
 * - Ensures positive energy projection by adding active solar plants at the base
 * Guarded by NODE_ENV === 'test'
 */
router.post('/test/seed-defenses', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(403).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Test-only endpoint disabled (NODE_ENV !== "test")',
      details: { env: process.env.NODE_ENV }
    });
  }

  // Test seed defenses endpoint now uses only Supabase implementation above
}));

/**
 * Test-only seeding endpoint to make Structures Start deterministic in E2E.
 * - Tops up credits
 * - Broadly raises tech levels so most structures are eligible
 * - Ensures positive energy projection and construction capacity (solar + robotics)
 * Guarded by NODE_ENV === 'test'
 */
router.post('/test/seed-structures', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(403).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Test-only endpoint disabled (NODE_ENV !== "test")',
      details: { env: process.env.NODE_ENV }
    });
  }

  // Test seeding endpoint now uses Supabase implementation
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) {
    return res.status(404).json({ success: false, message: 'Empire not found' });
  }

  // Determine target base coordinate
  let baseCoord = '';
  try {
    baseCoord = String((req.body?.baseCoord ?? '')).trim();
  } catch { baseCoord = ''; }
  if (!baseCoord) {
    const emp = await supabase.from('empires').select('territories').eq('id', empireId).maybeSingle();
    const territories: string[] = Array.isArray(emp.data?.territories) ? emp.data!.territories : [];
    if (territories.length > 0) baseCoord = territories[0];
  }
  if (!baseCoord) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'No base coordinate available to seed (provide baseCoord or colonize first)'
    });
  }

  // Top up credits
  const creditsTargetRaw = (req.body && typeof req.body.credits !== 'undefined') ? Number(req.body.credits) : 100000;
  const creditsTarget = Number.isFinite(creditsTargetRaw) ? creditsTargetRaw : 100000;

  const eRow = await supabase.from('empires').select('credits').eq('id', empireId).maybeSingle();
  const currentCredits = Math.max(0, Number((eRow.data as any)?.credits || 0));
  if (currentCredits < creditsTarget) {
    await supabase.from('empires').update({ credits: creditsTarget }).eq('id', empireId);
  }

  // Broadly raise tech levels to make structures eligible
  const levelTargetRaw = (req.body && typeof req.body.level === 'number') ? Number(req.body.level) : 10;
  const levelTarget = Number.isFinite(levelTargetRaw) ? levelTargetRaw : 10;

  // Update tech levels in empire record (this would need to be implemented in the empire schema)
  // For now, we'll use a placeholder implementation

  // Ensure positive energy projection with active solar plants
  const existingSolar = await supabase
    .from('buildings')
    .select('id, level')
    .eq('empire_id', empireId)
    .eq('location_coord', baseCoord)
    .eq('catalog_key', 'solar_plants')
    .eq('is_active', true)
    .maybeSingle();

  if (!existingSolar.data) {
    await supabase
      .from('buildings')
      .insert({
        empire_id: empireId,
        location_coord: baseCoord,
        catalog_key: 'solar_plants',
        level: 30,
        is_active: true,
        construction_completed: new Date().toISOString(),
        credits_cost: 0,
      });
  } else {
    await supabase
      .from('buildings')
      .update({ level: Math.max(30, Number((existingSolar.data as any).level || 1)) })
      .eq('id', (existingSolar.data as any).id);
  }

  // Ensure construction capacity with active robotic factories
  const existingRobo = await supabase
    .from('buildings')
    .select('id, level')
    .eq('empire_id', empireId)
    .eq('location_coord', baseCoord)
    .eq('catalog_key', 'robotic_factories')
    .eq('is_active', true)
    .maybeSingle();

  if (!existingRobo.data) {
    await supabase
      .from('buildings')
      .insert({
        empire_id: empireId,
        location_coord: baseCoord,
        catalog_key: 'robotic_factories',
        level: 10,
        is_active: true,
        construction_completed: new Date().toISOString(),
        credits_cost: 0,
      });
  } else {
    await supabase
      .from('buildings')
      .update({ level: Math.max(10, Number((existingRobo.data as any).level || 1)) })
      .eq('id', (existingRobo.data as any).id);
  }

  return res.json({
    success: true,
    data: { baseCoord, credits: creditsTarget, levelTarget },
    message: 'Seeded test structures prerequisites (credits, tech, energy, capacity)'
  });
}));

/**
 * Test-only cleanup endpoint to remove queued buildings for idempotency testing.
 * Guarded by NODE_ENV === 'test'
 */
router.delete('/test/buildings/queued/:catalogKey', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(403).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Test-only endpoint disabled (NODE_ENV !== "test")',
      details: { env: process.env.NODE_ENV }
    });
  }

  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) {
    return res.status(404).json({ success: false, message: 'Empire not found' });
  }

  const { catalogKey } = req.params;
  if (!catalogKey) {
    return res.status(400).json({ success: false, message: 'catalogKey required' });
  }

  // Remove any inactive (queued) buildings with this catalogKey for this empire
  const { data, error } = await supabase
    .from('buildings')
    .delete()
    .eq('empire_id', empireId)
    .eq('catalog_key', catalogKey)
    .eq('is_active', false)
    .select('id');

  if (error) {
    console.error('Error cleaning up queued buildings:', error);
    return res.status(500).json({ success: false, message: 'Failed to cleanup queued buildings' });
  }

  const deletedCount = data?.length || 0;

  return res.json({
    success: true,
    data: { deletedCount, catalogKey },
    message: `Cleaned up ${deletedCount} queued ${catalogKey} buildings`
  });
}));

// Research Management Routes

// Get empire research projects
router.get('/research', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) {
    return res.status(404).json({
      success: false,
      error: 'Empire not found'
    });
  }

  // For now, return empty array as research projects haven't been fully implemented in Supabase yet
  // This maintains API compatibility while the research system is being migrated
  res.json({
    success: true,
    data: { researchProjects: [] }
  });
}));

/**
 * Phase A Technology Routes
 * - Credits-based level-1 unlocks
 * - Gated by sum of research_lab levels at the selected base
 * - Prerequisites per technology (empire-wide levels)
 */

// Get technology catalog
router.get('/tech/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const catalog = getTechnologyList();
  res.json({
    success: true,
    data: { catalog }
  });
}));

// Get tech status for a specific base (labs, eligibility, credits)
router.get('/tech/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;
  const baseCoord = String(req.query.base || '').trim();
  if (!baseCoord) return res.status(400).json({ success: false, error: 'Missing base coordinate (?base=...)' });

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

const { TechService } = await import('../services/tech/TechService');
  const status = await TechService.getStatus(userId, empireId, baseCoord);
  res.json({
    success: true,
    data: { status }
  });
}));

// Start technology research with capacity-driven ETA
router.post('/tech/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;
  const { locationCoord, techKey } = req.body as { locationCoord?: string; techKey?: TechnologyKey };
  console.log('[tech/start] Request:', { userId, locationCoord, techKey, body: req.body });
  if (!locationCoord || !techKey) {
    console.log('[tech/start] Missing required params');
    return res.status(400).json({ success: false, error: 'locationCoord and techKey are required' });
  }

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

  const { TechService } = await import('../services/tech/TechService');
  const result = await TechService.start(userId, empireId, locationCoord, techKey as any);
  if (!result.success) {
    const statusCode = (result as any).code === 'ALREADY_IN_PROGRESS' ? 409 : 400;
    return res.status(statusCode).json(result);
  }
  return res.json({ success: true, data: (result as any).data, message: (result as any).message });
}));

/**
 * Structures (Buildings Phase A) Routes
 * Tech-only gating; maps to existing Building types and cost model.
 */

// Catalog
router.get('/structures/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const catalog = getBuildingsList();
  res.json({
    success: true,
    data: { catalog }
  });
}));

// Get structures queue
router.get('/structures/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

  const locationCoord = String(req.query.base || '').trim() || undefined;
const { StructuresService } = await import('../services/structures/StructuresService');
const queue = await StructuresService.getQueue(empireId, locationCoord);
  return res.json({ success: true, data: { queue } });
}));

// Cancel structures construction
router.delete('/structures/cancel/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

  const { coord } = req.params;
  if (!coord) return res.status(400).json({ success: false, error: 'Missing coord' });

  // Validate location ownership
  const { data: location } = await supabase
    .from('locations')
    .select('coord, owner')
    .eq('coord', coord)
    .maybeSingle();

  if (!location) return res.status(404).json({ success: false, error: 'Location not found' });
  if (location.owner !== userId) {
    return res.status(403).json({ success: false, error: 'You do not own this location' });
  }

const { StructuresService } = await import('../services/structures/StructuresService');
const result = await StructuresService.cancel(empireId, coord);

  if (!result.success) {
    const statusCode = (result as any).code === 'NO_ACTIVE_CONSTRUCTION' ? 404 : 400;
    return res.status(statusCode).json(result);
  }

  return res.json(result);
}));

/**
 * Defenses Routes (Citizen capacity driven)
 */
router.get('/defenses/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const catalog = getDefensesList();
  res.json({ success: true, data: { catalog } });
}));

router.get('/defenses/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

const { DefensesService } = await import('../services/defenses/DefensesService');
const status = await DefensesService.getStatus(empireId);
  return res.json({ success: true, data: { status } });
}));

router.get('/defenses/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

  const locationCoord = String(req.query.locationCoord || '').trim() || undefined;

  // Build query for defense queue
  let query = supabase
    .from('defense_queue')
    .select('id, defense_key, started_at, completes_at, location_coord')
    .eq('empire_id', empireId)
    .eq('status', 'pending');

  if (locationCoord) {
    query = query.eq('location_coord', locationCoord);
  }

  const { data: items } = await query.order('completes_at', { ascending: true, nullsFirst: false });

  const queue = (items || []).map((it: any) => ({
    id: String(it.id || ''),
    defenseKey: String(it.defense_key || ''),
    startedAt: it.started_at || null,
    completesAt: it.completes_at || null,
    baseCoord: String(it.location_coord || '')
  }));

  return res.json({ success: true, data: { queue } });
}));

router.post('/defenses/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

  const { locationCoord, defenseKey } = req.body as { locationCoord?: string; defenseKey?: DefenseKey };
  if (!locationCoord || !defenseKey) {
    return res.status(400).json({ success: false, error: 'locationCoord and defenseKey are required' });
  }

const { DefensesService } = await import('../services/defenses/DefensesService');
const result = await DefensesService.start(empireId, locationCoord, defenseKey);
  if (!result.success) {
    const errorResponse: any = {
      success: false,
      error: (result as any).error ?? (result as any).message,
      message: (result as any).message ?? (result as any).error
    };
    if ((result as any).code) errorResponse.code = (result as any).code;
    if ((result as any).details) errorResponse.details = (result as any).details;
    if ((result as any).reasons) errorResponse.reasons = (result as any).reasons;
    const statusCode = (result as any).code === 'ALREADY_IN_PROGRESS' ? 409 : 400;
    return res.status(statusCode).json(errorResponse);
  }

  return res.json({ success: true, data: result.data, message: result.message });
}));

// Cancel a pending defense item
router.delete('/defenses/queue/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ success: false, error: 'Invalid queue item id' });

  const { data: qItem } = await supabase
    .from('defense_queue')
    .select('id, empire_id, defense_key, status, started_at, completes_at')
    .eq('id', id)
    .maybeSingle();

  if (!qItem || String((qItem as any).empire_id) !== empireId) {
    return res.status(404).json({ success: false, error: 'Queue item not found' });
  }

  if (String((qItem as any).status || '') !== 'pending') {
    return res.status(400).json({ success: false, error: 'Only pending items can be cancelled' });
  }

  // Check if in progress (has started and not yet completed)
  if ((qItem as any).started_at && (qItem as any).completes_at) {
    const completesAt = new Date((qItem as any).completes_at).getTime();
    if (completesAt > Date.now()) {
      return res.status(400).json({ success: false, error: 'Cannot cancel an in-progress defense yet' });
    }
  }

  await supabase.from('defense_queue').update({ status: 'cancelled' }).eq('id', id);
  return res.json({ success: true, data: { cancelledId: id }, message: 'Defense construction cancelled' });
}));

/**
 * Units Routes (Phase A)
 * Tech-only gating; start is not implemented yet (friendly error after validation).
 */
router.get('/units/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const catalog = getUnitsList();
  res.json({ success: true, data: { catalog } });
}));

router.get('/units/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Resolve user -> empire id
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  const { data: userRow } = await supabase
    .from('users')
    .select('id, empire_id')
    .eq('id', userId)
    .maybeSingle();

  let { data: empireRow } = await supabase
    .from('empires')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!empireRow && (userRow as any)?.empire_id) {
    const byId = await supabase
      .from('empires')
      .select('id')
      .eq('id', (userRow as any).empire_id)
      .maybeSingle();
    empireRow = byId.data as any;
  }

  if (!empireRow) return res.status(404).json({ success: false, error: 'Empire not found' });

const { UnitsService } = await import('../services/units/UnitsService');
  const locationCoord = String(req.query.locationCoord || '').trim() || undefined;
const status = await UnitsService.getStatus((empireRow as any).id, locationCoord);
  return res.json({ success: true, data: { status } });
}));

router.post('/units/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  const { data: userRow } = await supabase
    .from('users')
    .select('id, empire_id')
    .eq('id', userId)
    .maybeSingle();

  let { data: empireRow } = await supabase
    .from('empires')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!empireRow && (userRow as any)?.empire_id) {
    const byId = await supabase
      .from('empires')
      .select('id')
      .eq('id', (userRow as any).empire_id)
      .maybeSingle();
    empireRow = byId.data as any;
  }

  if (!empireRow) return res.status(404).json({ success: false, error: 'Empire not found' });

  const { locationCoord, unitKey } = req.body as { locationCoord?: string; unitKey?: UnitKey };
  if (!locationCoord || !unitKey) {
    return res.status(400).json({ success: false, error: 'locationCoord and unitKey are required' });
  }

const { UnitsService } = await import('../services/units/UnitsService');
const result = await UnitsService.start(userId, (empireRow as any).id, locationCoord, unitKey);
  if (!(result as any).success) {
    const errorResponse: any = {
      success: false,
      error: (result as any).error ?? (result as any).message,
      message: (result as any).message ?? (result as any).error,
    };
    if ((result as any).code) errorResponse.code = (result as any).code;
    if ((result as any).details) errorResponse.details = (result as any).details;
    if ((result as any).reasons) errorResponse.reasons = (result as any).reasons;
    const statusCode = (result as any).code === 'ALREADY_IN_PROGRESS' ? 409 : 400;
    return res.status(statusCode).json(errorResponse);
  }

  return res.json({ success: true, data: (result as any).data, message: (result as any).message });
}));

/**
 * Units Production Queue
 * Lists active unit production (capacity-driven) for the authenticated empire.
 * Optional ?base=A00:10:22:10 to filter by a specific base coord.
 */
router.get('/units/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  const { data: userRow } = await supabase
    .from('users')
    .select('id, empire_id')
    .eq('id', userId)
    .maybeSingle();

  let { data: empireRow } = await supabase
    .from('empires')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!empireRow && (userRow as any)?.empire_id) {
    const byId = await supabase
      .from('empires')
      .select('id')
      .eq('id', (userRow as any).empire_id)
      .maybeSingle();
    empireRow = byId.data as any;
  }

  if (!empireRow) return res.status(404).json({ success: false, error: 'Empire not found' });

  const base = String(req.query.base || '').trim() || undefined;
const { UnitsService } = await import('../services/units/UnitsService');
const queue = await UnitsService.getQueue((empireRow as any).id, base);

  const transformed = (queue || []).map((item: any) => {
    const key = String(item.unit_key || '');
    let unitName = key;
    let creditsCost = 0;
    try {
      const spec = getUnitSpec(key as UnitKey);
      unitName = spec?.name || key;
      creditsCost = Math.max(0, Number(spec?.creditsCost || 0));
    } catch {}
    return {
      id: String(item.id || ''),
      unitKey: key,
      unitName,
      quantity: 1,
      totalQuantity: 1,
      startedAt: String(item.started_at || new Date().toISOString()),
      completesAt: String(item.completes_at || new Date().toISOString()),
      creditsCost,
      baseCoord: String(item.location_coord || ''),
    };
  });

  return res.json({ success: true, data: { queue: transformed } });
}));

// Cancel a pending unit production queue item
router.delete('/units/queue/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  
    const user = req.user! as any;
    const userId = user?._id || user?.id;

    const { data: userRow } = await supabase
      .from('users')
      .select('id, empire_id')
      .eq('id', userId)
      .maybeSingle();

    let { data: empireRow } = await supabase
      .from('empires')
      .select('id, credits')
      .eq('user_id', userId)
      .maybeSingle();

    if (!empireRow && (userRow as any)?.empire_id) {
      const byId = await supabase
        .from('empires')
        .select('id, credits')
        .eq('id', (userRow as any).empire_id)
        .maybeSingle();
      empireRow = byId.data as any;
    }

    if (!empireRow) return res.status(404).json({ success: false, error: 'Empire not found' });

    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, error: 'Invalid queue item id' });

    const { data: qItem } = await supabase
      .from('unit_queue')
      .select('id, empire_id, unit_key, status, completes_at')
      .eq('id', id)
      .maybeSingle();

    if (!qItem || String((qItem as any).empire_id) !== String((empireRow as any).id)) {
      return res.status(404).json({ success: false, error: 'Queue item not found' });
    }

    if (String((qItem as any).status || '') !== 'pending') {
      return res.status(400).json({ success: false, error: 'Only pending items can be cancelled' });
    }

    // Optional refund like Mongo path
    let refundedCredits: number | null = null;
    try {
      const spec = getUnitSpec(String((qItem as any).unit_key) as UnitKey);
      refundedCredits = Math.max(0, Number(spec?.creditsCost || 0));
      const currentCredits = Math.max(0, Number((empireRow as any).credits || 0));
      await supabase.from('empires').update({ credits: currentCredits + refundedCredits }).eq('id', (empireRow as any).id);
    } catch {}

    await supabase.from('unit_queue').update({ status: 'cancelled' }).eq('id', id);

    return res.json({ success: true, data: { cancelledId: id, refundedCredits }, message: 'Unit production cancelled' });
}));

/**
 * Bases summary for Empire page
 * Returns compact info per base: name, location, economy, occupier, construction, production, research
 */
router.get('/bases/summary', asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user! as any;
    const userId = user?._id || user?.id;

    // Load user and empire (by user_id then by users.empire_id)
    const { data: userRow } = await supabase
      .from('users')
      .select('id, username, email, empire_id')
      .eq('id', userId)
      .single();

    let { data: empireRow } = await supabase
      .from('empires')
      .select('id, territories')
      .eq('user_id', userId)
      .maybeSingle();

    if (!empireRow && userRow?.empire_id) {
      const byId = await supabase
        .from('empires')
        .select('id, territories')
        .eq('id', userRow.empire_id)
        .maybeSingle();
      empireRow = byId.data as any;
    }

    if (!empireRow) {
      return res.json({ success: true, data: { bases: [] } });
    }

    const coords: string[] = Array.isArray((empireRow as any).territories) ? (empireRow as any).territories : [];
    if (!coords.length) {
      return res.json({ success: true, data: { bases: [] } });
    }

    // Load locations and colonies
    const [locRes, colRes] = await Promise.all([
      supabase.from('locations').select('coord').in('coord', coords),
      supabase.from('colonies').select('location_coord, name').eq('empire_id', (empireRow as any).id).in('location_coord', coords),
    ]);

    const locations = locRes.data || [];
    const colonies = colRes.data || [];
    const colonyByCoord = new Map<string, any>((colonies as any[]).map((c) => [c.location_coord, c]));

    // Research summary: earliest scheduled pending; otherwise earliest unscheduled pending
    let researchSummary: { name: string; remaining: number; percent: number } | null = null;
    try {
      const now = Date.now();
      // Scheduled
      const sched = await supabase
        .from('tech_queue')
        .select('tech_key, started_at, completes_at')
        .eq('empire_id', (empireRow as any).id)
        .eq('status', 'pending')
        .not('completes_at', 'is', null)
        .order('completes_at', { ascending: true })
        .limit(1);

      let item: any = (sched.data && sched.data[0]) || null;

      if (!item) {
        // Unscheduled: order by created_at
        const unsched = await supabase
          .from('tech_queue')
          .select('tech_key, started_at, completes_at, created_at')
          .eq('empire_id', (empireRow as any).id)
          .eq('status', 'pending')
          .is('completes_at', null)
          .order('created_at', { ascending: true })
          .limit(1);
        item = (unsched.data && unsched.data[0]) || null;
      }

      if (item) {
        let name = '';
        try {
          name = getTechSpec(String(item.tech_key) as any).name;
        } catch {
          name = String(item.tech_key || '');
        }
        let remaining = 0;
        let percent = 0;
        if (item.completes_at && item.started_at) {
          const st = new Date(item.started_at as any).getTime();
          const et = new Date(item.completes_at as any).getTime();
          if (Number.isFinite(st) && Number.isFinite(et) && et > st) {
            remaining = Math.max(0, et - now);
            const total = et - st;
            const elapsed = Math.max(0, now - st);
            percent = Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)));
          }
        }
        researchSummary = { name, remaining, percent };
      }
    } catch {
      // non-fatal
    }

    // Construction/Production/Defense queues (pending) by base
    const nowTs = Date.now();
    const [buildingQ, unitQ, defQ] = await Promise.all([
      supabase
        .from('buildings')
        .select('catalog_key, location_coord, construction_started, construction_completed')
        .eq('empire_id', (empireRow as any).id)
        .eq('is_active', false)
        .gt('construction_completed', new Date(nowTs).toISOString())
        .in('location_coord', coords),
      supabase
        .from('unit_queue')
        .select('unit_key, location_coord, started_at, completes_at, created_at')
        .eq('empire_id', (empireRow as any).id)
        .eq('status', 'pending')
        .in('location_coord', coords),
      supabase
        .from('defense_queue')
        .select('defense_key, location_coord, started_at, completes_at, created_at')
        .eq('empire_id', (empireRow as any).id)
        .eq('status', 'pending')
        .in('location_coord', coords),
    ]);

    const consQueuedByCoord = new Map<string, number>();
    const consEarliestByCoord = new Map<string, { name: string; remaining: number; percent?: number; ts: number }>();
    const prodQueuedByCoord = new Map<string, number>();
    const prodEarliestByCoord = new Map<string, { name: string; remaining: number; percent?: number; ts: number }>();
    const defQueuedByCoord = new Map<string, number>();
    const defEarliestByCoord = new Map<string, { name: string; remaining: number; percent?: number; ts: number }>();

    // Buildings (construction)
    for (const b of buildingQ.data || []) {
      const lc = String((b as any).location_coord || '');
      if (!lc) continue;
      consQueuedByCoord.set(lc, 1); // single active construction model

      // Determine ordering
      const completesVal = (b as any).construction_completed as string | null;
      const startedVal = (b as any).construction_started as string | null;
      const orderTs = completesVal ? new Date(completesVal).getTime() : Number.POSITIVE_INFINITY;

      // Resolve display name
      let name = '';
      const key = String((b as any).catalog_key || '');
      if (key) {
        try {
          const spec = getBuildingSpec(key as any);
          name = spec?.name || key;
        } catch {
          name = key;
        }
      }

      // Remaining/percent if scheduled
      let remaining = 0;
      let percent: number | undefined = undefined;
      if (completesVal && startedVal) {
        const st = new Date(startedVal).getTime();
        const et = new Date(completesVal).getTime();
        if (Number.isFinite(st) && Number.isFinite(et) && et > st) {
          remaining = Math.max(0, et - nowTs);
          const total = et - st;
          const elapsed = Math.max(0, nowTs - st);
          percent = Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)));
        }
      }

      const prev = consEarliestByCoord.get(lc);
      if (!prev || orderTs < prev.ts) {
        consEarliestByCoord.set(lc, { name, remaining, percent, ts: orderTs });
      }
    }

    // Units
    for (const u of unitQ.data || []) {
      const lc = String((u as any).location_coord || '');
      if (!lc) continue;
      prodQueuedByCoord.set(lc, (prodQueuedByCoord.get(lc) || 0) + 1);

      // Determine ordering
      const completesVal = (u as any).completes_at as string | null;
      const createdVal = (u as any).created_at as string | null;
      const startedVal = (u as any).started_at as string | null;
      const orderTs = completesVal ? new Date(completesVal).getTime() : (createdVal ? new Date(createdVal).getTime() : Number.POSITIVE_INFINITY);

      // Resolve display name
      let name = '';
      const key = String((u as any).unit_key || '');
      if (key) {
        try {
          const spec = getUnitSpec(key as any);
          name = spec?.name || key;
        } catch {
          name = key;
        }
      }

      // Remaining/percent if scheduled
      let remaining = 0;
      let percent: number | undefined = undefined;
      if (completesVal && startedVal) {
        const st = new Date(startedVal).getTime();
        const et = new Date(completesVal).getTime();
        if (Number.isFinite(st) && Number.isFinite(et) && et > st) {
          remaining = Math.max(0, et - nowTs);
          const total = et - st;
          const elapsed = Math.max(0, nowTs - st);
          percent = Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)));
        }
      }

      const prev = prodEarliestByCoord.get(lc);
      if (!prev || orderTs < prev.ts) {
        prodEarliestByCoord.set(lc, { name, remaining, percent, ts: orderTs });
      }
    }

    // Defenses
    for (const d of defQ.data || []) {
      const lc = String((d as any).location_coord || '');
      if (!lc) continue;
      defQueuedByCoord.set(lc, (defQueuedByCoord.get(lc) || 0) + 1);

      const completesVal = (d as any).completes_at as string | null;
      const createdVal = (d as any).created_at as string | null;
      const startedVal = (d as any).started_at as string | null;
      const orderTs = completesVal ? new Date(completesVal).getTime() : (createdVal ? new Date(createdVal).getTime() : Number.POSITIVE_INFINITY);

      let name = '';
      const key = String((d as any).defense_key || '');
      if (key) {
        try {
          const spec = getDefensesList().find((it) => String((it as any).key) === key);
          name = (spec as any)?.name || key;
        } catch {
          name = key;
        }
      }

      let remaining = 0;
      let percent: number | undefined = undefined;
      if (completesVal && startedVal) {
        const st = new Date(startedVal).getTime();
        const et = new Date(completesVal).getTime();
        if (Number.isFinite(st) && Number.isFinite(et) && et > st) {
          remaining = Math.max(0, et - nowTs);
          const total = et - st;
          const elapsed = Math.max(0, nowTs - st);
          percent = Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)));
        }
      }

      const prev = defEarliestByCoord.get(lc);
      if (!prev || orderTs < prev.ts) {
        defEarliestByCoord.set(lc, { name, remaining, percent, ts: orderTs });
      }
    }

    const bases = (locations as any[]).map((loc) => {
      const coord = String(loc.coord);
      const colony = colonyByCoord.get(coord);
      return {
        baseId: coord,
        name: colony?.name || `Base ${coord}`,
        location: coord,
        economy: { metalPerHour: 0, energyPerHour: 0, researchPerHour: 0 },
        occupier: null,
        construction: { queued: consQueuedByCoord.get(coord) || 0, next: (() => { const n = consEarliestByCoord.get(coord); if (!n) return undefined; const { ts, ...rest } = n; return rest; })() },
        production: { queued: prodQueuedByCoord.get(coord) || 0, next: (() => { const n = prodEarliestByCoord.get(coord); if (!n) return undefined; const { ts, ...rest } = n; return rest; })() },
        defenses: { queued: defQueuedByCoord.get(coord) || 0, next: (() => { const n = defEarliestByCoord.get(coord); if (!n) return undefined; const { ts, ...rest } = n; return rest; })() },
        research: researchSummary,
      };
    });

return res.json({ success: true, data: { bases } });
}));

/**
 * Base Stats (Phase A visibility)
 * Returns area, energy, population budgets and owner income for a base.
 */
router.get('/base-stats/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;
  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

  const { coord } = req.params as { coord: string };
  if (!coord) return res.status(400).json({ success: false, error: 'Missing coord' });

const { StatsService } = require('../services/bases/StatsService');
const stats = await StatsService.getBaseStats(empireId, coord);
  return res.json({ success: true, data: { stats } });
}));

/**
 * Capacities Routes (Phase 1)
 * Computes Construction/Production/Research capacities for a base.
 */
router.get('/capacities/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;
  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

  const { coord } = req.params as { coord: string };
  if (!coord) return res.status(400).json({ success: false, error: 'Missing coord' });

const { CapacityService } = require('../services/bases/CapacityService');
const caps = await CapacityService.getBaseCapacities(empireId, coord);
  return res.json({ success: true, data: caps });
}));

/**
 * Base composite stats for a specific base (aggregates base-stats + capacities)
 * DTO: { success, data: { coord, stats, capacities }, message }
 */
router.get('/bases/:coord/stats', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Supabase implementation: combine base stats + capacities
  const user = req.user! as any;
  const userId = user?._id || user?.id;
  const { coord } = req.params as { coord: string };
  if (!coord) return res.status(400).json({ success: false, error: 'Missing coord' });

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

const { StatsService } = require('../services/bases/StatsService');
const { CapacityService } = require('../services/bases/CapacityService');

  const [stats, capacities] = await Promise.all([
    StatsService.getBaseStats(empireId, coord),
    CapacityService.getBaseCapacities(empireId, coord)
  ]);

  return res.json({ success: true, data: { coord, stats, capacities }, message: 'Base stats loaded' });
}));

/**
 * Base Defenses (aggregated levels per defense type at a base)
 * DTO: { success, data: { coord, defenseLevels: Array<{ key, name, level, energyDelta }>, inProgress: Array<{ key, name, completesAt }> }, message }
 */
router.get('/bases/:coord/defenses', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Supabase implementation: defenses not yet modeled -> return empty but valid payload
  const { coord } = req.params as { coord: string };
  if (!coord) return res.status(400).json({ success: false, error: 'Missing coord' });
  return res.json({ success: true, data: { coord, defenseLevels: [], inProgress: [] }, message: 'Base defenses loaded' });
}));

/**
 * Structures list for a specific base (catalogKey-first with ETA)
 * DTO: { success, data: { coord, constructionPerHour, items: [...] }, message }
 */
router.get('/bases/:coord/structures', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

  const { coord } = req.params as { coord: string };
  if (!coord) return res.status(400).json({ success: false, error: 'Missing coord' });

  const { CapacityService } = require('../services/bases/CapacityService');
  const caps = await CapacityService.getBaseCapacities(empireId, coord);

  // Current buildings at base
  const bRes = await supabase
    .from('buildings')
    .select('catalog_key, level, is_active, pending_upgrade, construction_started, construction_completed, credits_cost')
    .eq('empire_id', empireId)
    .eq('location_coord', coord);

  // Finalize any completed constructions client-side-like: if completed <= now, treat as active
  const nowTs = Date.now();

  // Compute current levels by catalog_key (active + pendingUpgrade treated as current)
  const levelByKey = new Map<string, number>();
  for (const b of bRes.data || []) {
    const key = String((b as any).catalog_key || '');
    if (!key) continue;
    const level = Math.max(0, Number((b as any).level || 0));
    const isActive = (b as any).is_active === true;
    const pendingUpgrade = (b as any).pending_upgrade === true;
    const completes = (b as any).construction_completed ? new Date((b as any).construction_completed as any).getTime() : 0;
    const effectiveActive = isActive || pendingUpgrade || (completes && completes <= nowTs);
    if (effectiveActive) {
      levelByKey.set(key, (levelByKey.get(key) || 0) + level);
    }
  }

  // Determine currently active construction (earliest future completion among inactive docs)
  let activeConstruction: { key: BuildingKey; completionAt: string; startedAt?: string; currentLevel: number; targetLevel: number; creditsCost: number; pendingUpgrade: boolean } | null = null;
  let earliest = Number.POSITIVE_INFINITY;
  for (const b of bRes.data || []) {
    const isActive = (b as any).is_active === true;
    const completes = (b as any).construction_completed ? new Date((b as any).construction_completed as any).getTime() : 0;
    if (!isActive && completes && completes > nowTs && completes < earliest) {
      earliest = completes;
      const key = String((b as any).catalog_key || '') as BuildingKey;
      const st = (b as any).construction_started ? new Date((b as any).construction_started as any).toISOString() : undefined;
      const level = Math.max(1, Number((b as any).level || 1));
      const pendingUpgrade = (b as any).pending_upgrade === true;
      const currentLevel = pendingUpgrade ? level : 0;
      const targetLevel = pendingUpgrade ? level + 1 : level;
      const creditsCost = Math.max(0, Number((b as any).credits_cost || 0));
      activeConstruction = { key, completionAt: new Date(completes).toISOString(), startedAt: st, currentLevel, targetLevel, creditsCost, pendingUpgrade };
    }
  }

  const constructionPerHour = Math.max(0, Number((caps as any)?.construction?.value || 0));

  const catalog = getBuildingsList();
  const items = catalog.map((spec) => {
    const key = spec.key as BuildingKey;
    const currentLevel = levelByKey.get(key) ?? 0;
    const nextLevel = currentLevel + 1;
    let creditsCostNext: number | null = null;
    try {
      creditsCostNext = getStructureCreditCostForLevel(key, nextLevel);
    } catch {
      creditsCostNext = currentLevel === 0 ? spec.creditsCost : null;
    }
    // For Phase 1, report eligibility as default-true; detailed gating enforced on start()
    const canStart = true;
    const reasons: string[] = [];

    let etaMinutes: number | null = null;
    if (typeof creditsCostNext === 'number' && constructionPerHour > 0) {
      const hours = creditsCostNext / constructionPerHour;
      etaMinutes = Math.max(1, Math.ceil(hours * 60));
    }

    return {
      key,
      name: spec.name,
      currentLevel,
      nextLevel,
      creditsCostNext,
      energyDelta: Number(spec.energyDelta || 0),
      requires: spec.techPrereqs?.map((p) => ({ key: p.key, level: p.level })) || [],
      canStart,
      reasons,
      etaMinutes,
    };
  });

  return res.json({ success: true, data: { coord, constructionPerHour, items, activeConstruction }, message: 'Base structures loaded' });
}));

/**
 * v0 Construction: start a single active construction at a base.
 * - No queueing. Reject if another construction is in progress at this base.
 * - Tech-only gating; no refunds/cancel in v0.
 */
router.post('/bases/:coord/structures/:key/construct', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;
  const { coord, key } = req.params as { coord: string; key: BuildingKey };
  if (!coord || !key) return res.status(400).json({ success: false, error: 'Missing coord or key' });

    // Resolve empire id
    let empireId: string | null = null;
    const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
    if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
    if (!empireId) {
      const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
      if (e.data?.id) empireId = String(e.data.id);
    }
    if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

    // Ownership check: location owner must be user
    const loc = await supabase.from('locations').select('owner_id, result').eq('coord', coord).maybeSingle();
    if (!loc.data) return res.status(404).json({ success: false, error: 'Location not found' });
    if (String(loc.data.owner_id || '') !== String(userId)) return res.status(403).json({ success: false, error: 'You do not own this location' });

    // Reject if a construction is already in progress at this base
    const now = Date.now();
    const inProg = await supabase
      .from('buildings')
      .select('id')
      .eq('empire_id', empireId)
      .eq('location_coord', coord)
      .eq('is_active', false)
      .gt('construction_completed', new Date(now).toISOString());
    if ((inProg.data || []).length > 0) {
      return res.status(409).json({ success: false, code: 'ALREADY_IN_PROGRESS', error: 'Construction already underway at this base' });
    }

    // Prevent duplicate key queued
    const dupKey = await supabase
      .from('buildings')
      .select('id')
      .eq('empire_id', empireId)
      .eq('location_coord', coord)
      .eq('catalog_key', key)
      .eq('is_active', false)
      .limit(1);
    if ((dupKey.data || []).length > 0) {
      return res.status(409).json({ success: false, code: 'ALREADY_IN_PROGRESS', error: 'Construction for this structure is already queued or upgrading at this base' });
    }

    // Capacity
const { CapacityService } = require('../services/bases/CapacityService');
const caps = await CapacityService.getBaseCapacities(empireId, coord);
    const perHour = Math.max(0, Number((caps as any)?.construction?.value || 0));
    if (!(perHour > 0)) return res.status(400).json({ success: false, code: 'NO_CAPACITY', error: 'This base has no construction capacity' });

    // Determine current level
    const existingActive = await supabase
      .from('buildings')
      .select('id, level')
      .eq('empire_id', empireId)
      .eq('location_coord', coord)
      .eq('catalog_key', key)
      .eq('is_active', true)
      .maybeSingle();
    const currentLevel = existingActive.data ? Math.max(1, Number((existingActive.data as any).level || 1)) : 0;
    const nextLevel = currentLevel + 1;

    // Cost
    let cost: number | null = null;
    try {
      cost = getStructureCreditCostForLevel(key, nextLevel);
    } catch {
      const spec0 = getBuildingSpec(key);
      cost = currentLevel === 0 ? spec0.creditsCost : null;
    }
    if (typeof cost !== 'number') return res.status(400).json({ success: false, code: 'NO_COST_DEFINED', error: 'No cost defined for this level' });

    // Credits validation
    const eRow = await supabase.from('empires').select('credits').eq('id', empireId).maybeSingle();
    const availableCredits = Math.max(0, Number((eRow.data as any)?.credits || 0));
    if (availableCredits < cost) {
      return res.status(400).json({ success: false, code: 'INSUFFICIENT_RESOURCES', error: `Insufficient credits. Requires ${cost}, you have ${availableCredits}.`, details: { requiredCredits: cost, availableCredits, shortfall: cost - availableCredits } });
    }

    // Energy validation (projected)
    const spec = getBuildingSpec(key);
    const energyDelta = Number(spec?.energyDelta || 0);
    if (energyDelta < 0) {
      // Compute current balance using active buildings
      const activeRes = await supabase
        .from('buildings')
        .select('catalog_key, level, is_active, pending_upgrade, construction_completed')
        .eq('empire_id', empireId)
        .eq('location_coord', coord);
      const active: Array<{ key: string; level: number; isActive: boolean }> = [];
      const nowTs = Date.now();
      for (const b of activeRes.data || []) {
        const isActive = (b as any).is_active === true;
        const pending = (b as any).pending_upgrade === true;
        const completes = (b as any).construction_completed ? new Date((b as any).construction_completed as any).getTime() : 0;
        const eff = isActive || pending || (completes && completes <= nowTs);
        const lv = Math.max(0, Number((b as any).level || 0));
        const k = String((b as any).catalog_key || '');
        if (eff && k && lv > 0) active.push({ key: k, level: lv, isActive: true });
      }
      const solar = Math.max(0, Number((loc.data as any)?.result?.solarEnergy ?? 0));
      const gas = Math.max(0, Number((loc.data as any)?.result?.yields?.gas ?? 0));
      const { produced, consumed, balance } = computeEnergyBalance({ buildingsAtBase: active, location: { solarEnergy: solar, gasYield: gas }, includeQueuedReservations: false });
      const projected = balance + energyDelta;
      if (projected < 0) {
        return res.status(400).json({ success: false, code: 'INSUFFICIENT_ENERGY', error: 'Insufficient energy capacity to start this construction.', details: { produced, consumed, balance, energyDelta, projectedEnergy: projected } });
      }
    }

    // Area & population validations
    const { StatsService } = require('../services/bases/StatsService');
    const stats = await StatsService.getBaseStats(empireId, coord);
    const areaRequired = Math.max(0, Number(spec?.areaRequired ?? 1));
    if (areaRequired > 0 && stats.area.free < areaRequired) return res.status(400).json({ success: false, code: 'INSUFFICIENT_AREA', error: 'Insufficient area capacity to start this construction.', details: { required: areaRequired, available: stats.area.free, used: stats.area.used, total: stats.area.total } });
    const populationRequired = Math.max(0, Number(spec?.populationRequired || 0));
    if (populationRequired > 0 && stats.population.free < populationRequired) return res.status(400).json({ success: false, code: 'INSUFFICIENT_POPULATION', error: 'Insufficient population capacity to start this construction.', details: { required: populationRequired, available: stats.population.free, used: stats.population.used, capacity: stats.population.capacity } });

    // ETA & writes
    const hours = (cost as number) / perHour;
    const completesAt = new Date(now + Math.max(1, Math.ceil(hours * 3600)) * 1000).toISOString();

    // CRITICAL: Perform database operations BEFORE deducting credits to prevent credit loss on DB errors
    if (!existingActive.data) {
      // Insert new queued L1
      const ins = await supabase
        .from('buildings')
        .insert({
          empire_id: empireId,
          location_coord: coord,
          catalog_key: key,
          type: key, // Required NOT NULL field - use catalog_key as type for consistency
          display_name: spec.name,
          level: 1,
          is_active: false,
          pending_upgrade: false,
          credits_cost: cost,
          construction_started: new Date(now).toISOString(),
          construction_completed: completesAt,
        })
        .select('id')
        .single();
      if (ins.error) {
        console.error('[Structures] Failed to insert building:', ins.error);
        return res.status(500).json({ success: false, code: 'DB_ERROR', error: 'Failed to queue construction', details: ins.error.message });
      }
    } else {
      // Upgrade existing active doc
      const upd = await supabase
        .from('buildings')
        .update({
          is_active: false,
          pending_upgrade: true,
          credits_cost: cost,
          construction_started: new Date(now).toISOString(),
          construction_completed: completesAt,
        })
        .eq('id', (existingActive.data as any).id);
      if (upd.error) {
        console.error('[Structures] Failed to update building for upgrade:', upd.error);
        return res.status(500).json({ success: false, code: 'DB_ERROR', error: 'Failed to queue upgrade', details: upd.error.message });
      }
    }

    // Only deduct credits after successful database operation
    const creditDeduction = await supabase
      .from('empires')
      .update({ credits: availableCredits - (cost as number) })
      .eq('id', empireId);
    
    if (creditDeduction.error) {
      console.error('[Structures] Failed to deduct credits after successful building creation:', creditDeduction.error);
      // This is a critical inconsistency - building was created but credits weren't deducted
      // Log it but don't fail the request since the building is already created
    }

    return res.json({ success: true, data: { coord, key, completesAt }, message: 'Construction started' });
}));

/**
 * Technology Research Queue
 * Lists active tech research (capacity-driven) for the authenticated empire.
 * Optional ?base=A00:10:22:10 to filter by a specific base coord.
 */
router.get('/tech/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user! as any;
    const userId = user?._id || user?.id;
    const base = String(req.query.base || '').trim();

    // Resolve empire id
    let empireId: string | null = null;
    const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
    if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
    if (!empireId) {
      const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
      if (e.data?.id) empireId = String(e.data.id);
    }
    if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

    const { TechService } = await import('../services/tech/TechService');
    const queue = await TechService.getQueue(empireId, base || undefined);
    console.log('[tech/queue] Returning queue:', { empireId, base, queueLength: queue.length, queue });
    return res.json({ success: true, data: { queue } });
}));

// Cancel a pending technology research queue item
router.delete('/tech/queue/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user! as any;
    const userId = user?._id || user?.id;

    // Resolve empire id
    let empireId: string | null = null;
    const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
    if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
    if (!empireId) {
      const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
      if (e.data?.id) empireId = String(e.data.id);
    }
    if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });

    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, error: 'Invalid queue item id' });

    // Fetch the queue item
    const { data: qItem, error: fetchError } = await supabase
      .from('tech_queue')
      .select('id, empire_id, tech_key, level, status, location_coord')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[tech/queue/:id DELETE] Error fetching item:', fetchError);
      return res.status(500).json({ success: false, error: 'Error fetching queue item' });
    }

    if (!qItem || String((qItem as any).empire_id) !== empireId) {
      return res.status(404).json({ success: false, error: 'Queue item not found' });
    }

    if (String((qItem as any).status || '') !== 'pending') {
      return res.status(400).json({ success: false, error: 'Only pending items can be cancelled' });
    }

    // Calculate refund
    let refundedCredits: number | null = null;
    try {
      const techKey = String((qItem as any).tech_key || '');
      const level = Math.max(1, Number((qItem as any).level || 1));
      const spec = getTechSpec(techKey as TechnologyKey);
      const credits = getTechCreditCostForLevel(spec, level);
      refundedCredits = credits;

      // Update empire credits
      const { data: empire } = await supabase
        .from('empires')
        .select('credits')
        .eq('id', empireId)
        .single();

      if (empire) {
        const currentCredits = Number(empire.credits || 0);
        await supabase
          .from('empires')
          .update({ credits: currentCredits + credits })
          .eq('id', empireId);

        // Log transaction (best effort)
try {
            // TODO: Implement credit ledger service
          } catch {}
      }
    } catch (e) {
      // If refund calculation fails, still proceed with cancellation
      console.warn('[tech/queue/:id DELETE] Refund calculation failed:', e);
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('tech_queue')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (updateError) {
      console.error('[tech/queue/:id DELETE] Error cancelling item:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to cancel queue item' });
    }

    return res.json({
      success: true,
      data: { cancelledId: id, refundedCredits },
      message: 'Research queue item cancelled'
    });
}));

/**
 * Base Units (MVP)
 * Returns aggregate counts of completed units at a specific base for the authenticated empire.
 * DTO: { success, data: { base, counts: Record<UnitKey, number>, total }, message }
 */
router.get('/base-units', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id || req.user!.id;
  
  // Get empire for current user
  const { data: userRow } = await supabase
    .from('users')
    .select('empire_id')
    .eq('id', userId)
    .maybeSingle();

  if (!userRow?.empire_id) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }
  
  const baseCoord = String(req.query.base || '').trim();
  if (!baseCoord) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Missing base coordinate (?base=...)',
      details: { field: 'base' }
    });
  }

  try {
    // Get completed units at this base for this empire
    const { data: completedUnits } = await supabase
      .from('units')
      .select('unit_key, count')
      .eq('empire_id', userRow.empire_id)
      .eq('location_coord', baseCoord)
      .eq('status', 'completed');

    const counts: Record<string, number> = {};
    let total = 0;
    
    (completedUnits || []).forEach(unit => {
      const key = String(unit.unit_key || '');
      const count = Math.max(0, Number(unit.count || 0));
      if (key) {
        counts[key] = (counts[key] || 0) + count;
        total += count;
      }
    });

    return res.json({
      success: true,
      data: { base: baseCoord, counts, total },
      message: 'Base units loaded'
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to load base units',
      details: { base: baseCoord }
    });
  }
}));

/**
 * Fleets — list fleets for current empire (optional ?base=coord)
 * DTO: { success, data: { fleets: [{ _id, name, ownerName, arrival, sizeCredits }] } }
 */
router.get('/fleets', asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!._id || req.user!.id;

    // Get empire for current user
    const { data: userRow } = await supabase
      .from('users')
      .select('empire_id')
      .eq('id', userId)
      .maybeSingle();

    if (!userRow?.empire_id) {
      return res.status(404).json({ success: false, error: 'Empire not found' });
    }

    // Get empire details for owner name
    const { data: empireRow } = await supabase
      .from('empires')
      .select('id, name')
      .eq('id', userRow.empire_id)
      .maybeSingle();

    if (!empireRow) {
      return res.status(404).json({ success: false, error: 'Empire not found' });
    }

    // Build query for fleets
    const baseCoord = String(req.query.base || '').trim();
    let query = supabase
      .from('fleets')
      .select('id, name, size_credits, created_at')
      .eq('empire_id', empireRow.id)
      .order('created_at', { ascending: true });

    // Add location filter if base coordinate provided
    if (baseCoord) {
      query = query.eq('location_coord', baseCoord);
    }

    const { data: fleets, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        code: 'DB_ERROR',
        error: error.message
      });
    }

    // Format response to match MongoDB structure
    const rows = (fleets || []).map((f: any) => ({
      _id: String(f.id),
      name: String(f.name),
      ownerName: empireRow.name,
      arrival: null as null, // stationed at base
      sizeCredits: Number(f.size_credits || 0),
    }));

    return res.json({
      success: true,
      data: { fleets: rows }
    });
}));

/**
 * Fleets Overview — public view for a base
 * Returns all stationed fleets at the base (any empire) and any inbound movements to that base.
 * Query: ?base=COORD
 * DTO: { success, data: { fleets: [{ _id, name, ownerName, arrival, sizeCredits }] } }
 */
router.get('/fleets-overview', asyncHandler(async (req: AuthRequest, res: Response) => {
  const baseCoord = String(req.query.base || '').trim();
  if (!baseCoord) {
    return res.status(400).json({ success: false, error: 'Missing base coordinate (?base=...)' });
  }
    // ========== SUPABASE PATH ==========
    try {
      // 1) Query stationed fleets at this base (all empires)
      const { data: stationedFleets, error: fleetsError } = await supabase
        .from('fleets')
        .select('id, empire_id, name, size_credits')
        .eq('location_coord', baseCoord);

      if (fleetsError) {
        return res.status(500).json({
          success: false,
          code: 'DB_ERROR',
          error: fleetsError.message
        });
      }

      // Collect empire IDs for name lookup
      const empireIds = new Set<string>();
      for (const f of stationedFleets || []) {
        if (f.empire_id) empireIds.add(String(f.empire_id));
      }

      // 2) Query inbound fleet movements to this base (pending/travelling)
      const { data: incomingMovements, error: movementsError } = await supabase
        .from('fleet_movements')
        .select('id, empire_id, fleet_id, estimated_arrival_time, size_credits')
        .eq('destination_coord', baseCoord)
        .in('status', ['pending', 'travelling']);

      if (movementsError) {
        return res.status(500).json({
          success: false,
          code: 'DB_ERROR',
          error: movementsError.message
        });
      }

      // Collect empire IDs from movements
      for (const m of incomingMovements || []) {
        if (m.empire_id) empireIds.add(String(m.empire_id));
      }

      // 3) Lookup empire names
      const empireNameById = new Map<string, string>();
      if (empireIds.size > 0) {
        const { data: empireDocs, error: empiresError } = await supabase
          .from('empires')
          .select('id, name')
          .in('id', Array.from(empireIds));

        if (!empiresError && empireDocs) {
          for (const e of empireDocs) {
            empireNameById.set(String(e.id), String(e.name || 'Unknown'));
          }
        }
      }

      // 4) For inbound movements, lookup fleet names
      const inboundFleetIds = Array.from(new Set((incomingMovements || []).map(m => String(m.fleet_id))));
      const inboundFleetById = new Map<string, any>();
      
      if (inboundFleetIds.length > 0) {
        const { data: inboundFleetDocs, error: inboundFleetsError } = await supabase
          .from('fleets')
          .select('id, name, size_credits')
          .in('id', inboundFleetIds);

        if (!inboundFleetsError && inboundFleetDocs) {
          for (const f of inboundFleetDocs) {
            inboundFleetById.set(String(f.id), f);
          }
        }
      }

      // 5) Build response rows
      const rows: Array<{ _id: string; name: string; ownerName: string; arrival: string | null; sizeCredits: number }> = [];

      // Add stationed fleets
      for (const f of stationedFleets || []) {
        rows.push({
          _id: String(f.id),
          name: String(f.name),
          ownerName: empireNameById.get(String(f.empire_id)) || 'Unknown',
          arrival: null, // stationed at base
          sizeCredits: Number(f.size_credits || 0),
        });
      }

      // Add incoming movements
      for (const m of incomingMovements || []) {
        const fleetDoc = inboundFleetById.get(String(m.fleet_id));
        rows.push({
          _id: String(m.id), // movement id as unique row id
          name: fleetDoc ? String(fleetDoc.name) : 'Inbound Fleet',
          ownerName: empireNameById.get(String(m.empire_id)) || 'Unknown',
          arrival: m.estimated_arrival_time ? new Date(m.estimated_arrival_time).toISOString() : null,
          sizeCredits: Number(m.size_credits || (fleetDoc?.size_credits ?? 0)),
        });
      }

      return res.json({ success: true, data: { fleets: rows } });
    } catch (err) {
      return res.status(500).json({
        success: false,
        code: 'SERVER_ERROR',
        error: 'Failed to load fleet overview',
        details: { base: baseCoord }
      });
    }
}));
/**
 * Fleet detail — composition and metadata
 * DTO: { success, data: { fleet: { _id, name, locationCoord, ownerName, units: [{ unitKey, name, count }], sizeCredits } } }
 */
router.get('/fleets/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id || '').trim();
  if (!id) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Invalid fleet id',
      details: { field: 'id' }
    });
  }
    // ========== SUPABASE PATH ==========
    const userId = req.user!._id || req.user!.id;

    // Get empire for current user
    const { data: userRow } = await supabase
      .from('users')
      .select('empire_id')
      .eq('id', userId)
      .maybeSingle();

    if (!userRow?.empire_id) {
      return res.status(404).json({ success: false, error: 'Empire not found' });
    }

    // Get empire details
    const { data: empireRow } = await supabase
      .from('empires')
      .select('id, name')
      .eq('id', userRow.empire_id)
      .maybeSingle();

    if (!empireRow) {
      return res.status(404).json({ success: false, error: 'Empire not found' });
    }

    // Query fleet by ID with empire ownership check
    const { data: fleet, error } = await supabase
      .from('fleets')
      .select('id, name, location_coord, units, size_credits')
      .eq('id', id)
      .eq('empire_id', empireRow.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        code: 'DB_ERROR',
        error: error.message
      });
    }

    if (!fleet) {
      return res.status(404).json({ success: false, error: 'Fleet not found' });
    }

    // Parse and format fleet composition
    const units = Array.isArray(fleet.units) ? fleet.units : [];
    const composition = units.map((u: any) => {
      const key = String(u?.unitKey || u?.unit_key || '');
      let name = key;
      try {
        name = getUnitSpec(key as any)?.name || key;
      } catch {
        // fallback to key
      }
      return { unitKey: key, name, count: Number(u?.count || 0) };
    });

    return res.json({
      success: true,
      data: {
        fleet: {
          _id: String(fleet.id),
          name: String(fleet.name),
          locationCoord: String(fleet.location_coord),
          ownerName: empireRow.name,
          units: composition,
          sizeCredits: Number(fleet.size_credits || 0),
        }
      }
    });
}));

/**
 * Fleet Movement Routes
 */

/**
 * Dispatch fleet to new location
 * POST /game/fleets/:id/dispatch
 * Body: { destinationCoord: string }
 * DTO: { success, data: { movement }, message }
 */
router.post('/fleets/:id/dispatch', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id || req.user!.id;

  const fleetId = String(req.params.id || '').trim();
  if (!fleetId) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Invalid fleet id',
      details: { field: 'id' }
    });
  }

  const { destinationCoord } = req.body as { destinationCoord?: string };
  if (!destinationCoord || typeof destinationCoord !== 'string') {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'destinationCoord is required',
      details: { field: 'destinationCoord' }
    });
  }

  // Get empire for current user
  const { data: userRow } = await supabase
    .from('users')
    .select('empire_id')
    .eq('id', userId)
    .maybeSingle();

  if (!userRow?.empire_id) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  try {
const result = await FleetMovementService.dispatchFleet(
      fleetId,
      userRow.empire_id,
      { destinationCoord }
    );

    if (!result.success) {
      const statusCode = result.code === 'FLEET_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        code: result.code,
        message: result.error || 'Failed to dispatch fleet'
      });
    }

    return res.json({
      success: true,
      data: {
        movement: result.movement
      },
      message: 'Fleet dispatched successfully'
    });

  } catch (error) {
    console.error('Error dispatching fleet:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to dispatch fleet'
    });
  }
}));

/**
 * Get fleet status including movement information
 * GET /game/fleets/:id/status
 * DTO: { success, data: { fleet, movement } }
 */
router.get('/fleets/:id/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const fleetId = String(req.params.id || '').trim();
  if (!fleetId) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Invalid fleet id',
      details: { field: 'id' }
    });
  }

  const userId = req.user!._id || req.user!.id;

  // Get empire for current user
  const { data: userRow } = await supabase
    .from('users')
    .select('empire_id')
    .eq('id', userId)
    .maybeSingle();

  if (!userRow?.empire_id) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  try {
    // Get fleet
    const { data: fleet, error: fleetError } = await supabase
      .from('fleets')
      .select('id, name, location_coord, units, size_credits')
      .eq('id', fleetId)
      .eq('empire_id', userRow.empire_id)
      .maybeSingle();

    if (fleetError || !fleet) {
      return res.status(404).json({
        success: false,
        code: 'FLEET_NOT_FOUND',
        message: 'Fleet not found'
      });
    }

    // Get active movement
    const { data: movement } = await supabase
      .from('fleet_movements')
      .select('*')
      .eq('fleet_id', fleetId)
      .in('status', ['pending', 'travelling'])
      .maybeSingle();

    // Format fleet composition
    const units = Array.isArray(fleet.units) ? fleet.units : [];
    const composition = units.map((u: any) => {
      const key = String(u?.unitKey || u?.unit_key || '');
      let name = key;
      try {
        name = getUnitSpec(key as any)?.name || key;
      } catch {
        // fallback to key
      }
      return { unitKey: key, name, count: Number(u?.count || 0) };
    });

    return res.json({
      success: true,
      data: {
        fleet: {
          _id: String(fleet.id),
          name: String(fleet.name),
          locationCoord: String(fleet.location_coord),
          units: composition,
          sizeCredits: Number(fleet.size_credits || 0),
          isMoving: !!movement
        },
        movement: movement ? {
          _id: String(movement.id),
          status: movement.status,
          originCoord: movement.origin_coord,
          destinationCoord: movement.destination_coord,
          departureTime: movement.departure_time,
          estimatedArrivalTime: movement.estimated_arrival_time,
          actualArrivalTime: movement.actual_arrival_time,
          travelTimeHours: movement.travel_time_hours,
          distance: movement.distance,
          fleetSpeed: movement.fleet_speed
        } : null
      }
    });

  } catch (error) {
    console.error('Error getting fleet status:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to get fleet status'
    });
  }
}));

/**
 * Estimate travel time for fleet dispatch
 * POST /game/fleets/:id/estimate-travel
 * Body: { destinationCoord: string }
 * DTO: { success, data: { travelTimeHours, distance, fleetSpeed } }
 */
router.post('/fleets/:id/estimate-travel', asyncHandler(async (req: AuthRequest, res: Response) => {
  const fleetId = String(req.params.id || '').trim();
  if (!fleetId) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Invalid fleet id',
      details: { field: 'id' }
    });
  }

  const { destinationCoord } = req.body as { destinationCoord?: string };
  if (!destinationCoord || typeof destinationCoord !== 'string') {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'destinationCoord is required',
      details: { field: 'destinationCoord' }
    });
  }

  const userId = req.user!._id || req.user!.id;

  // Get empire for current user
  const { data: userRow } = await supabase
    .from('users')
    .select('empire_id')
    .eq('id', userId)
    .maybeSingle();

  if (!userRow?.empire_id) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  try {
    // Get fleet
    const { data: fleet, error: fleetError } = await supabase
      .from('fleets')
      .select('id, location_coord, units')
      .eq('id', fleetId)
      .eq('empire_id', userRow.empire_id)
      .maybeSingle();

    if (fleetError || !fleet) {
      return res.status(404).json({
        success: false,
        code: 'FLEET_NOT_FOUND',
        message: 'Fleet not found'
      });
    }

    // Calculate travel time using FleetMovementService methods
    const units = Array.isArray(fleet.units) ? fleet.units : [];
const distance = FleetMovementService.calculateDistance(fleet.location_coord, destinationCoord);
const fleetSpeed = FleetMovementService.calculateFleetSpeed(units);
const travelTimeHours = FleetMovementService.calculateTravelTime(distance, fleetSpeed);

    return res.json({
      success: true,
      data: {
        travelTimeHours,
        distance,
        fleetSpeed
      }
    });

  } catch (error) {
    console.error('Error estimating travel time:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to estimate travel time'
    });
  }
}));

/**
 * Recall fleet (cancel movement)
 * PUT /game/fleets/:id/recall
 * Body: { reason?: string }
 * DTO: { success, data: { movement }, message }
 */
router.put('/fleets/:id/recall', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id || req.user!.id;
  const fleetId = String(req.params.id || '').trim();
  if (!fleetId) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Invalid fleet id',
      details: { field: 'id' }
    });
  }
  
  // Get empire for current user
  const { data: userRow } = await supabase
    .from('users')
    .select('empire_id')
    .eq('id', userId)
    .maybeSingle();

  if (!userRow?.empire_id) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { reason } = req.body as { reason?: string };

  try {
const result = await FleetMovementService.recallFleet(
      fleetId,
      userRow.empire_id,
      reason
    );

    if (!result.success) {
      const statusCode = result.code === 'NO_ACTIVE_MOVEMENT' ? 400 : 409;
      return res.status(statusCode).json({
        success: false,
        code: result.code,
        message: result.error || 'Failed to recall fleet'
      });
    }

    return res.json({
      success: true,
      data: {
        movement: result.movement
      },
      message: 'Fleet recalled successfully'
    });

  } catch (error) {
    console.error('Error recalling fleet:', error);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to recall fleet'
    });
  }
}));

export default router;
