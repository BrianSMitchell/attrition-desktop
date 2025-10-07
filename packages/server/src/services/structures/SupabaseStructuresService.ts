import { supabase } from '../../config/supabase';
import { SupabaseCapacityService } from '../bases/SupabaseCapacityService';
import { SupabaseBaseStatsService } from '../bases/SupabaseBaseStatsService';
import {
  getBuildingsList,
  getBuildingSpec,
  canStartBuildingByTech,
  BuildingKey,
  getStructureCreditCostForLevel,
  computeEnergyBalance,
} from '@game/shared';
import { formatAlreadyInProgress } from '../utils/idempotency';

/**
 * Helper to map tech levels from Supabase empire
 */
function mapTechLevels(techLevelsData: any): Partial<Record<string, number>> {
  if (!techLevelsData) return {};
  
  const out: Record<string, number> = {};
  
  // Handle JSONB object from Supabase
  if (typeof techLevelsData === 'object' && !Array.isArray(techLevelsData)) {
    for (const [key, value] of Object.entries(techLevelsData)) {
      out[key] = typeof value === 'number' ? value : Number(value || 0);
    }
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

// Service result types
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
 * DTO formatters for canonical response schema
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
 * Supabase-based Structures Service
 * Handles player-initiated building construction actions
 */
export class SupabaseStructuresService {
  /**
   * Get structures status for an empire (tech levels and eligibility)
   */
  static async getStatus(empireId: string): Promise<StructuresStatusDTO> {
    const { data: empire, error } = await supabase
      .from('empires')
      .select('tech_levels')
      .eq('id', empireId)
      .maybeSingle();

    if (error || !empire) {
      throw new Error('Empire not found');
    }

    const techLevels = mapTechLevels(empire.tech_levels);
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

      eligibility[spec.key] = {
        canStart: techCheck.ok,
        reasons,
      };
    }

    return { techLevels, eligibility };
  }

  /**
   * Start building construction or upgrade
   */
  static async start(empireId: string, locationCoord: string, buildingKey: BuildingKey): Promise<ServiceResult> {
    // Validate buildingKey
    if (!buildingKey || (typeof buildingKey === 'string' && buildingKey.trim().length === 0)) {
      return {
        success: false as const,
        code: 'INVALID_REQUEST',
        message: 'catalogKey is required',
        details: { field: 'catalogKey' },
        error: 'catalogKey is required',
      };
    }

    // Load empire
    const { data: empire, error: empireError } = await supabase
      .from('empires')
      .select('id, user_id, tech_levels, credits')
      .eq('id', empireId)
      .maybeSingle();

    if (empireError || !empire) {
      return formatError('NOT_FOUND', 'Empire not found');
    }

    // Validate location exists and is owned by this empire's user
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('coord, owner, result')
      .eq('coord', locationCoord)
      .maybeSingle();

    if (locationError || !location) {
      return formatError('NOT_FOUND', 'Location not found');
    }

    if (location.owner !== empire.user_id) {
      return formatError('NOT_OWNER', 'You do not own this location', { locationCoord });
    }

    // Get building spec
    const spec = getBuildingSpec(buildingKey);

    // Tech gating
    const techLevels = mapTechLevels(empire.tech_levels);
    const techCheck = canStartBuildingByTech(techLevels as any, spec);
    if (!techCheck.ok) {
      const reasons = techCheck.unmet.map(
        (u) => `Requires ${u.key} ${u.requiredLevel} (current ${u.currentLevel}).`
      );
      return {
        ...formatError('TECH_REQUIREMENTS', 'Technology requirements not met', { unmet: techCheck.unmet }),
        error: reasons.join(' '),
        reasons,
      };
    }

    // Check for existing building with this catalog key
    const { data: existing, error: existingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('location_coord', locationCoord)
      .eq('empire_id', empireId)
      .eq('catalog_key', buildingKey)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking for existing building:', existingError);
    }

    let isUpgrade = false;
    let nextLevel = 1;

    if (existing) {
      // Existing active building -> queue an upgrade to the next level
      if (existing.is_active === true) {
        isUpgrade = true;
        nextLevel = Math.max(2, Number(existing.level || 1) + 1);
      } else {
        // If existing building is inactive (queued), allow queuing another instance
        isUpgrade = false;
        nextLevel = 1;
      }
    } else {
      // No existing building of this catalog key -> first-time construction to level 1
      nextLevel = 1;
    }

    // Calculate credits cost
    let creditsCost: number;
    try {
      creditsCost = getStructureCreditCostForLevel(buildingKey, nextLevel);
    } catch (e) {
      if (nextLevel === 1) {
        // Fallback for initial construction
        creditsCost = Math.max(0, Number(spec.creditsCost || 0));
      } else {
        const msg = `Upgrade cost undefined for ${buildingKey} level ${nextLevel}.`;
        return formatError('INVALID_REQUEST', msg, { buildingKey, nextLevel });
      }
    }

    // Credits validation
    const availableCredits = Number(empire.credits || 0);
    if (availableCredits < creditsCost) {
      const shortfall = creditsCost - availableCredits;
      const msg = `Insufficient credits. Requires ${creditsCost}, you have ${availableCredits}.`;
      return formatError('INSUFFICIENT_RESOURCES', msg, {
        requiredCredits: creditsCost,
        availableCredits,
        shortfall,
      });
    }

    // Capacity-driven ETA
    const capacities = await SupabaseCapacityService.getBaseCapacities(empireId, locationCoord);
    const cap = Math.max(0, Number(capacities.construction?.value || 0));
    if (cap <= 0) {
      const msg = 'Cannot start: construction capacity is zero at this base.';
      return formatError('NO_CAPACITY', msg);
    }
    const hours = creditsCost / cap;
    const minutes = Math.max(1, Math.ceil(hours * 60));

    // Energy feasibility check
    const { data: existingBuildings, error: buildingsError } = await supabase
      .from('buildings')
      .select('is_active, pending_upgrade, catalog_key, level, construction_completed')
      .eq('empire_id', empireId)
      .eq('location_coord', locationCoord);

    if (buildingsError) {
      console.error('Error fetching buildings:', buildingsError);
    }

    // Extract planet-derived values
    const solarEnergy = Math.max(0, Number((location.result as any)?.solarEnergy ?? 0));
    const gasResource = Math.max(0, Number((location.result as any)?.yields?.gas ?? 0));

    // Map DB buildings for energy calculation
    const buildingsAtBase = (existingBuildings || [])
      .map((b: any) => {
        const key = b.catalog_key as string | undefined;
        if (!key) {
          console.warn(`[SupabaseStructuresService.start] skip: missing catalog_key`);
          return null;
        }
        const level = Math.max(1, Number(b.level || 1));
        const pendingUpgrade = b.pending_upgrade === true;
        const effectiveActive = b.is_active === true || pendingUpgrade;

        const s = getBuildingSpec(key as any);
        const d = Number(s?.energyDelta || 0);

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
          // queued new construction
          const isScheduled = !!b.construction_completed;
          const isQueuedConsumer = isScheduled && d < 0;
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
    const canStart = delta >= 0 || balance + reservedNegative + delta >= 0;
    const projectedEnergy = balance + reservedNegative + delta;

    console.log(
      `[SupabaseStructuresService.start] key=${buildingKey} delta=${delta} produced=${produced} consumed=${consumed} balance=${balance} reserved=${reservedNegative} projectedEnergy=${projectedEnergy}`
    );

    if (!canStart) {
      const msg = 'Insufficient energy capacity to start this construction.';
      return {
        success: false as const,
        code: 'INSUFFICIENT_ENERGY',
        message: msg,
        error: msg,
        reasons: ['insufficient_energy', msg],
        details: { produced, consumed, balance, reservedNegative, delta, projectedEnergy },
      };
    }

    // Population/Area feasibility check
    const baseStats = await SupabaseBaseStatsService.getBaseStats(empireId, locationCoord);
    const popReq = Math.max(0, Number(spec.populationRequired || 0));
    const areaReq = Math.max(0, Number(spec.areaRequired || 0));

    // Smart-queue projection for population/area
    const fertility = Math.max(0, Number((location.result as any)?.fertility ?? 0));

    // Build ordered earlier items
    const { data: queuedCapacityItems, error: queueError } = await supabase
      .from('buildings')
      .select('catalog_key, pending_upgrade, construction_completed, created_at')
      .eq('empire_id', empireId)
      .eq('location_coord', locationCoord)
      .eq('is_active', false);

    if (queueError) {
      console.error('Error fetching queued items:', queueError);
    }

    const scheduledCap = (queuedCapacityItems || [])
      .filter((q: any) => !!q.construction_completed)
      .sort((a: any, b: any) => new Date(a.construction_completed).getTime() - new Date(b.construction_completed).getTime());

    const unscheduledCap = (queuedCapacityItems || [])
      .filter((q: any) => !q.construction_completed)
      .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

    const earlierCap = [...scheduledCap, ...unscheduledCap];

    // Project free budgets
    let projectedPopFreeAtStart = Number(baseStats.population.free || 0);
    let projectedAreaFreeAtStart = Number(baseStats.area.free || 0);

    for (const q of earlierCap) {
      const k = q.catalog_key as string | undefined;
      if (!k) continue;
      const qSpec = getBuildingSpec(k as any);

      // Apply capacity gains
      let popCapacityGain = 0;
      if (k === 'urban_structures') popCapacityGain += fertility;
      else if (k === 'orbital_base') popCapacityGain += 10;

      let areaCapacityGain = 0;
      if (k === 'terraform') areaCapacityGain += 5;
      else if (k === 'multi_level_platforms') areaCapacityGain += 10;

      // Apply consumption footprint
      const popReqQ = Math.max(0, Number(qSpec?.populationRequired || 0));
      const areaReqQ = Math.max(0, Number(qSpec?.areaRequired ?? 1));

      projectedPopFreeAtStart += popCapacityGain - popReqQ;
      projectedAreaFreeAtStart += areaCapacityGain - areaReqQ;

      // Break if projected negative
      if (projectedPopFreeAtStart < 0 || projectedAreaFreeAtStart < 0) {
        break;
      }
    }

    // Enforce population validation
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
            free: baseStats.population.free,
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
          error: msg,
          reasons: ['insufficient_population', msg],
          details: {
            required: popReq,
            used,
            capacity,
            free: currentFree,
            currentFree,
            projectedFreeAtStart: projectedPopFreeAtStart,
            projectedUsed,
          },
        };
      }
    }

    // Enforce area validation
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
            free: baseStats.area.free,
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
          error: msg,
          reasons: ['insufficient_area', msg],
          details: {
            required: areaReq,
            used,
            capacity: total,
            total,
            free: currentFree,
            currentFree,
            projectedFreeAtStart: projectedAreaFreeAtStart,
            projectedUsed,
          },
        };
      }
    }

    // Persist queued construction/upgrade
    const now = new Date();
    const constructionStarted: Date | null = null;
    const constructionCompleted: Date | null = null;

    let building: any;
    let identityKey: string;

    if (!isUpgrade) {
      // Create new building for first-time construction
      // Compute per-queue sequence to allow multiple queued copies
      const { count: queuedCount, error: countError } = await supabase
        .from('buildings')
        .select('*', { count: 'exact', head: true })
        .eq('empire_id', empireId)
        .eq('location_coord', locationCoord)
        .eq('catalog_key', buildingKey)
        .eq('is_active', false);

      if (countError) {
        console.error('Error counting queued buildings:', countError);
      }

      const seq = Number(queuedCount || 0) + 1;
      identityKey = `${empireId}:${locationCoord}:${buildingKey}:L${nextLevel}:Q${seq}`;

      // Insert new building
      const { data: newBuilding, error: insertError } = await supabase
        .from('buildings')
        .insert({
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
          construction_completed: constructionCompleted,
        })
        .select()
        .single();

      if (insertError) {
        // Check for duplicate key (idempotency)
        if (insertError.code === '23505') {
          if (process.env.DEBUG_RESOURCES === 'true') {
            console.log(`[SupabaseStructuresService.start] idempotent existing queued for identityKey=${identityKey}`);
          }
          return formatAlreadyInProgress('structures', identityKey, buildingKey);
        }
        console.error('Error inserting building:', insertError);
        return formatError('INSERT_ERROR', 'Failed to create building', { insertError });
      }

      building = newBuilding;

      // Broadcast queue addition
      try {
        const { getIO } = await import('../../index');
        const io = getIO();
        (io as any)?.broadcastQueueUpdate?.(empireId, locationCoord, 'queue:item_queued', {
          locationCoord,
          catalogKey: buildingKey,
          level: 1,
          isUpgrade: false,
        });
      } catch {}
    } else if (existing) {
      // Queue upgrade on the existing building document
      identityKey = `${empireId}:${locationCoord}:${buildingKey}:L${nextLevel}`;

      const { data: updatedBuilding, error: updateError } = await supabase
        .from('buildings')
        .update({
          is_active: false,
          pending_upgrade: true,
          credits_cost: creditsCost,
          identity_key: identityKey,
          construction_started: constructionStarted,
          construction_completed: constructionCompleted,
        })
        .eq('id', existing.id)
        .eq('is_active', true)
        .select()
        .maybeSingle();

      if (updateError) {
        console.error('Error updating building for upgrade:', updateError);
        return formatError('UPDATE_ERROR', 'Failed to queue upgrade', { updateError });
      }

      if (!updatedBuilding) {
        // Building was already upgraded or modified
        return formatAlreadyInProgress('structures', identityKey, buildingKey);
      }

      building = updatedBuilding;

      // Broadcast queue addition for upgrade
      try {
        const { getIO } = await import('../../index');
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

    // Attempt to schedule the top-of-queue item immediately (non-blocking)
    try {
      const { BuildingService } = await import('../buildingService');
      await BuildingService.scheduleNextQueuedForBase(empireId, locationCoord);
    } catch (e) {
      console.warn('[SupabaseStructuresService.start] scheduleNextQueuedForBase failed', e);
    }

    return {
      success: true as const,
      data: {
        building,
        buildingKey,
        etaMinutes: minutes,
        constructionCapacityCredPerHour: cap,
      },
      message: `${spec.name} construction started. ETA ${minutes} minute(s).`,
    };
  }

  /**
   * Get construction queue for a location
   */
  static async getQueue(empireId: string, locationCoord?: string) {
    let query = supabase
      .from('buildings')
      .select('id, catalog_key, level, is_active, pending_upgrade, construction_started, construction_completed, credits_cost, created_at')
      .eq('empire_id', empireId)
      .eq('is_active', false);

    if (locationCoord) {
      query = query.eq('location_coord', locationCoord);
    }

    const { data: items, error } = await query.order('construction_completed', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('[SupabaseStructuresService.getQueue] Error:', error);
      return [];
    }

    return (items || []).map((item: any) => ({
      id: String(item.id || ''),
      catalogKey: String(item.catalog_key || ''),
      level: Number(item.level || 1),
      isUpgrade: item.pending_upgrade === true,
      constructionStarted: item.construction_started || null,
      constructionCompleted: item.construction_completed || null,
      creditsCost: Number(item.credits_cost || 0),
      createdAt: item.created_at || null,
    }));
  }

  /**
   * Cancel a queued construction/upgrade
   */
  static async cancel(empireId: string, locationCoord: string): Promise<ServiceResult> {
    const now = Date.now();

    // Find the active construction at this base (most recent incomplete item)
    const { data: item, error: fetchError } = await supabase
      .from('buildings')
      .select('*')
      .eq('empire_id', empireId)
      .eq('location_coord', locationCoord)
      .eq('is_active', false)
      .gt('construction_completed', new Date(now).toISOString())
      .order('construction_completed', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('[SupabaseStructuresService.cancel] Error fetching item:', fetchError);
      return formatError('FETCH_ERROR', 'Error fetching construction item');
    }

    if (!item) {
      return formatError('NO_ACTIVE_CONSTRUCTION', 'No active construction found at this base');
    }

    const key = String(item.catalog_key || '');
    const pendingUpgrade = item.pending_upgrade === true;
    const storedCost = Number(item.credits_cost || 0);

    // Determine refund amount
    let refundedCredits: number | null = null;
    try {
      if (storedCost > 0) {
        refundedCredits = storedCost;
      } else if (key) {
        const level = Math.max(1, Number(item.level || 1));
        const nextLevel = pendingUpgrade ? level + 1 : 1;
        try {
          refundedCredits = getStructureCreditCostForLevel(key as any, nextLevel);
        } catch {
          const spec = getBuildingSpec(key as any);
          refundedCredits = Number(spec?.creditsCost || 0) || null;
        }
      }
    } catch {
      refundedCredits = null;
    }

    let cancelled = false;

    if (pendingUpgrade) {
      // Revert upgrade: restore to active state
      const { error: updateError } = await supabase
        .from('buildings')
        .update({
          is_active: true,
          pending_upgrade: false,
          credits_cost: null,
          construction_started: null,
          construction_completed: null,
          identity_key: null,
        })
        .eq('id', item.id)
        .eq('is_active', false);

      cancelled = !updateError;
      if (updateError) {
        console.error('[SupabaseStructuresService.cancel] Error reverting upgrade:', updateError);
      }
    } else {
      // Delete new construction item
      const { error: deleteError } = await supabase
        .from('buildings')
        .delete()
        .eq('id', item.id);

      cancelled = !deleteError;
      if (deleteError) {
        console.error('[SupabaseStructuresService.cancel] Error deleting building:', deleteError);
      }
    }

    if (!cancelled) {
      return formatError('CANCEL_FAILED', 'Failed to cancel active construction');
    }

    // Refund credits
    if (refundedCredits && refundedCredits > 0) {
      const { data: empire } = await supabase
        .from('empires')
        .select('credits')
        .eq('id', empireId)
        .single();

      if (empire) {
        const currentCredits = Number(empire.credits || 0);
        await supabase
          .from('empires')
          .update({ credits: currentCredits + refundedCredits })
          .eq('id', empireId);

        // Log transaction (best effort)
        try {
          const { CreditLedgerService } = await import('../creditLedgerService');
          CreditLedgerService.logTransaction({
            empireId: empireId as any,
            amount: refundedCredits,
            type: 'construction_refund',
            note: `Cancel construction: ${key} at ${locationCoord}`,
            meta: { coord: locationCoord, key },
          }).catch(() => {});
        } catch {}
      }
    }

    // Broadcast cancellation
    try {
      const { getIO } = await import('../../index');
      const io = getIO();
      (io as any)?.broadcastQueueUpdate?.(empireId, locationCoord, 'queue:item_cancelled', {
        locationCoord,
        catalogKey: key,
      });
    } catch {}

    return formatSuccess(
      {
        cancelledStructure: key,
        refundedCredits: refundedCredits ?? 0,
      },
      'Construction cancelled'
    );
  }
}
