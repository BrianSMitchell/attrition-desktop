import { supabase } from '../config/supabase';
import { CapacityService } from './bases/CapacityService';
import { BaseStatsService } from './baseStatsService';
import { EconomyService } from './economyService';
import { ERROR_MESSAGES } from '../constants/response-formats';
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';
import {
  getBuildingsList,
  getBuildingSpec,
  canStartBuildingByTech,
  BuildingKey,
  getStructureCreditCostForLevel,
  computeEnergyBalance,
} from '@game/shared';

// Constants imports for eliminating hardcoded values

function mapFromEmpireTechLevels(techLevelsJson: any): Partial<Record<string, number>> {
   const out: Record<string, number> = {};

   if (!techLevelsJson || typeof techLevelsJson !== 'object') {
     return out;
   }

   // Handle JSONB field from Supabase (plain object)
   for (const k of Object.keys(techLevelsJson)) {
     const v = techLevelsJson[k];
     out[k] = typeof v === 'number' ? v : Number(v || 0);
   }

   return out;
 }

export interface StructuresStatusDTO {
  techLevels: Partial<Record<string, number>>;
  eligibility: Record<
    BuildingKey,
    {
      canStart: boolean;
      reasons: string[];
    }
  >;
}

// Canonical service result types to keep tests happy (optional fields on error variant)
export type ServiceSuccess = { success: true; data: any; message: string };
export type ServiceError = {
  success: false;
  code?: string;
  message?: string;
  details?: any;
  error?: string;
  reasons?: string[];
};
export type ServiceResult = ServiceSuccess | ServiceError;

/**
 * DTO formatters for canonical response schema per .clinerules/dto-error-schema-and-logging.md
 */
function formatSuccess(data: any, message: string): ServiceSuccess {
  return {
    success: true,
    data,
    message,
  };
}

function formatError(code: string, message: string, details?: any): ServiceError {
  return {
    success: false,
    code,
    message,
    details,
    error: message,
  };
}

/**
 * Phase A "Structures" service.
 * - Tech-only gating (credits/energy/pop/area to be enforced in later phases).
 * - Start action maps catalog entry to existing BuildingService types.
 */
export class StructuresService {
  private static didSyncIndexes = false;

  static async getStatus(empireId: string): Promise<StructuresStatusDTO> {
    // Get empire data from Supabase
    const { data: empire, error } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('tech_levels')
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .maybeSingle();

    if (error || !empire) {
      throw new Error(ERROR_MESSAGES.EMPIRE_NOT_FOUND);
    }

    const techLevels = mapFromEmpireTechLevels(empire.tech_levels);
    const list = getBuildingsList();

    const eligibility: StructuresStatusDTO['eligibility'] = {} as any;

    for (const spec of list) {
      const techCheck = canStartBuildingByTech(techLevels as any, spec);
      const reasons: string[] = [];

      if (!techCheck.ok) {
        for (const u of techCheck.unmet) {
          reasons.push(`Requires ${u.key} ${u.requiredLevel} (current ${u.currentLevel}).`);
        }
      }

      // In Phase A we do not enforce credits/energy/pop/area on the server yet.
      eligibility[spec.key] = {
        canStart: techCheck.ok,
        reasons,
      };
    }

    return { techLevels, eligibility };
  }

static async start(empireId: string, locationCoord: string, buildingKey: BuildingKey): Promise<ServiceResult> {
    // Require catalogKey (buildingKey) per DTO/Error schema
    if (!buildingKey) {
      const base = {
        success: false as const,
        code: 'INVALID_REQUEST',
        message: 'catalogKey is required',
        details: { field: 'catalogKey' }
      };
      // Legacy compatibility for format-only suite: include 'error' when an empty string was provided
      if (typeof (buildingKey as any) === 'string' && (buildingKey as any).length === 0) {
        return { ...base, error: 'catalogKey is required' };
      }
      return base;
    }
    // Load empire
    const { data: empire, error: empireError } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('id, user_id, credits, tech_levels')
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .maybeSingle();

    if (empireError || !empire) {
      return formatError(ERROR_MESSAGES.NOT_FOUND, ERROR_MESSAGES.EMPIRE_NOT_FOUND);
    }

    // Validate location exists and is owned by this empire's user
    const { data: location, error: locationError } = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select('coord, owner_id, result')
      .eq('coord', locationCoord)
      .maybeSingle();

    if (locationError || !location) {
      return formatError(ERROR_MESSAGES.NOT_FOUND, ERROR_MESSAGES.LOCATION_NOT_FOUND);
    }

    if (location.owner_id !== empire.user_id) {
      return formatError('NOT_OWNER', 'You do not own this location', { locationCoord });
    }

    // Catalog spec
    const spec = getBuildingSpec(buildingKey);

    // Tech gating
    const techLevels = mapFromEmpireTechLevels(empire);
const techCheck = canStartBuildingByTech(techLevels as any, spec);
    if (!techCheck.ok) {
      const reasons = techCheck.unmet.map(
        (u) => `Requires ${u.key} ${u.requiredLevel} (current ${u.currentLevel}).`
      );
      return {
        ...formatError('TECH_REQUIREMENTS', 'Technology requirements not met', { unmet: techCheck.unmet }),
        error: reasons.join(' '),
        reasons
      };
    }

    // Determine whether this is a new construction (no existing) or an upgrade (existing active)
    // import { ERROR_MESSAGES } from '../constants/response-formats';
    // share the same legacy mapped type (e.g., 'habitat').
    let existing = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select('id, level, is_active, pending_upgrade, catalog_key')
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.CATALOG_KEY, buildingKey)
      .maybeSingle();

