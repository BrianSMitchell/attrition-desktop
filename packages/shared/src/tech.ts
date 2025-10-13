// Technology catalog and helpers for Phase A (level 1 unlocks with credits and lab gating)

import { DB_FIELDS } from '../../server/src/constants/database-fields';
export type TechnologyKey =
  | DB_FIELDS.EMPIRES.ENERGY
  | 'computer'
  | 'armour'
  | 'laser'
  | 'missiles'
  | 'stellar_drive'
  | 'plasma'
  | 'warp_drive'
  | 'shielding'
  | 'ion'
  | 'stealth'
  | 'photon'
  | 'artificial_intelligence'
  | 'disruptor'
  | 'cybernetics'
  | 'tachyon_communications'
  | 'anti_gravity';

export interface TechPrereq {
  key: TechnologyKey;
  level: number;
}

export interface TechnologySpec {
  key: TechnologyKey;
  name: string;
  // Optional description shown in Game Info tables
  description?: string;
  // Cost to unlock level 1 (Phase A: credits only)
  creditsCost: number;
  // Minimum sum of research_lab levels required at the base
  requiredLabs: number;
  // Other technologies required at at-least these levels (empire-wide)
  prerequisites: TechPrereq[];
}

// Catalog derived from the provided screenshot. Values are for Level 1 unlocks.
export const technologyCatalog: Record<TechnologyKey, TechnologySpec> = {
  energy: {
    key: DB_FIELDS.EMPIRES.ENERGY,
    name: DB_FIELDS.EMPIRES.ENERGY,
    description: 'Increases all bases energy output by 5%.',
    creditsCost: 2,
    requiredLabs: 1,
    prerequisites: [],
  },
  computer: {
    key: 'computer',
    name: 'Computer',
    description: 'Allows one campaign fleet per level.',
    creditsCost: 2,
    requiredLabs: 1,
    prerequisites: [],
  },
  armour: {
    key: 'armour',
    name: 'Armour',
    description: 'Increases units and defenses armour by 5%.',
    creditsCost: 4,
    requiredLabs: 2,
    prerequisites: [],
  },
  laser: {
    key: 'laser',
    name: 'Laser',
    description: 'Increases laser weapons power by 5%.',
    creditsCost: 4,
    requiredLabs: 2,
    prerequisites: [{ key: DB_FIELDS.EMPIRES.ENERGY, level: 2 }],
  },
  missiles: {
    key: 'missiles',
    name: 'Missiles',
    description: 'Increases missile weapons power by 5%.',
    creditsCost: 8,
    requiredLabs: 4,
    prerequisites: [{ key: 'computer', level: 4 }],
  },
  stellar_drive: {
    key: 'stellar_drive',
    name: 'Stellar Drive',
    description: 'Increases stellar units speed by 5%.',
    creditsCost: 16,
    requiredLabs: 5,
    prerequisites: [{ key: DB_FIELDS.EMPIRES.ENERGY, level: 6 }],
  },
  plasma: {
    key: 'plasma',
    name: 'Plasma',
    description: 'Increases plasma weapons power by 5%.',
    creditsCost: 32,
    requiredLabs: 6,
    prerequisites: [
      { key: DB_FIELDS.EMPIRES.ENERGY, level: 6 },
      { key: 'laser', level: 4 },
    ],
  },
  warp_drive: {
    key: 'warp_drive',
    name: 'Warp Drive',
    description: 'Increases warp units speed by 5%.',
    creditsCost: 64,
    requiredLabs: 8,
    prerequisites: [
      { key: DB_FIELDS.EMPIRES.ENERGY, level: 8 },
      { key: 'stellar_drive', level: 4 },
    ],
  },
  shielding: {
    key: 'shielding',
    name: 'Shielding',
    description: 'Increases units and defenses shield by 5%.',
    creditsCost: 128,
    requiredLabs: 10,
    prerequisites: [{ key: DB_FIELDS.EMPIRES.ENERGY, level: 10 }],
  },
  ion: {
    key: 'ion',
    name: 'Ion',
    description: 'Increases ion weapons power by 5%.',
    creditsCost: 256,
    requiredLabs: 12,
    prerequisites: [
      { key: DB_FIELDS.EMPIRES.ENERGY, level: 12 },
      { key: 'laser', level: 10 },
    ],
  },
  stealth: {
    key: 'stealth',
    name: 'Stealth',
    description:
      'Decreases the time your own fleets can be detected before they arrive.',
    creditsCost: 512,
    requiredLabs: 14,
    prerequisites: [{ key: DB_FIELDS.EMPIRES.ENERGY, level: 14 }],
  },
  photon: {
    key: 'photon',
    name: 'Photon',
    description: 'Increases photon weapons power by 5%.',
    creditsCost: 1024,
    requiredLabs: 16,
    prerequisites: [
      { key: DB_FIELDS.EMPIRES.ENERGY, level: 16 },
      { key: 'plasma', level: 8 },
    ],
  },
  artificial_intelligence: {
    key: 'artificial_intelligence',
    name: 'Artificial Intelligence',
    description: 'Increases all bases research output by 5%.',
    creditsCost: 2048,
    requiredLabs: 18,
    prerequisites: [{ key: 'computer', level: 20 }],
  },
  disruptor: {
    key: 'disruptor',
    name: 'Disruptor',
    description: 'Increases disruptor weapons power by 5%.',
    creditsCost: 4096,
    requiredLabs: 20,
    prerequisites: [
      { key: DB_FIELDS.EMPIRES.ENERGY, level: 20 },
      { key: 'laser', level: 18 },
    ],
  },
  cybernetics: {
    key: 'cybernetics',
    name: 'Cybernetics',
    description: 'Increases all bases construction and production by 5%.',
    creditsCost: 8192,
    requiredLabs: 22,
    prerequisites: [{ key: 'artificial_intelligence', level: 6 }],
  },
  tachyon_communications: {
    key: 'tachyon_communications',
    name: 'Tachyon Communications',
    description: 'Allows 1 research link between 2 bases (min labs 20).',
    creditsCost: 32768,
    requiredLabs: 24,
    prerequisites: [
      { key: DB_FIELDS.EMPIRES.ENERGY, level: 24 },
      { key: 'computer', level: 24 },
    ],
  },
  anti_gravity: {
    key: 'anti_gravity',
    name: 'Anti-Gravity',
    description:
      'Decreases orbital structures construction time by 5% and increases Death Star speed by 5%.',
    creditsCost: 100000,
    requiredLabs: 26,
    prerequisites: [
      { key: DB_FIELDS.EMPIRES.ENERGY, level: 26 },
      { key: 'computer', level: 26 },
    ],
  },
};

