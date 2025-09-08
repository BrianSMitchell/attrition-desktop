// Canonical per-level structure credit costs (authoritative shared source).
// These tables are progressively migrated from client-level display tables
// to ensure both client and server use identical upgrade costs.
//
// Conventions:
// - Level is 1-based: level 1 means first construction from level 0 -> 1.
// - If a table isn't present for a key and level === 1, we fall back to the
//   BuildingSpec.creditsCost (Phase A behavior).
// - If a table isn't present for a key and level > 1, we currently throw to
//   avoid inventing a non-canonical formula. Add the table here to enable upgrades.

import { BuildingKey, getBuildingSpec } from './buildings';

const LEVEL_CREDITS: Partial<Record<BuildingKey, number[]>> = {
  // Urban Structures: Level -> Credits
  urban_structures: [
    1, 2, 3, 4, 6, 8, 12, 18, 26, 39, 58, 87, 130, 195, 292, 438, 657, 986, 1478, 2217,
  ],

  // Solar Plants: Level -> Credits
  solar_plants: [
    1, 2, 3, 4, 6, 8, 12, 18, 26, 39, 58, 87, 130,
  ],

  // Gas Plants: Level -> Credits
  gas_plants: [
    1, 2, 3, 4, 6, 8, 12, 18, 26, 39, 58, 87, 130, 195,
  ],

  // Metal Refineries: Level -> Credits
  metal_refineries: [
    1, 2, 3, 4, 6, 8, 12, 18, 26, 39, 58, 87, 130, 195, 292, 438, 657, 986, 1478, 2217, 3326,
  ],

  // Fusion Plants: Level -> Credits
  fusion_plants: [
    20, 30, 45, 68, 102, 152, 228, 342, 513, 769, 1154, 1730, 2595, 3893, 5839, 8758, 13137, 19706, 29558,
  ],

  // Research Labs: Level -> Credits
  research_labs: [
    2, 3, 5, 7, 11, 16, 23, 35, 52, 77, 116, 173, 260, 390, 584, 876, 1314, 1971, 2956, 4434, 6651, 9976, 14944, 22446, 33669, 50503, 75754, 113631, 170446, 255669,
  ],

  // Robotic Factories: Level -> Credits
  robotic_factories: [
    5, 8, 12, 17, 26, 38, 57, 86, 129, 193, 289, 433, 649, 974, 1460, 2190, 3285,
  ],

  // Shipyards: Level -> Credits
  shipyards: [
    5, 8, 12, 17, 26, 38, 57, 86, 129, 193, 289, 433, 649, 974, 1460, 2190, 3285, 4927, 7390, 11085, 16627, 24940, 37410, 56114, 84171, 126256, 189384, 284076, 426114,
  ],

  // Orbital Shipyards: Level -> Credits
  orbital_shipyards: [
    10000, 15000, 22500, 33750, 50625, 75938, 113907, 170860, 256290,
  ],

  // Spaceports: Level -> Credits
  spaceports: [
    5, 8, 12, 17, 26, 38, 57, 86, 129, 193, 289, 433, 649, 974, 1460, 2190, 3285, 4927, 7390, 11085,
  ],

  // Command Centers: Level -> Credits
  command_centers: [
    20, 30, 45, 68, 102, 152, 228, 342, 513, 769, 1154, 1730, 2595, 3893,
  ],

  // Android Factories: Level -> Credits
  android_factories: [
    1000, 1500, 2250, 3375, 5063, 7594, 11391, 17086, 25629, 38444, 57666, 86498,
  ],

  // Economic Centers: Level -> Credits
  economic_centers: [
    80, 120, 180, 270, 405, 608, 912, 1367, 2051, 3076, 4614, 6920, 10380,
  ],

  // Terraform: Level -> Credits
  terraform: [
    80, 120, 180, 270, 405, 608, 912, 1367, 2051, 3076, 4614, 6920, 10380,
  ],

  // Multi-Level Platforms: Level -> Credits
  multi_level_platforms: [
    10000, 15000, 22500, 33750, 50625, 75938, 113907, 170860, 256290, 384434, 576651,
  ],

  // Orbital Base: Level -> Credits
  orbital_base: [
    2000, 3000, 4500, 6750, 10125, 15188, 22782, 34172, 51258,
  ],

  // Crystal Mines: Level -> Credits
  crystal_mines: [
    2, 3, 5, 7, 11, 16, 23, 35,
  ],

  // Antimatter Plants: Level -> Credits
  antimatter_plants: [
    2000, 3000, 4500, 6750, 10125, 15188, 22782, 34172, 51258,
  ],

  // Orbital Plants: Level -> Credits
  orbital_plants: [
    40000, 60000, 90000, 135000, 202500, 303750, 455625, 683438, 1025157,
  ],

  // Nanite Factories: Level -> Credits (matches economic/terraform sequence)
  nanite_factories: [
    80, 120, 180, 270, 405, 608, 912, 1367, 2051, 3076, 4614, 6920, 10380,
  ],

  // Jump Gate: Level -> Credits
  jump_gate: [
    5000, 7500, 11250, 16875, 25313, 37970, 56955, 85433, 128150,
  ],

  // Biosphere Modification: Level -> Credits
  biosphere_modification: [
    20000, 30000, 45000, 67500, 101250, 151875, 227813, 341720, 512580,
  ],

  // Capital: Level -> Credits
  capital: [
    15000, 22500, 33750, 50625, 75938, 113907, 170861, 256292, 384438,
  ],
};
/**
 * Returns the canonical credits cost for constructing or upgrading a structure
 * to the target level. If the current level is N, the next level is N+1 and
 * this function should be called with level = N+1.
 *
 * Behavior:
 * - If a per-level table exists for the building key and covers the level,
 *   returns that value.
 * - If no table exists but level === 1, falls back to BuildingSpec.creditsCost.
 * - Otherwise throws an Error to indicate the upgrade cost is undefined.
 */
export function getStructureCreditCostForLevel(
  key: BuildingKey,
  level: number
): number {
  if (!Number.isFinite(level) || level <= 0) {
    throw new Error(`Invalid level ${level} for building ${key}`);
  }

  const table = LEVEL_CREDITS[key];
  if (table && level <= table.length) {
    const cost = table[level - 1];
    if (Number.isFinite(cost) && cost >= 0) return cost;
  }

  // Fallback for level 1 when no table is present: use spec.creditsCost
  if (level === 1) {
    const spec = getBuildingSpec(key);
    const cost = Number(spec?.creditsCost ?? NaN);
    if (Number.isFinite(cost) && cost >= 0) return cost;
  }

  throw new Error(`No canonical cost defined for ${key} at level ${level}`);
}

/**
 * Utility to check if a given key/level combination has a canonical cost defined.
 * Useful for gating upgrade UI or returning a cleaner server error before attempting to charge.
 */
export function hasCanonicalStructureCostForLevel(
  key: BuildingKey,
  level: number
): boolean {
  try {
    getStructureCreditCostForLevel(key, level);
    return true;
  } catch {
    return false;
  }
}
