import type { ResearchLevelRow } from './metrics';

export const DISRUPTOR_LEVEL_ROWS: Readonly<ResearchLevelRow[]> = [
  { level: 0, credits: 0, disruptorWeaponsAttackPct: 100 },
  { level: 1, credits: 4096, disruptorWeaponsAttackPct: 105 },
  { level: 2, credits: 6144, disruptorWeaponsAttackPct: 110 },
  { level: 3, credits: 9216, disruptorWeaponsAttackPct: 115 },
  { level: 4, credits: 13824, disruptorWeaponsAttackPct: 120 },
  { level: 5, credits: 20736, disruptorWeaponsAttackPct: 125 },
  { level: 6, credits: 31104, disruptorWeaponsAttackPct: 130 },
  { level: 7, credits: 46656, disruptorWeaponsAttackPct: 135 },
  { level: 8, credits: 69984, disruptorWeaponsAttackPct: 140 },
  { level: 9, credits: 104976, disruptorWeaponsAttackPct: 145 },
  { level: 10, credits: 157464, disruptorWeaponsAttackPct: 150 },
  { level: 11, credits: 236196, disruptorWeaponsAttackPct: 155 },
  { level: 12, credits: 354296, disruptorWeaponsAttackPct: 160 },
  { level: 13, credits: 531444, disruptorWeaponsAttackPct: 165 },
  { level: 14, credits: 797164, disruptorWeaponsAttackPct: 170 },
  { level: 15, credits: 1195744, disruptorWeaponsAttackPct: 175 },
  { level: 16, credits: 1793616, disruptorWeaponsAttackPct: 180 },
  { level: 17, credits: 2690424, disruptorWeaponsAttackPct: 185 },
  { level: 18, credits: 4035632, disruptorWeaponsAttackPct: 190 }
] as const;
