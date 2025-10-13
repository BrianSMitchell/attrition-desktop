import { supabase } from '../config/supabase';
import {
  getBuildingSpec,
  type BuildingKey,
  computeEnergyBalance,
  getDefensesList,
} from '@game/shared';

// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';

/**
 * Population capacity per Urban Structures level equals the planet's fertility.
 * i.e., capacity contribution = level * fertility.
 * This ties starting population to fertility since new bases get a free L1 Urban.
 */


export interface BaseStatsDTO {
  area: {
    total: number;
    used: number;
    free: number;
  };
  energy: {
    produced: number;
    consumed: number;
    balance: number;
    rawBalance?: number; // exposed for UI parity without reservations
    projectedBalance?: number; // alias of balance for clarity
  };
  population: {
    used: number;
    capacity: number;
    free: number;
  };
  citizens: {
    count: number;
    perHour: number;
  };
  ownerIncomeCredPerHour: number;
}

/**
 * Compute base budgets visible to the player for a given empire and location.
 * - Only counts active buildings for the given empire at that coord
 * - Uses shared building catalog to aggregate area/energy/pop/economy
 * - Urban Structures provide population capacity per level equal to the planet's fertility
 */
export class BaseStatsService {
  static async getBaseStats(empireId: string, locationCoord: string): Promise<BaseStatsDTO> {
    // 1) Environment totals from Overhaul (area, etc.)
    const { data: location, error: locationError } = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select(DB_FIELDS.LOCATIONS.RESULT)
      .eq('coord', locationCoord)
      .maybeSingle();

    if (locationError) {
      console.error('[BaseStatsService] Error fetching location:', locationError);
    }

    const areaTotal = Math.max(0, Number((location as any)?.result?.area ?? 0));
    const fertility = Math.max(
      0,
      Number(
        (location as any)?.result?.fertility ??
          (location as any)?.properties?.fertility ??
          0
      )
    );

    // Extract per-planet resource values for solar/gas plants
    const solarEnergy = Math.max(0, Number((location as any)?.result?.solarEnergy ?? 0));
    const gasResource = Math.max(0, Number((location as any)?.result?.yields?.gas ?? 0));

    // 2) Get all buildings for this empire at this location
    const { data: buildings, error: buildingsError } = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select('level, catalog_key, is_active, pending_upgrade, construction_started, construction_completed')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord);

    if (buildingsError) {
      console.error('[BaseStatsService] Error fetching buildings:', buildingsError);
    }

    let areaUsed = 0;
    let areaReserved = 0;
    let populationUsed = 0;
    let populationReserved = 0;
    let populationCapacity = 0;
    let ownerIncome = 0;

    // Separate active buildings from those under construction
    const activeBuildings: Array<{ key: string; level: number; isActive: boolean }> = [];
    const constructionQueue: Array<{ key: string; level: number }> = [];

    for (const b of (buildings || [])) {
      const isActive = (b as any).is_active === true;
      const pendingUpgrade = (b as any).pending_upgrade === true;
      const level = Math.max(0, Number((b as any).level || 0));
      const catalogKey = (b as any).catalog_key as BuildingKey | undefined;

      if (!catalogKey) {
        console.warn("[BaseStatsService] skip: missing catalogKey _id=%s", (b as any)._id?.toString?.());
        continue;
      }

      const spec = getBuildingSpec(catalogKey);
      const areaReq = Math.max(0, Number(spec.areaRequired ?? 0));
      const popReq = Math.max(0, Number(spec.populationRequired ?? 0));

      const countsAsActive = (isActive || pendingUpgrade) && level > 0;
      const isUnderConstruction = !isActive && (b as any).construction_completed; // queued step exists

      if (countsAsActive) {
        // Count current active level even while upgrading (pendingUpgrade=true)
        activeBuildings.push({ key: catalogKey, level, isActive: true });
        areaUsed += level * areaReq;
        populationUsed += level * popReq;

        // Population capacity from Urban Structures
        if (catalogKey === 'urban_structures') {
          populationCapacity += level * fertility;
        }

        // Owner Income (credits/hour)
        const econ = Math.max(0, Number(spec.economy || 0));
        ownerIncome += level * econ;
      }

      if (isUnderConstruction) {
        // Under construction - count reservation for the next step only
        const targetLevel = level > 0 ? level + 1 : 1; // If upgrading, next level; if new, level 1
        constructionQueue.push({ key: catalogKey, level: targetLevel });
        // Reserve area and population for this single step
        areaReserved += areaReq;
        populationReserved += popReq;
      }
    }

    // Calculate current energy (active buildings only)
    const currentEnergy = computeEnergyBalance({
      buildingsAtBase: activeBuildings,
      location: { solarEnergy, gasYield: gasResource },
      includeQueuedReservations: false, // Don't include reservations in current balance
    });

