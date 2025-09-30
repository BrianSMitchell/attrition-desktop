import mongoose from 'mongoose';
import { Building } from '../models/Building';
import type { BaseCapacitiesDTO, CapacityResult } from '@game/shared';
import { Location } from '../models/Location';

/**
 * CapacityService computes per-base capacities.
 */
export class CapacityService {
  static async getBaseCapacities(empireId: string, locationCoord: string): Promise<BaseCapacitiesDTO> {
    // Load active buildings for this base/empire
    const buildings = await Building.find({
      empireId: new mongoose.Types.ObjectId(empireId),
      locationCoord,
    })
      .select('catalogKey isActive pendingUpgrade level')
      .lean();

    const activeLevels = new Map<string, number>();
    for (const b of buildings || []) {
      const key = String((b as any).catalogKey || '');
      if (!key) continue;
      const level = Math.max(0, Number((b as any).level || 0));
      const effectiveActive = (b as any).isActive === true || (b as any).pendingUpgrade === true;
      if (effectiveActive) {
        activeLevels.set(key, Math.max(activeLevels.get(key) || 0, level));
      }
    }

    // Environment context needed for metal refinery contributions
    let metalYield = 0;
    try {
      const loc = await Location.findOne({ coord: locationCoord }).select('result').lean();
      metalYield = Math.max(0, Number((loc as any)?.result?.yields?.metal || 0));
    } catch {}

    const construction = this.computeConstruction(activeLevels, metalYield);
    const production = this.computeProduction(activeLevels, metalYield);
    const research = this.computeResearch(activeLevels);
    const citizen = this.computeCitizen(activeLevels);

    return { construction, production, research, citizen };
  }

  private static result(value: number, breakdown: CapacityResult['breakdown'] = []): CapacityResult {
    return { value, breakdown };
  }

  private static computeConstruction(levels: Map<string, number>, metalYield: number): CapacityResult {
    const breakdown: CapacityResult['breakdown'] = [];
    // Baseline +40 cred/h
    const baseline = 40;
    breakdown.push({ source: 'Baseline', value: baseline, kind: 'flat' });

    const lv = Math.max(0, levels.get('robotic_factories') || 0);
    const robotic = lv * 2;
    if (robotic) breakdown.push({ source: 'Robotic Factories', value: robotic, kind: 'flat' });

    // Metal Refineries: +metalYield per level
    const refineryLv = Math.max(0, levels.get('metal_refineries') || 0);
    const refineryFlat = refineryLv * Math.max(0, metalYield || 0);
    if (refineryFlat) breakdown.push({ source: 'Metal Refineries (+metal yield per level)', value: refineryFlat, kind: 'flat' });

    const total = baseline + robotic + refineryFlat;
    return this.result(total, breakdown);
  }

  private static computeProduction(levels: Map<string, number>, metalYield: number): CapacityResult {
    const breakdown: CapacityResult['breakdown'] = [];
    // Baseline 0 cred/h
    const baseline = 0;
    breakdown.push({ source: 'Baseline', value: baseline, kind: 'flat' });

    const lv = Math.max(0, levels.get('shipyards') || 0);
    const shipyardFlat = lv * 2;
    if (shipyardFlat) breakdown.push({ source: 'Shipyards (+2 per level)', value: shipyardFlat, kind: 'flat' });

    // Robotic Factories also add +2 per level to production
    const roboLv = Math.max(0, levels.get('robotic_factories') || 0);
    const roboFlat = roboLv * 2;
    if (roboFlat) breakdown.push({ source: 'Robotic Factories', value: roboFlat, kind: 'flat' });

    // Metal Refineries add metalYield per level
    const refineryLv = Math.max(0, levels.get('metal_refineries') || 0);
    const refineryFlat = refineryLv * Math.max(0, metalYield || 0);
    if (refineryFlat) breakdown.push({ source: 'Metal Refineries (+metal yield per level)', value: refineryFlat, kind: 'flat' });

    const total = baseline + shipyardFlat + roboFlat + refineryFlat;
    return this.result(total, breakdown);
  }

  private static computeResearch(levels: Map<string, number>): CapacityResult {
    const breakdown: CapacityResult['breakdown'] = [];
    // Baseline 0 cred/h
    const baseline = 0;
    breakdown.push({ source: 'Baseline', value: baseline, kind: 'flat' });

    const lv = Math.max(0, levels.get('research_labs') || 0);
    const flat = lv * 8;
    if (flat) breakdown.push({ source: 'Research Labs (+8 per level)', value: flat, kind: 'flat' });

    const total = baseline + flat;
    return this.result(total, breakdown);
  }

  private static computeCitizen(levels: Map<string, number>): CapacityResult {
    const items: CapacityResult['breakdown'] = [];
    const sum = (key: string, perLevel: number, label: string) => {
      const lv = Math.max(0, levels.get(key) || 0);
      const v = lv * perLevel;
      if (v) items.push({ source: label, value: v, kind: 'flat' });
      return v;
    };
    const total =
      sum('urban_structures', 3, 'Urban Structures') +
      sum('command_centers', 1, 'Command Centers') +
      sum('orbital_base', 5, 'Orbital Base') +
      sum('capital', 8, 'Capital') +
      sum('biosphere_modification', 10, 'Biosphere Modification');
    return this.result(total, items);
  }
}
