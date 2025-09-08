import type { BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';

// Orbital Base
// Title: Orbital Base
// Subtitle: Each level increase population capacity by 10 and doesn't require area on the base.
// Columns: Level | Credits | Population Capacity
export const ORBITAL_BASE_ROWS: LevelRow[] = [
  { level: 1, credits: 2000, populationCapacity: 10 },
  { level: 2, credits: 3000, populationCapacity: 20 },
  { level: 3, credits: 4500, populationCapacity: 30 },
  { level: 4, credits: 6750, populationCapacity: 40 },
  { level: 5, credits: 10125, populationCapacity: 50 },
  { level: 6, credits: 15188, populationCapacity: 60 },
  { level: 7, credits: 22782, populationCapacity: 70 },
  { level: 8, credits: 34172, populationCapacity: 80 },
  { level: 9, credits: 51258, populationCapacity: 90 },
];

// Helper map for display metadata per structure (extensible)
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  orbital_base: {
    title: 'Orbital Base',
    subtitle: "Each level increase population capacity by 10 and doesn't require area on the base.",
  },
};
