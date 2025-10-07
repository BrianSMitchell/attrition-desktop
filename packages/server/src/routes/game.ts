import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Empire } from '../models/Empire';
import { CreditLedgerService } from '../services/creditLedgerService';
import { Colony } from '../models/Colony';
import { ResearchProject } from '../models/ResearchProject';
import { TechQueue } from '../models/TechQueue';
import { UnitQueue } from '../models/UnitQueue';
import { Building } from '../models/Building';
import { DefenseQueue } from '../models/DefenseQueue';
import { Fleet } from '../models/Fleet';
import { CreditTransaction } from '../models/CreditTransaction';
import { User } from '../models/User';
import { Location } from '../models/Location';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ResourceService } from '../services/resourceService';
import { getOnlineUniqueUsersCount } from '../services/socketService';
import { TechService } from '../services/techService';
import { StructuresService } from '../services/structuresService';
import { DefensesService } from '../services/defensesService';
import { UnitsService } from '../services/unitsService';
import { BaseStatsService } from '../services/baseStatsService';
import { CapacityService } from '../services/capacityService';
import { EconomyService } from '../services/economyService';
import { getTechnologyList, TechnologyKey, getBuildingsList, BuildingKey, getDefensesList, DefenseKey, getUnitsList, UnitKey, getUnitSpec, getTechSpec, getStructureCreditCostForLevel, getBuildingSpec, getTechCreditCostForLevel, computeEnergyBalance } from '@game/shared';
import { FleetMovementService } from '../services/fleetMovementService';
import { SupabaseEconomyService } from '../services/economy/SupabaseEconomyService';
import { getDatabaseType } from '../config/database';
import { supabase } from '../config/supabase';

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

  if (getDatabaseType() === 'supabase') {
    // Supabase path
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
    const creditsPerHour = await SupabaseEconomyService.sumCreditsPerHourForEmpire(String((empireRow as any).id));

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
  }

  // MongoDB (legacy) path
  const userLegacy = req.user!;
  
  // Get user's empire
  let empire = await Empire.findOne({ userId: userLegacy._id });
  
  // If no empire exists, bootstrap one automatically in development to avoid empty dashboards
  if (!empire) {
    if (process.env.NODE_ENV !== 'production') {
      try {
        const displayName = (userLegacy as any)?.username || (userLegacy as any)?.email?.split?.('@')?.[0] || 'Commander';
        empire = new Empire({
          userId: userLegacy._id,
          name: `${displayName}'s Empire`,
          resources: { credits: 1000, energy: 0 },
          baseCount: 0,
          economyPerHour: 0,
        } as any);
        await empire.save();
      } catch (e) {
        console.warn('Auto-creation of empire failed, falling back to new-player payload:', e);
        return res.json({
          success: true,
          data: {
            user: userLegacy,
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
    } else {
      return res.json({
        success: true,
        data: {
          user: userLegacy,
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
  }

  // Update empire resources before returning data
  const resourceUpdate = await ResourceService.updateEmpireResources((empire._id as mongoose.Types.ObjectId).toString());

  // Compute player profile stats
  const economyBreakdown = await EconomyService.computeEmpireEconomy((empire._id as mongoose.Types.ObjectId).toString());
  const technologyScore = computeTechnologyScore(resourceUpdate.empire);
  const fleetScore = 0; // Placeholder until fleet system is implemented
  const level = Math.pow(economyBreakdown.totalCreditsPerHour * 100 + fleetScore + technologyScore, 0.25);

  const profile = {
    economyPerHour: economyBreakdown.totalCreditsPerHour,
    fleetScore,
    technologyScore,
    level
  };

  res.json({
    success: true,
    data: {
      user: userLegacy,
      empire: resourceUpdate.empire,
      resourcesGained: resourceUpdate.resourcesGained,
      creditsPerHour: resourceUpdate.creditsPerHour,
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
  // Supabase implementation
  if (getDatabaseType() === 'supabase') {
    const user = req.user! as any;
    const userId = user?._id || user?.id;

    // Resolve empire by user_id, fallback to users.empire_id
    let empireRow: any = null;
    let byUser = await supabase.from('empires').select('id, name, territories, credits, energy').eq('user_id', userId).maybeSingle();
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
  }

  const empire = await Empire.findOne({ userId: req.user!._id });

  if (!empire) {
    return res.status(404).json({
      success: false,
      error: 'Empire not found'
    });
  }

  // Update resources before returning
  const resourceUpdate = await ResourceService.updateEmpireResources((empire._id as mongoose.Types.ObjectId).toString());

  res.json({
    success: true,
    data: { 
      empire: resourceUpdate.empire,
      creditsPerHour: resourceUpdate.creditsPerHour,
      resourcesGained: resourceUpdate.resourcesGained
    }
  });
}));

// Update empire resources manually
router.post('/empire/update-resources', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });

  if (!empire) {
    return res.status(404).json({
      success: false,
      error: 'Empire not found'
    });
  }

  const resourceUpdate = await ResourceService.updateEmpireResources((empire._id as mongoose.Types.ObjectId).toString());

  res.json({
    success: true,
    data: {
      empire: resourceUpdate.empire,
      resourcesGained: resourceUpdate.resourcesGained,
      creditsPerHour: resourceUpdate.creditsPerHour
    }
  });
}));


// Credit history for current empire
router.get('/credits/history', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }
  const limitRaw = Number(req.query.limit || 50);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 200) : 50;
  const txns = await CreditTransaction.find({ empireId: empire._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return res.json({ success: true, data: { history: (txns || []).map(t => ({
    _id: t._id?.toString?.(),
    amount: t.amount,
    type: t.type,
    note: t.note || null,
    balanceAfter: typeof (t as any).balanceAfter === 'number' ? (t as any).balanceAfter : null,
    createdAt: t.createdAt,
  })) } });
}));

// Territory Management Routes

// Get empire territories
router.get('/territories', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Supabase implementation
  if (getDatabaseType() === 'supabase') {
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
  }

  // Legacy (Mongo) implementation
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({
      success: false,
      error: 'Empire not found'
    });
  }

  // Get location details for all territories
  const territories = await Location.find({
    coord: { $in: empire.territories }
  });

  res.json({
    success: true,
    data: { territories }
  });
}));

// List buildings at a specific owned location
router.get('/buildings/location/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Supabase implementation
  if (getDatabaseType() === 'supabase') {
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
  }

  // Legacy (Mongo) implementation
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { coord } = req.params;
  if (!coord) {
    return res.status(400).json({ success: false, error: 'Missing coord' });
  }

  const location = await Location.findOne({ coord });
  if (!location) {
    return res.status(404).json({ success: false, error: 'Location not found' });
  }

  if (location.owner?.toString() !== empire.userId.toString()) {
    return res.status(403).json({ success: false, error: 'You do not own this location' });
  }

  const buildings = await Building.find({
    empireId: empire._id,
    locationCoord: coord
  }).sort({ constructionCompleted: 1 });

  return res.json({ success: true, data: { buildings } });
}));

