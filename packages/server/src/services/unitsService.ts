import { supabase } from '../config/supabase';
import { CreditLedgerService } from './creditLedgerService';
import { CapacityService } from './bases/CapacityService';
import { getUnitsList, UnitKey, TechnologyKey } from '@game/shared';
import { ERROR_MESSAGES } from '../constants/response-formats';

// Constants imports for eliminating hardcoded values
import { ERROR_MESSAGES } from '../constants/response-formats';

import { DB_FIELDS } from '../../../constants/database-fields';
import { ENV_VARS } from '../../../shared/src/constants/env-vars';

function mapFromEmpireTechLevels(empire: any): Partial<Record<string, number>> {
  const mapVal = (empire as any).techLevels as Map<string, number> | undefined;
  if (!mapVal) return {};
  const obj: Record<string, number> = {};
  for (const [k, v] of mapVal.entries()) {
    obj[k] = typeof v === 'number' ? v : Number(v || 0);
  }
  return obj;
}

function evaluateUnitTechPrereqs(
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

export interface UnitsStatusDTO {
  techLevels: Partial<Record<string, number>>;
  eligibility: Record<
    UnitKey,
    {
      canStart: boolean;
      reasons: string[];
    }
  >;
}

/**
 * DTO formatters for canonical response schema per .clinerules/dto-error-schema-and-logging.md
 */
function formatSuccess(data: any, message: string) {
  return {
    success: true as const,
    data,
    message
  };
}

function formatError(code: string, message: string, details?: any) {
  return {
    success: false as const,
    code,
    message,
    details,
    error: message
  };
}

/**
 * Phase A "Units" service.
 * - Tech-only gating (credits/energy/shipyard not enforced yet).
 * - Start action is NOT implemented (no persistence/model yet). Validates prereqs and returns a friendly error.
 */
export class UnitsService {
  static async getStatus(empireId: string, locationCoord?: string): Promise<UnitsStatusDTO> {
    const { data: empire, error } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('*')
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .maybeSingle();

    if (error) {
      console.error('[UnitsService.getStatus] Error fetching empire:', error);
      throw new Error(ERROR_MESSAGES.EMPIRE_NOT_FOUND);
    }

    if (!empire) {
      throw new Error(ERROR_MESSAGES.EMPIRE_NOT_FOUND);
    }

    const techLevels = mapFromEmpireTechLevels(empire);
    const list = getUnitsList();

    // Get shipyard levels for the location if specified
    let shipyardLevels: Record<string, number> = {};
    if (locationCoord) {
      const { data: shipyards, error: shipyardError } = await supabase
        .from(DB_TABLES.BUILDINGS)
        .select(DB_FIELDS.BUILDINGS.LEVEL)
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
        .eq(DB_FIELDS.BUILDINGS.CATALOG_KEY, 'shipyards')
        .eq(DB_FIELDS.BUILDINGS.IS_ACTIVE, true);

      if (shipyardError) {
        console.error('[UnitsService.getStatus] Error fetching shipyards:', shipyardError);
      }

      const maxShipyardLevel = (shipyards || []).reduce((max: number, b: any) => Math.max(max, Number(b.level || 0)), 0);
      shipyardLevels['shipyards'] = maxShipyardLevel;

      // Also check for orbital shipyards if needed
      const { data: orbitalShipyards, error: orbitalError } = await supabase
        .from(DB_TABLES.BUILDINGS)
        .select(DB_FIELDS.BUILDINGS.LEVEL)
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
        .eq(DB_FIELDS.BUILDINGS.CATALOG_KEY, 'orbital_shipyards')
        .eq(DB_FIELDS.BUILDINGS.IS_ACTIVE, true);

      if (orbitalError) {
        console.error('[UnitsService.getStatus] Error fetching orbital shipyards:', orbitalError);
      }

      const maxOrbitalShipyardLevel = (orbitalShipyards || []).reduce((max: number, b: any) => Math.max(max, Number(b.level || 0)), 0);
      shipyardLevels['orbital_shipyards'] = maxOrbitalShipyardLevel;
    }

    const eligibility: UnitsStatusDTO['eligibility'] = {} as any;

    for (const spec of list) {
      const techCheck = evaluateUnitTechPrereqs(techLevels, spec.techPrereqs || []);
      const reasons: string[] = [];
      let canStart = true;

      // Check tech requirements
      if (!techCheck.ok) {
        canStart = false;
        for (const u of techCheck.unmet) {
          reasons.push(`Requires ${u.key} ${u.requiredLevel} (current ${u.currentLevel}).`);
        }
      }

      // Check shipyard requirements if location is specified
      if (locationCoord) {
        if (typeof spec.requiredShipyardLevel === 'number' && spec.requiredShipyardLevel > 0) {
          const currentShipyardLevel = shipyardLevels['shipyards'] || 0;
          if (currentShipyardLevel < spec.requiredShipyardLevel) {
            canStart = false;
            reasons.push(`Requires Shipyard level ${spec.requiredShipyardLevel} (current ${currentShipyardLevel}).`);
          }
        }

        if (typeof spec.requiredOrbitalShipyardLevel === 'number' && spec.requiredOrbitalShipyardLevel > 0) {
          const currentOrbitalLevel = shipyardLevels['orbital_shipyards'] || 0;
          if (currentOrbitalLevel < spec.requiredOrbitalShipyardLevel) {
            canStart = false;
            reasons.push(`Requires Orbital Shipyard level ${spec.requiredOrbitalShipyardLevel} (current ${currentOrbitalLevel}).`);
          }
        }
      }

      eligibility[spec.key] = {
        canStart,
        reasons,
      };
    }

    return { techLevels, eligibility };
  }

  /**
   * Phase 3/4: Start unit production (capacity-driven ETA).
   * Validates ownership, tech prereqs, optional shipyard level, and credits.
   * Computes ETA from production capacity (cred/hour) at the specified base.
   * Deducts credits and enqueues a UnitQueue item to complete later.
   */
  static async start(empireId: string, locationCoord: string, unitKey: UnitKey) {
    const { data: empire, error: empireError } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('*')
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .maybeSingle();

    if (empireError) {
      console.error('[UnitsService.start] Error fetching empire:', empireError);
      return formatError(ERROR_MESSAGES.NOT_FOUND, ERROR_MESSAGES.EMPIRE_NOT_FOUND);
    }

    if (!empire) {
      return formatError(ERROR_MESSAGES.NOT_FOUND, ERROR_MESSAGES.EMPIRE_NOT_FOUND);
    }

    // Validate location and ownership
    const { data: location, error: locationError } = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select('*')
      .eq('coord', locationCoord)
      .maybeSingle();

    if (locationError) {
      console.error('[UnitsService.start] Error fetching location:', locationError);
      return formatError(ERROR_MESSAGES.NOT_FOUND, ERROR_MESSAGES.LOCATION_NOT_FOUND);
    }

    if (!location) {
      return formatError(ERROR_MESSAGES.NOT_FOUND, ERROR_MESSAGES.LOCATION_NOT_FOUND);
    }

    if (location.owner !== empire.user_id) {
      return {
        ...formatError('NOT_OWNER', 'You do not own this location', {
          requiredOwner: empire.user_id,
          currentOwner: location.owner
        }),
        reasons: ['not_owner']
      };
    }

    // Validate against catalog + tech prereqs
    const spec = getUnitsList().find((u) => u.key === unitKey);
    if (!spec) {
      return {
        ...formatError('INVALID_REQUEST', 'Unknown unit key', { field: 'unitKey', value: unitKey }),
        reasons: ['unknown_unit']
      };
    }

    const techLevels = mapFromEmpireTechLevels(empire);
    const techCheck = evaluateUnitTechPrereqs(techLevels, spec.techPrereqs || []);
    if (!techCheck.ok) {
      const reasonsText = techCheck.unmet.map(
        (u) => `Requires ${u.key} ${u.requiredLevel} (current ${u.currentLevel}).`
      );
      return {
        ...formatError('TECH_REQUIREMENTS', 'Technology requirements not met', { unmet: techCheck.unmet }),
        reasons: reasonsText
      };
    }

    // Optional shipyard level validation if spec defines it
    if (typeof spec.requiredShipyardLevel === 'number' && spec.requiredShipyardLevel > 0) {
      const { data: shipyards, error: shipyardError } = await supabase
        .from(DB_TABLES.BUILDINGS)
        .select(DB_FIELDS.BUILDINGS.LEVEL)
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
        .eq(DB_FIELDS.BUILDINGS.CATALOG_KEY, 'shipyards')
        .eq(DB_FIELDS.BUILDINGS.IS_ACTIVE, true);

      if (shipyardError) {
        console.error('[UnitsService.start] Error fetching shipyards:', shipyardError);
        return formatError('TECH_REQUIREMENTS', 'Error checking shipyard requirements');
      }

      const maxShipyardLevel = (shipyards || []).reduce((max: number, b: any) => Math.max(max, Number(b.level || 0)), 0);
      if (maxShipyardLevel < spec.requiredShipyardLevel) {
        const msg = `Requires Shipyard level ${spec.requiredShipyardLevel} at this base (current ${maxShipyardLevel}).`;
        return {
          ...formatError('TECH_REQUIREMENTS', msg, { requiredShipyardLevel: spec.requiredShipyardLevel, currentLevel: maxShipyardLevel }),
          reasons: [msg]
        };
      }
    }

    // Credits validation (credits-only model)
    const creditsCost = Math.max(0, Number(spec.creditsCost || 0));
    if (empire.resources.credits < creditsCost) {
      const msg = `Insufficient credits. Requires ${creditsCost}.`;
      return {
        ...formatError('INSUFFICIENT_RESOURCES', msg, {
          requiredCredits: creditsCost,
          availableCredits: empire.resources.credits,
          shortfall: creditsCost - empire.resources.credits
        }),
        reasons: ['insufficient_credits']
      };
    }

    // Capacity-driven ETA (creditsCost / production.value in hours)
    const { production } = await CapacityService.getBaseCapacities(empireId, locationCoord);
    const cap = Math.max(0, Number(production?.value || 0));
    if (cap <= 0) {
      const msg = 'Cannot start: production capacity is zero at this base.';
      return {
        ...formatError('NO_CAPACITY', msg, { capacityType: 'production', value: cap }),
        reasons: ['no_production_capacity']
      };
    }

    const hours = creditsCost / cap;
    const etaMinutes = Math.max(1, Math.ceil(hours * 60));

    // Queue idempotency guard: check for existing pending item
    // Allow multiple simultaneous unit productions of the same type by using a unique identityKey per item.
    // This intentionally relaxes the prior idempotency guard that prevented more than one pending item
    // for the same empire/base/unitKey.
    const now = new Date();
    const nonce = `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
    const identityKey = `${empireId}:${locationCoord}:${unitKey}:${nonce}`;

    // Create the unit queue item in Supabase
    const completesAt = new Date(now.getTime() + etaMinutes * 60 * 1000);

    const { data: queueItem, error: queueError } = await supabase
      .from(DB_TABLES.UNIT_QUEUES)
      .insert({
        empire_id: empireId,
        location_coord: locationCoord,
        unit_key: unitKey,
        identity_key: identityKey,
        started_at: now.toISOString(),
        completes_at: completesAt.toISOString(),
        status: 'pending',
      })
      .select(DB_FIELDS.BUILDINGS.ID)
      .single();

    if (queueError) {
      // Handle unique constraint violations (identity_key + status)
      if (queueError.code === '23505') { // PostgreSQL unique_violation
        if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
          console.log(`[UnitsService.start] idempotent duplicate key for identityKey=${identityKey}`);
        }
        return formatAlreadyInProgress('units', identityKey, unitKey);
      }
      console.error('[UnitsService.start] Error creating queue item:', queueError);
      return formatError('QUEUE_ERROR', 'Failed to create unit queue item');
    }

    // Deduct credits only after queue creation succeeds
    const { error: creditError } = await supabase
      .from(DB_TABLES.EMPIRES)
      .update({
        credits: empire.credits - creditsCost
      })
      .eq(DB_FIELDS.BUILDINGS.ID, empireId);

    if (creditError) {
      console.error('[UnitsService.start] Error deducting credits:', creditError);
      // TODO: Implement compensation logic to remove the queue item if credit deduction fails
      return formatError('CREDIT_ERROR', 'Failed to deduct credits');
    }

    // Log unit production charge
    CreditLedgerService.logTransaction({
      empireId,
      amount: -creditsCost,
      type: 'unit_production',
      note: `Start unit ${unitKey} at ${locationCoord}`,
      meta: { locationCoord, unitKey, queueId: queueItem.id },
    }).catch(() => {});

    return formatSuccess(
      {
        queueId: queueItem.id,
        unitKey,
        completesAt,
        etaMinutes,
        productionCapacityCredPerHour: cap,
      },
      `${spec.name} construction started. ETA ${etaMinutes} minute(s).`
    );
  }
}



