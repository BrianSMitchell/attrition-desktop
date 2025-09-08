import type { BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';

// Robotic Factories
// Title: Robotic Factories
// Subtitle: Each level increases production and construction capacity by 2.
// Columns: Level | Credits | Production Output
export const ROBOTIC_FACTORIES_ROWS: LevelRow[] = [
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
];

// Helper map for display metadata per structure
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  robotic_factories: {
    title: 'Robotic Factories',
    subtitle: 'Each level increases production and construction capacity by 2.',
  },
};
