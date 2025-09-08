import { getStructureCreditCostForLevel, hasCanonicalStructureCostForLevel, type BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';
import { URBAN_STRUCTURES_ROWS, STRUCTURE_META as URBAN_META } from './urban_structures';
import { SOLAR_PLANTS_ROWS, STRUCTURE_META as SOLAR_META } from './solar_plants';
import { GAS_PLANTS_ROWS, STRUCTURE_META as GAS_META } from './gas_plants';
import { FUSION_PLANTS_ROWS, STRUCTURE_META as FUSION_META } from './fusion_plants';
import { RESEARCH_LABS_ROWS, STRUCTURE_META as RESEARCH_META } from './research_labs';
import { METAL_REFINERIES_ROWS, STRUCTURE_META as METAL_META } from './metal_refineries';
import { ROBOTIC_FACTORIES_ROWS, STRUCTURE_META as ROBOTIC_META } from './robotic_factories';
import { SHIPYARDS_ROWS, STRUCTURE_META as SHIPYARDS_META } from './shipyards';
import { ORBITAL_SHIPYARDS_ROWS, STRUCTURE_META as ORBITAL_SHIPYARDS_META } from './orbital_shipyards';
import { SPACEPORTS_ROWS, STRUCTURE_META as SPACEPORTS_META } from './spaceports';
import { COMMAND_CENTERS_ROWS, STRUCTURE_META as COMMAND_CENTERS_META } from './command_centers';
import { ANDROID_FACTORIES_ROWS, STRUCTURE_META as ANDROID_META } from './android_factories';
import { ECONOMIC_CENTERS_ROWS, STRUCTURE_META as ECONOMIC_CENTERS_META } from './economic_centers';
import { TERRAFORM_ROWS, STRUCTURE_META as TERRAFORM_META } from './terraform';
import { MULTI_LEVEL_PLATFORMS_ROWS, STRUCTURE_META as MULTI_LEVEL_PLATFORMS_META } from './multi_level_platforms';
import { ORBITAL_BASE_ROWS, STRUCTURE_META as ORBITAL_BASE_META } from './orbital_base';
import { CRYSTAL_MINES_ROWS, STRUCTURE_META as CRYSTAL_MINES_META } from './crystal_mines';

const computeSharedCredits = (key: BuildingKey, rows: LevelRow[]): LevelRow[] =>
  rows
    .filter((r) => hasCanonicalStructureCostForLevel(key, r.level))
    .map((r) => ({
      ...r,
      credits: getStructureCreditCostForLevel(key, r.level),
    }));

// Aggregate map of structure level tables by BuildingKey
export const STRUCTURE_LEVEL_TABLES: Partial<Record<BuildingKey, LevelRow[]>> = {
  urban_structures: computeSharedCredits('urban_structures', URBAN_STRUCTURES_ROWS),
  solar_plants: computeSharedCredits('solar_plants', SOLAR_PLANTS_ROWS),
  gas_plants: computeSharedCredits('gas_plants', GAS_PLANTS_ROWS),
  fusion_plants: computeSharedCredits('fusion_plants', FUSION_PLANTS_ROWS),
  research_labs: computeSharedCredits('research_labs', RESEARCH_LABS_ROWS),
  metal_refineries: computeSharedCredits('metal_refineries', METAL_REFINERIES_ROWS),
  robotic_factories: computeSharedCredits('robotic_factories', ROBOTIC_FACTORIES_ROWS),
  shipyards: computeSharedCredits('shipyards', SHIPYARDS_ROWS),
  orbital_shipyards: computeSharedCredits('orbital_shipyards', ORBITAL_SHIPYARDS_ROWS),
  spaceports: computeSharedCredits('spaceports', SPACEPORTS_ROWS),
  command_centers: computeSharedCredits('command_centers', COMMAND_CENTERS_ROWS),
  android_factories: computeSharedCredits('android_factories', ANDROID_FACTORIES_ROWS),
  economic_centers: computeSharedCredits('economic_centers', ECONOMIC_CENTERS_ROWS),
  terraform: computeSharedCredits('terraform', TERRAFORM_ROWS),
  multi_level_platforms: computeSharedCredits('multi_level_platforms', MULTI_LEVEL_PLATFORMS_ROWS),
  orbital_base: computeSharedCredits('orbital_base', ORBITAL_BASE_ROWS),
  crystal_mines: computeSharedCredits('crystal_mines', CRYSTAL_MINES_ROWS),
  // Add more structure tables here as they are created
};

// Aggregate metadata map (title/subtitle) by BuildingKey
export const STRUCTURE_LEVEL_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  ...URBAN_META,
  ...SOLAR_META,
  ...GAS_META,
  ...FUSION_META,
  ...RESEARCH_META,
  ...METAL_META,
  ...ROBOTIC_META,
  ...SHIPYARDS_META,
  ...ORBITAL_SHIPYARDS_META,
  ...SPACEPORTS_META,
  ...COMMAND_CENTERS_META,
  ...ANDROID_META,
  ...ECONOMIC_CENTERS_META,
  ...TERRAFORM_META,
  ...MULTI_LEVEL_PLATFORMS_META,
  ...ORBITAL_BASE_META,
  ...CRYSTAL_MINES_META,
};
