// Shared capacities helpers

// Shared capacity calculators for Construction, Production, and Research
// Phase 1: Minimal viable rules per current model constraints.
//
// Notes:
// - BuildingType currently does not differentiate fine-grained BuildingKey variants.
//   We treat all 'factory' the same (no direct production capacity) for now.
//   We treat all 'shipyard' the same (+2 cred/h per level).
//   We treat all 'research_lab' the same (+8 cred/h per level).
// - Tech bonuses:
//   - Cybernetics: +5% to construction and production capacities
//   - Artificial Intelligence: +5% to research capacity
// - Percent bonuses apply after summing all flat additions: effective = flatSum * (1 + totalPercent)

import type { BuildingType } from './types';
import type { TechnologyKey } from './tech';

// Tunable constants for Phase 2 (safe defaults; adjust as needed)
const ROBOTIC_FACTORY_CONSTR_PER_LEVEL = 2; // +2 cred/h per level (Construction)
const NANITE_FACTORY_CONSTR_PER_LEVEL = 10; // +10 cred/h per level (Construction)
const ANDROID_FACTORY_CONSTR_PER_LEVEL = 18; // +18 cred/h per level (Construction)

// Production per-level constants
const ROBOTIC_FACTORY_PROD_PER_LEVEL = 2; // +2 cred/h per level (Production)

// Overhaul-derived multipliers (percent per unit)
const PROD_PCT_PER_METAL_YIELD_UNIT = 0.01; // +1% Production per metal yield unit
const RESEARCH_PCT_PER_FERTILITY_UNIT = 0.01; // +1% Research per fertility unit
const CONSTR_PCT_PER_SOLAR_UNIT = 0.01; // +1% Construction per base solarEnergy unit

export type CapacityBreakdownItem = {
  source: string;
  value: number; // flat value in cred/h or percent fraction for kind === 'percent' (e.g., 0.05 for +5%)
  kind: 'flat' | 'percent';
};

export interface CapacityResult {
  value: number; // effective capacity in cred/h
  breakdown: CapacityBreakdownItem[];
}

// Base capacities DTO including citizen (used by server API responses)
export interface BaseCapacitiesDTO {
  construction: CapacityResult;
  production: CapacityResult;
  research: CapacityResult;
  citizen: CapacityResult;
}

export interface CapacityContext {
  techLevels: Partial<Record<TechnologyKey, number>>;
  // catalogKey is optional and used to distinguish subtypes (e.g., metal_refineries, robotic/nanite/android factories)
  buildingsAtBase: Array<{ type: BuildingType; level: number; isActive: boolean; catalogKey?: string | null }>;
  // Derived environmental context from Overhaul computations at the location
  locationDerived?: {
    yieldsMetal?: number;   // final metal yield from Overhaul (result.yields.metal)
    fertility?: number;     // final fertility (result.fertility)
    solarEnergy?: number;   // base position solar energy (positionBase.solarEnergy)
  };
  // Commander hooks (percent bonuses, e.g., 0.10 for +10%). Safe to omit for now (no-op).
  commander?: {
    constructionPct?: number;
    productionPct?: number;
    researchPct?: number;
  };
  defaults: {
    baseConstructionCredPerHour: number; // 40 per spec
    baseProductionCredPerHour: number;   // 0 per spec
    baseResearchCredPerHour: number;     // 0 per spec
  };
}

// Helpers

function hasAtLeastLevel(
  techLevels: Partial<Record<TechnologyKey, number>>,
  key: TechnologyKey,
  level: number = 1,
): boolean {
  const v = techLevels[key] ?? 0;
  return (typeof v === 'number' ? v : 0) >= level;
}

function finalizeCapacity(flat: number, percentTotal: number): number {
  const base = typeof flat === 'number' && isFinite(flat) ? flat : 0;
  const pct = typeof percentTotal === 'number' && isFinite(percentTotal) ? percentTotal : 0;
  return base * (1 + pct);
}

