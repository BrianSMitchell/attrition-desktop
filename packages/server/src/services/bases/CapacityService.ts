import { supabase } from '../../config/supabase';
import type { BaseCapacitiesDTO, CapacityResult } from '@game/shared';

import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
export class CapacityService {
  static async getBaseCapacities(empireId: string, coord: string): Promise<BaseCapacitiesDTO> {
    // Load active buildings for this base/empire
    const bRes = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select('catalog_key, is_active, pending_upgrade, construction_completed, level')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, coord);

    const now = Date.now();
    const levels = new Map<string, number>();
    for (const b of bRes.data || []) {
      const key = String((b as any).catalog_key || '');
      if (!key) continue;
      const level = Math.max(0, Number((b as any).level || 0));
      const isActive = (b as any).is_active === true;
      const pending = (b as any).pending_upgrade === true;
      const completes = (b as any).construction_completed ? new Date((b as any).construction_completed).getTime() : 0;
      const effectiveActive = isActive || pending || (completes && completes <= now);
      if (effectiveActive) levels.set(key, (levels.get(key) || 0) + level);
    }

    // Metal yield from location
    let metalYield = 0;
    try {
      const loc = await supabase.from(DB_TABLES.LOCATIONS).select(DB_FIELDS.LOCATIONS.RESULT).eq('coord', coord).maybeSingle();
      metalYield = Math.max(0, Number((loc.data as any)?.result?.yields?.metal || 0));
    } catch {}

    const construction = this.computeConstruction(levels, metalYield);
    const production = this.computeProduction(levels, metalYield);
    const research = this.computeResearch(levels);
    const citizen = this.computeCitizen(levels);

    // Citizens bonus (if colony present)
    try {
      const col = await supabase
        .from(DB_TABLES.COLONIES)
        .select('citizens')
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, coord)
        .maybeSingle();
      const citizens = Math.max(0, Number((col.data as any)?.citizens || 0));
      // Citizens bonus: Every 1000 citizens = +1% bonus to Construction, Production, and Research
      // Formula: (citizens / 1000) / 100 = citizens / 100000
      // Example: 1000 citizens → 1000/100000 = 0.01 = 1%
      //          5000 citizens → 5000/100000 = 0.05 = 5%
      const pct = citizens / 100000;
      const applyPct = (res: CapacityResult): CapacityResult => ({
        value: Math.round(res.value * (1 + pct)),
        breakdown: [...(res.breakdown || []), ...(pct > 0 ? [{ source: 'Citizens Bonus', value: pct, kind: 'percent' as const }] : [])],
      });
      return {
        construction: applyPct(construction),
        production: applyPct(production),
        research: applyPct(research),
        citizen,
      };
    } catch {
      return { construction, production, research, citizen };
    }
  }

  private static result(value: number, breakdown: CapacityResult['breakdown'] = []): CapacityResult {
    return { value, breakdown };
  }

  private static computeConstruction(levels: Map<string, number>, metalYield: number): CapacityResult {
    const breakdown: CapacityResult['breakdown'] = [];
    const baseline = 40;
    breakdown.push({ source: 'Baseline', value: baseline, kind: 'flat' });
    const robotic = Math.max(0, levels.get('robotic_factories') || 0) * 2;
    if (robotic) breakdown.push({ source: 'Robotic Factories', value: robotic, kind: 'flat' });
    const refineryLv = Math.max(0, levels.get('metal_refineries') || 0);
    const refineryFlat = refineryLv * Math.max(0, metalYield || 0);
    if (refineryFlat) breakdown.push({ source: 'Metal Refineries (+metal yield per level)', value: refineryFlat, kind: 'flat' });
    return this.result(baseline + robotic + refineryFlat, breakdown);
  }

  private static computeProduction(levels: Map<string, number>, metalYield: number): CapacityResult {
    const breakdown: CapacityResult['breakdown'] = [];
    const baseline = 0;
    breakdown.push({ source: 'Baseline', value: baseline, kind: 'flat' });
    const shipyardFlat = Math.max(0, levels.get('shipyards') || 0) * 2;
    if (shipyardFlat) breakdown.push({ source: 'Shipyards (+2 per level)', value: shipyardFlat, kind: 'flat' });
    const roboFlat = Math.max(0, levels.get('robotic_factories') || 0) * 2;
    if (roboFlat) breakdown.push({ source: 'Robotic Factories', value: roboFlat, kind: 'flat' });
    const refineryLv = Math.max(0, levels.get('metal_refineries') || 0);
    const refineryFlat = refineryLv * Math.max(0, metalYield || 0);
    if (refineryFlat) breakdown.push({ source: 'Metal Refineries (+metal yield per level)', value: refineryFlat, kind: 'flat' });
    return this.result(baseline + shipyardFlat + roboFlat + refineryFlat, breakdown);
  }

  private static computeResearch(levels: Map<string, number>): CapacityResult {
    const breakdown: CapacityResult['breakdown'] = [];
    const baseline = 0;
    breakdown.push({ source: 'Baseline', value: baseline, kind: 'flat' });
    const flat = Math.max(0, levels.get('research_labs') || 0) * 8;
    if (flat) breakdown.push({ source: 'Research Labs (+8 per level)', value: flat, kind: 'flat' });
    return this.result(baseline + flat, breakdown);
  }

  private static computeCitizen(levels: Map<string, number>): CapacityResult {
    const breakdown: CapacityResult['breakdown'] = [];
    const sum = (key: string, perLevel: number, label: string) => {
      const lv = Math.max(0, levels.get(key) || 0);
      const v = lv * perLevel;
      if (v) breakdown.push({ source: label, value: v, kind: 'flat' });
      return v;
    };
    const total =
      sum('urban_structures', 3, 'Urban Structures') +
      sum('command_centers', 1, 'Command Centers') +
      sum('orbital_base', 5, 'Orbital Base') +
      sum('capital', 8, 'Capital') +
      sum('biosphere_modification', 10, 'Biosphere Modification');
    return this.result(total, breakdown);
  }
}