// Colonize a location
router.post('/territories/colonize', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({
      success: false,
      error: 'Empire not found'
    });
  }

  const { locationCoord, colonyName } = req.body;

  if (!locationCoord || !colonyName) {
    return res.status(400).json({
      success: false,
      error: 'Location coordinate and colony name are required'
    });
  }

  // Check if location exists and is unowned
  const location = await Location.findOne({ coord: locationCoord });
  if (!location) {
    return res.status(404).json({
      success: false,
      error: 'Location not found'
    });
  }

  if (location.owner) {
    return res.status(400).json({
      success: false,
      error: 'Location is already owned'
    });
  }

  // Calculate progressive colonization cost based on base count
  const { getColonizationCost } = await import('@game/shared');
  const colonizationCostCredits = getColonizationCost(empire.baseCount, empire.hasDeletedBase);

  // Check if empire can afford colonization (credits only)
  if (empire.resources.credits < colonizationCostCredits) {
    return res.status(400).json({
      success: false,
      error: `Insufficient credits for colonization. Required: ${colonizationCostCredits}, Available: ${empire.resources.credits}`
    });
  }

  // TODO: Add Outpost Ship requirement validation here
  // For now, we'll skip this requirement in Phase A

  // Deduct credits
  empire.resources.credits -= colonizationCostCredits;
  // Log transaction (best-effort)
  CreditLedgerService.logTransaction({
    empireId: (empire._id as mongoose.Types.ObjectId),
    amount: -colonizationCostCredits,
    type: 'colonization',
    note: `Colonized ${locationCoord}`,
    meta: { locationCoord, colonyName },
    balanceAfter: empire.resources.credits,
  }).catch(() => {});

  // Increment base count and reset deletion discount
  empire.baseCount += 1;
  empire.hasDeletedBase = false;

  // Claim location
  location.owner = empire.userId;
  await location.save();

  // Add to empire territories
  empire.territories.push(locationCoord);
  await empire.save();

  // Create colony
  const colony = new Colony({
    empireId: empire._id,
    locationCoord,
    name: colonyName
  });

  await colony.save();

  // Note: Starter structures are now handled by the modern structures system
  // No legacy building creation needed during colonization

  res.status(201).json({
    success: true,
    data: { 
      colony, 
      location, 
      colonizationCost: colonizationCostCredits,
      newBaseCount: empire.baseCount 
    },
    message: 'Location colonized successfully'
  });
}));

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

  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, message: 'Empire not found' });
  }

  // Determine target base coordinate: explicit body param or first owned territory
  let baseCoord = '';
  try {
    baseCoord = String((req.body?.baseCoord ?? '')).trim();
  } catch {
    baseCoord = '';
  }
  if (!baseCoord) {
    const territories: string[] = Array.isArray((empire as any).territories) ? (empire as any).territories : [];
    if (territories.length > 0) {
      baseCoord = territories[0];
    }
  }
  if (!baseCoord) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'No base coordinate available to seed (provide baseCoord or colonize first)'
    });
  }

  // Top up credits if needed
  const creditsTargetRaw = (req.body && typeof req.body.credits !== 'undefined') ? Number(req.body.credits) : 50000;
  const creditsTarget = Number.isFinite(creditsTargetRaw) ? creditsTargetRaw : 50000;
  if (Number(empire.resources?.credits || 0) < creditsTarget) {
    empire.resources.credits = creditsTarget;
    await empire.save();
  }

  // Ensure at least one active research_lab at the base
  let lab = await Building.findOne({
    empireId: empire._id,
    locationCoord: baseCoord,
    type: 'research_lab',
    isActive: true
  });

  if (!lab) {
    lab = new Building({
      empireId: empire._id,
      locationCoord: baseCoord,
      type: 'research_lab',
      displayName: 'Research Lab',
      catalogKey: 'research_labs',
      level: 1,
      isActive: true
    });
    await lab.save();
  }

  const baseLabTotal = await TechService.getBaseLabTotal((empire._id as mongoose.Types.ObjectId).toString(), baseCoord);

  return res.json({
    success: true,
    data: {
      baseCoord,
      credits: empire.resources.credits,
      baseLabTotal
    },
    message: 'Seeded test research lab and credits'
  });
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

  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, message: 'Empire not found' });
  }

  // Determine target base coordinate
  let baseCoord = '';
  try {
    baseCoord = String((req.body?.baseCoord ?? '')).trim();
  } catch { baseCoord = ''; }
  if (!baseCoord) {
    const territories: string[] = Array.isArray((empire as any).territories) ? (empire as any).territories : [];
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
  if (Number(empire.resources?.credits || 0) < creditsTarget) {
    empire.resources.credits = creditsTarget;
    await empire.save();
  }

  // Ensure tech prereqs for jump_gate
  const mapVal = (empire as any).techLevels as Map<string, number> | undefined;
  const ensureMap = () => {
    if ((empire as any).techLevels instanceof Map) return (empire as any).techLevels as Map<string, number>;
    (empire as any).techLevels = new Map<string, number>();
    return (empire as any).techLevels as Map<string, number>;
  };
  const tl = ensureMap();
  tl.set('warp_drive', Math.max(12, Number(tl.get('warp_drive') || 0)));
  tl.set('energy', Math.max(20, Number(tl.get('energy') || 0)));
  await empire.save();

  // Ensure enough active solar plants for positive energy projection
  // Create or upgrade an active solar_plants building at this base with sufficient level.
  let solar = await Building.findOne({
    empireId: empire._id,
    locationCoord: baseCoord,
    catalogKey: 'solar_plants',
    isActive: true
  });

  if (!solar) {
    solar = new Building({
      locationCoord: baseCoord,
      empireId: empire._id,
      type: 'energy_plant',
      displayName: 'Solar Plants',
      catalogKey: 'solar_plants',
      level: 50,
      constructionStarted: new Date(),
      isActive: true
    } as any);
    await solar.save();
  } else {
    (solar as any).level = Math.max(50, Number((solar as any).level || 1));
    await solar.save();
  }

  // Ensure construction capacity by adding/upgrading active robotic factories at this base
  let robo = await Building.findOne({
    empireId: empire._id,
    locationCoord: baseCoord,
    catalogKey: 'robotic_factories',
    isActive: true
  });

  if (!robo) {
    robo = new Building({
      locationCoord: baseCoord,
      empireId: empire._id,
      type: 'factory',
      displayName: 'Robotic Factories',
      catalogKey: 'robotic_factories',
      level: 10,
      constructionStarted: new Date(),
      isActive: true
    } as any);
    await robo.save();
  } else {
    (robo as any).level = Math.max(10, Number((robo as any).level || 1));
    await robo.save();
  }

  // Ensure strong positive energy production with active fusion plants
  let fusion = await Building.findOne({
    empireId: empire._id,
    locationCoord: baseCoord,
    catalogKey: 'fusion_plants',
    isActive: true
  });

  if (!fusion) {
    fusion = new Building({
      locationCoord: baseCoord,
      empireId: empire._id,
      type: 'energy_plant',
      displayName: 'Fusion Plants',
      catalogKey: 'fusion_plants',
      level: 20,
      constructionStarted: new Date(),
      isActive: true
    } as any);
    await fusion.save();
  } else {
    (fusion as any).level = Math.max(20, Number((fusion as any).level || 1));
    await fusion.save();
  }

  return res.json({
    success: true,
    data: { baseCoord, credits: empire.resources.credits, warp_drive: tl.get('warp_drive'), energy: tl.get('energy') },
    message: 'Seeded test defenses prerequisites (credits, tech, solar plants, construction capacity)'
  });
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

  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, message: 'Empire not found' });
  }

  // Determine target base coordinate
  let baseCoord = '';
  try {
    baseCoord = String((req.body?.baseCoord ?? '')).trim();
  } catch { baseCoord = ''; }
  if (!baseCoord) {
    const territories: string[] = Array.isArray((empire as any).territories) ? (empire as any).territories : [];
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
  if (Number(empire.resources?.credits || 0) < creditsTarget) {
    empire.resources.credits = creditsTarget;
    await empire.save();
  }

  // Broadly raise tech levels to make structures eligible
  const levelTargetRaw = (req.body && typeof req.body.level === 'number') ? Number(req.body.level) : 10;
  const levelTarget = Number.isFinite(levelTargetRaw) ? levelTargetRaw : 10;
  const ensureMap = () => {
    if ((empire as any).techLevels instanceof Map) return (empire as any).techLevels as Map<string, number>;
    (empire as any).techLevels = new Map<string, number>();
    return (empire as any).techLevels as Map<string, number>;
  };
  const tl = ensureMap();
  const techCatalog = getTechnologyList();
  for (const t of techCatalog) {
    const key = (t as any).key as string;
    tl.set(key, Math.max(levelTarget, Number(tl.get(key) || 0)));
  }
  await empire.save();

  // Ensure positive energy projection with active solar plants
  let solar = await Building.findOne({
    empireId: empire._id,
    locationCoord: baseCoord,
    catalogKey: 'solar_plants',
    isActive: true
  });
  if (!solar) {
    solar = new Building({
      locationCoord: baseCoord,
      empireId: empire._id,
      type: 'energy_plant',
      displayName: 'Solar Plants',
      catalogKey: 'solar_plants',
      level: 30,
      constructionStarted: new Date(),
      isActive: true
    } as any);
    await solar.save();
  } else {
    (solar as any).level = Math.max(30, Number((solar as any).level || 1));
    await solar.save();
  }

  // Ensure construction capacity with active robotic factories
  let robo = await Building.findOne({
    empireId: empire._id,
    locationCoord: baseCoord,
    catalogKey: 'robotic_factories',
    isActive: true
  });
  if (!robo) {
    robo = new Building({
      locationCoord: baseCoord,
      empireId: empire._id,
      type: 'factory',
      displayName: 'Robotic Factories',
      catalogKey: 'robotic_factories',
      level: 10,
      constructionStarted: new Date(),
      isActive: true
    } as any);
    await robo.save();
  } else {
    (robo as any).level = Math.max(10, Number((robo as any).level || 1));
    await robo.save();
  }

  return res.json({
    success: true,
    data: { baseCoord, credits: empire.resources.credits, levelTarget },
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

  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, message: 'Empire not found' });
  }

  const { catalogKey } = req.params;
  if (!catalogKey) {
    return res.status(400).json({ success: false, message: 'catalogKey required' });
  }

  // Remove any inactive (queued) buildings with this catalogKey for this empire
  const result = await Building.deleteMany({
    empireId: empire._id,
    catalogKey,
    isActive: false
  });

  return res.json({
    success: true,
    data: { deletedCount: result.deletedCount, catalogKey },
    message: `Cleaned up ${result.deletedCount} queued ${catalogKey} buildings`
  });
}));

// Research Management Routes

// Get empire research projects
router.get('/research', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({
      success: false,
      error: 'Empire not found'
    });
  }

  const researchProjects = await ResearchProject.find({
    empireId: empire._id
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: { researchProjects }
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
  if (getDatabaseType() === 'supabase') {
    // Minimal placeholder for Supabase
    const baseCoord = String(req.query.base || '').trim();
    if (!baseCoord) return res.status(400).json({ success: false, error: 'Missing base coordinate (?base=...)' });
    return res.json({ success: true, data: { status: { techLevels: {}, eligibility: {}, baseLabTotal: 0 } } });
  }
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const baseCoord = String(req.query.base || '').trim();
  if (!baseCoord) {
    return res.status(400).json({ success: false, error: 'Missing base coordinate (?base=...)' });
  }

  const status = await TechService.getStatus((empire._id as mongoose.Types.ObjectId).toString(), baseCoord);
  res.json({
    success: true,
    data: { status }
  });
}));

