/**
 * Base detail header component
 * Shows title, back button, and base stats
 */

import React from 'react';
import { useModalStore } from '../../../stores/modalStore';
import { gameApi } from '../../../stores/services/gameApi';
import { LAYOUT_CLASSES } from '../../../constants/css-constants';
import { 
  getStructuresList as getBuildingsList, 
  getDefensesList,
  computeEnergyBalance,
  type StructureKey as BuildingKey,
  type DefenseKey
} from '@game/shared';

export interface BaseDetailHeaderProps {
  /** Base data */
  base: any;
  /** Base stats for budget display */
  baseStats: any;
  /** Back button handler */
  onBack: () => void;
  /** Refresh handler for stats */
  onRefresh: () => void;
}

function StatItem({
  label,
  main,
  sub
}: {
  label: string;
  main: React.ReactNode;
  sub?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-md px-4 py-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 text-lg text-white font-mono">{main}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// Breakdown Handler Functions
const createAreaBreakdownHandler = (base: any, baseStats: any, openModal: any) => async () => {
  try {
    if (!base?.locationCoord) return;

    const structuresRes = await gameApi.getBaseStructures(base.locationCoord);
    if (!structuresRes.success || !structuresRes.data) return;

    const items = structuresRes.data.items || [];
    const levels: Record<string, number> = {};
    for (const it of items) {
      levels[String(it.key)] = Math.max(0, Number(it.currentLevel || 0));
    }

    const catalog = getBuildingsList();
    const nameByKey = new Map(catalog.map((spec) => [spec.key, spec.name]));
    const areaByKey = new Map(catalog.map((spec) => [spec.key, Number(spec.areaRequired || 0)]));

    const consumers: Array<{ key: string; name: string; value: number }> = [];
    for (const [key, lv] of Object.entries(levels)) {
      if (!lv) continue;
      const a = areaByKey.get(key as BuildingKey) || 0;
      if (!a) continue;
      const name = nameByKey.get(key as BuildingKey) || key;
      consumers.push({ key, name, value: lv * a });
    }

    openModal('area_breakdown', {
      coord: base.locationCoord,
      totals: {
        used: baseStats?.area.used ?? 0,
        free: baseStats?.area.free ?? 0,
        total: baseStats?.area.total ?? 0
      },
      breakdown: {
        consumers: consumers.sort((a, b) => b.value - a.value)
      }
    });
  } catch {
    // non-fatal
  }
};

const createEnergyBreakdownHandler = (base: any, _baseStats: any, openModal: any) => async () => {
  try {
    if (!base?.locationCoord) return;

    const [structuresRes, planetRes, defensesRes] = await Promise.all([
      gameApi.getBaseStructures(base.locationCoord),
      gameApi.getLocationByCoord(base.locationCoord),
      gameApi.getBaseDefenses(base.locationCoord)
    ]);
    if (!structuresRes.success || !structuresRes.data) return;

    // Structures levels
    const items = structuresRes.data.items || [];
    const levels: Record<string, number> = {};
    for (const it of items) {
      levels[String(it.key)] = Math.max(0, Number(it.currentLevel || 0));
    }

    // Defense levels
    const defenseLevelsArr = (defensesRes.success && defensesRes.data) ? (defensesRes.data.defenseLevels || []) : [];
    const defenseLevelByKey = new Map<DefenseKey, number>(
      defenseLevelsArr.map((d: any) => [d.key as DefenseKey, Math.max(0, Number(d.level || 0))])
    );

    const solarEnergy = typeof (planetRes as any)?.data?.result?.solarEnergy === 'number'
      ? (planetRes as any).data.result.solarEnergy
      : 0;
    const gasYield = typeof (planetRes as any)?.data?.result?.yields?.gas === 'number'
      ? (planetRes as any).data.result.yields.gas
      : 0;

    const buildingsAtBase = Object.entries(levels)
      .filter(([_, lv]) => (lv || 0) > 0)
      .map(([key, lv]) => ({ key, level: lv as number, isActive: true }));

    const catalog = getBuildingsList();
    const nameByKey = new Map(catalog.map((spec) => [spec.key, spec.name]));
    const deltaByKey = new Map(catalog.map((spec) => [spec.key, Number(spec.energyDelta || 0)]));

    // Calculate baseline totals from structures
    const totalsStruct = computeEnergyBalance({
      buildingsAtBase,
      location: { solarEnergy, gasYield },
      includeQueuedReservations: false,
    });

    // Add defense contributions to totals and breakdown
    const defensesCatalog = getDefensesList();
    const defNameByKey = new Map<DefenseKey, string>(defensesCatalog.map((d) => [d.key as DefenseKey, d.name]));
    const defDeltaByKey = new Map<DefenseKey, number>(defensesCatalog.map((d) => [d.key as DefenseKey, Number(d.energyDelta || 0)]));

    let defProduced = 0;
    let defConsumed = 0;
    const defenseConsumers: Array<{ key: string; name: string; value: number }> = [];
    const defenseProducers: Array<{ key: string; name: string; value: number }> = [];

    for (const [k, lv] of defenseLevelByKey.entries()) {
      const d = defDeltaByKey.get(k) || 0;
      const nm = defNameByKey.get(k) || (k as string);
      if (d >= 0) {
        defProduced += lv * d;
        if (d > 0) defenseProducers.push({ key: k, name: nm, value: lv * d });
      } else {
        defConsumed += lv * Math.abs(d);
        defenseConsumers.push({ key: k, name: nm, value: lv * Math.abs(d) });
      }
    }

    const totals = {
      produced: totalsStruct.produced + defProduced,
      consumed: totalsStruct.consumed + defConsumed,
      balance: (totalsStruct.produced + defProduced) - (totalsStruct.consumed + defConsumed),
    };

    // Build per-source breakdown
    const baseline = 2;
    const solar = (levels['solar_plants'] || 0) * solarEnergy;
    const gas = (levels['gas_plants'] || 0) * gasYield;

    const producers: Array<{ key: string; name: string; value: number }> = [];
    const consumers: Array<{ key: string; name: string; value: number }> = [];

    for (const [key, lv] of Object.entries(levels)) {
      if (!lv) continue;
      if (key === 'solar_plants' || key === 'gas_plants') continue;
      const d = deltaByKey.get(key as BuildingKey) || 0;
      if (!d) continue;
      const name = nameByKey.get(key as BuildingKey) || key;
      if (d >= 0) producers.push({ key, name, value: lv * d });
      else consumers.push({ key, name, value: lv * Math.abs(d) });
    }

    // Merge defense breakdown
    producers.push(...defenseProducers);
    consumers.push(...defenseConsumers);

    openModal('energy_breakdown', {
      coord: base.locationCoord,
      totals,
      breakdown: {
        baseline,
        solar,
        gas,
        producers: producers.sort((a, b) => b.value - a.value),
        consumers: consumers.sort((a, b) => b.value - a.value),
        reserved: [],
      },
    });
  } catch {
    // non-fatal
  }
};

const createPopulationBreakdownHandler = (base: any, baseStats: any, openModal: any) => async () => {
  try {
    if (!base?.locationCoord) return;

    const [structuresRes, planetRes] = await Promise.all([
      gameApi.getBaseStructures(base.locationCoord),
      gameApi.getLocationByCoord(base.locationCoord)
    ]);
    if (!structuresRes.success || !structuresRes.data) return;

    const items = structuresRes.data.items || [];
    const levels: Record<string, number> = {};
    for (const it of items) {
      levels[String(it.key)] = Math.max(0, Number(it.currentLevel || 0));
    }

    const catalog = getBuildingsList();
    const nameByKey = new Map(catalog.map((spec) => [spec.key, spec.name]));
    const popReqByKey = new Map(catalog.map((spec) => [spec.key, Number(spec.populationRequired || 0)]));

    const users: Array<{ key: string; name: string; value: number }> = [];
    for (const [key, lv] of Object.entries(levels)) {
      if (!lv) continue;
      const p = popReqByKey.get(key as BuildingKey) || 0;
      if (!p) continue;
      const name = nameByKey.get(key as BuildingKey) || key;
      users.push({ key, name, value: lv * p });
    }

    // Capacity Sources
    const sources: Array<{ key: string; name: string; value: number }> = [];
    const fertility = typeof (planetRes as any)?.data?.result?.fertility === 'number'
      ? Number((planetRes as any).data.result.fertility)
      : typeof (planetRes as any)?.data?.properties?.fertility === 'number'
        ? Number((planetRes as any).data.properties.fertility)
        : 0;

    const urbanLv = Math.max(0, Number(levels['urban_structures'] || 0));
    if (urbanLv > 0 && fertility > 0) {
      sources.push({ key: 'urban_structures', name: nameByKey.get('urban_structures' as BuildingKey) || 'Urban Structures', value: urbanLv * fertility });
    }

    const orbitalBaseLv = Math.max(0, Number(levels['orbital_base'] || 0));
    if (orbitalBaseLv > 0) {
      sources.push({ key: 'orbital_base', name: nameByKey.get('orbital_base' as BuildingKey) || 'Orbital Base', value: orbitalBaseLv * 10 });
    }

    openModal('population_breakdown', {
      coord: base.locationCoord,
      totals: {
        used: baseStats?.population.used ?? 0,
        free: baseStats?.population.free ?? 0,
        capacity: baseStats?.population.capacity ?? 0
      },
      breakdown: {
        users: users.sort((a, b) => b.value - a.value),
        sources: sources.sort((a, b) => b.value - a.value)
      }
    });
  } catch {
    // non-fatal
  }
};

// Citizens capacity breakdown (uses /game/capacities)
const createCitizensBreakdownHandler = (base: any, _baseStats: any, openModal: any) => async () => {
  try {
    if (!base?.locationCoord) return;
    const capacitiesRes = await gameApi.getCapacities(base.locationCoord);
    if (!capacitiesRes.success || !capacitiesRes.data) return;
    openModal('capacity_breakdown', {
      coord: base.locationCoord,
      capacities: capacitiesRes.data,
    });
  } catch {
    // non-fatal
  }
};

export const BaseDetailHeader: React.FC<BaseDetailHeaderProps> = ({
  base,
  baseStats,
  onBack,
  onRefresh: _onRefresh
}) => {
  const { openModal } = useModalStore();
  
  // Create handler functions
  const handleAreaBreakdown = createAreaBreakdownHandler(base, baseStats, openModal);
  const handleEnergyBreakdown = createEnergyBreakdownHandler(base, baseStats, openModal);
  const handlePopulationBreakdown = createPopulationBreakdownHandler(base, baseStats, openModal);
  const handleCitizensBreakdown = createCitizensBreakdownHandler(base, baseStats, openModal);
  
  return (
    <>
      {/* Header */}
      <div className="game-card">
        <div className={LAYOUT_CLASSES.FLEX_BETWEEN}>
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              ← Back to Bases
            </button>
            <h1 className="text-2xl font-bold text-empire-gold">
              {base.name} ({base.locationCoord})
            </h1>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="game-card">
        <div className="grid grid-cols-4 gap-4">
          <StatItem
            label="Area"
            main={
              baseStats ? (
                <span className="font-mono">
                  {baseStats.area?.used?.toLocaleString()} / {baseStats.area?.total?.toLocaleString()}
                </span>
              ) : (
                '—'
              )
            }
            sub={
              baseStats ? (
                <button
                  onClick={handleAreaBreakdown}
                  className="text-sm text-blue-400 hover:text-blue-300"
                  title="View detailed area usage"
                >
                  View breakdown →
                </button>
              ) : undefined
            }
          />

          <StatItem
            label="Energy"
            main={
              baseStats ? (
                <span className={`font-mono ${(baseStats.energy?.balance ?? 0) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {(baseStats.energy?.balance ?? 0).toLocaleString()}
                </span>
              ) : (
                '—'
              )
            }
            sub={
              baseStats ? (
                <button
                  onClick={handleEnergyBreakdown}
                  className="text-sm text-blue-400 hover:text-blue-300"
                  title="View energy production and consumption"
                >
                  View breakdown →
                </button>
              ) : undefined
            }
          />

          <StatItem
            label="Population"
            main={
              baseStats ? (
                <span className="font-mono">
                  {baseStats.population?.used?.toLocaleString()} / {baseStats.population?.capacity?.toLocaleString()}
                </span>
              ) : (
                '—'
              )
            }
            sub={
              baseStats ? (
                <button
                  onClick={handlePopulationBreakdown}
                  className="text-sm text-blue-400 hover:text-blue-300"
                  title="View population usage details"
                >
                  View breakdown →
                </button>
              ) : undefined
            }
          />

          <StatItem
            label="Citizens"
            main={
              baseStats ? (
                <span className="font-mono">
                  {baseStats.citizens?.count?.toLocaleString?.() ?? '0'}
                </span>
              ) : (
                'â€”'
              )
            }
            sub={
              baseStats ? (
                <div className="flex items-center gap-3">
                  {Number.isFinite(baseStats.citizens?.perHour as any) && (
                    <span className="text-sm text-gray-400" title="Citizens generated per hour">
                      +{(baseStats.citizens!.perHour).toLocaleString()}/hr
                    </span>
                  )}
                  <button
                    onClick={handleCitizensBreakdown}
                    className="text-sm text-blue-400 hover:text-blue-300"
                    title="View citizen capacity breakdown"
                  >
                    View breakdown →
                  </button>
                </div>
              ) : undefined
            }
          />
        </div>
      </div>
    </>
  );
};