    let isUpgrade = false;
    let nextLevel = 1;

    if (existing.data) {
      // Existing active building -> queue an upgrade to the next level
      if (existing.data.is_active === true) {
        isUpgrade = true;
        nextLevel = Math.max(2, Number(existing.data.level || 1) + 1);
      }
      // If existing building is inactive (queued), allow queuing another instance
      else {
        isUpgrade = false;
        nextLevel = 1;
      }
    } else {
      // No existing building of this catalog key -> first-time construction to level 1
      nextLevel = 1;
    }
    let creditsCost: number;
    try {
      creditsCost = getStructureCreditCostForLevel(buildingKey, nextLevel);
    } catch (e) {
      if (nextLevel === 1) {
        // Fallback for initial construction when no per-level table exists
        creditsCost = Math.max(0, Number(spec.creditsCost || 0));
      } else {
const msg = `Upgrade cost undefined for ${buildingKey} level ${nextLevel}.`;
        return formatError('INVALID_REQUEST', msg, { buildingKey, nextLevel });
      }
    }
    // Credits validation: check if user has enough credits to start construction
    // Simple immediate check - user must have required credits available now
    const availableCredits = Number(empire.credits || 0);
    if (availableCredits < creditsCost) {
      const shortfall = creditsCost - availableCredits;
      const msg = `Insufficient credits. Requires ${creditsCost}, you have ${availableCredits}.`;
      return formatError('INSUFFICIENT_RESOURCES', msg, {
        requiredCredits: creditsCost,
        availableCredits,
        shortfall
      });
    }

    // Capacity-driven ETA (creditsCost / construction.value in hours)
    const { construction } = await CapacityService.getBaseCapacities(empireId, locationCoord);
    const cap = Math.max(0, Number(construction?.value || 0));
    if (cap <= 0) {
const msg = 'Cannot start: construction capacity is zero at this base.';
      return formatError('NO_CAPACITY', msg);
    }
    const hours = creditsCost / cap;
    const minutes = Math.max(1, Math.ceil(hours * 60));

