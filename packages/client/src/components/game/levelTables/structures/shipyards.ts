import type { BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';

// Shipyards
// Title: Shipyards
// Subtitle: Each level increases base production by 2 and allows the production of more units.
// Columns: Level | Credits | Production Output
export const SHIPYARDS_ROWS: LevelRow[] = [
  { level: 1, credits: 5, productionOutput: 2 },
  { level: 2, credits: 8, productionOutput: 4 },
  { level: 3, credits: 12, productionOutput: 6 },
  { level: 4, credits: 17, productionOutput: 8 },
  { level: 5, credits: 26, productionOutput: 10 },
  { level: 6, credits: 38, productionOutput: 12 },
  { level: 7, credits: 57, productionOutput: 14 },
  { level: 8, credits: 86, productionOutput: 16 },
  { level: 9, credits: 129, productionOutput: 18 },
  { level: 10, credits: 193, productionOutput: 20 },
  { level: 11, credits: 289, productionOutput: 22 },
  { level: 12, credits: 433, productionOutput: 24 },
  { level: 13, credits: 649, productionOutput: 26 },
  { level: 14, credits: 974, productionOutput: 28 },
  { level: 15, credits: 1460, productionOutput: 30 },
  { level: 16, credits: 2190, productionOutput: 32 },
  { level: 17, credits: 3285, productionOutput: 34 },
  { level: 18, credits: 4927, productionOutput: 36 },
  { level: 19, credits: 7390, productionOutput: 38 },
  { level: 20, credits: 11085, productionOutput: 40 },
  { level: 21, credits: 16627, productionOutput: 42 },
  { level: 22, credits: 24940, productionOutput: 44 },
  { level: 23, credits: 37410, productionOutput: 46 },
  { level: 24, credits: 56114, productionOutput: 48 },
  { level: 25, credits: 84171, productionOutput: 50 },
  { level: 26, credits: 126256, productionOutput: 52 },
  { level: 27, credits: 189384, productionOutput: 54 },
  { level: 28, credits: 284076, productionOutput: 56 },
  { level: 29, credits: 426114, productionOutput: 58 },
];

// Helper map for display metadata per structure (extensible)
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  shipyards: {
    title: 'Shipyards',
    subtitle: 'Each level increases base production by 2 and allows the production of more units.',
  },
};
