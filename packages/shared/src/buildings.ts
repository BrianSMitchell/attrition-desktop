// Buildings catalog (Phase A subset) + helpers.
// Note: For Phase A we primarily gate by technology prerequisites.
// Credits/energy/economy/pop/area are included for future use but not fully enforced yet.

import { TechnologyKey } from './tech';

export type BuildingKey =
  | 'urban_structures'
  | 'solar_plants'
  | 'gas_plants'
  | 'fusion_plants'
  | 'antimatter_plants'
  | 'orbital_plants'
  | 'research_labs'
  | 'metal_refineries'
  | 'crystal_mines'
  | 'robotic_factories'
  | 'command_centers'
  | 'shipyards'
  | 'orbital_shipyards'
  | 'spaceports'
  | 'nanite_factories'
  | 'android_factories'
  | 'economic_centers'
  | 'terraform'
  | 'multi_level_platforms'
  | 'orbital_base'
  | 'jump_gate'
  | 'biosphere_modification'
  | 'capital';

export interface BuildingTechPrereq {
  key: TechnologyKey;
  level: number;
}

export interface BuildingSpec {
  key: BuildingKey;
  name: string;
  // Credits required to construct level 1
  creditsCost: number;
  // Energy effect: positive = produces, negative = consumes
  energyDelta: number;
  // Economy (credits/hour) added at the base (1 economy = 1 credit/hour)
  economy: number;
  populationRequired: number;
  areaRequired?: number;
  advanced?: boolean; // corresponds to 'x' in Advanced column
  techPrereqs: BuildingTechPrereq[];
}