// Start technology research with capacity-driven ETA
router.post('/tech/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { locationCoord, techKey } = req.body as { locationCoord?: string; techKey?: TechnologyKey };
  if (!locationCoord || !techKey) {
    return res.status(400).json({ success: false, error: 'locationCoord and techKey are required' });
  }

  const result = await TechService.start((empire._id as mongoose.Types.ObjectId).toString(), locationCoord, techKey);
  if (!result.success) {
    // Handle both old format (error) and new format (code/message) with safe typing
    const errorResponse: any = {
      success: false,
      error: (result as any).error ?? (result as any).message,
      message: (result as any).message ?? (result as any).error
    };
    if ((result as any).code) errorResponse.code = (result as any).code;
    if ((result as any).details) errorResponse.details = (result as any).details;
    if ((result as any).reasons) errorResponse.reasons = (result as any).reasons;
    
    // Return 409 for idempotency conflicts, 400 for other errors
    const statusCode = (result as any).code === 'ALREADY_IN_PROGRESS' ? 409 : 400;
    return res.status(statusCode).json(errorResponse);
  }

  res.json({
    success: true,
    data: result.data,
    message: result.message
  });
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



/**
 * Defenses Routes (Citizen capacity driven)
 */
router.get('/defenses/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const catalog = getDefensesList();
  res.json({ success: true, data: { catalog } });
}));

router.get('/defenses/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Supabase implementation: return minimal status placeholders
  if (getDatabaseType() === 'supabase') {
    return res.json({ success: true, data: { status: { techLevels: {}, eligibility: {} } } });
  }
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }
  const status = await DefensesService.getStatus((empire._id as mongoose.Types.ObjectId).toString());
  res.json({ success: true, data: { status } });
}));

router.get('/defenses/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (getDatabaseType() === 'supabase') {
    // Not implemented yet in Supabase schema; return empty queue
    return res.json({ success: true, data: { queue: [] } });
  }
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) return res.status(404).json({ success: false, error: 'Empire not found' });
  const locationCoord = String(req.query.locationCoord || '').trim();
  const filter: any = { empireId: empire._id, status: 'pending' };
  if (locationCoord) filter.locationCoord = locationCoord;

  const items = await (await import('../models/DefenseQueue')).DefenseQueue.find(filter)
    .sort({ completesAt: 1, createdAt: 1 })
    .lean();

  const queue = (items || []).map((it: any) => ({
    id: it._id?.toString() || '',
    defenseKey: it.defenseKey,
    startedAt: it.startedAt || null,
    completesAt: it.completesAt || null,
    baseCoord: it.locationCoord || ''
  }));

  return res.json({ success: true, data: { queue } });
}));

router.post('/defenses/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { locationCoord, defenseKey } = req.body as { locationCoord?: string; defenseKey?: DefenseKey };

  if (!locationCoord || !defenseKey) {
    return res.status(400).json({ success: false, error: 'locationCoord and defenseKey are required' });
  }

  const result = await DefensesService.start((empire._id as mongoose.Types.ObjectId).toString(), locationCoord, defenseKey);
  if (!result.success) {
    // Handle both old format (error) and new format (code/message) with safe typing
    const errorResponse: any = {
      success: false,
      error: (result as any).error ?? (result as any).message,
      message: (result as any).message ?? (result as any).error
    };
    if ((result as any).code) errorResponse.code = (result as any).code;
    if ((result as any).details) errorResponse.details = (result as any).details;
    if ((result as any).reasons) errorResponse.reasons = (result as any).reasons;
    
    // Return 409 for idempotency conflicts, 400 for other errors
    const statusCode = (result as any).code === 'ALREADY_IN_PROGRESS' ? 409 : 400;
    return res.status(statusCode).json(errorResponse);
  }

  res.json({
    success: true,
    data: result.data,
    message: result.message
  });
}));

// Cancel a pending defense item
router.delete('/defenses/queue/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) return res.status(404).json({ success: false, error: 'Empire not found' });

  const id = String(req.params.id || '').trim();
  if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, error: 'Invalid id' });

  const { DefenseQueue } = await import('../models/DefenseQueue');
  const item: any = await DefenseQueue.findById(id);
  if (!item || String(item.empireId) !== String(empire._id)) return res.status(404).json({ success: false, error: 'Queue item not found' });
  if (item.startedAt && item.completesAt && new Date(item.completesAt).getTime() > Date.now()) {
    return res.status(400).json({ success: false, error: 'Cannot cancel an in-progress defense yet' });
  }

  item.status = 'cancelled';
  await item.save();
  return res.json({ success: true, data: { cancelledId: id } });
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
  if (getDatabaseType() === 'supabase') {
    // Minimal placeholder for Supabase; units not modeled yet
    return res.json({ success: true, data: { status: { capacities: {}, eligibility: {} } } });
  }
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }
  const locationCoord = String(req.query.locationCoord || '').trim() || undefined;
  const status = await UnitsService.getStatus((empire._id as mongoose.Types.ObjectId).toString(), locationCoord);
  res.json({ success: true, data: { status } });
}));

router.post('/units/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { locationCoord, unitKey } = req.body as { locationCoord?: string; unitKey?: UnitKey };

  if (!locationCoord || !unitKey) {
    return res.status(400).json({ success: false, error: 'locationCoord and unitKey are required' });
  }

  const result = await UnitsService.start((empire._id as mongoose.Types.ObjectId).toString(), locationCoord, unitKey);
  if (!result.success) {
    // Handle both old format (error) and new format (code/message) with safe typing
    const errorResponse: any = {
      success: false,
      error: (result as any).error ?? (result as any).message,
      message: (result as any).message ?? (result as any).error
    };
    if ((result as any).code) errorResponse.code = (result as any).code;
    if ((result as any).details) errorResponse.details = (result as any).details;
    if ((result as any).reasons) errorResponse.reasons = (result as any).reasons;
    
    // Return 409 for idempotency conflicts, 400 for other errors
    const statusCode = (result as any).code === 'ALREADY_IN_PROGRESS' ? 409 : 400;
    return res.status(statusCode).json(errorResponse);
  }

  res.json({
    success: true,
    data: (result as any).data,
    message: (result as any).message || 'Unit construction started'
  });
}));

/**
 * Units Production Queue
 * Lists active unit production (capacity-driven) for the authenticated empire.
 * Optional ?base=A00:10:22:10 to filter by a specific base coord.
 */
router.get('/units/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (getDatabaseType() === 'supabase') {
    // Not implemented yet in Supabase schema; return empty queue
    return res.json({ success: true, data: { queue: [] } });
  }
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const base = String(req.query.base || '').trim();
  const filter: any = { empireId: empire._id, status: 'pending' };
  if (base) filter.locationCoord = base;

  const queue = await UnitQueue.find(filter).sort({ completesAt: 1, createdAt: 1 }).lean();

  // Transform queue items to match frontend expectations
  const transformedQueue = (queue || []).map((item: any) => {
    let unitName = item.unitKey || '';
    let creditsCost = 0;
    try {
      const spec = getUnitSpec(item.unitKey as UnitKey);
      unitName = spec?.name || item.unitKey;
      creditsCost = Math.max(0, Number(spec?.creditsCost || 0));
    } catch {
      // fallback to key
    }

    return {
      id: item._id?.toString() || '',
      unitKey: item.unitKey,
      unitName,
      quantity: 1, // Phase A: single unit per queue item
      totalQuantity: 1, // Phase A: single unit per queue item
      startedAt: item.startedAt?.toISOString() || new Date().toISOString(),
      completesAt: item.completesAt?.toISOString() || new Date().toISOString(),
      creditsCost,
      baseCoord: item.locationCoord || ''
    };
  });

  res.json({ success: true, data: { queue: transformedQueue } });
}));

// Cancel a pending unit production queue item
router.delete('/units/queue/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const id = String(req.params.id || '').trim();
  if (!id || !mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: 'Invalid queue item id' });
  }

  const item = await UnitQueue.findById(id);
  if (!item || item.empireId.toString() !== (empire._id as mongoose.Types.ObjectId).toString()) {
    return res.status(404).json({ success: false, error: 'Queue item not found' });
  }

  if (item.status !== 'pending') {
    return res.status(400).json({ success: false, error: 'Only pending items can be cancelled' });
  }

  let refundedCredits: number | null = null;
  try {
    // Calculate refund from unit spec
    const spec = getUnitSpec(item.unitKey as UnitKey);
    refundedCredits = Math.max(0, Number(spec?.creditsCost || 0));
    (empire as any).resources.credits = Number((empire as any).resources.credits || 0) + refundedCredits;
    await empire.save();
  } catch {
    // If spec lookup fails, skip refund silently to avoid throwing; status still changes
  }

  item.status = 'cancelled';
  await item.save();

  return res.json({
    success: true,
    data: { cancelledId: item._id?.toString(), refundedCredits },
    message: 'Unit production cancelled'
  });
}));

/**
 * Bases summary for Empire page
 * Returns compact info per base: name, location, economy, occupier, construction, production, research
 */
