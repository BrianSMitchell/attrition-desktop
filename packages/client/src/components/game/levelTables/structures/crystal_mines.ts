import type { BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';

// Crystal Mines
// Title: Crystal Mines
// Subtitle: Each level increases base economy by base crystals resource.
// Columns: Level | Credits | Economy Output
export const CRYSTAL_MINES_ROWS: LevelRow[] = [
  { level: 1, credits: 2, economyOutput: 2 },
  { level: 2, credits: 3, economyOutput: 4 },
  { level: 3, credits: 5, economyOutput: 6 },
  { level: 4, credits: 7, economyOutput: 8 },
  { level: 5, credits: 11, economyOutput: 10 },
  { level: 6, credits: 16, economyOutput: 12 },
  { level: 7, credits: 23, economyOutput: 14 },
  { level: 8, credits: 35, economyOutput: 16 },
];

// Helper map for display metadata per structure (extensible)
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  crystal_mines: {
    title: 'Crystal Mines',
    subtitle: 'Economy output equals the base’s crystals attribute (no baseline).',
  },
};