// Construction Capacity
// Rules:
// - Baseline: defaults.baseConstructionCredPerHour (40)
// - +5% if 'cybernetics' >= 1
export function computeConstructionCapacity(ctx: CapacityContext): CapacityResult {
  const breakdown: CapacityBreakdownItem[] = [];

  // Baseline flat
  let flat = ctx.defaults.baseConstructionCredPerHour;
  breakdown.push({ source: 'Baseline', value: flat, kind: 'flat' });

  // Flat additions from factory chain (by catalogKey)
  const active = (ctx.buildingsAtBase || []).filter(b => b.isActive);
  const sumLevels = (key: string) =>
    active.filter(b => (b.catalogKey || '') === key).reduce((s, b) => s + Math.max(0, b.level || 0), 0);

  const roboticLv = sumLevels('robotic_factories');
  const naniteLv  = sumLevels('nanite_factories');
  const androidLv = sumLevels('android_factories');

  const roboticFlat  = roboticLv * ROBOTIC_FACTORY_CONSTR_PER_LEVEL;
  const naniteFlat   = naniteLv  * NANITE_FACTORY_CONSTR_PER_LEVEL;
  const androidFlat  = androidLv * ANDROID_FACTORY_CONSTR_PER_LEVEL;

  if (roboticFlat) {
    flat += roboticFlat;
    breakdown.push({ source: 'Robotic Factories', value: roboticFlat, kind: 'flat' });
  }
  if (naniteFlat) {
    flat += naniteFlat;
    breakdown.push({ source: 'Nanite Factories', value: naniteFlat, kind: 'flat' });
  }
  if (androidFlat) {
    flat += androidFlat;
    breakdown.push({ source: 'Android Factories', value: androidFlat, kind: 'flat' });
  }

  // Buildings: Metal Refineries (by catalogKey) — add base metal yield per level
  {
    const refineryLevels = (ctx.buildingsAtBase || [])
      .filter(b => b.isActive && (b.catalogKey || '') === 'metal_refineries')
      .reduce((sum, b) => sum + Math.max(0, b.level || 0), 0);
    const refineryFlat = refineryLevels * (ctx.locationDerived?.yieldsMetal || 0);
    if (refineryFlat) {
      flat += refineryFlat;
      breakdown.push({ source: 'Metal Refineries (+metal yield per level)', value: refineryFlat, kind: 'flat' });
    }
  }

  // Percent modifiers
  let percent = 0;

  // Tech: Cybernetics +5%
  if (hasAtLeastLevel(ctx.techLevels, 'cybernetics', 1)) {
    percent += 0.05;
    breakdown.push({ source: 'Tech: Cybernetics +5%', value: 0.05, kind: 'percent' });
  }

  // Overhaul-derived: solarEnergy influences construction capacity (based on base position)
  if (typeof ctx.locationDerived?.solarEnergy === 'number') {
    const p = CONSTR_PCT_PER_SOLAR_UNIT * (ctx.locationDerived.solarEnergy || 0);
    if (p) {
      percent += p;
      breakdown.push({ source: 'Environment: Solar Energy', value: p, kind: 'percent' });
    }
  }

  // Commander hook (no-op if undefined)
  if (typeof ctx.commander?.constructionPct === 'number' && ctx.commander.constructionPct) {
    percent += ctx.commander.constructionPct;
    breakdown.push({ source: 'Commander Bonus', value: ctx.commander.constructionPct, kind: 'percent' });
  }

  const value = finalizeCapacity(flat, percent);
  return { value, breakdown };
}

// Production Capacity
// Rules:
// - Baseline: defaults.baseProductionCredPerHour (0)
// - shipyard: +2 cred/h per level (isActive only)
// - +5% if 'cybernetics' >= 1
export function computeProductionCapacity(ctx: CapacityContext): CapacityResult {
  const breakdown: CapacityBreakdownItem[] = [];

  // Baseline flat
  let flat = ctx.defaults.baseProductionCredPerHour;
  breakdown.push({ source: 'Baseline', value: flat, kind: 'flat' });

  // Buildings: Shipyards
  const shipyardFlat = (ctx.buildingsAtBase || [])
    .filter(b => b.isActive && b.type === 'shipyard')
    .reduce((sum, b) => sum + 2 * Math.max(0, b.level || 0), 0);

  if (shipyardFlat > 0) {
    flat += shipyardFlat;
    breakdown.push({ source: 'Shipyards (+2 per level)', value: shipyardFlat, kind: 'flat' });
  }

  // Buildings: Metal Refineries (by catalogKey) — add base metal yield per level
  const refineryLevels = (ctx.buildingsAtBase || [])
    .filter(b => b.isActive && (b.catalogKey || '') === 'metal_refineries')
    .reduce((sum, b) => sum + Math.max(0, b.level || 0), 0);

  const refineryFlat = refineryLevels * (ctx.locationDerived?.yieldsMetal || 0);
  if (refineryFlat) {
    flat += refineryFlat;
    breakdown.push({ source: 'Metal Refineries (+metal yield per level)', value: refineryFlat, kind: 'flat' });
  }

  // Buildings: Robotic Factories (per-level flat +2)
  const roboticLevelsProd = (ctx.buildingsAtBase || [])
    .filter(b => b.isActive && (b.catalogKey || '') === 'robotic_factories')
    .reduce((sum, b) => sum + Math.max(0, b.level || 0), 0);
  const roboticFlatProd = roboticLevelsProd * ROBOTIC_FACTORY_PROD_PER_LEVEL;
  if (roboticFlatProd) {
    flat += roboticFlatProd;
    breakdown.push({ source: 'Robotic Factories', value: roboticFlatProd, kind: 'flat' });
  }

  // Percent modifiers
  let percent = 0;

  // Tech: Cybernetics +5%
  if (hasAtLeastLevel(ctx.techLevels, 'cybernetics', 1)) {
    percent += 0.05;
    breakdown.push({ source: 'Tech: Cybernetics +5%', value: 0.05, kind: 'percent' });
  }

  // Overhaul-derived: metal yield influences production capacity
  if (typeof ctx.locationDerived?.yieldsMetal === 'number') {
    const p = PROD_PCT_PER_METAL_YIELD_UNIT * (ctx.locationDerived.yieldsMetal || 0);
    if (p) {
      percent += p;
      breakdown.push({ source: 'Environment: Metal Yield', value: p, kind: 'percent' });
    }
  }

  // Commander hook (no-op if undefined)
  if (typeof ctx.commander?.productionPct === 'number' && ctx.commander.productionPct) {
    percent += ctx.commander.productionPct;
    breakdown.push({ source: 'Commander Bonus', value: ctx.commander.productionPct, kind: 'percent' });
  }

  const value = finalizeCapacity(flat, percent);
  return { value, breakdown };
}