router.get('/bases/summary', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (getDatabaseType() === 'supabase') {
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

    // Production/Defense queues (pending) by base
    const [unitQ, defQ] = await Promise.all([
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

    const prodQueuedByCoord = new Map<string, number>();
    const prodEarliestByCoord = new Map<string, { name: string; remaining: number; percent?: number; ts: number }>();
    const defQueuedByCoord = new Map<string, number>();
    const defEarliestByCoord = new Map<string, { name: string; remaining: number; percent?: number; ts: number }>();
    const nowTs = Date.now();

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
        construction: { queued: 0 },
        production: { queued: prodQueuedByCoord.get(coord) || 0, next: (() => { const n = prodEarliestByCoord.get(coord); if (!n) return undefined; const { ts, ...rest } = n; return rest; })() },
        defenses: { queued: defQueuedByCoord.get(coord) || 0, next: (() => { const n = defEarliestByCoord.get(coord); if (!n) return undefined; const { ts, ...rest } = n; return rest; })() },
        research: researchSummary,
      };
    });

    return res.json({ success: true, data: { bases } });
  }

  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const coords: string[] = Array.isArray((empire as any).territories) ? (empire as any).territories : [];

  // Load locations and colonies for naming
  const [locations, colonies] = await Promise.all([
    Location.find({ coord: { $in: coords } }).lean(),
    Colony.find({ empireId: empire._id, locationCoord: { $in: coords } }).lean()
  ]);

  // Prefer scheduled research (has completesAt) by soonest completion; otherwise earliest unscheduled pending (waiting)
  let researchPending = await TechQueue.findOne({ empireId: empire._id, status: 'pending', completesAt: { $ne: null } }).sort({ completesAt: 1 }).lean();
  if (!researchPending) {
    researchPending = await TechQueue.findOne({
      empireId: empire._id,
      status: 'pending',
      $or: [{ completesAt: { $exists: false } }, { completesAt: null }]
    })
      .sort({ createdAt: 1 })
      .lean();
  }

  const colonyByCoord = new Map<string, any>((colonies || []).map((c: any) => [c.locationCoord, c]));
  const researchSummary = researchPending
    ? (() => {
        const name = (() => {
          try {
            return getTechSpec((researchPending as any).techKey as any).name;
          } catch {
            return String((researchPending as any).techKey || '');
          }
        })();

        const completesVal = (researchPending as any).completesAt;
        const startedVal = (researchPending as any).startedAt;

        if (completesVal && startedVal) {
          const started = new Date(startedVal as any).getTime();
          const completes = new Date(completesVal as any).getTime();
          const now = Date.now();
          const total = Math.max(0, completes - started);
          const elapsed = Math.max(0, now - started);
          const percent = total > 0 ? Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100))) : 0;
          return { name, remaining: Math.max(0, completes - now), percent };
        }

        // Not yet scheduled/charged: waiting for credits/capacity
        return { name, remaining: 0, percent: 0 };
      })()
    : null;

  // Construction: derive single active construction per base (if any)
  // We model a single active construction per base in v0 via Building documents with isActive=false and future constructionCompleted
  const nowMs = Date.now();
  const activeConstructions = await Building.find({
    empireId: empire._id,
    locationCoord: { $in: coords },
    isActive: false,
    constructionCompleted: { $gt: new Date(nowMs) }
  })
    .select('locationCoord catalogKey constructionStarted constructionCompleted')
    .lean();

  const consQueuedByCoord = new Map<string, number>();
  const consNextByCoord = new Map<string, { name: string; remaining: number; percent?: number }>();

  for (const c of activeConstructions || []) {
    const lc = (c as any).locationCoord as string | undefined;
    if (!lc) continue;

    consQueuedByCoord.set(lc, 1); // single active construction model

    // Resolve structure display name
    let name = '';
    const key = (c as any).catalogKey as any;
    try {
      const spec = getBuildingSpec(key);
      name = spec?.name || String(key || '');
    } catch {
      name = String(key || '');
    }

    const startedVal = (c as any).constructionStarted;
    const completesVal = (c as any).constructionCompleted;
    let remaining = 0;
    let percent: number | undefined = undefined;

    if (completesVal) {
      const completes = new Date(completesVal as any).getTime();
      remaining = Math.max(0, completes - nowMs);
      if (startedVal) {
        const started = new Date(startedVal as any).getTime();
        if (Number.isFinite(started) && Number.isFinite(completes) && completes > started) {
          const total = completes - started;
          const elapsed = Math.max(0, nowMs - started);
          percent = Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)));
        } else {
          percent = 0;
        }
      } else {
        percent = 0;
      }
    }

    consNextByCoord.set(lc, { name, remaining, percent });
  }

  // Helper to compute production from buildings (mirror of client logic)
  const computeProductionRates = (buildings: any[]) => {
    return (buildings || []).reduce(
      (rates, building) => {
        if (!building.isActive) return rates;
        switch (building.type) {
          case 'metal_mine':
            rates.metalPerHour += 10 * building.level;
            break;
          case 'energy_plant':
            rates.energyPerHour += 8 * building.level;
            break;
          case 'research_lab':
            rates.researchPerHour += 5 * building.level;
            break;
          case 'factory':
            rates.metalPerHour += 5 * building.level;
            rates.energyPerHour += 3 * building.level;
            break;
          default:
            break;
        }
        return rates;
      },
      { metalPerHour: 0, energyPerHour: 0, researchPerHour: 0 }
    );
  };

  // Aggregate unit production (UnitQueue) per base: queued count and earliest pending item as "next"
  const unitQueue = await UnitQueue.find({
    empireId: empire._id,
    status: 'pending',
    locationCoord: { $in: coords }
  })
    .select('locationCoord unitKey startedAt completesAt createdAt')
    .lean();

  const prodQueuedByCoord = new Map<string, number>();
  const prodEarliestTsByCoord = new Map<string, number>();
  const prodNextByCoord = new Map<string, { name: string; remaining: number; percent?: number }>();

  for (const u of unitQueue || []) {
    const lc = (u as any).locationCoord as string | undefined;
    if (!lc) continue;

    // Count pending unit productions
    prodQueuedByCoord.set(lc, (prodQueuedByCoord.get(lc) || 0) + 1);

    // Determine ordering timestamp: prefer completesAt when present, otherwise createdAt (waiting)
    const completesVal = (u as any).completesAt;
    const startedVal = (u as any).startedAt;
    const createdVal = (u as any).createdAt;
    const orderTs = completesVal
      ? new Date(completesVal as any).getTime()
      : (createdVal ? new Date(createdVal as any).getTime() : Number.POSITIVE_INFINITY);

    const prevTs = prodEarliestTsByCoord.get(lc);
    if (prevTs === undefined || orderTs < prevTs) {
      // Resolve unit display name
      let name = '';
      const key = (u as any).unitKey as string | undefined;
      if (key) {
        try {
          const spec = getUnitSpec(key as any);
          name = spec?.name || key;
        } catch {
          name = key || '';
        }
      }

      // Compute remaining and percent (if scheduled)
      const now = Date.now();
      let remaining = 0;
      let percent = 0;

      if (completesVal && startedVal) {
        const started = new Date(startedVal as any).getTime();
        const completes = new Date(completesVal as any).getTime();
        remaining = Math.max(0, completes - now);
        if (Number.isFinite(started) && Number.isFinite(completes) && completes > started) {
          const total = completes - started;
          const elapsed = Math.max(0, now - started);
          percent = Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)));
        }
      }
      prodEarliestTsByCoord.set(lc, orderTs);
      prodNextByCoord.set(lc, { name, remaining, percent });
    }
  }

  // Aggregate defense queue (DefenseQueue) per base
  const defenseQueue = await DefenseQueue.find({
    empireId: empire._id,
    status: 'pending',
    locationCoord: { $in: coords }
  })
    .select('locationCoord defenseKey startedAt completesAt createdAt')
    .lean();

  const defQueuedByCoord = new Map<string, number>();
  const defEarliestTsByCoord = new Map<string, number>();
  const defNextByCoord = new Map<string, { name: string; remaining: number; percent?: number }>();

  for (const d of defenseQueue || []) {
    const lc = (d as any).locationCoord as string | undefined;
    if (!lc) continue;

    defQueuedByCoord.set(lc, (defQueuedByCoord.get(lc) || 0) + 1);

    const completesVal = (d as any).completesAt;
    const startedVal = (d as any).startedAt;
    const createdVal = (d as any).createdAt;
    const orderTs = completesVal
      ? new Date(completesVal as any).getTime()
      : (createdVal ? new Date(createdVal as any).getTime() : Number.POSITIVE_INFINITY);

    const prevTs = defEarliestTsByCoord.get(lc);
    if (prevTs === undefined || orderTs < prevTs) {
      let name = '';
      const key = (d as any).defenseKey as string | undefined;
      if (key) {
        try {
          const spec = getDefensesList().find((it) => String((it as any).key) === String(key));
          name = (spec as any)?.name || key;
        } catch {
          name = key || '';
        }
      }

      const now = Date.now();
      let remaining = 0;
      let percent = 0;
      if (completesVal && startedVal) {
        const started = new Date(startedVal as any).getTime();
        const completes = new Date(completesVal as any).getTime();
        remaining = Math.max(0, completes - now);
        if (Number.isFinite(started) && Number.isFinite(completes) && completes > started) {
          const total = completes - started;
          const elapsed = Math.max(0, now - started);
          percent = Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)));
        }
      }

      defEarliestTsByCoord.set(lc, orderTs);
      defNextByCoord.set(lc, { name, remaining, percent });
    }
  }

  const bases = (locations || []).map((loc: any) => {
    const colony = colonyByCoord.get(loc.coord);

    return {
      baseId: (loc._id)?.toString(),
      name: colony?.name || `Base ${loc.coord}`,
      location: loc.coord,
      economy: { metalPerHour: 0, energyPerHour: 0, researchPerHour: 0 }, // Legacy system removed
      // Occupier concept not yet modeled; placeholder null. In future, populate when hostile occupation exists.
      occupier: null as null | { empireId: string; name: string },
      construction: {
        queued: consQueuedByCoord.get(loc.coord) || 0,
        next: consNextByCoord.get(loc.coord) || undefined
      },
      production: {
        queued: prodQueuedByCoord.get(loc.coord) || 0,
        next: prodNextByCoord.get(loc.coord) || undefined
      },
      defenses: {
        queued: defQueuedByCoord.get(loc.coord) || 0,
        next: defNextByCoord.get(loc.coord) || undefined
      },
      research: researchSummary
    };
  });

  res.json({
    success: true,
    data: { bases }
  });
}));

