import type { BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';

// Metal Refineries
// Title: Metal Refineries
// Subtitle: Each level increases production and construction capacity by base metal resource.
// Columns: Level | Credits | Production Output
export const METAL_REFINERIES_ROWS: LevelRow[] = [
  { level: 1, credits: 1, productionOutput: 3 },
  { level: 2, credits: 2, productionOutput: 6 },
  { level: 3, credits: 3, productionOutput: 9 },
  { level: 4, credits: 4, productionOutput: 12 },
  { level: 5, credits: 6, productionOutput: 15 },
  { level: 6, credits: 8, productionOutput: 18 },
  { level: 7, credits: 12, productionOutput: 21 },
  { level: 8, credits: 18, productionOutput: 24 },
  { level: 9, credits: 26, productionOutput: 27 },
  { level: 10, credits: 39, productionOutput: 30 },
  { level: 11, credits: 58, productionOutput: 33 },
  { level: 12, credits: 87, productionOutput: 36 },
  { level: 13, credits: 130, productionOutput: 39 },
  { level: 14, credits: 195, productionOutput: 42 },
  { level: 15, credits: 292, productionOutput: 45 },
  { level: 16, credits: 438, productionOutput: 48 },
  { level: 17, credits: 657, productionOutput: 51 },
  { level: 18, credits: 986, productionOutput: 54 },
  { level: 19, credits: 1478, productionOutput: 57 },
  { level: 20, credits: 2217, productionOutput: 60 },
  { level: 21, credits: 3326, productionOutput: 63 },
];

// Helper map for display metadata per structure (extensible)
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  metal_refineries: {
    title: 'Metal Refineries',
    subtitle: 'Each level increases production and construction capacity by base metal resource.',
  },
};
