import type { BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';

// Spaceports
// Title: Spaceports
// Subtitle: Each level increases base economy by 2 and allows trade routes.
// Columns: Level | Credits | Economy Output
export const SPACEPORTS_ROWS: LevelRow[] = [
  { level: 1, credits: 5, economyOutput: 2, tradeRoutes: 1 },
  { level: 2, credits: 8, economyOutput: 4, tradeRoutes: 2 },
  { level: 3, credits: 12, economyOutput: 6, tradeRoutes: 3 },
  { level: 4, credits: 17, economyOutput: 8, tradeRoutes: 4 },
  { level: 5, credits: 26, economyOutput: 10, tradeRoutes: 5 },
  { level: 6, credits: 38, economyOutput: 12, tradeRoutes: 6 },
  { level: 7, credits: 57, economyOutput: 14, tradeRoutes: 7 },
  { level: 8, credits: 86, economyOutput: 16, tradeRoutes: 8 },
  { level: 9, credits: 129, economyOutput: 18, tradeRoutes: 9 },
  { level: 10, credits: 193, economyOutput: 20, tradeRoutes: 10 },
  { level: 11, credits: 289, economyOutput: 22, tradeRoutes: 11 },
  { level: 12, credits: 433, economyOutput: 24, tradeRoutes: 12 },
  { level: 13, credits: 649, economyOutput: 26, tradeRoutes: 13 },
  { level: 14, credits: 974, economyOutput: 28, tradeRoutes: 14 },
  { level: 15, credits: 1460, economyOutput: 30, tradeRoutes: 15 },
  { level: 16, credits: 2190, economyOutput: 32, tradeRoutes: 16 },
  { level: 17, credits: 3285, economyOutput: 34, tradeRoutes: 17 },
  { level: 18, credits: 4927, economyOutput: 36, tradeRoutes: 18 },
  { level: 19, credits: 7390, economyOutput: 38, tradeRoutes: 19 },
  { level: 20, credits: 11085, economyOutput: 40, tradeRoutes: 20 },
];

// Helper map for display metadata per structure (extensible)
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  spaceports: {
    title: 'Spaceports',
    subtitle: 'Each level increases base economy by 2 and allows trade routes.',
  },
};
