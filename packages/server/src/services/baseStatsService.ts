import mongoose from 'mongoose';
import { Building } from '../models/Building';
import { Location } from '../models/Location';
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
 * - Only counts active buildings for the given empire at that coord
 * - Uses shared building catalog to aggregate area/energy/pop/economy
 * - Urban Structures provide population capacity per level equal to the planet's fertility
 */
export class BaseStatsService {
  static async getBaseStats(empireId: string, locationCoord: string): Promise<BaseStatsDTO> {
    // 1) Environment totals from Overhaul (area, etc.)
const location = await Location.findOne({ coord: locationCoord })
      .select('result properties.fertility')
      .lean();

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

    // 2) Active buildings at this base for this empire
    // Include pending upgrades as effectively active for display budgets:
    // - Upgrades: pendingUpgrade === true, isActive === false (keep counting current level)
    // - New constructions: pendingUpgrade === false, isActive === false (do not count yet)
    const buildings = await Building.find({
      empireId: new mongoose.Types.ObjectId(empireId),
      locationCoord,
    })
      .select('level catalogKey isActive pendingUpgrade')
      .lean();

    let areaUsed = 0;
    let areaReserved = 0;
    const energyInputs: Array<{ key: string; level: number; isActive: boolean; isQueuedConsumer?: boolean }> = [];
    let populationUsed = 0;
    let populationReserved = 0;
    let populationCapacity = 0;
    let ownerIncome = 0;

    for (const b of (buildings || [])) {
      // Treat pending upgrades as effectively active so current level continues contributing during upgrade
      const effectiveActive = (b as any).isActive === true || (b as any).pendingUpgrade === true;

      const level = Math.max(0, Number((b as any).level || 0));
      const catalogKey = (b as any).catalogKey as BuildingKey | undefined;

      if (!catalogKey) {
        console.warn("[BaseStatsService] skip: missing catalogKey _id=%s", (b as any)._id?.toString?.());
        continue;
      }

      const spec = getBuildingSpec(catalogKey);

      // Area / Energy / Population accounting
      const areaReq = Math.max(0, Number(spec.areaRequired ?? 0));
      const popReq = Math.max(0, Number(spec.populationRequired ?? 0));
      const queuedNew = (b as any).isActive === false && (b as any).pendingUpgrade !== true;

      if (effectiveActive) {
        // Effective active (includes pendingUpgrade): count fully
        areaUsed += level * areaReq;
        const delta = Number(spec?.energyDelta || 0);
        const input: { key: string; level: number; isActive: boolean; isQueuedConsumer?: boolean } = { key: catalogKey, level, isActive: true };
        // If this is a pending upgrade and the next level would consume energy, pre-reserve one step
        if ((b as any).pendingUpgrade === true && delta < 0) {
          input.isQueuedConsumer = true;
          areaReserved += areaReq;
          populationReserved += popReq;
        }
        energyInputs.push(input);
        populationUsed += level * popReq;
      } else if (queuedNew) {
        // Queued new construction: reserve usage and only reserve negative energy
        areaReserved += level * areaReq;
        const delta = Number(spec?.energyDelta || 0);
        energyInputs.push({ key: catalogKey, level, isActive: false, isQueuedConsumer: delta < 0 });
        populationReserved += level * popReq;
      } else {
        // Inactive but not queued new (e.g., safety fallback) — ignore
      }

      // Population (capacity) from Urban Structures: per level equals fertility
      if (catalogKey === 'urban_structures') {
        populationCapacity += level * fertility;
      }

      // Owner Income (credits/hour)
      const econ = Math.max(0, Number(spec.economy || 0));
      ownerIncome += level * econ;
    }

    const { produced: energyProduced, consumed: energyConsumed, balance, reservedNegative } = computeEnergyBalance({
      buildingsAtBase: energyInputs,
      location: { solarEnergy, gasYield: gasResource },
    });
    const projectedBalance = balance + reservedNegative;
    const areaFree = Math.max(0, areaTotal - (areaUsed + areaReserved));
    const populationFree = Math.max(0, populationCapacity - (populationUsed + populationReserved));

    return {
      area: {
        total: areaTotal,
        used: areaUsed + areaReserved,
        free: areaFree,
      },
      energy: {
        produced: energyProduced,
        consumed: energyConsumed,
        balance: projectedBalance, // show balance including queued negative reservations
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
