import { supabase } from '../../config/supabase';
import { CapacityService } from '../bases/CapacityService';
import { ERROR_MESSAGES } from '../../constants/response-formats';
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';
import {
  getDefensesList,
  DefenseKey,
  TechnologyKey,
  computeEnergyBalance,
  getBuildingSpec,
} from '@game/shared';

/**
 * DTO formatters
 */
function formatSuccess(data: any, message: string) {
  return {
    success: true as const,
    data,
    message,
  };
}

function formatError(code: string, message: string, details?: any) {
  return {
    success: false as const,
    code,
    message,
    details,
    error: message,
  };
}

/**
 * Map tech levels from Supabase empire
 */
function mapTechLevels(techLevelsData: any): Partial<Record<string, number>> {
  if (!techLevelsData) return {};

  const out: Record<string, number> = {};

  if (typeof techLevelsData === 'object' && !Array.isArray(techLevelsData)) {
    for (const [key, value] of Object.entries(techLevelsData)) {
      out[key] = typeof value === 'number' ? value : Number(value || 0);
    }
  }

  return out;
}

/**
 * Evaluate defense tech prerequisites
 */
function evaluateDefenseTechPrereqs(
  techLevels: Partial<Record<string, number>>,
  prereqs: Array<{ key: TechnologyKey; level: number }>
): { ok: boolean; unmet: Array<{ key: TechnologyKey; requiredLevel: number; currentLevel: number }> } {
  const unmet: Array<{ key: TechnologyKey; requiredLevel: number; currentLevel: number }> = [];
  for (const req of prereqs) {
    const current = Math.max(0, (techLevels as any)[req.key] ?? 0);
    if (current < req.level) {
      unmet.push({ key: req.key, requiredLevel: req.level, currentLevel: current });
    }
  }
  return { ok: unmet.length === 0, unmet };
}

export interface DefensesStatusDTO {
  techLevels: Partial<Record<string, number>>;
  eligibility: Record<
    DefenseKey,
    {
      canStart: boolean;
      reasons: string[];
    }
  >;
}

/**
 * Supabase-based Defenses Service
 */
export class DefensesService {
  /**
   * Get defenses status for an empire
   */
  static async getStatus(empireId: string): Promise<DefensesStatusDTO> {
    const { data: empire, error } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('tech_levels')
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .maybeSingle();

    if (error || !empire) {
      throw new Error(ERROR_MESSAGES.EMPIRE_NOT_FOUND);
    }

    const techLevels = mapTechLevels(empire.tech_levels);
    const list = getDefensesList();

    const eligibility: DefensesStatusDTO['eligibility'] = {} as any;

    for (const spec of list) {
      const techCheck = evaluateDefenseTechPrereqs(techLevels, spec.techPrereqs);
      const reasons: string[] = [];

      if (!techCheck.ok) {
        for (const u of techCheck.unmet) {
          reasons.push(`Requires ${u.key} ${u.requiredLevel} (current ${u.currentLevel}).`);
        }
      }

      eligibility[spec.key] = {
        canStart: techCheck.ok,
        reasons,
      };
    }

    return { techLevels, eligibility };
  }

  /**
   * Start defense construction
   */
  static async start(empireId: string, locationCoord: string, defenseKey: DefenseKey) {
    // Load empire
    const { data: empire, error: empireError } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('id, user_id, tech_levels, credits')
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .maybeSingle();

    if (empireError || !empire) {
      return formatError(ERROR_MESSAGES.NOT_FOUND, ERROR_MESSAGES.EMPIRE_NOT_FOUND);
    }

    // Validate owned location
    const { data: location, error: locationError } = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select('coord, owner, result')
      .eq('coord', locationCoord)
      .maybeSingle();

    if (locationError || !location) {
      return formatError(ERROR_MESSAGES.NOT_FOUND, ERROR_MESSAGES.LOCATION_NOT_FOUND);
    }

    if (location.owner !== empire.user_id) {
      return formatError('NOT_OWNER', 'You do not own this location', { locationCoord });
    }

    // Validate defense spec and tech prereqs
    const spec = getDefensesList().find((d) => d.key === defenseKey);
    if (!spec) {
      return formatError('INVALID_REQUEST', 'Unknown defense key', { field: 'defenseKey', value: defenseKey });
    }

    const techLevels = mapTechLevels(empire.tech_levels);
    const techCheck = evaluateDefenseTechPrereqs(techLevels, spec.techPrereqs);
    if (!techCheck.ok) {
      const reasons = techCheck.unmet.map((u) => `Requires ${u.key} ${u.requiredLevel} (current ${u.currentLevel}).`);
      return {
        ...formatError('TECH_REQUIREMENTS', 'Technology requirements not met', { unmet: techCheck.unmet }),
        reasons,
      } as any;
    }

    // Check if item already in progress
    const now = Date.now();
    const { data: inProgress, error: progressError } = await supabase
      .from(DB_TABLES.DEFENSE_QUEUE)
      .select('*')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
      .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending')
      .gt(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, new Date(now).toISOString())
      .maybeSingle();

    if (progressError) {
      console.error('Error checking defense queue:', progressError);
    }

    if (!inProgress) {
      // No item in progress - start immediately
      // Compute citizen capacity
      const caps = await CapacityService.getBaseCapacities(empireId, locationCoord);
      const perHour = Math.max(0, Number(caps?.citizen?.value || 0));
      if (!(perHour > 0)) {
        return formatError('NO_CAPACITY', 'This base has no citizen capacity to build defenses.');
      }

      // Energy validation
      const solarEnergy = Math.max(0, Number((location.result as any)?.solarEnergy ?? 0));
      const gasResource = Math.max(0, Number((location.result as any)?.yields?.gas ?? 0));

      // Gather active buildings
      const { data: buildings, error: buildingsError } = await supabase
        .from(DB_TABLES.BUILDINGS)
        .select('catalog_key, level, is_active, pending_upgrade')
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord);

      if (buildingsError) {
        console.error('Error fetching buildings:', buildingsError);
      }

      const activeBuildings: Array<{ key: string; level: number; isActive: boolean }> = [];
      for (const b of buildings || []) {
        const key = String(b.catalog_key || '');
        const level = Math.max(0, Number(b.level || 0));
        if (!key || !(level > 0)) continue;
        if (b.is_active === true || b.pending_upgrade === true) {
          activeBuildings.push({ key, level, isActive: true });
        }
      }

      // Include completed defenses in energy baseline
      const { data: completedDefs, error: defsError } = await supabase
        .from(DB_TABLES.DEFENSE_QUEUE)
        .select(DB_FIELDS.DEFENSE_QUEUE.DEFENSE_KEY)
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
        .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'completed');

