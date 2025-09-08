import type { BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';

// Fusion Plants
// Title: Fusion Plants
// Subtitle: Each level increases base energy output by 4.
// Columns: Level | Credits | Energy Output
export const FUSION_PLANTS_ROWS: LevelRow[] = [
  { level: 1, credits: 20, energyOutput: 4 },
  { level: 2, credits: 30, energyOutput: 8 },
  { level: 3, credits: 45, energyOutput: 12 },
  { level: 4, credits: 68, energyOutput: 16 },
  { level: 5, credits: 102, energyOutput: 20 },
  { level: 6, credits: 152, energyOutput: 24 },
  { level: 7, credits: 228, energyOutput: 28 },
  { level: 8, credits: 342, energyOutput: 32 },
  { level: 9, credits: 513, energyOutput: 36 },
  { level: 10, credits: 769, energyOutput: 40 },
  { level: 11, credits: 1154, energyOutput: 44 },
  { level: 12, credits: 1730, energyOutput: 48 },
  { level: 13, credits: 2595, energyOutput: 52 },
  { level: 14, credits: 3893, energyOutput: 56 },
  { level: 15, credits: 5839, energyOutput: 60 },
  { level: 16, credits: 8758, energyOutput: 64 },
  { level: 17, credits: 13137, energyOutput: 68 },
  { level: 18, credits: 19706, energyOutput: 72 },
  { level: 19, credits: 29558, energyOutput: 76 },
];

// Helper map for display metadata per structure (extensible)
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  fusion_plants: {
    title: 'Fusion Plants',
    subtitle: 'Each level increases base energy output by 4.',
  },
};