// Research Capacity
// Rules:
// - Baseline: defaults.baseResearchCredPerHour (0)
// - research_lab: +8 cred/h per level (isActive only)
// - +5% if 'artificial_intelligence' >= 1
export function computeResearchCapacity(ctx: CapacityContext): CapacityResult {
  const breakdown: CapacityBreakdownItem[] = [];

  // Baseline flat
  let flat = ctx.defaults.baseResearchCredPerHour;
  breakdown.push({ source: 'Baseline', value: flat, kind: 'flat' });

  // Buildings: Research Labs
  const labsFlat = (ctx.buildingsAtBase || [])
    .filter(b => b.isActive && b.type === 'research_lab')
    .reduce((sum, b) => sum + 8 * Math.max(0, b.level || 0), 0);

  if (labsFlat > 0) {
    flat += labsFlat;
    breakdown.push({ source: 'Research Labs (+8 per level)', value: labsFlat, kind: 'flat' });
  }

  // Percent modifiers
  let percent = 0;

  // Tech: Artificial Intelligence +5%
  if (hasAtLeastLevel(ctx.techLevels, 'artificial_intelligence', 1)) {
    percent += 0.05;
    breakdown.push({ source: 'Tech: Artificial Intelligence +5%', value: 0.05, kind: 'percent' });
  }

  // Overhaul-derived: fertility influences research capacity
  if (typeof ctx.locationDerived?.fertility === 'number') {
    const p = RESEARCH_PCT_PER_FERTILITY_UNIT * (ctx.locationDerived.fertility || 0);
    if (p) {
      percent += p;
      breakdown.push({ source: 'Environment: Fertility', value: p, kind: 'percent' });
    }
  }

  // Commander hook (no-op if undefined)
  if (typeof ctx.commander?.researchPct === 'number' && ctx.commander.researchPct) {
    percent += ctx.commander.researchPct;
    breakdown.push({ source: 'Commander Bonus', value: ctx.commander.researchPct, kind: 'percent' });
  }

  const value = finalizeCapacity(flat, percent);
  return { value, breakdown };
}

// Convenience: compute all three at once
export function computeAllCapacities(ctx: CapacityContext): {
  construction: CapacityResult;
  production: CapacityResult;
  research: CapacityResult;
} {
  return {
    construction: computeConstructionCapacity(ctx),
    production: computeProductionCapacity(ctx),
    research: computeResearchCapacity(ctx),
  };
}

/**
 * Categorized breakdown shape for UI grouping without changing CapacityResult.
 */
export interface ClassifiedCapacityBreakdown {
  baseline: CapacityBreakdownItem[];
  buildings: CapacityBreakdownItem[];
  location: CapacityBreakdownItem[];
  tech: CapacityBreakdownItem[];
  commander: CapacityBreakdownItem[];
  citizen: CapacityBreakdownItem[];
  other: CapacityBreakdownItem[];
}

/**
 * Classify a CapacityResult.breakdown into grouped categories:
 * - baseline: "Baseline"
 * - buildings: Shipyards, Research Labs, Robotic/Nanite/Android Factories, Metal Refineries
 * - location: "Environment: ..."
 * - tech: "Tech: ..."
 * - commander: "Commander Bonus"
 * - other: any remaining entries
 *
 * This preserves existing CapacityResult API while enabling clearer UI sections.
 */
export function classifyCapacityBreakdown(items: CapacityBreakdownItem[] = []): ClassifiedCapacityBreakdown {
  const result: ClassifiedCapacityBreakdown = {
    baseline: [],
    buildings: [],
    location: [],
    tech: [],
    commander: [],
    citizen: [],
    other: [],
  };

  const isBuildingSource = (src: string) =>
    src === 'Shipyards (+2 per level)' ||
    src.startsWith('Research Labs') ||
    src === 'Robotic Factories' ||
    src === 'Nanite Factories' ||
    src === 'Android Factories' ||
    src.startsWith('Metal Refineries');

  for (const item of items) {
    const src = item.source || '';
    if (src === 'Baseline') {
      result.baseline.push(item);
    } else if (isBuildingSource(src)) {
      result.buildings.push(item);
    } else if (src.startsWith('Environment:')) {
      result.location.push(item);
    } else if (src.startsWith('Tech:')) {
      result.tech.push(item);
    } else if (src === 'Commander Bonus') {
      result.commander.push(item);
    } else if (src === 'Citizens Bonus') {
      result.citizen.push(item);
    } else {
      result.other.push(item);
    }
  }

  return result;
}
