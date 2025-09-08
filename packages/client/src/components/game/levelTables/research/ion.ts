import type { ResearchLevelRow } from './metrics';

export const ION_LEVEL_ROWS: Readonly<ResearchLevelRow[]> = [
  { level: 0, credits: 0, ionWeaponsAttackPct: 100 },
  { level: 1, credits: 256, ionWeaponsAttackPct: 105 },
  { level: 2, credits: 384, ionWeaponsAttackPct: 110 },
  { level: 3, credits: 576, ionWeaponsAttackPct: 115 },
  { level: 4, credits: 864, ionWeaponsAttackPct: 120 },
  { level: 5, credits: 1296, ionWeaponsAttackPct: 125 },
  { level: 6, credits: 1944, ionWeaponsAttackPct: 130 },
  { level: 7, credits: 2916, ionWeaponsAttackPct: 135 },
  { level: 8, credits: 4374, ionWeaponsAttackPct: 140 },
  { level: 9, credits: 6561, ionWeaponsAttackPct: 145 },
  { level: 10, credits: 9842, ionWeaponsAttackPct: 150 },
  { level: 11, credits: 14762, ionWeaponsAttackPct: 155 },
  { level: 12, credits: 22144, ionWeaponsAttackPct: 160 },
  { level: 13, credits: 33215, ionWeaponsAttackPct: 165 },
  { level: 14, credits: 49823, ionWeaponsAttackPct: 170 },
  { level: 15, credits: 74734, ionWeaponsAttackPct: 175 },
  { level: 16, credits: 112101, ionWeaponsAttackPct: 180 },
  { level: 17, credits: 168152, ionWeaponsAttackPct: 185 },
  { level: 18, credits: 252227, ionWeaponsAttackPct: 190 }
] as const;
