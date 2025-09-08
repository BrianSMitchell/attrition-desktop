import type { BuildingKey } from '@game/shared';
import type { LevelRow } from './urban_structures';

// Terraform
// Title: Terraform
// Subtitle: Each level increases base construction area by 5, doesn't require population.
// Columns: Level | Credits | Increased Area
export const TERRAFORM_ROWS: LevelRow[] = [
  { level: 1, credits: 80, increasedArea: 5 },
  { level: 2, credits: 120, increasedArea: 10 },
  { level: 3, credits: 180, increasedArea: 15 },
  { level: 4, credits: 270, increasedArea: 20 },
  { level: 5, credits: 405, increasedArea: 25 },
  { level: 6, credits: 608, increasedArea: 30 },
  { level: 7, credits: 912, increasedArea: 35 },
  { level: 8, credits: 1367, increasedArea: 40 },
  { level: 9, credits: 2051, increasedArea: 45 },
  { level: 10, credits: 3076, increasedArea: 50 },
  { level: 11, credits: 4614, increasedArea: 55 },
  { level: 12, credits: 6920, increasedArea: 60 },
  { level: 13, credits: 10380, increasedArea: 65 },
];

// Helper map for display metadata per structure
export const STRUCTURE_META: Partial<Record<BuildingKey, { title: string; subtitle?: string }>> = {
  terraform: {
    title: 'Terraform',
    subtitle: "Each level increases base construction area by 5, doesn't require population.",
  },
};