// Helpers

export function getTechnologyList(): TechnologySpec[] {
  return Object.values(technologyCatalog);
}

export function getTechSpec(key: TechnologyKey): TechnologySpec {
  return technologyCatalog[key];
}

export function evaluatePrereqs(
  techLevels: Partial<Record<TechnologyKey, number>>,
  prerequisites: TechPrereq[],
): {
  ok: boolean;
  unmet: Array<{ key: TechnologyKey; requiredLevel: number; currentLevel: number }>;
} {
  const unmet: Array<{ key: TechnologyKey; requiredLevel: number; currentLevel: number }> = [];
  for (const req of prerequisites) {
    const current = Math.max(0, techLevels[req.key] ?? 0);
    if (current < req.level) {
      unmet.push({ key: req.key, requiredLevel: req.level, currentLevel: current });
    }
  }
  return { ok: unmet.length === 0, unmet };
}

export function canStartTech(
  params: {
    techLevels: Partial<Record<TechnologyKey, number>>;
    baseLabTotal: number;
    credits: number;
  },
  spec: TechnologySpec,
): { canStart: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Already unlocked (Phase A: only level 1)
  const currentLevel = Math.max(0, params.techLevels[spec.key] ?? 0);
  if (currentLevel >= 1) {
    reasons.push('Already unlocked.');
  }

  // Labs
  if (params.baseLabTotal < spec.requiredLabs) {
    reasons.push(
      `Requires ${spec.requiredLabs} lab levels at this base (have ${params.baseLabTotal}).`,
    );
  }

  // Credits
  if (params.credits < spec.creditsCost) {
    reasons.push(`Requires ${spec.creditsCost.toLocaleString()} credits (have ${params.credits.toLocaleString()}).`);
  }

  // Prerequisites
  const { ok, unmet } = evaluatePrereqs(params.techLevels, spec.prerequisites);
  if (!ok) {
    for (const u of unmet) {
      const prereqSpec = getTechSpec(u.key);
      reasons.push(`Requires ${prereqSpec.name} ${u.requiredLevel} (current ${u.currentLevel}).`);
    }
  }

  return { canStart: reasons.length === 0, reasons };
}

