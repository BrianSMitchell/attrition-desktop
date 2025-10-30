import { AuthRequest } from '../../middleware/auth';
import { Response, Router } from 'express';
import { supabase } from '../../config/supabase';

// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../constants/response-formats';
import { createBaseRouter, asyncHandler } from './baseRouter';
import {
  getBuildingsList,
  BuildingKey,
  getBuildingSpec,
  getStructureCreditCostForLevel,
  computeEnergyBalance
} from '@game/shared';

const router = createBaseRouter();

// Add deprecation notice middleware for all building/structure routes
router.use((req, res, next) => {
  res.setHeader('X-Deprecated-Path', 'Use /api/game/structures/* instead');
  next();
});

// Get buildings catalog
// Get structures catalog
/**
 * @deprecated Use /api/game/structures/catalog instead
 */
router.get('/structures/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const { StructureService } = await import('../../services/structures/StructureService');
  const { data, error } = await StructureService.getCatalog();
  if (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: error });
  }
  res.json({ success: true, data: { catalog: data } });
}));

/**
 * @deprecated Use /api/game/defenses/catalog instead
 */
router.get('/defenses/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.setHeader('X-Deprecated-Path', 'Use /api/game/defenses/catalog instead');
  const { getDefensesCatalog } = await import('../../services/structures/structures.data');
  const catalog = getDefensesCatalog();
  res.json({ success: true, data: { catalog } });
}));

// List buildings at a specific owned location
router.get('/location/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;
  const { coord } = req.params;
  if (!coord) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED });
  }

  // Resolve empire using the service
  let empireId: string | null = null;
  const userRow = await supabase.from(DB_TABLES.USERS).select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from(DB_TABLES.EMPIRES).select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });

  // Ownership check via locations.owner_id
  const loc = await supabase.from(DB_TABLES.LOCATIONS).select('owner_id').eq('coord', coord).maybeSingle();
  if (!loc.data) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.LOCATION_NOT_FOUND });
  if (String(loc.data.owner_id || '') !== String(userId)) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, error: 'You do not own this location' });
  }

  // Fetch buildings at this location for this empire
  const bRes = await supabase
    .from(DB_TABLES.BUILDINGS)
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

// Get structures queue
// Get details for base including structure capacities and levels
router.get('/base/:coord/structures', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;
  const { coord } = req.params;
  if (!coord) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED });

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from(DB_TABLES.USERS).select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from(DB_TABLES.EMPIRES).select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });

  // Get base capacities
  const { CapacityService } = await import('../../services/bases/CapacityService');
  const caps = await CapacityService.getBaseCapacities(empireId, coord);

  // Current buildings at base
  const bRes = await supabase
    .from(DB_TABLES.BUILDINGS)
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
    const key = String((b as any).catalog_key || '') as BuildingKey;
    const completes = (b as any).construction_completed ? new Date((b as any).construction_completed as any).getTime() : 0;
    const starts = (b as any).construction_started ? new Date((b as any).construction_started as any).getTime() : 0;
    if (!key || !completes || !starts || completes <= nowTs) continue;
    const isActive = (b as any).is_active === true;
    const pendingUpgrade = (b as any).pending_upgrade === true;
    if (isActive || pendingUpgrade) continue;
    if (completes < earliest) {
      earliest = completes;
      activeConstruction = {
        key,
        completionAt: new Date(completes).toISOString(),
        startedAt: new Date(starts).toISOString(),
        currentLevel: Math.max(0, Number((b as any).level || 0)),
        targetLevel: Math.max(1, Number((b as any).level || 0)),
        creditsCost: Number((b as any).credits_cost || 0),
        pendingUpgrade: false
      };
    }
  }

  res.json({
    success: true,
    data: { 
      constructionPerHour: Math.max(0, Number((caps as any)?.construction?.value || 0)),
      activeConstruction,
      levelByKey: Object.fromEntries(levelByKey)
    }
  });
}));

router.get('/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from(DB_TABLES.USERS).select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from(DB_TABLES.EMPIRES).select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });

  const locationCoord = String(req.query.base || '').trim() || undefined;

  const { StructuresService } = await import('../../services/structures/StructuresService');
  const queue = await StructuresService.getQueue(empireId, locationCoord);
  return res.json({ success: true, data: { queue } });
}));

// Cancel structures construction
router.delete('/cancel/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from(DB_TABLES.USERS).select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from(DB_TABLES.EMPIRES).select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });

  const { coord } = req.params;
  if (!coord) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED });

  // Validate location ownership
  const { data: location } = await supabase
    .from(DB_TABLES.LOCATIONS)
    .select('owner_id')
    .eq('coord', coord)
    .maybeSingle();

  if (!location) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.LOCATION_NOT_FOUND });
  if (location.owner_id !== userId) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, error: 'You do not own this location' });
  }

  const { StructuresService } = await import('../../services/structures/StructuresService');
  const result = await StructuresService.cancel(empireId, coord);

  if (!result.success) {
    const statusCode = (result as any).code === 'NO_ACTIVE_CONSTRUCTION' ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
    return res.status(statusCode).json(result);
  }

  return res.json(result);
}));

