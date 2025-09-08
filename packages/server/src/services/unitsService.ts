import mongoose from 'mongoose';
import { Empire, EmpireDocument } from '../models/Empire';
import { Location } from '../models/Location';
import { Building } from '../models/Building';
import { CapacityService } from './capacityService';
import { UnitQueue } from '../models/UnitQueue';
import { getUnitsList, UnitKey, TechnologyKey } from '@game/shared';
import { formatAlreadyInProgress } from './utils/idempotency';

function mapFromEmpireTechLevels(empire: EmpireDocument): Partial<Record<string, number>> {
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
  static async getStatus(empireId: string): Promise<UnitsStatusDTO> {
    const empire = await Empire.findById(empireId);
    if (!empire) {
      throw new Error('Empire not found');
    }

    const techLevels = mapFromEmpireTechLevels(empire);
    const list = getUnitsList();

    const eligibility: UnitsStatusDTO['eligibility'] = {} as any;

    for (const spec of list) {
      const techCheck = evaluateUnitTechPrereqs(techLevels, spec.techPrereqs || []);
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
   * Phase 3/4: Start unit production (capacity-driven ETA).
   * Validates ownership, tech prereqs, optional shipyard level, and credits.
   * Computes ETA from production capacity (cred/hour) at the specified base.
   * Deducts credits and enqueues a UnitQueue item to complete later.
   */
  static async start(empireId: string, locationCoord: string, unitKey: UnitKey) {
    const empire = await Empire.findById(empireId);
    if (!empire) {
      return formatError('NOT_FOUND', 'Empire not found');
    }

    // Validate location and ownership
    const location = await Location.findOne({ coord: locationCoord });
    if (!location) {
      return formatError('NOT_FOUND', 'Location not found');
    }
    if (location.owner?.toString() !== empire.userId.toString()) {
      return {
        ...formatError('NOT_OWNER', 'You do not own this location', {
          requiredOwner: empire.userId.toString(),
          currentOwner: location.owner?.toString()
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
      const shipyards = await Building.find({
        empireId: new mongoose.Types.ObjectId(empireId),
        locationCoord,
        catalogKey: 'shipyards',
        isActive: true,
      }).select('level');

      const maxShipyardLevel = (shipyards || []).reduce((max, b: any) => Math.max(max, Number(b.level || 0)), 0);
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
    const identityKey = `${empireId}:${locationCoord}:${unitKey}`;
    const existing = typeof (UnitQueue as any).findOne === 'function'
      ? await (UnitQueue as any).findOne({ identityKey, status: 'pending' })
      : null;
    if (existing) {
      console.log(`[UnitsService.start] idempotent identityKey=${identityKey} state=${existing.status} itemId=${existing._id}`);
      return formatAlreadyInProgress(
        'units',
        identityKey,
        unitKey,
        {
          _id: existing._id?.toString(),
          state: existing.status,
          startedAt: existing.startedAt,
          etaSeconds: Math.max(0, Math.ceil((existing.completesAt.getTime() - Date.now()) / 1000)),
          catalogKey: unitKey
        }
      );
    }

    // Enqueue first, then deduct credits after successful insert to avoid race-condition double-charge
    const now = new Date();
    const completesAt = new Date(now.getTime() + etaMinutes * 60 * 1000);

    const queueItem = new UnitQueue({
      empireId: new mongoose.Types.ObjectId(empireId),
      locationCoord,
      unitKey,
      identityKey,
      startedAt: now,
      completesAt,
      status: 'pending',
    });

    try {
      await queueItem.save();
    } catch (err: any) {
      // Handle duplicate key race (unique partial index on identityKey,status=pending)
      if (err?.code === 11000) {
        console.log(`[UnitsService.start] idempotent duplicate key for identityKey=${identityKey}`);
        return formatAlreadyInProgress('units', identityKey, unitKey);
      }
      throw err;
    }

    // Deduct credits only after queue creation succeeds
    empire.resources.credits -= creditsCost;
    await empire.save();

    return formatSuccess(
      {
        queueId: queueItem._id?.toString(),
        unitKey,
        completesAt,
        etaMinutes,
        productionCapacityCredPerHour: cap,
      },
      `${spec.name} construction started. ETA ${etaMinutes} minute(s).`
    );
  }
}