/**
 * Base Stats (Phase A visibility)
 * Returns area, energy, population budgets and owner income for a base.
 */
router.get('/base-stats/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (getDatabaseType() === 'supabase') {
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

    const { SupabaseBaseStatsService } = require('../services/bases/SupabaseBaseStatsService');
    const stats = await SupabaseBaseStatsService.getBaseStats(empireId, coord);
    return res.json({ success: true, data: { stats } });
  }

  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { coord } = req.params;
  if (!coord) {
    return res.status(400).json({ success: false, error: 'Missing coord' });
  }

  const stats = await BaseStatsService.getBaseStats(
    (empire._id as mongoose.Types.ObjectId).toString(),
    coord
  );

  return res.json({
    success: true,
    data: { stats }
  });
}));

/**
 * Capacities Routes (Phase 1)
 * Computes Construction/Production/Research capacities for a base.
 */
router.get('/capacities/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (getDatabaseType() === 'supabase') {
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

    const { SupabaseCapacityService } = require('../services/bases/SupabaseCapacityService');
    const caps = await SupabaseCapacityService.getBaseCapacities(empireId, coord);
    return res.json({ success: true, data: caps });
  }

  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { coord } = req.params;
  if (!coord) {
    return res.status(400).json({ success: false, error: 'Missing coord' });
  }

  const caps = await CapacityService.getBaseCapacities(
    (empire._id as mongoose.Types.ObjectId).toString(),
    coord
  );

  return res.json({
    success: true,
    data: caps
  });
}));

/**
 * Base composite stats for a specific base (aggregates base-stats + capacities)
 * DTO: { success, data: { coord, stats, capacities }, message }
 */
router.get('/bases/:coord/stats', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Supabase implementation: combine base stats + capacities
  if (getDatabaseType() === 'supabase') {
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

    const { SupabaseBaseStatsService } = require('../services/bases/SupabaseBaseStatsService');
    const { SupabaseCapacityService } = require('../services/bases/SupabaseCapacityService');

    const [stats, capacities] = await Promise.all([
      SupabaseBaseStatsService.getBaseStats(empireId, coord),
      SupabaseCapacityService.getBaseCapacities(empireId, coord),
    ]);

    return res.json({ success: true, data: { coord, stats, capacities }, message: 'Base stats loaded' });
  }

  // Legacy (Mongo) implementation
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { coord } = req.params;
  if (!coord) {
    return res.status(400).json({ success: false, error: 'Missing coord' });
  }

  const empireId = (empire._id as mongoose.Types.ObjectId).toString();

  const [stats, capacities] = await Promise.all([
    BaseStatsService.getBaseStats(empireId, coord),
    CapacityService.getBaseCapacities(empireId, coord),
  ]);

  return res.json({
    success: true,
    data: { coord, stats, capacities },
    message: 'Base stats loaded'
  });
}));

/**
 * Base Defenses (aggregated levels per defense type at a base)
 * DTO: { success, data: { coord, defenseLevels: Array<{ key, name, level, energyDelta }>, inProgress: Array<{ key, name, completesAt }> }, message }
 */
router.get('/bases/:coord/defenses', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Supabase implementation: defenses not yet modeled -> return empty but valid payload
  if (getDatabaseType() === 'supabase') {
    const { coord } = req.params as { coord: string };
    if (!coord) return res.status(400).json({ success: false, error: 'Missing coord' });
    return res.json({ success: true, data: { coord, defenseLevels: [], inProgress: [] }, message: 'Base defenses loaded' });
  }

  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { coord } = req.params;
  if (!coord) {
    return res.status(400).json({ success: false, error: 'Missing coord' });
  }

  // Aggregate completed defense counts by key for this base/empire
  const { DefenseQueue } = await import('../models/DefenseQueue');
  const agg = await DefenseQueue.aggregate([
    { $match: { empireId: empire._id, locationCoord: coord, status: 'completed' } as any },
    { $group: { _id: '$defenseKey', level: { $sum: 1 } } }
  ]);

  const catalog = getDefensesList();
  const defenseLevels = (agg || []).map((g: any) => {
    const spec = catalog.find((d) => String((d as any).key) === String(g._id));
    return {
      key: String(g._id || ''),
      name: spec?.name || String(g._id || ''),
      level: Number(g.level || 0),
      energyDelta: Number(spec?.energyDelta || 0)
    };
  });

  // In-progress scheduled defenses (optional, for UI progress)
  const inProgDocs = await DefenseQueue.find({
    empireId: empire._id,
    locationCoord: coord,
    status: 'pending',
    completesAt: { $gt: new Date() }
  }).select('defenseKey completesAt').sort({ completesAt: 1 }).lean();

  const inProgress = (inProgDocs || []).map((it: any) => {
    const spec = catalog.find((d) => String((d as any).key) === String(it.defenseKey));
    return {
      key: String(it.defenseKey || ''),
      name: spec?.name || String(it.defenseKey || ''),
      completesAt: it.completesAt ? new Date(it.completesAt).toISOString() : null
    };
  });

  return res.json({ success: true, data: { coord, defenseLevels, inProgress }, message: 'Base defenses loaded' });
}));

/**
 * Structures list for a specific base (catalogKey-first with ETA)
 * DTO: { success, data: { coord, constructionPerHour, items: [...] }, message }
 */
