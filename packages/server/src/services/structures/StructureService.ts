import { supabase } from '../../config/supabase';
import { ERROR_MESSAGES } from '../../constants/response-formats';
import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
import { 
  getBuildingSpec, 
  BuildingKey, 
  computeEnergyBalance, 
  getStructureCreditCostForLevel 
} from '@game/shared';
import { StatsService } from '../bases/StatsService';
import { CapacityService } from '../bases/CapacityService';

export interface Structure {
  catalogKey: string;
  level: number;
  isActive: boolean;
  pendingUpgrade: boolean;
  constructionStarted: Date | null;
  constructionCompleted: Date | null;
  creditsCost: number | null;
}

export interface BaseStats {
  area: {
    total: number;
    used: number;
    free: number;
  };
  population: {
    capacity: number;
    used: number;
    free: number;
  };
}

export class StructureService {
  /**
   * Get structures catalog
   */
  static async getCatalog(): Promise<{ data: any; error: string | null }> {
    try {
      const { getStructuresCatalog } = await import('../../services/structures/structures.data');
      const catalog = getStructuresCatalog();
      return { data: catalog, error: null };
    } catch (e: any) {
      return { data: null, error: e?.message || 'Failed to load structures catalog' };
    }
  }

  /**
   * Get the current queue of structures being built or upgraded
   */
  static async getQueue(empireId: string, locationCoord?: string) {
    let query = supabase
      .from(DB_TABLES.BUILDINGS)
      .select('catalog_key, level, is_active, pending_upgrade, construction_started, construction_completed')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.IS_ACTIVE, false)
      .gt(DB_FIELDS.BUILDINGS.CONSTRUCTION_COMPLETED, new Date().toISOString());

    if (locationCoord) {
      query = query.eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error('Failed to fetch structure queue');
    }

