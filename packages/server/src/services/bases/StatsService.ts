import { supabase } from '../../config/supabase';
import { getBuildingSpec, BuildingKey, getDefensesList, computeEnergyBalance } from '@game/shared';

import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';
export interface BaseStatsDTO {
  area: { total: number; used: number; free: number };
  energy: { produced: number; consumed: number; balance: number; rawBalance?: number; projectedBalance?: number };
  population: { used: number; capacity: number; free: number };
  citizens: { count: number; perHour: number };
  ownerIncomeCredPerHour: number;
}

export class StatsService {
  static async getBaseStats(empireId: string, coord: string): Promise<BaseStatsDTO> {
    // 1) Location environment
    const locRes = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select(DB_FIELDS.LOCATIONS.RESULT)
      .eq('coord', coord)
      .maybeSingle();

    const result = (locRes.data as any)?.result || {};
    const areaTotal = Math.max(0, Number(result?.area ?? 0));
    const fertility = Math.max(0, Number(result?.fertility ?? 0));
    const solarEnergy = Math.max(0, Number(result?.solarEnergy ?? 0));
    const gasResource = Math.max(0, Number(result?.yields?.gas ?? 0));

    // 2) Buildings at base for this empire
    const bRes = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select('catalog_key, level, is_active, pending_upgrade, construction_completed')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, coord);

    let areaUsed = 0;
    let areaReserved = 0;
    let populationUsed = 0;
    let populationReserved = 0;
    let populationCapacity = 0;
    let ownerIncome = 0;

    const activeBuildings: Array<{ key: string; level: number; isActive: boolean }> = [];

    const nowTs = Date.now();

    for (const row of bRes.data || []) {
      const isActive = row.is_active === true;
      const pendingUpgrade = row.pending_upgrade === true;
      const level = Math.max(0, Number(row.level || 0));
      const key = String(row.catalog_key || '') as BuildingKey;
      if (!key) continue;
      const spec = getBuildingSpec(key);
      const areaReq = Math.max(0, Number(spec.areaRequired ?? 0));
      const popReq = Math.max(0, Number(spec.populationRequired ?? 0));

      const countsAsActive = (isActive || pendingUpgrade) && level > 0;
      const underConstruction = !isActive && row.construction_completed && new Date(row.construction_completed).getTime() > nowTs;

      if (countsAsActive) {
        activeBuildings.push({ key, level, isActive: true });
        areaUsed += level * areaReq;
        populationUsed += level * popReq;
        if (key === 'urban_structures') {
          populationCapacity += level * fertility;
        }
        const econ = Math.max(0, Number(spec.economy || 0));
        ownerIncome += level * econ;
      }

      if (underConstruction) {
        areaReserved += areaReq;
        populationReserved += popReq;
      }
    }

    // 3) Energy from active buildings
    const energyBase = computeEnergyBalance({
      buildingsAtBase: activeBuildings,
      location: { solarEnergy, gasYield: gasResource },
      includeQueuedReservations: false,
    });

    // 4) Completed defenses (energy impact)
    const defCompleted = await supabase
      .from(DB_TABLES.DEFENSE_QUEUE)
      .select(DB_FIELDS.DEFENSE_QUEUE.DEFENSE_KEY)
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, coord)
      .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'completed');

    const defenseSpecByKey = new Map<string, { energyDelta: number; name: string }>();
    for (const d of getDefensesList()) {
      defenseSpecByKey.set(String((d as any).key), { energyDelta: Number((d as any).energyDelta || 0), name: String((d as any).name || String((d as any).key)) });
    }

    const defenseCountByKey = new Map<string, number>();
    for (const it of defCompleted.data || []) {
      const k = String((it as any).defense_key || '');
      if (!k) continue;
      defenseCountByKey.set(k, (defenseCountByKey.get(k) || 0) + 1);
    }

    let defenseProduced = 0;
    let defenseConsumed = 0;
    defenseCountByKey.forEach((count, k) => {
      const spec = defenseSpecByKey.get(k);
      const delta = Number(spec?.energyDelta || 0);
      if (delta >= 0) defenseProduced += count * delta;
      else defenseConsumed += count * Math.abs(delta);
    });

    const producedWithDef = energyBase.produced + defenseProduced;
    const consumedWithDef = energyBase.consumed + defenseConsumed;
    const rawBalanceWithDef = producedWithDef - consumedWithDef;

    // 5) Scheduled defenses: reserve negative energy
    let reservedNegative = 0;
    try {
      const defPending = await supabase
        .from(DB_TABLES.DEFENSE_QUEUE)
        .select('defense_key, completes_at')
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, coord)
        .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending')
        .gt(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, new Date(nowTs).toISOString());

      for (const it of defPending.data || []) {
        const k = String((it as any).defense_key || '');
        const spec = defenseSpecByKey.get(k);
        const delta = Number(spec?.energyDelta || 0);
        if (delta < 0) reservedNegative += delta;
      }
    } catch {}

    const projectedBalance = rawBalanceWithDef + reservedNegative;

    const areaFree = Math.max(0, areaTotal - (areaUsed + areaReserved));
    const populationFree = Math.max(0, populationCapacity - (populationUsed + populationReserved));

    // Citizens placeholders (wired in 3.2 capacities)
    const citizens = { count: 0, perHour: 0 };

    return {
      area: { total: areaTotal, used: areaUsed + areaReserved, free: areaFree },
      energy: { produced: producedWithDef, consumed: consumedWithDef, balance: projectedBalance, rawBalance: rawBalanceWithDef, projectedBalance },
      population: { used: populationUsed + populationReserved, capacity: populationCapacity, free: populationFree },
      citizens,
      ownerIncomeCredPerHour: ownerIncome,
    };
  }
}