router.get('/bases/:coord/structures', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (getDatabaseType() === 'supabase') {
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

    const { SupabaseCapacityService } = require('../services/bases/SupabaseCapacityService');
    const caps = await SupabaseCapacityService.getBaseCapacities(empireId, coord);

    // Current buildings at base
    const bRes = await supabase
      .from('buildings')
      .select('catalog_key, level, is_active, pending_upgrade, construction_started, construction_completed')
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
    let activeConstruction: { key: BuildingKey; completionAt: string; startedAt?: string } | null = null;
    let earliest = Number.POSITIVE_INFINITY;
    for (const b of bRes.data || []) {
      const isActive = (b as any).is_active === true;
      const completes = (b as any).construction_completed ? new Date((b as any).construction_completed as any).getTime() : 0;
      if (!isActive && completes && completes > nowTs && completes < earliest) {
        earliest = completes;
        const key = String((b as any).catalog_key || '') as BuildingKey;
        const st = (b as any).construction_started ? new Date((b as any).construction_started as any).toISOString() : undefined;
        activeConstruction = { key, completionAt: new Date(completes).toISOString(), startedAt: st };
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
  }

  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { coord } = req.params;
  if (!coord) {
    return res.status(400).json({ success: false, error: 'Missing coord' });
  }

  const empireId = (empire._id as mongoose.Types.ObjectId).toString();

  // Load capacities, status, and current buildings at base
  const [caps, status, buildings] = await Promise.all([
    CapacityService.getBaseCapacities(empireId, coord),
    StructuresService.getStatus(empireId),
    Building.find({ empireId: empire._id, locationCoord: coord })
      .select('catalogKey level isActive pendingUpgrade constructionStarted constructionCompleted')
      .lean(),
  ]);

  // Finalize any completed constructions (v0: simple inline finalizer)
  try {
    const nowTs = Date.now();
    const toFinalize = (buildings || []).filter((b: any) => b?.isActive === false && b?.constructionCompleted && new Date(b.constructionCompleted).getTime() <= nowTs);
    for (const b of toFinalize) {
      if ((b as any).pendingUpgrade === true) {
        await Building.updateOne({ _id: (b as any)._id }, { $set: { isActive: true, pendingUpgrade: false }, $inc: { level: 1 } });
        (b as any).isActive = true; (b as any).pendingUpgrade = false; (b as any).level = Number((b as any).level || 0) + 1;
      } else {
        await Building.updateOne({ _id: (b as any)._id }, { $set: { isActive: true } });
        (b as any).isActive = true;
      }
    }
  } catch {}

  const constructionPerHour = Math.max(0, Number((caps as any)?.construction?.value || 0));

  // Compute current levels by catalogKey (active + pendingUpgrade treated as current)
  // IMPORTANT: Sum levels across multiple instances of the same catalog key
  // (e.g., Metal Refineries L12 + L1 + L1 => 14), instead of taking only the max.
  const levelByKey = new Map<string, number>();
  for (const b of (buildings || [])) {
    const key = (b as any).catalogKey as string | undefined;
    if (!key) continue;
    const level = Math.max(0, Number((b as any).level || 0));
    if ((b as any).isActive === true || (b as any).pendingUpgrade === true) {
      const prev = levelByKey.get(key) || 0;
      levelByKey.set(key, prev + level);
    }
  }

  // Determine currently active construction at this base (earliest future completion among inactive docs)
  let activeConstruction: { key: BuildingKey; completionAt: string; startedAt?: string } | null = null;
  try {
    const nowTs = Date.now();
    let earliest = Number.POSITIVE_INFINITY;
    let startedForEarliest: number | null = null;
    for (const b of (buildings || [])) {
      if ((b as any)?.isActive === false && (b as any)?.constructionCompleted) {
        const ts = new Date((b as any).constructionCompleted as any).getTime();
        if (Number.isFinite(ts) && ts > nowTs && ts < earliest) {
          earliest = ts;
          const key = String((b as any).catalogKey || "");
          const st = (b as any)?.constructionStarted ? new Date((b as any).constructionStarted as any).getTime() : null;
          startedForEarliest = st ?? startedForEarliest;
          if (key) {
            activeConstruction = { key: key as BuildingKey, completionAt: new Date(ts).toISOString(), startedAt: startedForEarliest ? new Date(startedForEarliest).toISOString() : undefined };
          }
        }
      }
    }
  } catch {
    // non-fatal: leave activeConstruction null on error
  }

  const catalog = getBuildingsList();

  const items = catalog.map((spec) => {
    const key = spec.key as BuildingKey;
    const currentLevel = levelByKey.get(key) ?? 0;
    const nextLevel = currentLevel + 1;

    let creditsCostNext: number | null = null;
    try {
      creditsCostNext = getStructureCreditCostForLevel(key, nextLevel);
    } catch {
      // Fallback for initial L1 when no per-level table exists; upgrades remain null
      creditsCostNext = currentLevel === 0 ? spec.creditsCost : null;
    }

    const canStart = !!status?.eligibility?.[key]?.canStart;
    const reasons = status?.eligibility?.[key]?.reasons || [];

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

  return res.json({
    success: true,
    data: { coord, constructionPerHour, items, activeConstruction },
    message: 'Base structures loaded',
  });
}));

/**
 * v0 Construction: start a single active construction at a base.
 * - No queueing. Reject if another construction is in progress at this base.
 * - Tech-only gating; no refunds/cancel in v0.
 */
router.post('/bases/:coord/structures/:key/construct', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (getDatabaseType() === 'supabase') {
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
    const { SupabaseCapacityService } = require('../services/bases/SupabaseCapacityService');
    const caps = await SupabaseCapacityService.getBaseCapacities(empireId, coord);
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
    const { SupabaseBaseStatsService } = require('../services/bases/SupabaseBaseStatsService');
    const stats = await SupabaseBaseStatsService.getBaseStats(empireId, coord);
    const areaRequired = Math.max(0, Number(spec?.areaRequired ?? 1));
    if (areaRequired > 0 && stats.area.free < areaRequired) return res.status(400).json({ success: false, code: 'INSUFFICIENT_AREA', error: 'Insufficient area capacity to start this construction.', details: { required: areaRequired, available: stats.area.free, used: stats.area.used, total: stats.area.total } });
    const populationRequired = Math.max(0, Number(spec?.populationRequired || 0));
    if (populationRequired > 0 && stats.population.free < populationRequired) return res.status(400).json({ success: false, code: 'INSUFFICIENT_POPULATION', error: 'Insufficient population capacity to start this construction.', details: { required: populationRequired, available: stats.population.free, used: stats.population.used, capacity: stats.population.capacity } });

    // ETA & writes
    const hours = (cost as number) / perHour;
    const completesAt = new Date(now + Math.max(1, Math.ceil(hours * 3600)) * 1000).toISOString();

    // Deduct credits
    await supabase
      .from('empires')
      .update({ credits: availableCredits - (cost as number) })
      .eq('id', empireId);

    if (!existingActive.data) {
      // Insert new queued L1
      try {
        await supabase
          .from('buildings')
          .insert({
            empire_id: empireId,
            location_coord: coord,
            catalog_key: key,
            level: 1,
            is_active: false,
            pending_upgrade: false,
            credits_cost: cost,
            construction_started: new Date(now).toISOString(),
            construction_completed: completesAt,
          });
      } catch {}
    } else {
      // Upgrade existing active doc
      await supabase
        .from('buildings')
        .update({
          is_active: false,
          pending_upgrade: true,
          credits_cost: cost,
          construction_started: new Date(now).toISOString(),
          construction_completed: completesAt,
        })
        .eq('id', (existingActive.data as any).id);
    }

    return res.json({ success: true, data: { coord, key, completesAt }, message: 'Construction started' });
  }

  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { coord, key } = req.params as { coord: string; key: BuildingKey };
  if (!coord || !key) {
    return res.status(400).json({ success: false, error: 'Missing coord or key' });
  }

  // Ownership check
  const location = await Location.findOne({ coord });
  if (!location) {
    return res.status(404).json({ success: false, error: 'Location not found' });
  }
  if (String(location.owner) !== String(empire.userId)) {
    return res.status(403).json({ success: false, error: 'You do not own this location' });
  }

  // Best-effort: finalize any completed constructions before validation so budgets reflect reality
  try {
    const nowTs = Date.now();
    const toFinalize = await Building.find({
      empireId: empire._id,
      locationCoord: coord,
      isActive: false,
      constructionCompleted: { $lte: new Date(nowTs) },
    }).lean();
    for (const b of toFinalize || []) {
      if ((b as any).pendingUpgrade === true) {
        await Building.updateOne({ _id: (b as any)._id }, { $set: { isActive: true, pendingUpgrade: false }, $inc: { level: 1 } });
      } else {
        await Building.updateOne({ _id: (b as any)._id }, { $set: { isActive: true } });
      }
    }
  } catch {}

  // Reject if a construction is already in progress at this base
  const now = Date.now();
  const existingInProgress = await Building.findOne({
    empireId: empire._id,
    locationCoord: coord,
    isActive: false,
    constructionCompleted: { $gt: new Date(now) }
  }).lean();
  if (existingInProgress) {
    return res.status(409).json({ success: false, code: 'ALREADY_IN_PROGRESS', error: 'Construction already underway at this base' });
  }

  // Guard: prevent duplicate instances for the same key while an upgrade or queued item exists
  // If there is any inactive document for this catalogKey at this base (pending upgrade OR queued new construction),
  // treat it as already in progress for this structure key.
  const existingForKeyInactive = await Building.findOne({
    empireId: empire._id,
    locationCoord: coord,
    catalogKey: key,
    isActive: false,
  }).lean();
  if (existingForKeyInactive) {
    return res.status(409).json({
      success: false,
      code: 'ALREADY_IN_PROGRESS',
      error: 'Construction for this structure is already queued or an upgrade is pending at this base',
    });
  }

  // Capacity
  const caps = await CapacityService.getBaseCapacities((empire._id as mongoose.Types.ObjectId).toString(), coord);
  const perHour = Math.max(0, Number((caps as any)?.construction?.value || 0));
  if (!(perHour > 0)) {
    return res.status(400).json({ success: false, code: 'NO_CAPACITY', error: 'This base has no construction capacity' });
  }

  // Determine next level for this structure
  const existingActive = await Building.findOne({
    empireId: empire._id,
    locationCoord: coord,
    catalogKey: key,
    isActive: true
  }).lean();
  const currentLevel = existingActive ? Math.max(1, Number((existingActive as any).level || 1)) : 0;
  const nextLevel = currentLevel + 1;

  // Cost
  let cost: number | null = null;
  try {
    cost = getStructureCreditCostForLevel(key, nextLevel);
  } catch {
    const spec = getBuildingSpec(key);
    cost = currentLevel === 0 ? spec.creditsCost : null;
  }
  if (typeof cost !== 'number') {
    return res.status(400).json({ success: false, code: 'NO_COST_DEFINED', error: 'No cost defined for this level' });
  }

  // Credits validation: check if empire has enough credits
  const availableCredits = Number((empire as any).resources?.credits || 0);
  if (availableCredits < cost) {
    const shortfall = cost - availableCredits;
    return res.status(400).json({
      success: false,
      code: 'INSUFFICIENT_RESOURCES',
      error: `Insufficient credits. Requires ${cost}, you have ${availableCredits}.`,
      details: {
        requiredCredits: cost,
        availableCredits,
        shortfall
      }
    });
  }

  // Energy validation: canonical parity with client/server helpers
  const spec = getBuildingSpec(key);
  const energyDelta = Number(spec?.energyDelta || 0);

  if (energyDelta < 0) {
    // Build energy inputs to mirror the Structures list/Breakdown (aggregate by key, pendingUpgrade treated as active)
    const allBuildings = await Building.find({
      empireId: empire._id,
      locationCoord: coord,
    })
      .select('catalogKey level isActive pendingUpgrade constructionStarted constructionCompleted createdAt')
      .lean();

    const solarEnergy = Math.max(0, Number((location as any)?.result?.solarEnergy ?? 0));
    const gasResource = Math.max(0, Number((location as any)?.result?.yields?.gas ?? 0));

  // Aggregate active levels by key exactly like GET /bases/:coord/structures
  // Sum levels across multiple instances to reflect true total level
  const levelByKey = new Map<string, number>();
  for (const b of (allBuildings || [])) {
    const k = String((b as any).catalogKey || '');
    if (!k) continue;
    const lv = Math.max(0, Number((b as any).level || 0));
    if ((b as any).isActive === true || (b as any).pendingUpgrade === true) {
      const prev = levelByKey.get(k) || 0;
      levelByKey.set(k, prev + lv);
    }
  }

    const buildingsAtBase: Array<{ key: string; level: number; isActive: boolean; isQueuedConsumer?: boolean }> = [];
    for (const [k, lv] of levelByKey.entries()) {
      if (lv > 0) buildingsAtBase.push({ key: k, level: lv, isActive: true });
    }

    // Determine the earliest actively scheduled queued item (same as structures list)
    let earliest: any = null;
    const nowTs = Date.now();
    for (const b of (allBuildings || [])) {
      if ((b as any)?.isActive === false && (b as any)?.constructionCompleted) {
        const ts = new Date((b as any).constructionCompleted as any).getTime();
        if (Number.isFinite(ts) && ts > nowTs) {
          if (!earliest || ts < earliest.ts) {
            earliest = { ts, key: String((b as any).catalogKey || '') };
          }
        }
      }
    }
    if (earliest && earliest.key) {
      const s = getBuildingSpec(earliest.key as any);
      const d = Number(s?.energyDelta || 0);
      if (d < 0) {
        buildingsAtBase.push({ key: earliest.key, level: 1, isActive: false, isQueuedConsumer: true });
      }
    }

    const { produced, consumed, balance, reservedNegative } = computeEnergyBalance({
      buildingsAtBase,
      location: { solarEnergy, gasYield: gasResource },
      includeQueuedReservations: true,
    });

    const projectedEnergy = balance + reservedNegative + energyDelta;

    // Standardized parity log (same as StructuresService.start)
    console.log(
      `[StructuresService.start] key=${key} delta=${energyDelta} produced=${produced} consumed=${consumed} balance=${balance} reserved=${reservedNegative} projectedEnergy=${projectedEnergy}`
    );

    if (projectedEnergy < 0) {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_ENERGY',
        error: 'Insufficient energy capacity to start this construction.',
        details: {
          produced,
          consumed,
          balance,
          reservedNegative,
          energyDelta,
          projectedEnergy,
        },
      });
    }
  }

  // Area validation: check if there's enough area available
  const areaRequired = Math.max(0, Number(spec?.areaRequired ?? 1)); // Default to 1 if not specified
  if (areaRequired > 0) {
    const baseStats = await BaseStatsService.getBaseStats((empire._id as mongoose.Types.ObjectId).toString(), coord);
    if (baseStats.area.free < areaRequired) {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_AREA',
        error: 'Insufficient area capacity to start this construction.',
        details: {
          required: areaRequired,
          available: baseStats.area.free,
          used: baseStats.area.used,
          total: baseStats.area.total
        }
      });
    }
  }

  // Population validation: check if there's enough population available
  const populationRequired = Math.max(0, Number(spec?.populationRequired || 0));
  if (populationRequired > 0) {
    const baseStats = await BaseStatsService.getBaseStats((empire._id as mongoose.Types.ObjectId).toString(), coord);
    if (baseStats.population.free < populationRequired) {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_POPULATION',
        error: 'Insufficient population capacity to start this construction.',
        details: {
          required: populationRequired,
          available: baseStats.population.free,
          used: baseStats.population.used,
          capacity: baseStats.population.capacity
        }
      });
    }
  }

  // ETA
  const hours = cost / perHour;
  const completesAt = new Date(now + Math.max(1, Math.ceil(hours * 3600)) * 1000);

  // Deduct credits immediately when construction starts
  await Empire.updateOne(
    { _id: empire._id },
    { $inc: { 'resources.credits': -cost } }
  );
  CreditLedgerService.logTransaction({
    empireId: (empire._id as mongoose.Types.ObjectId),
    amount: -cost,
    type: 'construction',
    note: `Start construction: ${key} at ${coord}`,
    meta: { coord, key },
  }).catch(() => {});

  // Start construction
  if (!existingActive) {
    const spec = getBuildingSpec(key);
    try {
      await Building.create({
        locationCoord: coord,
        empireId: empire._id,
        type: key as any, // Now using catalogKey as type
        displayName: spec.name,
        catalogKey: key,
        level: 1,
        isActive: false,
        creditsCost: cost,
        pendingUpgrade: false,
        constructionStarted: new Date(now),
        constructionCompleted: completesAt
      } as any);
    } catch (err: any) {
      // Handle race with unique index (another request created the doc first)
      if (err && (err.code === 11000 || /duplicate key/i.test(String(err.message || '')))) {
        // Fetch the current doc and decide: upgrade or already-in-progress
        const current = await Building.findOne({ empireId: empire._id, locationCoord: coord, catalogKey: key }).lean();
        if (current) {
          if ((current as any).isActive === true) {
            // Switch to upgrade path on the existing active document
            await Building.updateOne(
              { _id: (current as any)._id, isActive: true },
              {
                $set: {
                  isActive: false,
                  pendingUpgrade: true,
                  creditsCost: cost,
                  constructionStarted: new Date(now),
                  constructionCompleted: completesAt
                }
              }
            );
          } else {
            // Already queued for this key
            return res.status(409).json({ success: false, code: 'ALREADY_IN_PROGRESS', error: 'Construction for this structure is already queued at this base' });
          }
        } else {
          // Fallback: rethrow if we truly cannot find it
          throw err;
        }
      } else {
        throw err;
      }
    }
  } else {
    await Building.updateOne(
      { _id: (existingActive as any)._id, isActive: true },
      {
        $set: {
          isActive: false,
          pendingUpgrade: true,
          creditsCost: cost,
          constructionStarted: new Date(now),
          constructionCompleted: completesAt
        }
      }
    );
  }

  return res.json({ success: true, data: { coord, key, completesAt }, message: 'Construction started' });
}));