// Start construction of a building
router.post('/:coord/construct/:key', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;
  const { coord, key } = req.params as { coord: string; key: BuildingKey };
  if (!coord || !key) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Missing coord or key' });

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from(DB_TABLES.USERS).select('id, empire_id').eq('id', userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from(DB_TABLES.EMPIRES).select('id').eq('user_id', userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });

  // Ownership check: location owner must be user
  const loc = await supabase.from(DB_TABLES.LOCATIONS).select('owner_id, result').eq('coord', coord).maybeSingle();
  if (!loc.data) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.LOCATION_NOT_FOUND });
  if (String(loc.data.owner_id || '') !== String(userId)) return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, error: 'You do not own this location' });

  // Reject if a construction is already in progress at this base
  const now = Date.now();
  const inProg = await supabase
    .from(DB_TABLES.BUILDINGS)
    .select('id')
    .eq('empire_id', empireId)
    .eq('location_coord', coord)
    .eq('is_active', false)
    .gt('construction_completed', new Date(now).toISOString());
  if ((inProg.data || []).length > 0) {
    return res.status(HTTP_STATUS.CONFLICT).json({ success: false, code: 'ALREADY_IN_PROGRESS', error: 'Construction already underway at this base' });
  }

  // Prevent duplicate key queued
  const dupKey = await supabase
    .from(DB_TABLES.BUILDINGS)
    .select('id')
    .eq('empire_id', empireId)
    .eq('location_coord', coord)
    .eq('catalog_key', key)
    .eq('is_active', false)
    .limit(1);
  if ((dupKey.data || []).length > 0) {
    return res.status(HTTP_STATUS.CONFLICT).json({ success: false, code: 'ALREADY_IN_PROGRESS', error: 'Construction for this structure is already queued or upgrading at this base' });
  }

  // Get capacity
  const { CapacityService } = await import('../../services/bases/CapacityService');
  const caps = await CapacityService.getBaseCapacities(empireId, coord);
  const perHour = Math.max(0, Number((caps as any)?.construction?.value || 0));
  if (!(perHour > 0)) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, code: 'NO_CAPACITY', error: 'This base has no construction capacity' });

  // Determine current level
  const existingActive = await supabase
    .from(DB_TABLES.BUILDINGS)
    .select('id, level')
    .eq('empire_id', empireId)
    .eq('location_coord', coord)
    .eq('catalog_key', key)
    .eq('is_active', true)
    .maybeSingle();
  const currentLevel = existingActive.data ? Math.max(1, Number((existingActive.data as any).level || 1)) : 0;
  const nextLevel = currentLevel + 1;

  // Calculate cost
  let cost: number | null = null;
  try {
    cost = getStructureCreditCostForLevel(key, nextLevel);
  } catch {
    const spec0 = getBuildingSpec(key);
    cost = currentLevel === 0 ? spec0.creditsCost : null;
  }
  if (typeof cost !== 'number') return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, code: 'NO_COST_DEFINED', error: 'No cost defined for this level' });

  // Credits validation
  const eRow = await supabase.from(DB_TABLES.EMPIRES).select('credits').eq('id', empireId).maybeSingle();
  const availableCredits = Math.max(0, Number((eRow.data as any)?.credits || 0));
  if (availableCredits < cost) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, code: 'INSUFFICIENT_RESOURCES', error: `Insufficient credits. Requires ${cost}, you have ${availableCredits}.`, details: { requiredCredits: cost, availableCredits, shortfall: cost - availableCredits } });
  }

  // Energy validation (projected)
  const spec = getBuildingSpec(key);
  const energyDelta = Number(spec?.energyDelta || 0);
  if (energyDelta < 0) {
    // Compute current balance using active buildings
    const activeRes = await supabase
      .from(DB_TABLES.BUILDINGS)
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
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, code: 'INSUFFICIENT_ENERGY', error: 'Insufficient energy capacity to start this construction.', details: { produced, consumed, balance, energyDelta, projectedEnergy: projected } });
    }
  }

  // Calculate stats and validate area/population requirements
  const { StatsService } = await import('../../services/bases/StatsService');
  const stats = await StatsService.getBaseStats(empireId, coord);
  const areaRequired = Math.max(0, Number(spec?.areaRequired ?? 1));
  if (areaRequired > 0 && stats.area.free < areaRequired) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, code: 'INSUFFICIENT_AREA', error: 'Insufficient area capacity to start this construction.', details: { required: areaRequired, available: stats.area.free, used: stats.area.used, total: stats.area.total } });
  const populationRequired = Math.max(0, Number(spec?.populationRequired || 0));
  if (populationRequired > 0 && stats.population.free < populationRequired) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, code: 'INSUFFICIENT_POPULATION', error: 'Insufficient population capacity to start this construction.', details: { required: populationRequired, available: stats.population.free, used: stats.population.used, capacity: stats.population.capacity } });

  // Calculate ETA and start construction
  const hours = (cost as number) / perHour;
  const completesAt = new Date(now + Math.max(1, Math.ceil(hours * 3600)) * 1000).toISOString();

  // CRITICAL: Perform database operations BEFORE deducting credits to prevent credit loss on DB errors
  if (!existingActive.data) {
    // Insert new queued L1
    const ins = await supabase
      .from(DB_TABLES.BUILDINGS)
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, code: 'DB_ERROR', error: 'Failed to queue construction', details: ins.error.message });
    }
  } else {
    // Upgrade existing active doc
    const upd = await supabase
      .from(DB_TABLES.BUILDINGS)
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, code: 'DB_ERROR', error: 'Failed to queue upgrade', details: upd.error.message });
    }
  }

  // Only deduct credits after successful database operation
  const creditDeduction = await supabase
    .from(DB_TABLES.EMPIRES)
    .update({ credits: availableCredits - (cost as number) })
    .eq('id', empireId);

  if (creditDeduction.error) {
    console.error('[Structures] Failed to deduct credits after successful building creation:', creditDeduction.error);
    // This is a critical inconsistency - building was created but credits weren't deducted
    // Log it but don't fail the request since the building is already created
  }

  return res.json({ success: true, data: { coord, key, completesAt }, message: 'Construction started' });
}));

export const structuresRouter = router;
export default router;







