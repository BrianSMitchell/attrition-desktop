import type { BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';

// Command Centers
// Title: Command Centers
// Subtitle: Each level increases the number of occupied bases you can have by 1, and add 5% fleet attack power at base location.
// Columns: Level | Credits | Command Points
export const COMMAND_CENTERS_ROWS: LevelRow[] = [
  { level: 1, credits: 20, commandPoints: 1 },
  { level: 2, credits: 30, commandPoints: 2 },
  { level: 3, credits: 45, commandPoints: 3 },
  { level: 4, credits: 68, commandPoints: 4 },
  { level: 5, credits: 102, commandPoints: 5 },
  { level: 6, credits: 152, commandPoints: 6 },
  { level: 7, credits: 228, commandPoints: 7 },
  { level: 8, credits: 342, commandPoints: 8 },
  { level: 9, credits: 513, commandPoints: 9 },
  { level: 10, credits: 769, commandPoints: 10 },
  { level: 11, credits: 1154, commandPoints: 11 },
  { level: 12, credits: 1730, commandPoints: 12 },
  { level: 13, credits: 2595, commandPoints: 13 },
  { level: 14, credits: 3893, commandPoints: 14 },
];

// Helper map for display metadata per structure (extensible)
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  command_centers: {
    title: 'Command Centers',
    subtitle:
      'Each level increases the number of occupied bases you can have by 1, and add 5% fleet attack power at base location.',
  },
};