/**
 * Cancel active structure construction at a base (v0)
 * - If the active construction is an upgrade (pendingUpgrade=true), revert the building to active and clear construction fields
 * - If the active construction is a new level-1 structure created for construction, delete that document
 * - No credits refund in v0 (refundedCredits = null)
 */
router.delete('/bases/:coord/structures/cancel', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { coord } = req.params as { coord: string };
  if (!coord) {
    return res.status(400).json({ success: false, error: 'Missing coord' });
  }

  // Ownership check
  const location = await Location.findOne({ coord });
  if (!location) {
    return res.status(404).json({ success: false, error: 'Location not found' });
  }
  if (String(location.owner) !== String(empire.userId)) {
    return res.status(403).json({ success: false, error: 'You do not own this location' });
  }

  // Find an in-progress construction for this base (single active construction model)
  const now = new Date();
  const item = await Building.findOne({
    empireId: empire._id,
    locationCoord: coord,
    isActive: false,
    constructionCompleted: { $gt: now }
  }).sort({ constructionCompleted: 1 });

  if (!item) {
    return res.status(404).json({ success: false, code: 'NO_ACTIVE_CONSTRUCTION', error: 'No active construction found at this base' });
  }

  const key = String((item as any).catalogKey || '');
  const pendingUpgrade = !!(item as any).pendingUpgrade;
  // Determine refund amount from stored creditsCost, with safe fallback to catalog
  let refundedCredits: number | null = null;
  try {
    const stored = Number((item as any).creditsCost);
    if (Number.isFinite(stored) && stored > 0) {
      refundedCredits = stored;
    } else if (key) {
      try {
        // Compute from catalog as a fallback
        const level = Math.max(1, Number((item as any).level || 1));
        const nextLevel = pendingUpgrade ? level + 1 : 1;
        refundedCredits = getStructureCreditCostForLevel(key as any, nextLevel);
      } catch {
        try {
          const spec = getBuildingSpec(key as any);
          refundedCredits = Number(spec?.creditsCost || 0) || null;
        } catch {
          refundedCredits = null;
        }
      }
    }
  } catch {
    refundedCredits = null;
  }

  let cancelled = false;

  if (pendingUpgrade) {
    // Revert the existing building back to active state and clear construction fields
    const result = await Building.updateOne(
      { _id: (item as any)._id, isActive: false },
      {
        $set: { isActive: true, pendingUpgrade: false },
        $unset: { creditsCost: '', constructionStarted: '', constructionCompleted: '' }
      }
    );
    cancelled = (result.modifiedCount || 0) > 0;
  } else {
    // This was a new L1 structure created solely for construction; remove it
    const result = await Building.deleteOne({ _id: (item as any)._id });
    cancelled = (result.deletedCount || 0) > 0;
  }

  if (!cancelled) {
    return res.status(400).json({ success: false, code: 'CANCEL_FAILED', error: 'Failed to cancel active construction' });
  }

  // Apply refund after successful cancel
  if (refundedCredits && refundedCredits > 0) {
    await Empire.updateOne(
      { _id: empire._id },
      { $inc: { 'resources.credits': refundedCredits } }
    );
    CreditLedgerService.logTransaction({
      empireId: (empire._id as mongoose.Types.ObjectId),
      amount: refundedCredits,
      type: 'construction_refund',
      note: `Cancel construction: ${key} at ${coord}`,
      meta: { coord, key },
    }).catch(() => {});
  }

  return res.json({
    success: true,
    data: { cancelledStructure: key, refundedCredits: refundedCredits ?? 0 },
    message: 'Construction cancelled'
  });
}));

/**
 * Technology Research Queue
 * Lists active tech research (capacity-driven) for the authenticated empire.
 * Optional ?base=A00:10:22:10 to filter by a specific base coord.
 */
router.get('/tech/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const base = String(req.query.base || '').trim();
  const filter: any = { empireId: empire._id, status: 'pending' };
  if (base) filter.locationCoord = base;

  const queue = await TechQueue.find(filter).sort({ completesAt: 1, createdAt: 1 }).lean();

  res.json({ success: true, data: { queue } });
}));