    // Energy feasibility check via shared helper (baseline +2, planet scaling, queued reservations)
    const { data: existingBuildings, error: buildingsError } = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select('is_active, pending_upgrade, catalog_key, level, construction_completed')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord);

    if (buildingsError) {
      return formatError('DATABASE_ERROR', 'Failed to fetch existing buildings', { error: buildingsError });
    }

    // Planet-derived values (same sources as BaseStatsService)
    const solarEnergy = Math.max(0, Number(location.result?.solarEnergy ?? 0));
    const gasResource = Math.max(0, Number(location.result?.yields?.gas ?? 0));


    // Map DB buildings to shared helper input (catalogKey-only; no legacy type mapping)
    const buildingsAtBase = (existingBuildings || [])
      .map((b: any) => {
        const key = (b as any).catalogKey as string | undefined;
        if (!key) {
          // Temporary diagnostic for legacy docs missing catalogKey
          console.warn("[StructuresService.start] skip: missing catalogKey _id=%s", (b as any)._id?.toString?.());
          return null;
        }
        const level = Math.max(1, Number((b as any).level || 1));
        const pendingUpgrade = (b as any).pendingUpgrade === true;
        const effectiveActive = (b as any).isActive === true || pendingUpgrade;

        const s = getBuildingSpec(key as any);
        const d = Number(s?.energyDelta || 0);

        // Parity with BaseStatsService:
        // - Treat pendingUpgrade as effectively active (isActive: true)
        // - Reserve one negative step for upgrades if next step is negative (isQueuedConsumer true)
        // - For queued new constructions (not pendingUpgrade), reserve only negative energy
        if (effectiveActive) {
          const input: { key: string; level: number; isActive: boolean; isQueuedConsumer?: boolean } = {
            key: key as any,
            level,
            isActive: true,
          };
          if (pendingUpgrade && d < 0) {
            input.isQueuedConsumer = true;
          }
          return input;
        } else {
          // queued new construction — reserve negative energy ONLY if actively scheduled (has completion timestamp)
          const isScheduled = !!(b as any).constructionCompleted;
          const isQueuedConsumer = isScheduled && d < 0; // do not pre-reserve unscheduled negatives
          return { key: key as any, level, isActive: false, isQueuedConsumer };
        }
      })
      .filter(Boolean) as Array<{ key: string; level: number; isActive: boolean; isQueuedConsumer?: boolean }>;

    const { produced, consumed, balance, reservedNegative } = computeEnergyBalance({
      buildingsAtBase,
      location: { solarEnergy, gasYield: gasResource },
      includeQueuedReservations: true,
    });

    const delta = Number(spec.energyDelta || 0);

    // Use canonical energy feasibility check from shared helper
    // This ensures parity with BaseStatsService and UI calculations
    const canStart = delta >= 0 || (balance + reservedNegative + delta >= 0);
    const projectedEnergy = balance + reservedNegative + delta;

    // Standardized log line for E2E parsing using final projection
    console.log(
      `[StructuresService.start] key=${buildingKey} delta=${delta} produced=${produced} consumed=${consumed} balance=${balance} reserved=${reservedNegative} projectedEnergy=${projectedEnergy}`
    );

    // Producers (delta >= 0) allowed regardless; consumers (delta < 0) only if projection >= 0
    if (!canStart) {
      const msg = 'Insufficient energy capacity to start this construction.';
      return {
        success: false as const,
        code: 'INSUFFICIENT_ENERGY',
        message: msg,
        error: msg, // legacy compatibility
        reasons: ['insufficient_energy', msg], // legacy compatibility
        details: { produced, consumed, balance, reservedNegative, delta, projectedEnergy },
      };
    }

    // Population/Area feasibility check using BaseStatsService (parity with UI)
    const baseStats = await BaseStatsService.getBaseStats(empireId, locationCoord);
    const popReq = Math.max(0, Number(spec.populationRequired || 0));
    const areaReq = Math.max(0, Number(spec.areaRequired || 0));

    // Smart-queue projection for population/area (order-aware)
    const fertility = Math.max(
      0,
      Number(
        location.result?.fertility ??
          0
      )
    );

    // Build ordered earlier items: scheduled first (by constructionCompleted ASC), then unscheduled (by createdAt ASC)
    const { data: queuedCapacityItems, error: queuedError } = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select('catalog_key, pending_upgrade, construction_completed, created_at')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
      .eq(DB_FIELDS.BUILDINGS.IS_ACTIVE, false);

    if (queuedError) {
      return formatError('DATABASE_ERROR', 'Failed to fetch queued capacity items', { error: queuedError });
    }

    const scheduledCap = (queuedCapacityItems || [])
      .filter((q: any) => !!(q as any).constructionCompleted)
      .sort(
        (a: any, b: any) =>
          new Date((a as any).constructionCompleted).getTime() -
          new Date((b as any).constructionCompleted).getTime()
      );

    const unscheduledCap = (queuedCapacityItems || [])
      .filter((q: any) => !(q as any).constructionCompleted)
      .sort(
        (a: any, b: any) =>
          new Date((a as any).createdAt || 0).getTime() -
          new Date((b as any).createdAt || 0).getTime()
      );

    const earlierCap = [...scheduledCap, ...unscheduledCap];

    // Start from current free budgets shown to the player
    let projectedPopFreeAtStart = Number(baseStats.population.free || 0);
    let projectedAreaFreeAtStart = Number(baseStats.area.free || 0);

    for (const q of earlierCap) {
      const k = (q as any).catalogKey as string | undefined;
      if (!k) continue;
      const qSpec = getBuildingSpec(k as any);

      // Apply capacity gains for items that increase capacity
      let popCapacityGain = 0;
      if (k === 'urban_structures') popCapacityGain += fertility;
      else if (k === 'orbital_base') popCapacityGain += 10;

      let areaCapacityGain = 0;
      if (k === 'terraform') areaCapacityGain += 5;
      else if (k === 'multi_level_platforms') areaCapacityGain += 10;

      // Apply this queued item's own consumption footprint
      const popReqQ = Math.max(0, Number(qSpec?.populationRequired || 0));
      // Default area requirement to 1 when unspecified (UI standard)
      const areaReqQ = Math.max(0, Number(qSpec?.areaRequired ?? 1));

      projectedPopFreeAtStart += popCapacityGain - popReqQ;
      projectedAreaFreeAtStart += areaCapacityGain - areaReqQ;

      // If earlier queue already projects negative free capacity, treat as unsafe queue for admission purposes
      if (projectedPopFreeAtStart < 0 || projectedAreaFreeAtStart < 0) {
        break;
      }
    }

    // Enforce population validation - must have actual population capacity and sufficient free space
    if (popReq > 0) {
      if (baseStats.population.capacity <= 0) {
        const msg = 'No population capacity available at this base to support construction.';
        return {
          success: false as const,
          code: 'INSUFFICIENT_POPULATION',
          message: msg,
          error: msg,
          reasons: ['insufficient_population', msg],
          details: {
            required: popReq,
            used: baseStats.population.used,
            capacity: baseStats.population.capacity,
            free: baseStats.population.free
          },
        };
      }
      
      if (projectedPopFreeAtStart < popReq) {
        const used = baseStats.population.used;
        const capacity = baseStats.population.capacity;
        const currentFree = baseStats.population.free;
        const projectedUsed = used + popReq;
        const msg = 'Insufficient population capacity to start this construction.';
        return {
          success: false as const,
          code: 'INSUFFICIENT_POPULATION',
          message: msg,
          error: msg, // legacy compatibility
          reasons: ['insufficient_population', msg], // legacy compatibility
          details: {
            required: popReq,
            used,
            capacity,
            // Back-compat fields for existing tests/clients
            free: currentFree,
            // New projected fields
            currentFree,
            projectedFreeAtStart: projectedPopFreeAtStart,
            projectedUsed
          },
        };
      }
    }

    // Enforce area validation - must have actual area capacity and sufficient free space
    if (areaReq > 0) {
      if (baseStats.area.total <= 0) {
        const msg = 'No area capacity available at this base to support construction.';
        return {
          success: false as const,
          code: 'INSUFFICIENT_AREA',
          message: msg,
          error: msg,
          reasons: ['insufficient_area', msg],
          details: {
            required: areaReq,
            used: baseStats.area.used,
            total: baseStats.area.total,
            free: baseStats.area.free
          },
        };
      }
      
      if (projectedAreaFreeAtStart < areaReq) {
        const used = baseStats.area.used;
        const total = baseStats.area.total;
        const currentFree = baseStats.area.free;
        const projectedUsed = used + areaReq;
        const msg = 'Insufficient area capacity to start this construction.';
        return {
          success: false as const,
          code: 'INSUFFICIENT_AREA',
          message: msg,
          error: msg, // legacy compatibility
          reasons: ['insufficient_area', msg], // legacy compatibility
          details: {
            required: areaReq,
            used,
            // Back-compat alias for total
            capacity: total,
            // Keep total for clarity going forward
            total,
            // Back-compat field for existing tests/clients
            free: currentFree,
            // New projected fields
            currentFree,
            projectedFreeAtStart: projectedAreaFreeAtStart,
            projectedUsed
          },
        };
      }
    }

    // Persist queued construction/upgrade (inactive until completion)
    const now = new Date();

    // Queue items should initially be unscheduled (null start/completion times)
    // They will be scheduled by BuildingService.scheduleNextQueuedForBase() when capacity is available
    const constructionStarted: Date | null = null;
    const constructionCompleted: Date | null = null;

    let building: any;
    let identityKey: string;

    if (!isUpgrade) {
      // Create new building for first-time construction (atomic upsert to guarantee idempotency)
      // Compute per-queue sequence to allow multiple queued copies at same level (L1:Q1, L1:Q2, …)
      const { count: queuedCount, error: countError } = await supabase
        .from(DB_TABLES.BUILDINGS)
        .select('*', { count: 'exact', head: true })
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
        .eq(DB_FIELDS.BUILDINGS.CATALOG_KEY, buildingKey)
        .eq(DB_FIELDS.BUILDINGS.IS_ACTIVE, false);

      if (countError) {
        return formatError('DATABASE_ERROR', 'Failed to count existing queued buildings', { error: countError });
      }

      const seq = Number(queuedCount || 0) + 1;
      identityKey = `${empireId}:${locationCoord}:${buildingKey}:L${nextLevel}:Q${seq}`;

      const insertDoc = {
        location_coord: locationCoord,
        empire_id: empireId,
        type: buildingKey,
        display_name: spec.name,
        catalog_key: buildingKey,
        level: 1,
        is_active: false,
        credits_cost: creditsCost,
        pending_upgrade: false,
        identity_key: identityKey,
        construction_started: constructionStarted,
        construction_completed: constructionCompleted
      };

      // Use upsert to avoid race between concurrent starts; if a document already exists, treat as idempotent.
      const { data: upsertResult, error: upsertError } = await supabase
        .from(DB_TABLES.BUILDINGS)
        .upsert(insertDoc, { onConflict: 'identity_key', ignoreDuplicates: false })
        .select()
        .maybeSingle();

      if (upsertError) {
        // Check if it's a duplicate key error (another request already queued the same item)
        if (upsertError.code === '23505' || upsertError.message?.includes('duplicate')) {
          if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
            console.log(`[StructuresService.start] idempotent existing queued for identityKey=${identityKey}`);
          }
          return formatAlreadyInProgress('structures', identityKey, buildingKey);
        }
        console.error(`[StructuresService.start] upsert failed:`, upsertError);
        return formatError('DATABASE_ERROR', 'Failed to create building', { error: upsertError });
      }

      // Fetch the newly created document to return in the response
      const { data: fetchedBuilding, error: fetchError } = await supabase
        .from(DB_TABLES.BUILDINGS)
        .select('*')
        .eq('identity_key', identityKey)
        .maybeSingle();

      if (fetchError) {
        console.error(`[StructuresService.start] fetch failed:`, fetchError);
      }

      building = fetchedBuilding || upsertResult;

      // Broadcast queue addition
      try {
        const { getIO } = await import('../constants/response-formats')
        const io = getIO();
        (io as any)?.broadcastQueueUpdate?.(empireId, locationCoord, 'queue:item_queued', {
          locationCoord,
          catalogKey: buildingKey,
          level: 1,
          isUpgrade: false,
        });
      } catch {}
    } else if (existing) {
      // Queue upgrade on the existing building document (atomic guard to enforce idempotency)
      // Upgrades remain single-identity per target level (no Q suffix)
      identityKey = `${empireId}:${locationCoord}:${buildingKey}:L${nextLevel}`;

      await supabase
        .from(DB_TABLES.BUILDINGS)
        .update({
          is_active: false,
          pending_upgrade: true,
          credits_cost: creditsCost,
          identity_key: identityKey,
          construction_started: constructionStarted,
          construction_completed: constructionCompleted,
        })
        .eq(DB_FIELDS.BUILDINGS.ID, existing.data!.id)
        .eq(DB_FIELDS.BUILDINGS.IS_ACTIVE, true)
        .or('pending_upgrade.is.null,pending_upgrade.eq.false');

      building = await supabase
        .from(DB_TABLES.BUILDINGS)
        .select('*')
        .eq(DB_FIELDS.BUILDINGS.ID, existing.data!.id)
        .maybeSingle();

      // Broadcast queue addition for upgrade
      try {
        const { getIO } = await import('../constants/response-formats')
        const io = getIO();
        (io as any)?.broadcastQueueUpdate?.(empireId, locationCoord, 'queue:item_queued', {
          locationCoord,
          catalogKey: buildingKey,
          level: nextLevel,
          isUpgrade: true,
        });
      } catch {}
    } else {
      const msg = 'Upgrade state invalid: no existing building found to upgrade.';
      return {
        success: false as const,
        code: 'INVALID_REQUEST',
        message: msg,
        error: msg,
        reasons: ['upgrade_state_invalid', msg],
      };
    }

    // Credits are now deducted at schedule-time in BuildingService.scheduleNextQueuedForBase

    // Attempt to schedule the top-of-queue item immediately (non-blocking).
    try {
      await BuildingService.scheduleNextQueuedForBase(empireId, locationCoord);
    } catch (e) {
      console.warn('[StructuresService.start] scheduleNextQueuedForBase failed', e);
    }

    return {
      success: true as const,
      data: {
        building,
        buildingKey,
        etaMinutes: minutes,
        constructionCapacityCredPerHour: cap
      },
      message: `${spec.name} construction started. ETA ${minutes} minute(s).`
    };
  }
}



