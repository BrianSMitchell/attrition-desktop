import { supabase } from '../config/supabase';
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';
import {
  getBuildingSpec,
  type BuildingKey,
  computeEnergyBalance,
} from '@game/shared';

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
    rawBalance?: number; // current balance without reservations
    projectedBalance?: number; // balance including reservations for active constructions
  };
  population: {
    used: number;
    capacity: number;
    free: number;
  };
  ownerIncomeCredPerHour: number;
}

/**
 * Compute base budgets visible to the player for a given empire and location.
 * Fixed version that properly separates current vs projected energy states.
 */
export class BaseStatsService {
  static async getBaseStats(empireId: string, locationCoord: string): Promise<BaseStatsDTO> {
    // 1) Environment totals from Overhaul (area, etc.)
    const { data: location, error: locationError } = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select('result, properties:legacy_properties')
      .eq('coord', locationCoord)
      .single();

    if (locationError) {
      throw new Error(`Failed to fetch location: ${locationError.message}`);
    }

    const areaTotal = Math.max(0, Number(location?.result?.area ?? 0));
    const fertility = Math.max(
      0,
      Number(
        location?.result?.fertility ??
        location?.properties?.fertility ??
        0
      )
    );

    // Extract per-planet resource values for solar/gas plants
    const solarEnergy = Math.max(0, Number(location?.result?.solarEnergy ?? 0));
    const gasResource = Math.max(0, Number(location?.result?.yields?.gas ?? 0));

    // 2) Get all buildings for this empire at this location
    const { data: buildings, error: buildingsError } = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select('level, catalog_key, is_active, construction_started, construction_completed')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord);

    if (buildingsError) {
      throw new Error(`Failed to fetch buildings: ${buildingsError.message}`);
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
      const isActive = b.is_active === true;
      const pendingUpgrade = (b as any).pending_upgrade === true;  // Handle legacy field name
      const level = Math.max(0, Number(b.level || 0));
      const catalogKey = b.catalog_key as BuildingKey | undefined;

      if (!catalogKey) {
        console.warn("[BaseStatsService] skip: missing catalog_key for building at %s", locationCoord);
        continue;
      }

      const spec = getBuildingSpec(catalogKey);
      const areaReq = Math.max(0, Number(spec.areaRequired ?? 0));
      const popReq = Math.max(0, Number(spec.populationRequired ?? 0));

      const countsAsActive = (isActive || pendingUpgrade) && level > 0;
      const isUnderConstruction = !isActive && b.construction_completed;

      if (countsAsActive) {
        // Count the current level even when upgrading (pendingUpgrade=true)
        activeBuildings.push({ key: catalogKey, level, isActive: true });
        areaUsed += level * areaReq;
        populationUsed += level * popReq;

        if (catalogKey === 'urban_structures') {
          populationCapacity += level * fertility;
        }

        const econ = Math.max(0, Number(spec.economy || 0));
        ownerIncome += level * econ;
      }

      if (isUnderConstruction) {
        // Reserve for the next step only
        const targetLevel = level > 0 ? level + 1 : 1;
        constructionQueue.push({ key: catalogKey, level: targetLevel });
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

    // Calculate projected energy (with construction queue)
    let projectedBalance = currentEnergy.balance;
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
      projectedBalance = currentEnergy.balance + reservedNegative;
    }

    const areaFree = Math.max(0, areaTotal - (areaUsed + areaReserved));
    const populationFree = Math.max(0, populationCapacity - (populationUsed + populationReserved));

    return {
      area: {
        total: areaTotal,
        used: areaUsed + areaReserved,
        free: areaFree,
      },
      energy: {
        produced: currentEnergy.produced,
        consumed: currentEnergy.consumed,
        balance: currentEnergy.balance, // Always show current balance
        rawBalance: currentEnergy.balance, // Same as balance when no construction
        projectedBalance: projectedBalance, // Only different when construction is active
      },
      population: {
        used: populationUsed + populationReserved,
        capacity: populationCapacity,
        free: populationFree,
      },
      ownerIncomeCredPerHour: ownerIncome,
    };
  }
}
