import { Router, Response } from 'express';
import { supabase } from '../../../config/supabase';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticate, AuthRequest } from '../../../middleware/auth';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../../constants/response-formats';
import { DB_TABLES, DB_FIELDS } from '../../../constants/database-fields';
import {
  BuildingKey,
  DefenseKey,
  TechnologyKey,
  UnitKey,
  getTechnologyList,
  getBuildingsList,
  getDefensesList,
  getUnitsList,
  getUnitSpec,
  getTechSpec,
  getStructureCreditCostForLevel,
  getBuildingSpec 
} from '@game/shared';
import { EmpireResolutionService } from '../../../services/EmpireResolutionService';

const router = Router();

router.use(authenticate);

/**
 * List empire territories/bases
 * GET /api/game/bases
 * 
 * Migrated from /api/v1/territory - Essential functionality for base management
 * Returns list of bases with coordinates and names (FR-16)
 * 
 * Response DTO: { success: boolean, data: { territories: Array<{coord: string, name?: string}> } }
 */
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);

  // Prefer colonies (name + coord). If none, fall back to empires.territories and fetch locations.
  const coloniesRes = await supabase
    .from(DB_TABLES.COLONIES)
    .select('location_coord, name')
    .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId);

  let territories: Array<{ coord: string; name?: string }> = [];
  if ((coloniesRes.data || []).length > 0) {
    territories = (coloniesRes.data as any[]).map((c) => ({ coord: String(c.location_coord), name: c.name || undefined }));
  } else {
    const emp = await supabase.from(DB_TABLES.EMPIRES).select(DB_FIELDS.EMPIRES.TERRITORIES).eq(DB_FIELDS.BUILDINGS.ID, empireId).maybeSingle();
    const coords: string[] = Array.isArray(emp.data?.territories) ? emp.data!.territories : [];
    if (coords.length > 0) {
      const locs = await supabase.from(DB_TABLES.LOCATIONS).select('coord').in('coord', coords);
      territories = (locs.data || []).map((l: any) => ({ coord: String(l.coord) }));
    }
  }

  return res.json({ success: true, data: { territories } });
}));

/**
 * Base Statistics endpoint
 * GET /api/game/bases/:coord/stats
 * 
 * Migrated from /api/v1/territory/base-stats/:coord - Essential for base management UI (FR-16)
 * Returns area, energy, population budgets and owner income for a base
 * 
 * Response DTO: { success: boolean, data: { stats: object } }
 */
router.get('/:coord/stats', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const { coord } = req.params as { coord: string };
  if (!coord) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED });

  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);

  const { StatsService } = await import('../../../services/bases/StatsService');
  const stats = await StatsService.getBaseStats(empireId, coord);
  return res.json({ success: true, data: { stats } });
}));

/**
 * Base Capacities endpoint
 * GET /api/game/bases/:coord/capacities
 * 
 * Migrated from /api/v1/territory/capacities/:coord - Required for construction/production planning (FR-16)
 * Computes Construction/Production/Research capacities for a base
 * 
 * Response DTO: { success: boolean, data: capacities }
 */
router.get('/:coord/capacities', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const { coord } = req.params as { coord: string };
  if (!coord) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED });

  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);

  const { CapacityService } = await import('../../../services/bases/CapacityService');
  const caps = await CapacityService.getBaseCapacities(empireId, coord);
  return res.json({ success: true, data: caps });
}));

/**
 * Combined Base Stats endpoint
 * GET /api/game/bases/:coord/combined-stats
 * 
 * Migrated from /api/v1/territory/bases/:coord/stats - Convenience endpoint combining stats + capacities (FR-16)
 * Returns comprehensive base information with stats and capacities
 * 
 * Response DTO: { success: boolean, data: { coord, stats, capacities }, message }
 */
router.get('/:coord/combined-stats', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const { coord } = req.params as { coord: string };
  if (!coord) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED });

  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);

  const { StatsService } = await import('../../../services/bases/StatsService');
  const { CapacityService } = await import('../../../services/bases/CapacityService');

  const [stats, capacities] = await Promise.all([
    StatsService.getBaseStats(empireId, coord),
    CapacityService.getBaseCapacities(empireId, coord)
  ]);

  return res.json({ success: true, data: { coord, stats, capacities }, message: 'Base stats loaded' });
}));

/**
 * Base summaries for Empire page
 * Returns compact info per base: name, location, economy, occupier, construction, production, research
 */
