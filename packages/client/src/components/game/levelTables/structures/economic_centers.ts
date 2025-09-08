import type { BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';

// Economic Centers
// Title: Economic Centers
// Subtitle: Each level increases base economy by 3.
// Columns: Level | Credits | Economy Output
export const ECONOMIC_CENTERS_ROWS: LevelRow[] = [
  { level: 1, credits: 80, economyOutput: 3 },
  { level: 2, credits: 120, economyOutput: 6 },
  { level: 3, credits: 180, economyOutput: 9 },
  { level: 4, credits: 270, economyOutput: 12 },
  { level: 5, credits: 405, economyOutput: 15 },
  { level: 6, credits: 608, economyOutput: 18 },
  { level: 7, credits: 912, economyOutput: 21 },
  { level: 8, credits: 1367, economyOutput: 24 },
  { level: 9, credits: 2051, economyOutput: 27 },
  { level: 10, credits: 3076, economyOutput: 30 },
  { level: 11, credits: 4614, economyOutput: 33 },
  { level: 12, credits: 6920, economyOutput: 36 },
  { level: 13, credits: 10380, economyOutput: 39 },
];

// Helper map for display metadata per structure
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  economic_centers: {
    title: 'Economic Centers',
    subtitle: 'Each level increases base economy by 3.',
  },
};
