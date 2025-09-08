import mongoose from 'mongoose';
import { Building } from '../models/Building';
import { Location } from '../models/Location';
import { TechService } from './techService';
import {
  computeAllCapacities,
  type CapacityResult,
  type TechnologyKey,
  type BuildingType,
} from '@game/shared';

export class CapacityService {
  /**
   * Compute Construction/Production/Research capacities for a base
   * using shared calculators and current server models.
   */
  static async getBaseCapacities(
    empireId: string,
    locationCoord: string
  ): Promise<{
    construction: CapacityResult;
    production: CapacityResult;
    research: CapacityResult;
  }> {
    // 1) Load tech levels for this empire (Phase A: Map of TechnologyKey->level)
    const techStatus = await TechService.getStatus(empireId, locationCoord);
    const techLevels = (techStatus?.techLevels || {}) as Partial<Record<TechnologyKey, number>>;

    // 2) Load buildings at the base for this empire
    const buildings = await Building.find({
      empireId: new mongoose.Types.ObjectId(empireId),
      locationCoord,
    })
      .select('type level isActive catalogKey')
      .lean();

    const buildingsAtBase: Array<{ type: BuildingType; level: number; isActive: boolean; catalogKey?: string | null }> = (buildings || []).map(
      (b: any) => ({
        type: b.type as BuildingType,
        level: Number(b.level || 0),
        isActive: Boolean(b.isActive),
        catalogKey: (b as any).catalogKey ?? null,
      })
    );

    // 3) Derive environment context from Overhaul (if available)
    const location = await Location.findOne({ coord: locationCoord })
      .select('result positionBase')
      .lean();

    const locationDerived = location
      ? {
          yieldsMetal: (location as any).result?.yields?.metal,
          fertility: (location as any).result?.fertility,
          solarEnergy: (location as any).positionBase?.solarEnergy,
        }
      : undefined;

    // 4) Defaults per spec
    const defaults = {
      baseConstructionCredPerHour: 40,
      baseProductionCredPerHour: 0,
      baseResearchCredPerHour: 0,
    };

    // 5) Compute shared capacities
    const { construction, production, research } = computeAllCapacities({
      techLevels,
      buildingsAtBase,
      locationDerived,
      defaults,
    });

    return { construction, production, research };
  }
}