// Cancel a pending technology research queue item
router.delete('/tech/queue/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const id = String(req.params.id || '').trim();
  if (!id || !mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: 'Invalid queue item id' });
  }

  const item = await TechQueue.findById(id);
  if (!item || item.empireId.toString() !== (empire._id as mongoose.Types.ObjectId).toString()) {
    return res.status(404).json({ success: false, error: 'Queue item not found' });
  }

  if (item.status !== 'pending') {
    return res.status(400).json({ success: false, error: 'Only pending items can be cancelled' });
  }

  let refundedCredits: number | null = null;
  try {
    if (item.charged === true) {
      const spec = getTechSpec(item.techKey as TechnologyKey);
      const credits = getTechCreditCostForLevel(spec, Math.max(1, Number(item.level || 1)));
      refundedCredits = credits;
      (empire as any).resources.credits = Number((empire as any).resources.credits || 0) + credits;
      await empire.save();
      CreditLedgerService.logTransaction({
        empireId: (empire._id as mongoose.Types.ObjectId),
        amount: credits,
        type: 'research_refund',
        note: `Cancel research ${item.techKey} at ${item.locationCoord}`,
        meta: { techKey: item.techKey, level: item.level, locationCoord: item.locationCoord },
      }).catch(() => {});
    }
  } catch {
    // If spec lookup fails, skip refund silently to avoid throwing; status still changes
  }

  item.status = 'cancelled';
  await item.save();

  return res.json({
    success: true,
    data: { cancelledId: item._id?.toString(), refundedCredits },
    message: 'Research queue item cancelled'
  });
}));

/**
 * Base Units (MVP)
 * Returns aggregate counts of completed units at a specific base for the authenticated empire.
 * DTO: { success, data: { base, counts: Record<UnitKey, number>, total }, message }
 */
router.get('/base-units', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
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
    // Aggregate completed unit productions at this base for this empire
    const agg = await UnitQueue.aggregate([
      { $match: { empireId: empire._id, locationCoord: baseCoord, status: 'completed' } as any },
      { $group: { _id: '$unitKey', count: { $sum: 1 } } }
    ]);

    const counts: Record<string, number> = {};
    let total = 0;
    for (const g of agg || []) {
      const key = String(g?._id || '');
      const n = Math.max(0, Number(g?.count || 0));
      if (key) counts[key] = n;
      total += n;
    }

    return res.json({
      success: true,
      data: { base: baseCoord, counts, total },
      message: 'Base units loaded'
    });
  } catch (err) {
    // Fallback error shape per DTO/Error schema guidance
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
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const baseCoord = String(req.query.base || '').trim();
  const filter: any = { empireId: empire._id };
  if (baseCoord) filter.locationCoord = baseCoord;

  const fleets = await Fleet.find(filter).sort({ createdAt: 1 }).lean();

  const rows = (fleets || []).map((f: any) => ({
    _id: f._id?.toString(),
    name: f.name,
    ownerName: empire.name,
    arrival: null as null, // stationed at base
    sizeCredits: Number(f.sizeCredits || 0),
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

  // 1) Stationed fleets at this base (all empires)
  const stationed = await Fleet.find({ locationCoord: baseCoord }).lean();

  // Collect empire ids for name lookup
  const empireIds = new Set<string>();
  for (const f of stationed) {
    if ((f as any).empireId) empireIds.add(String((f as any).empireId));
  }

  // 2) Inbound movements to this base (any empire)
  //    We include both 'pending' and 'travelling' as incoming
  const { FleetMovement } = await import('../models/FleetMovement');
  const incoming = await FleetMovement.find({
    destinationCoord: baseCoord,
    status: { $in: ['pending', 'travelling'] }
  }).lean();

  for (const m of incoming as any[]) {
    if (m.empireId) empireIds.add(String(m.empireId));
  }

  // Lookup empire names
  const empireDocs = await Empire.find({ _id: { $in: Array.from(empireIds) } }).lean();
  const empireNameById = new Map<string, string>();
  for (const e of empireDocs) {
    empireNameById.set(String((e as any)._id), String((e as any).name || 'Unknown'));
  }

  // For inbound movements, also lookup fleet names (and potentially size)
  const inboundFleetIds = Array.from(new Set((incoming as any[]).map(m => String(m.fleetId))));
  const inboundFleets = inboundFleetIds.length > 0
    ? await Fleet.find({ _id: { $in: inboundFleetIds } }).lean()
    : [];
  const inboundFleetById = new Map<string, any>();
  for (const f of inboundFleets) inboundFleetById.set(String((f as any)._id), f);

  // Build rows
  const rows: Array<{ _id: string; name: string; ownerName: string; arrival: string | null; sizeCredits: number }> = [];

  // Stationed
  for (const f of stationed as any[]) {
    rows.push({
      _id: String(f._id),
      name: String(f.name),
      ownerName: empireNameById.get(String(f.empireId)) || 'Unknown',
      arrival: null, // stationed
      sizeCredits: Number(f.sizeCredits || 0),
    });
  }

  // Incoming
  for (const m of incoming as any[]) {
    const fleetDoc = inboundFleetById.get(String(m.fleetId));
    rows.push({
      _id: String(m._id), // movement id as unique row id
      name: fleetDoc ? String(fleetDoc.name) : `Inbound Fleet`,
      ownerName: empireNameById.get(String(m.empireId)) || 'Unknown',
      arrival: m.estimatedArrivalTime ? new Date(m.estimatedArrivalTime).toISOString() : null,
      sizeCredits: Number(m.sizeCredits || (fleetDoc?.sizeCredits ?? 0)),
    });
  }

  return res.json({ success: true, data: { fleets: rows } });
}));

/**
 * Fleet detail — composition and metadata
 * DTO: { success, data: { fleet: { _id, name, locationCoord, ownerName, units: [{ unitKey, name, count }], sizeCredits } } }
 */
router.get('/fleets/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const id = String(req.params.id || '').trim();
  if (!id || !mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Invalid fleet id',
      details: { field: 'id' }
    });
  }

  const fleet = await Fleet.findOne({ _id: id, empireId: empire._id }).lean();
  if (!fleet) {
    return res.status(404).json({ success: false, error: 'Fleet not found' });
  }

  const units = Array.isArray((fleet as any).units) ? (fleet as any).units : [];
  const composition = units.map((u: any) => {
    const key = String(u?.unitKey || '');
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
        _id: (fleet as any)._id?.toString?.(),
        name: (fleet as any).name,
        locationCoord: (fleet as any).locationCoord,
        ownerName: empire.name,
        units: composition,
        sizeCredits: Number((fleet as any).sizeCredits || 0),
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
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const fleetId = String(req.params.id || '').trim();
  if (!fleetId || !mongoose.isValidObjectId(fleetId)) {
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

  try {
    const result = await FleetMovementService.dispatchFleet(
      fleetId,
      empire._id as mongoose.Types.ObjectId,
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
        movement: {
          _id: result.movement!._id,
          status: result.movement!.status,
          originCoord: result.movement!.originCoord,
          destinationCoord: result.movement!.destinationCoord,
          departureTime: result.movement!.departureTime,
          estimatedArrivalTime: result.movement!.estimatedArrivalTime,
          travelTimeHours: result.movement!.travelTimeHours,
          distance: result.movement!.distance,
          fleetSpeed: result.movement!.fleetSpeed
        }
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
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const fleetId = String(req.params.id || '').trim();
  if (!fleetId || !mongoose.isValidObjectId(fleetId)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Invalid fleet id',
      details: { field: 'id' }
    });
  }

  try {
    const result = await FleetMovementService.getFleetStatus(
      fleetId,
      empire._id as mongoose.Types.ObjectId
    );

    if (!result.success) {
      return res.status(404).json({
        success: false,
        code: 'FLEET_NOT_FOUND',
        message: result.error || 'Fleet not found'
      });
    }

    return res.json({
      success: true,
      data: {
        fleet: result.fleet,
        movement: result.movement ? {
          _id: result.movement._id,
          status: result.movement.status,
          originCoord: result.movement.originCoord,
          destinationCoord: result.movement.destinationCoord,
          departureTime: result.movement.departureTime,
          estimatedArrivalTime: result.movement.estimatedArrivalTime,
          actualArrivalTime: result.movement.actualArrivalTime,
          travelTimeHours: result.movement.travelTimeHours,
          distance: result.movement.distance,
          fleetSpeed: result.movement.fleetSpeed
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
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const fleetId = String(req.params.id || '').trim();
  if (!fleetId || !mongoose.isValidObjectId(fleetId)) {
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

  try {
    const fleet = await Fleet.findOne({ _id: fleetId, empireId: empire._id });
    if (!fleet) {
      return res.status(404).json({
        success: false,
        code: 'FLEET_NOT_FOUND',
        message: 'Fleet not found'
      });
    }

    // Calculate travel time using FleetMovementService methods
    const distance = FleetMovementService.calculateDistance(fleet.locationCoord, destinationCoord);
    const fleetSpeed = FleetMovementService.calculateFleetSpeed(fleet.units || []);
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
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const fleetId = String(req.params.id || '').trim();
  if (!fleetId || !mongoose.isValidObjectId(fleetId)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Invalid fleet id',
      details: { field: 'id' }
    });
  }

  const { reason } = req.body as { reason?: string };

  try {
    const result = await FleetMovementService.recallFleet(
      fleetId,
      empire._id as mongoose.Types.ObjectId,
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
        movement: {
          _id: result.movement!._id,
          status: result.movement!.status,
          originCoord: result.movement!.originCoord,
          destinationCoord: result.movement!.destinationCoord,
          recallTime: result.movement!.recallTime,
          recallReason: result.movement!.recallReason
        }
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
