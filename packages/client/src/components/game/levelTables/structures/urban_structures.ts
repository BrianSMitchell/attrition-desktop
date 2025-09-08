import type { BuildingKey } from '@game/shared';

export type LevelRow = {
  level: number;
  credits: number;
  populationCapacity?: number;
  energyOutput?: number;
  researchOutput?: number;
  economyOutput?: number;
  tradeRoutes?: number;
  commandPoints?: number;
  productionOutput?: number;
  increasedArea?: number;
};

// Urban Structures
// Title: Urban Structures
// Subtitle: Each level increases population capacity by base fertility.
// Columns: Level | Credits | Population Capacity
export const URBAN_STRUCTURES_ROWS: LevelRow[] = [
  { level: 1, credits: 1, populationCapacity: 7 },
  { level: 2, credits: 2, populationCapacity: 14 },
  { level: 3, credits: 3, populationCapacity: 21 },
  { level: 4, credits: 4, populationCapacity: 28 },
  { level: 5, credits: 6, populationCapacity: 35 },
  { level: 6, credits: 8, populationCapacity: 42 },
  { level: 7, credits: 12, populationCapacity: 49 },
  { level: 8, credits: 18, populationCapacity: 56 },
  { level: 9, credits: 26, populationCapacity: 63 },
  { level: 10, credits: 39, populationCapacity: 70 },
  { level: 11, credits: 58, populationCapacity: 77 },
  { level: 12, credits: 87, populationCapacity: 84 },
  { level: 13, credits: 130, populationCapacity: 91 },
  { level: 14, credits: 195, populationCapacity: 98 },
  { level: 15, credits: 292, populationCapacity: 105 },
  { level: 16, credits: 438, populationCapacity: 112 },
  { level: 17, credits: 657, populationCapacity: 119 },
  { level: 18, credits: 986, populationCapacity: 126 },
  { level: 19, credits: 1478, populationCapacity: 133 },
  { level: 20, credits: 2217, populationCapacity: 140 },
];

// Helper map for display metadata per structure (extensible)
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  urban_structures: {
    title: 'Urban Structures',
    subtitle: 'Each level increases population capacity by base fertility.',
  },
};