      if (defsError) {
        console.error('Error fetching completed defenses:', defsError);
      }

      let produced = 0,
        consumed = 0,
        balance = 0,
        reservedNegative = 0;
      {
        const base = computeEnergyBalance({
          buildingsAtBase: activeBuildings,
          location: { solarEnergy, gasYield: gasResource },
          includeQueuedReservations: false,
        });
        produced = base.produced;
        consumed = base.consumed;
        balance = base.balance;

        // Add defense contributions
        for (const it of completedDefs || []) {
          const k = String(it.defense_key || '');
          const dSpec = getDefensesList().find((d) => String(d.key) === k);
          const d = Number(dSpec?.energyDelta || 0);
          if (d >= 0) produced += d;
          else consumed += Math.abs(d);
        }
        balance = produced - consumed;
      }

      // Projected energy after adding this defense
      const delta = Number(spec.energyDelta || 0);
      const projectedEnergy = balance + reservedNegative + delta;
      if (delta < 0 && projectedEnergy < 0) {
        return formatError('INSUFFICIENT_ENERGY', 'Insufficient energy capacity to start this defense.', {
          balance,
          delta,
          projectedEnergy,
        });
      }

      // Deduct credits now
      const cost = Math.max(0, Number(spec.creditsCost || 0));
      const available = Number(empire.credits || 0);
      if (available < cost) {
        return formatError('INSUFFICIENT_RESOURCES', `Insufficient credits. Requires ${cost}, you have ${available}.`, {
          required: cost,
          available,
        });
      }

      // Update empire credits
      const { error: updateError } = await supabase
        .from(DB_TABLES.EMPIRES)
        .update({ credits: available - cost })
        .eq(DB_FIELDS.BUILDINGS.ID, empireId);

      if (updateError) {
        console.error('Error updating empire credits:', updateError);
        return formatError('UPDATE_ERROR', 'Failed to deduct credits');
      }

      // Calculate completion time
      const seconds = Math.max(60, Math.ceil((cost / perHour) * 3600));
      const startedAt = new Date(now);
      const completesAt = new Date(now + seconds * 1000);

      // Insert defense queue item
      const { data: queueItem, error: insertError } = await supabase
        .from(DB_TABLES.DEFENSE_QUEUE)
        .insert({
          empire_id: empireId,
          location_coord: locationCoord,
          defense_key: defenseKey,
          status: 'pending',
          started_at: startedAt.toISOString(),
          completes_at: completesAt.toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting defense queue:', insertError);
        return formatError('INSERT_ERROR', 'Failed to create defense queue item');
      }

      return formatSuccess(
        {
          queueItem: {
            id: queueItem.id,
            defenseKey,
            startedAt: queueItem.started_at,
            completesAt: queueItem.completes_at,
          },
        },
        `${spec.name} construction started.`
      );
    } else {
      // Item already in progress - enqueue waiting item
      // Charge credits immediately
      const cost = Math.max(0, Number(spec.creditsCost || 0));
      const available = Number(empire.credits || 0);
      if (available < cost) {
        return formatError('INSUFFICIENT_RESOURCES', `Insufficient credits. Requires ${cost}, you have ${available}.`, {
          required: cost,
          available,
        });
      }

      // Update empire credits
      const { error: updateError } = await supabase
        .from(DB_TABLES.EMPIRES)
        .update({ credits: available - cost })
        .eq(DB_FIELDS.BUILDINGS.ID, empireId);

      if (updateError) {
        console.error('Error updating empire credits:', updateError);
        return formatError('UPDATE_ERROR', 'Failed to deduct credits');
      }

      // Insert waiting queue item (no completion time yet)
      const { data: queueItem, error: insertError } = await supabase
        .from(DB_TABLES.DEFENSE_QUEUE)
        .insert({
          empire_id: empireId,
          location_coord: locationCoord,
          defense_key: defenseKey,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting defense queue:', insertError);
        return formatError('INSERT_ERROR', 'Failed to create defense queue item');
      }

      return formatSuccess(
        {
          queueItem: { id: queueItem.id, defenseKey },
        },
        `${spec.name} queued.`
      );
    }
  }
}



