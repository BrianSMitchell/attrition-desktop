import type { BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';

// Android Factories
// Title: Android Factories
// Subtitle: Each level increases production and construction capacity by 6.
// Columns: Level | Credits | Production Output
export const ANDROID_FACTORIES_ROWS: LevelRow[] = [
  { level: 1, credits: 1000, productionOutput: 6 },
  { level: 2, credits: 1500, productionOutput: 12 },
  { level: 3, credits: 2250, productionOutput: 18 },
  { level: 4, credits: 3375, productionOutput: 24 },
  { level: 5, credits: 5063, productionOutput: 30 },
  { level: 6, credits: 7594, productionOutput: 36 },
  { level: 7, credits: 11391, productionOutput: 42 },
  { level: 8, credits: 17086, productionOutput: 48 },
  { level: 9, credits: 25629, productionOutput: 54 },
  { level: 10, credits: 38444, productionOutput: 60 },
  { level: 11, credits: 57666, productionOutput: 66 },
  { level: 12, credits: 86498, productionOutput: 72 },
];

// Helper map for display metadata per structure
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  android_factories: {
    title: 'Android Factories',
    subtitle: 'Each level increases production and construction capacity by 6.',
  },
};
