import type { BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';

// Orbital Shipyards
// Title: Orbital Shipyards
// Subtitle: Each level increases base production by 8, allows the production of more units and doesn't require area on the base.
// Columns: Level | Credits | Production Output
export const ORBITAL_SHIPYARDS_ROWS: LevelRow[] = [
  { level: 1, credits: 10000, productionOutput: 8 },
  { level: 2, credits: 15000, productionOutput: 16 },
  { level: 3, credits: 22500, productionOutput: 24 },
  { level: 4, credits: 33750, productionOutput: 32 },
  { level: 5, credits: 50625, productionOutput: 40 },
  { level: 6, credits: 75938, productionOutput: 48 },
  { level: 7, credits: 113907, productionOutput: 56 },
  { level: 8, credits: 170860, productionOutput: 64 },
  { level: 9, credits: 256290, productionOutput: 72 },
];

// Helper map for display metadata per structure (extensible)
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  orbital_shipyards: {
    title: 'Orbital Shipyards',
    subtitle:
      "Each level increases base production by 8, allows the production of more units and doesn't require area on the base.",
  },
};