    // Incorporate completed defenses into energy (consumption/production)
    // Each completed defense queue item counts as one level of that defense at the base.
    const { data: completedDefenses, error: completedDefensesError } = await supabase
      .from(DB_TABLES.DEFENSE_QUEUE)
      .select(DB_FIELDS.DEFENSE_QUEUE.DEFENSE_KEY)
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
      .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'completed');

    if (completedDefensesError) {
      console.error('[BaseStatsService] Error fetching completed defenses:', completedDefensesError);
    }

    const defenseSpecByKey = new Map<string, { energyDelta: number; name: string }>();
    for (const d of getDefensesList()) {
      defenseSpecByKey.set(String((d as any).key), { energyDelta: Number((d as any).energyDelta || 0), name: String((d as any).name || String((d as any).key)) });
    }

    const defenseCountByKey = new Map<string, number>();
    for (const it of (completedDefenses || [])) {
      const k = String((it as any).defense_key || '');
      if (!k) continue;
      defenseCountByKey.set(k, (defenseCountByKey.get(k) || 0) + 1);
    }

    let defenseProduced = 0;
    let defenseConsumed = 0;
    for (const [k, count] of defenseCountByKey.entries()) {
      const spec = defenseSpecByKey.get(k);
      const delta = Number(spec?.energyDelta || 0);
      if (delta >= 0) defenseProduced += count * delta;
      else defenseConsumed += count * Math.abs(delta);
    }

    const producedWithDef = currentEnergy.produced + defenseProduced;
    const consumedWithDef = currentEnergy.consumed + defenseConsumed;
    const rawBalanceWithDef = producedWithDef - consumedWithDef;

    // Calculate projected energy (with construction queue) and reserve queued negatives (buildings + defenses)
    let projectedBalance = rawBalanceWithDef;
    let reservedNegative = 0;

    if (constructionQueue.length > 0) {
      // Only count negative energy deltas from the construction queue
      for (const item of constructionQueue) {
        const spec = getBuildingSpec(item.key as BuildingKey);
        const delta = Number(spec?.energyDelta || 0);
        if (delta < 0) {
          reservedNegative += delta; // Single step reservation
        }
      }
    }

    // Also reserve queued negative energy from scheduled defense items at this base
    try {
      const now = new Date();
      const { data: scheduledDefense, error: scheduledDefenseError } = await supabase
        .from(DB_TABLES.DEFENSE_QUEUE)
        .select(DB_FIELDS.DEFENSE_QUEUE.DEFENSE_KEY)
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
        .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending')
        .gt(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, now.toISOString());

      if (scheduledDefenseError) {
        console.error('[BaseStatsService] Error fetching scheduled defenses:', scheduledDefenseError);
      }

      for (const it of (scheduledDefense || [])) {
        const k = String((it as any).defense_key || '');
        if (!k) continue;
        const spec = defenseSpecByKey.get(k);
        const delta = Number(spec?.energyDelta || 0);
        if (delta < 0) reservedNegative += delta; // single step reservation per queued defense
      }
    } catch {}

    projectedBalance = rawBalanceWithDef + reservedNegative;

    const areaFree = Math.max(0, areaTotal - (areaUsed + areaReserved));
    const populationFree = Math.max(0, populationCapacity - (populationUsed + populationReserved));

    // Citizens: fetch per-hour from CapacityService and current count from Colony
    let citizensPerHour = 0;
    let citizensCount = 0;
    try {
      const { CapacityService } = require('./capacityService');
      const { Colony } = require('../models/Colony');
      const caps = await CapacityService.getBaseCapacities(empireId, locationCoord);
      citizensPerHour = Math.max(0, Number((caps as any)?.citizen?.value || 0));
      const { data: colony, error: colonyError } = await supabase
        .from(DB_TABLES.COLONIES)
        .select('citizens')
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
        .maybeSingle();

      if (colonyError) {
        console.error('[BaseStatsService] Error fetching colony:', colonyError);
      }
      citizensCount = Math.max(0, Number((colony as any)?.citizens || 0));
    } catch {}

    return {
      area: {
        total: areaTotal,
        used: areaUsed + areaReserved,
        free: areaFree,
      },
      energy: {
        produced: producedWithDef,
        consumed: consumedWithDef,
        balance: projectedBalance, // For backwards compatibility, show projected when construction/defense is active
        rawBalance: rawBalanceWithDef, // Current balance including completed defenses and without reservations
        projectedBalance: projectedBalance, // Includes reservations from structures and scheduled defenses
      },
      population: {
        used: populationUsed + populationReserved,
        capacity: populationCapacity,
        free: populationFree,
      },
      citizens: {
        count: citizensCount,
        perHour: citizensPerHour,
      },
      ownerIncomeCredPerHour: ownerIncome,
    };
  }
}