    return data.map(b => ({
      catalogKey: b.catalog_key,
      level: b.level,
      isActive: b.is_active,
      pendingUpgrade: b.pending_upgrade,
      constructionStarted: b.construction_started ? new Date(b.construction_started) : null,
      constructionCompleted: b.construction_completed ? new Date(b.construction_completed) : null
    }));
  }

  /**
   * Cancel structure construction at a base
   */
  static async cancel(empireId: string, locationCoord: string) {
    // Verify base has an active construction
    const now = new Date();
    const { data: active } = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select('id, catalog_key, level, credits_cost, construction_completed, pending_upgrade')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
      .eq(DB_FIELDS.BUILDINGS.IS_ACTIVE, false)
      .gt(DB_FIELDS.BUILDINGS.CONSTRUCTION_COMPLETED, now.toISOString());

    if (!active?.length) {
      return {
        success: false,
        code: 'NO_ACTIVE_CONSTRUCTION',
        error: 'No active construction to cancel'
      };
    }

    // Get item to cancel (earliest completion)
    const item = active.reduce((earliest, current) => {
      const eCompletes = earliest.construction_completed ? new Date(earliest.construction_completed).getTime() : Infinity;
      const cCompletes = current.construction_completed ? new Date(current.construction_completed).getTime() : Infinity;
      return cCompletes < eCompletes ? current : earliest;
    });

    // Refund credits
    let refundedCredits = 0;
    if (item.credits_cost) {
      refundedCredits = item.credits_cost;
      await supabase
        .from(DB_TABLES.EMPIRES)
        .select(DB_FIELDS.EMPIRES.CREDITS)
        .eq(DB_FIELDS.BUILDINGS.ID, empireId)
        .single()
        .then(({ data }) => {
          if (data) {
            const currentCredits = Number(data.credits || 0);
            return supabase
              .from(DB_TABLES.EMPIRES)
              .update({ credits: currentCredits + refundedCredits })
              .eq(DB_FIELDS.BUILDINGS.ID, empireId);
          }
        });
    }

    // If upgrading, reactivate the building
    if (item.pending_upgrade) {
      await supabase
        .from(DB_TABLES.BUILDINGS)
        .update({
          is_active: true,
          pending_upgrade: false,
          construction_started: null,
          construction_completed: null,
          credits_cost: null
        })
        .eq(DB_FIELDS.BUILDINGS.ID, item.id);
    } else {
      // Otherwise delete the in-progress building
      await supabase
        .from(DB_TABLES.BUILDINGS)
        .delete()
        .eq(DB_FIELDS.BUILDINGS.ID, item.id);
    }

    return {
      success: true,
      data: { cancelledId: item.id, refundedCredits },
      message: 'Construction cancelled'
    };
  }

  /**
   * Start construction of a new structure or upgrade
   */
  static async startConstruction(
    userId: string,
    empireId: string,
    locationCoord: string,
    catalogKey: BuildingKey,
  ) {
    // Ownership check: location owner must be user
    const { data: location } = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select('owner_id, result')
      .eq('coord', locationCoord)
      .maybeSingle();

    if (!location) {
      return { success: false, error: ERROR_MESSAGES.LOCATION_NOT_FOUND };
    }
    if (String(location.owner_id || '') !== String(userId)) {
      return { success: false, error: 'You do not own this location' };
    }

    // Reject if construction already in progress
    const now = Date.now();
    const { data: inProgress } = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select(DB_FIELDS.BUILDINGS.ID)
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
      .eq(DB_FIELDS.BUILDINGS.IS_ACTIVE, false)
      .gt(DB_FIELDS.BUILDINGS.CONSTRUCTION_COMPLETED, new Date(now).toISOString());

    if ((inProgress || []).length > 0) {
      return {
        success: false,
        code: 'ALREADY_IN_PROGRESS',
        error: 'Construction already underway at this base'
      };
    }

    // Prevent duplicate key queued
    const { data: duplicates } = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select(DB_FIELDS.BUILDINGS.ID)
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
      .eq(DB_FIELDS.BUILDINGS.CATALOG_KEY, catalogKey)
      .eq(DB_FIELDS.BUILDINGS.IS_ACTIVE, false)
      .limit(1);

    if ((duplicates || []).length > 0) {
      return {
        success: false,
        code: 'ALREADY_IN_PROGRESS',
        error: 'Construction for this structure is already queued or upgrading at this base'
      };
    }

    // Get capacity
    const caps = await CapacityService.getBaseCapacities(empireId, locationCoord);
    const constructionPerHour = Math.max(0, Number((caps as any)?.construction?.value || 0));
    if (!(constructionPerHour > 0)) {
      return {
        success: false,
        code: 'NO_CAPACITY',
        error: 'This base has no construction capacity'
      };
    }

    // Determine current level
    const { data: existingActive } = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select('id, level')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
      .eq(DB_FIELDS.BUILDINGS.CATALOG_KEY, catalogKey)
      .eq(DB_FIELDS.BUILDINGS.IS_ACTIVE, true)
      .maybeSingle();

    const currentLevel = existingActive ? Math.max(1, Number(existingActive.level || 1)) : 0;
    const nextLevel = currentLevel + 1;

    // Calculate cost
    let cost: number | null = null;
    try {
      cost = getStructureCreditCostForLevel(catalogKey, nextLevel);
    } catch {
      const spec = getBuildingSpec(catalogKey);
      cost = currentLevel === 0 ? spec.creditsCost : null;
    }
    if (typeof cost !== 'number') {
      return {
        success: false,
        code: 'NO_COST_DEFINED',
        error: 'No cost defined for this level'
      };
    }

    // Validate credits
    const { data: empire } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select(DB_FIELDS.EMPIRES.CREDITS)
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .maybeSingle();

    const availableCredits = Math.max(0, Number(empire?.credits || 0));
    if (availableCredits < cost) {
      return {
        success: false,
        code: 'INSUFFICIENT_RESOURCES',
        error: `Insufficient credits. Requires ${cost}, you have ${availableCredits}.`,
        details: {
          requiredCredits: cost,
          availableCredits,
          shortfall: cost - availableCredits
        }
      };
    }

    // Energy validation
    const spec = getBuildingSpec(catalogKey);
    const energyDelta = Number(spec?.energyDelta || 0);
    if (energyDelta < 0) {
      // Get current active buildings
      const { data: activeBuildings } = await supabase
        .from(DB_TABLES.BUILDINGS)
        .select('catalog_key, level, is_active, pending_upgrade, construction_completed')
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord);

      const activeStructures = [];
      for (const b of activeBuildings || []) {
        const isActive = b.is_active === true;
        const pending = b.pending_upgrade === true;
        const completes = b.construction_completed ? new Date(b.construction_completed).getTime() : 0;
        const effective = isActive || pending || (completes && completes <= now);
        const level = Math.max(0, Number(b.level || 0));
        const key = String(b.catalog_key || '');
        if (effective && key && level > 0) {
          activeStructures.push({ key, level, isActive: true });
        }
      }

      const solar = Math.max(0, Number(location.result?.solarEnergy ?? 0));
      const gas = Math.max(0, Number(location.result?.yields?.gas ?? 0));
      const { produced, consumed, balance } = computeEnergyBalance({
        buildingsAtBase: activeStructures,
        location: { solarEnergy: solar, gasYield: gas },
        includeQueuedReservations: false
      });

      const projected = balance + energyDelta;
      if (projected < 0) {
        return {
          success: false,
          code: 'INSUFFICIENT_ENERGY',
          error: 'Insufficient energy capacity to start this construction.',
          details: { produced, consumed, balance, energyDelta, projectedEnergy: projected }
        };
      }
    }

    // Area and population validation
    const stats = await StatsService.getBaseStats(empireId, locationCoord);
    const areaRequired = Math.max(0, Number(spec?.areaRequired ?? 1));
    if (areaRequired > 0 && stats.area.free < areaRequired) {
      return {
        success: false,
        code: 'INSUFFICIENT_AREA',
        error: 'Insufficient area capacity to start this construction.',
        details: {
          required: areaRequired,
          available: stats.area.free,
          used: stats.area.used,
          total: stats.area.total
        }
      };
    }

    const populationRequired = Math.max(0, Number(spec?.populationRequired || 0));
    if (populationRequired > 0 && stats.population.free < populationRequired) {
      return {
        success: false,
        code: 'INSUFFICIENT_POPULATION',
        error: 'Insufficient population capacity to start this construction.',
        details: {
          required: populationRequired,
          available: stats.population.free,
          used: stats.population.used,
          capacity: stats.population.capacity
        }
      };
    }

    // Calculate completion time
    const hours = cost / constructionPerHour;
    const startedAt = new Date(now).toISOString();
    const completesAt = new Date(now + Math.max(1, Math.ceil(hours * 3600)) * 1000).toISOString();

    try {
      // Start transaction
      if (!existingActive) {
        // Insert new structure
        await supabase
          .from(DB_TABLES.BUILDINGS)
          .insert({
            empire_id: empireId,
            location_coord: locationCoord,
            catalog_key: catalogKey,
            type: catalogKey,
            display_name: spec.name,
            level: 1,
            is_active: false,
            pending_upgrade: false,
            credits_cost: cost,
            construction_started: startedAt,
            construction_completed: completesAt,
          });
      } else {
        // Upgrade existing
        await supabase
          .from(DB_TABLES.BUILDINGS)
          .update({
            is_active: false,
            pending_upgrade: true,
            credits_cost: cost,
            construction_started: startedAt,
            construction_completed: completesAt,
          })
          .eq(DB_FIELDS.BUILDINGS.ID, existingActive.id);
      }

      // Deduct credits
      await supabase
        .from(DB_TABLES.EMPIRES)
        .update({ credits: availableCredits - cost })
        .eq(DB_FIELDS.BUILDINGS.ID, empireId);

      return {
        success: true,
        data: {
          coord: locationCoord,
          key: catalogKey,
          completesAt
        },
        message: 'Construction started'
      };

    } catch (error) {
      console.error('[StructureService] Failed to start construction:', error);
      return {
        success: false,
        code: 'DB_ERROR',
        error: 'Failed to start construction'
      };
    }
  }

  /**
   * Get structure details for a base
   */
  static async getStructureDetails(empireId: string, locationCoord: string) {
    const caps = await CapacityService.getBaseCapacities(empireId, locationCoord);
    const constructionPerHour = Math.max(0, Number((caps as any)?.construction?.value || 0));

    // Get all buildings at base
    const { data: buildings } = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select('catalog_key, level, is_active, pending_upgrade, construction_started, construction_completed, credits_cost')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord);

    if (!buildings) {
      return {
        constructionPerHour: 0,
        activeConstruction: null,
        levelByKey: {}
      };
    }

    // Process current levels
    const nowTs = Date.now();
    const levelByKey = new Map<string, number>();
    
    for (const b of buildings) {
      const key = String(b.catalog_key || '');
      if (!key) continue;

      const level = Math.max(0, Number(b.level || 0));
      const isActive = b.is_active === true;
      const pendingUpgrade = b.pending_upgrade === true;
      const completes = b.construction_completed ? new Date(b.construction_completed).getTime() : 0;
      const effectiveActive = isActive || pendingUpgrade || (completes && completes <= nowTs);
      
      if (effectiveActive) {
        levelByKey.set(key, (levelByKey.get(key) || 0) + level);
      }
    }

    // Find active construction
    let activeConstruction = null;
    let earliest = Number.POSITIVE_INFINITY;

    for (const b of buildings) {
      const completes = b.construction_completed ? new Date(b.construction_completed).getTime() : 0;
      const starts = b.construction_started ? new Date(b.construction_started).getTime() : 0;
      if (!b.catalog_key || !completes || !starts || completes <= nowTs) continue;
      
      const isActive = b.is_active === true;
      const pendingUpgrade = b.pending_upgrade === true;
      if (isActive || pendingUpgrade) continue;

      if (completes < earliest) {
        earliest = completes;
        activeConstruction = {
          key: b.catalog_key as BuildingKey,
          completionAt: new Date(completes).toISOString(),
          startedAt: new Date(starts).toISOString(),
          currentLevel: Math.max(0, Number(b.level || 0)),
          targetLevel: Math.max(1, Number(b.level || 0)),
          creditsCost: Number(b.credits_cost || 0),
          pendingUpgrade: false
        };
      }
    }

    return {
      constructionPerHour,
      activeConstruction,
      levelByKey: Object.fromEntries(levelByKey)
    };
  }
}


