import type { BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';

// Multi-Level Platforms
// Title: Multi-Level Platforms
// Subtitle: Each level increases base construction area by 10, doesn't require population.
// Columns: Level | Credits | Increased Area
export const MULTI_LEVEL_PLATFORMS_ROWS: LevelRow[] = [
  { level: 1, credits: 10000, increasedArea: 10 },
  { level: 2, credits: 15000, increasedArea: 20 },
  { level: 3, credits: 22500, increasedArea: 30 },
  { level: 4, credits: 33750, increasedArea: 40 },
  { level: 5, credits: 50625, increasedArea: 50 },
  { level: 6, credits: 75938, increasedArea: 60 },
  { level: 7, credits: 113907, increasedArea: 70 },
  { level: 8, credits: 170860, increasedArea: 80 },
  { level: 9, credits: 256290, increasedArea: 90 },
  { level: 10, credits: 384434, increasedArea: 100 },
  { level: 11, credits: 576651, increasedArea: 110 },
];

// Helper map for display metadata per structure (extensible)
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  multi_level_platforms: {
    title: 'Multi-Level Platforms',
    subtitle: "Each level increases base construction area by 10, doesn't require population.",
  },
};