router.get('/summary', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Load user and empire (by user_id then by users.empire_id)
  const { data: userRow } = await supabase
    .from(DB_TABLES.USERS)
    .select('id, username, email, empire_id')
    .eq(DB_FIELDS.BUILDINGS.ID, userId)
    .single();

  let { data: empireRow } = await supabase
    .from(DB_TABLES.EMPIRES)
    .select('id, territories')
    .eq(DB_FIELDS.EMPIRES.USER_ID, userId)
    .maybeSingle();

  if (!empireRow && userRow?.empire_id) {
    const byId = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('id, territories')
      .eq(DB_FIELDS.BUILDINGS.ID, userRow.empire_id)
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
    supabase.from(DB_TABLES.LOCATIONS).select('coord').in('coord', coords),
    supabase.from(DB_TABLES.COLONIES).select('location_coord, name').eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, (empireRow as any).id).in(DB_FIELDS.BUILDINGS.LOCATION_COORD, coords),
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
      .from(DB_TABLES.TECH_QUEUE)
      .select('tech_key, started_at, completes_at')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, (empireRow as any).id)
      .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending')
      .not(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, 'is', null)
      .order(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, { ascending: true })
      .limit(1);

    let item: any = (sched.data && sched.data[0]) || null;

    if (!item) {
      // Unscheduled: order by created_at
      const unsched = await supabase
        .from(DB_TABLES.TECH_QUEUE)
        .select('tech_key, started_at, completes_at, created_at')
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, (empireRow as any).id)
        .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending')
        .is(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, null)
        .order(DB_FIELDS.BUILDINGS.CREATED_AT, { ascending: true })
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
      .from(DB_TABLES.BUILDINGS)
      .select('catalog_key, location_coord, construction_started, construction_completed')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, (empireRow as any).id)
      .eq(DB_FIELDS.BUILDINGS.IS_ACTIVE, false)
      .gt(DB_FIELDS.BUILDINGS.CONSTRUCTION_COMPLETED, new Date(nowTs).toISOString())
      .in(DB_FIELDS.BUILDINGS.LOCATION_COORD, coords),
    supabase
      .from(DB_TABLES.UNIT_QUEUE)
      .select('unit_key, location_coord, started_at, completes_at, created_at')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, (empireRow as any).id)
      .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending')
      .in(DB_FIELDS.BUILDINGS.LOCATION_COORD, coords),
    supabase
      .from(DB_TABLES.DEFENSE_QUEUE)
      .select('defense_key, location_coord, started_at, completes_at, created_at')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, (empireRow as any).id)
      .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending')
      .in(DB_FIELDS.BUILDINGS.LOCATION_COORD, coords),
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
 * Base Defenses (aggregated levels per defense type at a base)
 * DTO: { success, data: { coord, defenseLevels: Array<{ key, name, level, energyDelta }>, inProgress: Array<{ key, name, completesAt }> }, message }
 */
router.get('/:coord/defenses', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Supabase implementation: defenses not yet modeled -> return empty but valid payload
  const { coord } = req.params as { coord: string };
  if (!coord) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED });
  return res.json({ success: true, data: { coord, defenseLevels: [], inProgress: [] }, message: 'Base defenses loaded' });
}));

/**
 * Structures list for a specific base (catalogKey-first with ETA)
 * DTO: { success, data: { coord, constructionPerHour, items: [...] }, message }
 */
router.get('/:coord/structures', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from(DB_TABLES.USERS).select('id, empire_id').eq(DB_FIELDS.BUILDINGS.ID, userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from(DB_TABLES.EMPIRES).select(DB_FIELDS.BUILDINGS.ID).eq(DB_FIELDS.EMPIRES.USER_ID, userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });

  const { coord } = req.params as { coord: string };
  if (!coord) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED });

  const { CapacityService } = await import('../../../services/bases/CapacityService');
  const caps = await CapacityService.getBaseCapacities(empireId, coord);

  // Current buildings at base
  const bRes = await supabase
    .from(DB_TABLES.BUILDINGS)
    .select('catalog_key, level, is_active, pending_upgrade, construction_started, construction_completed, credits_cost')
    .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
    .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, coord);

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
 * Base Resources
 */
router.get('/:coord/resources', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { coord } = req.params as { coord: string };
  if (!coord) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED });

  // Not implemented yet
  return res.json({ success: true, data: { coord } });
}));

export default router;






