import type { BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';

// Gas Plants
// Title: Gas Plants
// Subtitle: Each level increases base energy output by base gas resource.
// Columns: Level | Credits | Energy Output
export const GAS_PLANTS_ROWS: LevelRow[] = [
  { level: 1, credits: 1, energyOutput: 3 },
  { level: 2, credits: 2, energyOutput: 6 },
  { level: 3, credits: 3, energyOutput: 9 },
  { level: 4, credits: 4, energyOutput: 12 },
  { level: 5, credits: 6, energyOutput: 15 },
  { level: 6, credits: 8, energyOutput: 18 },
  { level: 7, credits: 12, energyOutput: 21 },
  { level: 8, credits: 18, energyOutput: 24 },
  { level: 9, credits: 26, energyOutput: 27 },
  { level: 10, credits: 39, energyOutput: 30 },
  { level: 11, credits: 58, energyOutput: 33 },
  { level: 12, credits: 87, energyOutput: 36 },
  { level: 13, credits: 130, energyOutput: 39 },
  { level: 14, credits: 195, energyOutput: 42 },
];

// Helper map for display metadata per structure (extensible)
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  gas_plants: {
    title: 'Gas Plants',
    subtitle: 'Each level increases base energy output by base gas resource.',
  },
};
