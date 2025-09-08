import { TechnologyKey, technologyCatalog } from '@game/shared';
import type { ResearchLevelRow } from './metrics';
import { ENERGY_LEVEL_ROWS } from './energy';
import { COMPUTER_LEVEL_ROWS } from './computer';
import { ARMOUR_LEVEL_ROWS } from './armour';
import { LASER_LEVEL_ROWS } from './laser';
import { MISSILES_LEVEL_ROWS } from './missiles';
import { STELLAR_DRIVE_LEVEL_ROWS } from './stellar_drive';
import { PLASMA_LEVEL_ROWS } from './plasma';
import { PHOTON_LEVEL_ROWS } from './photon';
import { WARP_DRIVE_LEVEL_ROWS } from './warp_drive';
import { SHIELDING_LEVEL_ROWS } from './shielding';
import { STEALTH_LEVEL_ROWS } from './stealth';
import { ARTIFICIAL_INTELLIGENCE_LEVEL_ROWS } from './artificial_intelligence';
import { CYBERNETICS_LEVEL_ROWS } from './cybernetics';
import { ION_LEVEL_ROWS } from './ion';
import { DISRUPTOR_LEVEL_ROWS } from './disruptor';
import { TACHYON_COMMUNICATIONS_LEVEL_ROWS } from './tachyon_communications';
import { ANTI_GRAVITY_LEVEL_ROWS } from './anti_gravity';


// Default scaffold: build a single L1 row per tech from TechnologySpec.
// This establishes the framework, mirroring structures level tables,
// and can be extended with per-tech files later if/when multi-level data is defined.
const buildDefaultTables = (): Record<TechnologyKey, ResearchLevelRow[]> => {
  const tables = {} as Record<TechnologyKey, ResearchLevelRow[]>;
  (Object.keys(technologyCatalog) as TechnologyKey[]).forEach((key) => {
    const spec = technologyCatalog[key];
    const requires =
      spec.prerequisites && spec.prerequisites.length > 0
        ? spec.prerequisites.map((p) => `${p.key.replace(/_/g, ' ')} ${p.level}`).join(', ')
        : '—';
    tables[key] = [
      {
        level: 1,
        credits: spec.creditsCost,
        labs: spec.requiredLabs,
        requires,
        effect: spec.description || '—',
      },
    ];
  });
  return tables;
};

export const RESEARCH_LEVEL_TABLES: Record<TechnologyKey, ResearchLevelRow[]> = (() => {
  const tables = buildDefaultTables();
  tables['energy'] = ENERGY_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['computer'] = COMPUTER_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['armour'] = ARMOUR_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['laser'] = LASER_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['plasma'] = PLASMA_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['photon'] = PHOTON_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['missiles'] = MISSILES_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['stellar_drive'] = STELLAR_DRIVE_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['warp_drive'] = WARP_DRIVE_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['shielding'] = SHIELDING_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['stealth'] = STEALTH_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['artificial_intelligence'] = ARTIFICIAL_INTELLIGENCE_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['cybernetics'] = CYBERNETICS_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['ion'] = ION_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['disruptor'] = DISRUPTOR_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['tachyon_communications'] = TACHYON_COMMUNICATIONS_LEVEL_ROWS as unknown as ResearchLevelRow[];
  tables['anti_gravity'] = ANTI_GRAVITY_LEVEL_ROWS as unknown as ResearchLevelRow[];
  return tables;
})();

export const RESEARCH_LEVEL_META: Record<TechnologyKey, { title: string; subtitle?: string }> = ((): Record<TechnologyKey, { title: string; subtitle?: string }> => {
  const meta = {} as Record<TechnologyKey, { title: string; subtitle?: string }>;
  (Object.keys(technologyCatalog) as TechnologyKey[]).forEach((key) => {
    const spec = technologyCatalog[key];
    meta[key] = {
      title: `${spec.name} — Levels`,
      subtitle: spec.description || undefined,
    };
  });
  // Override subtitle for Energy to match UI copy
  if (meta['energy']) {
    meta['energy'].subtitle = 'Each level increases all bases energy output by 5%.';
  }
  // Override subtitle for Artificial Intelligence to match UI copy
  if (meta['artificial_intelligence']) {
    meta['artificial_intelligence'].subtitle = 'Each level increases all bases research output by 5%.';
  }
  // Override subtitle for Computer to match UI copy
  if (meta['computer']) {
    meta['computer'].subtitle = 'Each level allows one campaign fleet and the recruiting of one commander. Each 5 levels allows one auto scout fleet.';
  }
  // Override subtitle for Armour to match UI copy
  if (meta['armour']) {
    meta['armour'].subtitle = 'Each level increases units and defenses armour by 5%.';
  }
  // Override subtitle for Laser to match UI copy
  if (meta['laser']) {
    meta['laser'].subtitle = 'Each level increases laser weapons power by 5%.';
  }
  // Override subtitle for Plasma to match UI copy
  if (meta['plasma']) {
    meta['plasma'].subtitle = 'Each level increases plasma weapons power by 5%.';
  }
  // Override subtitle for Photon to match UI copy
  if (meta['photon']) {
    meta['photon'].subtitle = 'Each level increases photon weapons power by 5%.';
  }
  if (meta['missiles']) {
    meta['missiles'].subtitle = 'Each level increases missile weapons power by 5%.';
  }
  if (meta['stellar_drive']) {
    meta['stellar_drive'].subtitle = 'Each level increases stellar units travel speed by 5%.';
  }
  if (meta['warp_drive']) {
    meta['warp_drive'].subtitle = 'Each level increases warp units travel speed by 5%.';
  }
  if (meta['shielding']) {
    meta['shielding'].subtitle = 'Each level increases units and defenses shield strength by 5%.';
  }
  if (meta['cybernetics']) {
    meta['cybernetics'].subtitle = 'Each level increases all bases construction and production output by 5%.';
  }
  return meta;
})();
