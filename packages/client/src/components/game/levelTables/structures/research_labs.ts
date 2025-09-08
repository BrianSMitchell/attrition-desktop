import type { BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';

// Research Labs
// Title: Research Labs
// Subtitle: Each level increases base research capacity by 8, and allows the research of more technologies.
// Columns: Level | Credits | Research Output
export const RESEARCH_LABS_ROWS: LevelRow[] = [
  { level: 1, credits: 2, researchOutput: 8 },
  { level: 2, credits: 3, researchOutput: 16 },
  { level: 3, credits: 5, researchOutput: 24 },
  { level: 4, credits: 7, researchOutput: 32 },
  { level: 5, credits: 11, researchOutput: 40 },
  { level: 6, credits: 16, researchOutput: 48 },
  { level: 7, credits: 23, researchOutput: 56 },
  { level: 8, credits: 35, researchOutput: 64 },
  { level: 9, credits: 52, researchOutput: 72 },
  { level: 10, credits: 77, researchOutput: 80 },
  { level: 11, credits: 116, researchOutput: 88 },
  { level: 12, credits: 173, researchOutput: 96 },
  { level: 13, credits: 260, researchOutput: 104 },
  { level: 14, credits: 390, researchOutput: 112 },
  { level: 15, credits: 584, researchOutput: 120 },
  { level: 16, credits: 876, researchOutput: 128 },
  { level: 17, credits: 1314, researchOutput: 136 },
  { level: 18, credits: 1971, researchOutput: 144 },
  { level: 19, credits: 2956, researchOutput: 152 },
  { level: 20, credits: 4434, researchOutput: 160 },
  { level: 21, credits: 6651, researchOutput: 168 },
  { level: 22, credits: 9976, researchOutput: 176 },
  { level: 23, credits: 14944, researchOutput: 184 },
  { level: 24, credits: 22446, researchOutput: 192 },
  { level: 25, credits: 33669, researchOutput: 200 },
  { level: 26, credits: 50503, researchOutput: 208 },
  { level: 27, credits: 75754, researchOutput: 216 },
  { level: 28, credits: 113631, researchOutput: 224 },
  { level: 29, credits: 170446, researchOutput: 232 },
  { level: 30, credits: 255669, researchOutput: 240 },
];

// Helper map for display metadata per structure (extensible)
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  research_labs: {
    title: 'Research Labs',
    subtitle: 'Each level increases base research capacity by 8, and allows the research of more technologies.',
  },
};