// Minimal best-guess subset derived from screenshot.
// Many items map to existing generic types to avoid schema changes in Phase A.
export const buildingsCatalog: Record<BuildingKey, BuildingSpec> = {
  urban_structures: {
    key: 'urban_structures',
    name: 'Urban Structures',
    creditsCost: 1,
    energyDelta: 0,
    economy: 0,
    populationRequired: 0,
    areaRequired: 1,
    techPrereqs: [],
  },
  solar_plants: {
    key: 'solar_plants',
    name: 'Solar Plants',
    creditsCost: 1,
    energyDelta: 1,
    economy: 0,
    populationRequired: 1,
    areaRequired: 1,
    techPrereqs: [],
  },
  gas_plants: {
    key: 'gas_plants',
    name: 'Gas Plants',
    creditsCost: 1,
    energyDelta: 1,
    economy: 0,
    populationRequired: 1,
    areaRequired: 1,
    techPrereqs: [],
  },
  fusion_plants: {
    key: 'fusion_plants',
    name: 'Fusion Plants',
    creditsCost: 20,
    energyDelta: 4,
    economy: 0,
    populationRequired: 1,
    areaRequired: 1,
    techPrereqs: [{ key: 'energy', level: 6 }],
  },
  antimatter_plants: {
    key: 'antimatter_plants',
    name: 'Antimatter Plants',
    creditsCost: 2000,
    energyDelta: 10,
    economy: 0,
    populationRequired: 1,
    areaRequired: 1,
    advanced: true,
    techPrereqs: [{ key: 'energy', level: 20 }],
  },
  orbital_plants: {
    key: 'orbital_plants',
    name: 'Orbital Plants',
    creditsCost: 40000,
    energyDelta: 12,
    economy: 0,
    populationRequired: 1,
    areaRequired: 0,
    advanced: true,
    techPrereqs: [{ key: 'energy', level: 25 }],
  },
  research_labs: {
    key: 'research_labs',
    name: 'Research Labs',
    creditsCost: 2,
    energyDelta: -1,
    economy: 0,
    populationRequired: 1,
    areaRequired: 1,
    techPrereqs: [],
  },
  metal_refineries: {
    key: 'metal_refineries',
    name: 'Metal Refineries',
    creditsCost: 1,
    energyDelta: -1,
    economy: 1,
    populationRequired: 1,
    areaRequired: 1,
    techPrereqs: [],
  },
  crystal_mines: {
    key: 'crystal_mines',
    name: 'Crystal Mines',
    creditsCost: 2,
    energyDelta: -1,
    economy: 0,
    populationRequired: 1,
    areaRequired: 1,
    techPrereqs: [],
  },
  robotic_factories: {
    key: 'robotic_factories',
    name: 'Robotic Factories',
    creditsCost: 5,
    energyDelta: -1,
    economy: 1,
    populationRequired: 1,
    areaRequired: 1,
    techPrereqs: [{ key: 'computer', level: 2 }],
  },
  command_centers: {
    key: 'command_centers',
    name: 'Command Centers',
    creditsCost: 20,
    energyDelta: -1,
    economy: 0,
    populationRequired: 1,
    areaRequired: 1,
    techPrereqs: [{ key: 'computer', level: 6 }],
  },
  shipyards: {
    key: 'shipyards',
    name: 'Shipyards',
    creditsCost: 5, // placeholder
    energyDelta: -1,
    economy: 1,
    populationRequired: 1,
    areaRequired: 1,
    techPrereqs: [],
  },
  orbital_shipyards: {
    key: 'orbital_shipyards',
    name: 'Orbital Shipyards',
    creditsCost: 10000,
    energyDelta: -12,
    economy: 2,
    populationRequired: 1,
    areaRequired: 0,
    techPrereqs: [{ key: 'cybernetics', level: 2 }],
  },
  spaceports: {
    key: 'spaceports',
    name: 'Spaceports',
    creditsCost: 5,
    energyDelta: -1,
    economy: 2,
    populationRequired: 1,
    areaRequired: 1,
    techPrereqs: [],
  },
  nanite_factories: {
    key: 'nanite_factories',
    name: 'Nanite Factories',
    creditsCost: 80,
    energyDelta: -2,
    economy: 2,
    populationRequired: 1,
    areaRequired: 1,
    techPrereqs: [
      { key: 'computer', level: 10 },
      { key: 'laser', level: 8 },
    ],
  },
  android_factories: {
    key: 'android_factories',
    name: 'Android Factories',
    creditsCost: 1000,
    energyDelta: -4,
    economy: 2,
    populationRequired: 1,
    areaRequired: 1,
    techPrereqs: [{ key: 'artificial_intelligence', level: 4 }],
  },
  economic_centers: {
    key: 'economic_centers',
    name: 'Economic Centers',
    creditsCost: 80,
    energyDelta: -2,
    economy: 3,
    populationRequired: 1,
    areaRequired: 1,
    techPrereqs: [{ key: 'computer', level: 10 }],
  },
  terraform: {
    key: 'terraform',
    name: 'Terraform',
    creditsCost: 80,
    energyDelta: 0,
    economy: 0,
    populationRequired: 0,
    areaRequired: 1,
    techPrereqs: [
      { key: 'computer', level: 10 },
      { key: 'energy', level: 10 },
    ],
  },
  multi_level_platforms: {
    key: 'multi_level_platforms',
    name: 'Multi-Level Platforms',
    creditsCost: 10000,
    energyDelta: 0,
    economy: 0,
    populationRequired: 0,
    advanced: true,
    techPrereqs: [{ key: 'armour', level: 22 }],
  },
  orbital_base: {
    key: 'orbital_base',
    name: 'Orbital Base',
    creditsCost: 2000,
    energyDelta: 0,
    economy: 0,
    populationRequired: 0,
    advanced: true,
    techPrereqs: [{ key: 'computer', level: 20 }],
  },
  jump_gate: {
    key: 'jump_gate',
    name: 'Jump Gate',
    creditsCost: 5000,
    energyDelta: -12,
    economy: 0,
    populationRequired: 1,
    advanced: true,
    techPrereqs: [
      { key: 'warp_drive', level: 12 },
      { key: 'energy', level: 20 },
    ],
  },
  biosphere_modification: {
    key: 'biosphere_modification',
    name: 'Biosphere Modification',
    creditsCost: 20000,
    energyDelta: -24,
    economy: 0,
    populationRequired: 1,
    advanced: true,
    techPrereqs: [
      { key: 'computer', level: 24 },
      { key: 'energy', level: 24 },
    ],
  },
  capital: {
    key: 'capital',
    name: 'Capital',
    creditsCost: 15000,
    energyDelta: -12,
    economy: 10,
    populationRequired: 1,
    advanced: true,
    techPrereqs: [{ key: 'tachyon_communications', level: 1 }],
  },
};

export function getBuildingsList(): BuildingSpec[] {
  return Object.values(buildingsCatalog);
}

export function getBuildingSpec(key: BuildingKey): BuildingSpec {
  return buildingsCatalog[key];
}

// Phase 0 terminology bridge: prefer Structure* names in new code
/** @deprecated Use getStructuresList */
export const getStructuresList = getBuildingsList;
/** @deprecated Use StructureKey */
export type StructureKey = BuildingKey;
/** @deprecated Use StructureSpec */
export type StructureSpec = BuildingSpec;

// Simple tech-gating helper (Phase A):
export function canStartBuildingByTech(
  techLevels: Partial<Record<TechnologyKey, number>>,
  spec: BuildingSpec,
): { ok: boolean; unmet: Array<{ key: TechnologyKey; requiredLevel: number; currentLevel: number }> } {
  const unmet: Array<{ key: TechnologyKey; requiredLevel: number; currentLevel: number }> = [];
  for (const req of spec.techPrereqs) {
    const curr = Math.max(0, techLevels[req.key] ?? 0);
    if (curr < req.level) {
      unmet.push({ key: req.key, requiredLevel: req.level, currentLevel: curr });
    }
  }
  return { ok: unmet.length === 0, unmet };
}