/**
 * Compute the credit cost for a specific technology level.
 * - Level 1 uses the catalog's creditsCost
 * - Higher levels use a geometric progression with ratio ~1.5, rounded each step
 *   This matches the general pattern used across level tables (2,3,5,7,11,16,23,...).
 */
export function getTechCreditCostForLevel(
  specOrKey: TechnologyKey | TechnologySpec,
  level: number
): number {
  const spec = typeof specOrKey === 'string' ? getTechSpec(specOrKey) : specOrKey;
  const base = Math.max(0, Number(spec.creditsCost || 0));
  const targetLevel = Math.max(1, Math.floor(level || 1));
  if (targetLevel <= 1) return base;

  // Geometric growth with ratio 1.5, rounding each step
  let cost = base;
  for (let l = 2; l <= targetLevel; l++) {
    cost = Math.round(cost * 1.5);
  }
  return Math.max(1, cost);
}

/**
 * Multi-level gating that considers the TARGET level being researched.
 * - Uses getTechCreditCostForLevel(spec, targetLevel) for credits
 * - Uses spec.requiredLabs for lab requirement (constant for all levels in Phase A)
 * - Uses spec.prerequisites (treated as global requirements independent of target level)
 */
export function canStartTechLevel(
  params: {
    techLevels: Partial<Record<TechnologyKey, number>>;
    baseLabTotal: number;
    credits: number;
  },
  spec: TechnologySpec,
  targetLevel: number
): { canStart: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const currentLevel = Math.max(0, params.techLevels[spec.key] ?? 0);
  const desired = Math.max(1, Math.floor(targetLevel || 1));

  // Already at or above desired level
  if (currentLevel >= desired) {
    reasons.push(`Already unlocked (current ${currentLevel}).`);
  }

  // Labs (Phase A: spec.requiredLabs applies to all levels)
  if (params.baseLabTotal < spec.requiredLabs) {
    reasons.push(
      `Requires ${spec.requiredLabs} lab levels at this base (have ${params.baseLabTotal}).`
    );
  }

  // Credits for the desired level
  const cost = getTechCreditCostForLevel(spec, desired);
  if (params.credits < cost) {
    reasons.push(`Requires ${cost.toLocaleString()} credits (have ${params.credits.toLocaleString()}).`);
  }

  // Prerequisites (treated as global requirements)
  const { ok, unmet } = evaluatePrereqs(params.techLevels, spec.prerequisites);
  if (!ok) {
    for (const u of unmet) {
      const prereqSpec = getTechSpec(u.key);
      reasons.push(`Requires ${prereqSpec.name} ${u.requiredLevel} (current ${u.currentLevel}).`);
    }
  }

  return { canStart: reasons.length === 0, reasons };
}
