import { supabase } from '../../config/supabase';
import type { BaseCapacitiesDTO, CapacityResult } from '@game/shared';

export class SupabaseCapacityService {
  static async getBaseCapacities(empireId: string, coord: string): Promise<BaseCapacitiesDTO> {
    // Load active buildings for this base/empire
    const bRes = await supabase
      .from('buildings')
      .select('catalog_key, is_active, pending_upgrade, level')
      .eq('empire_id', empireId)
      .eq('location_coord', coord);

    const levels = new Map<string, number>();
    for (const b of bRes.data || []) {
      const key = String((b as any).catalog_key || '');
      if (!key) continue;
      const level = Math.max(0, Number((b as any).level || 0));
      const effectiveActive = (b as any).is_active === true || (b as any).pending_upgrade === true;
      if (effectiveActive) levels.set(key, (levels.get(key) || 0) + level);
    }

    // Metal yield from location
    let metalYield = 0;
    try {
      const loc = await supabase.from('locations').select('result').eq('coord', coord).maybeSingle();
      metalYield = Math.max(0, Number((loc.data as any)?.result?.yields?.metal || 0));
    } catch {}

    const construction = this.computeConstruction(levels, metalYield);
    const production = this.computeProduction(levels, metalYield);
    const research = this.computeResearch(levels);

    // Citizens bonus (if colony present)
    let citizen: CapacityResult = { value: 0, breakdown: [] };
    try {
      const col = await supabase
        .from('colonies')
        .select('citizens')
        .eq('empire_id', empireId)
        .eq('location_coord', coord)
        .maybeSingle();
      const citizens = Math.max(0, Number((col.data as any)?.citizens || 0));
      // Citizen capacity per hour value mirrors legacy computeCitizen from CapacityService (sum of buildings elsewhere).
      // For Phase 1, keep citizen capacity as-is (0) and only apply citizens bonus to other capacities.
      const pct = citizens / 100000; // 1000 citizens -> 1%
      const applyPct = (res: CapacityResult): CapacityResult => ({
        value: Math.round(res.value * (1 + pct)),
        breakdown: [...(res.breakdown || []), ...(pct > 0 ? [{ source: 'Citizens Bonus', value: pct, kind: 'percent' as const }] : [])],
      });
      citizen = { value: 0, breakdown: [] };
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
}