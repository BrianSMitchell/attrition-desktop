import mongoose from 'mongoose';
import { Empire, EmpireDocument } from '../models/Empire';
import { Location } from '../models/Location';
import { Building } from '../models/Building';
import { BuildingService } from './buildingService';
import {
  getDefensesList,
  DefenseKey,
  TechnologyKey,
  computeEnergyBalance,
} from '@game/shared';

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

function mapFromEmpireTechLevels(empire: EmpireDocument): Partial<Record<string, number>> {
  const raw = (empire as any).techLevels as any;
  const out: Record<string, number> = {};

  // Support Mongoose Map-like (has forEach), native Map, and plain objects
  if (raw && typeof raw.forEach === 'function') {
    raw.forEach((v: any, k: string) => {
      out[k] = typeof v === 'number' ? v : Number(v || 0);
    });
    return out;
  }

  if (raw instanceof Map) {
    for (const [k, v] of raw.entries()) {
      out[k] = typeof v === 'number' ? v : Number(v || 0);
    }
    return out;
  }

  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(raw)) {
      const v = (raw as any)[k];
      out[k] = typeof v === 'number' ? v : Number(v || 0);
    }
    return out;
  }

  return {};
}

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
 * Phase A "Defenses" service.
 * - Tech-only gating (credits/energy not enforced yet).
 * - Start action directly enqueues a generic 'defense_station' build item using BuildingService
 *   (does not run StructuresService tech/energy gating meant for structures).
 */
import { DefenseQueue } from '../models/DefenseQueue';
import { CapacityService } from './capacityService';
export class DefensesService {
  static async getStatus(empireId: string): Promise<DefensesStatusDTO> {
    const empire = await Empire.findById(empireId);
    if (!empire) {
      throw new Error('Empire not found');
    }

    const techLevels = mapFromEmpireTechLevels(empire);
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

  static async start(empireId: string, locationCoord: string, defenseKey: DefenseKey) {
    const empire = await Empire.findById(empireId);
    if (!empire) {
      return formatError('NOT_FOUND', 'Empire not found');
    }

    // Validate owned location
    const location = await Location.findOne({ coord: locationCoord });
    if (!location) {
      return formatError('NOT_FOUND', 'Location not found');
    }
    if (location.owner?.toString() !== (empire as any).userId?.toString()) {
      return formatError('NOT_OWNER', 'You do not own this location', { locationCoord });
    }

    // Validate against catalog + tech prereqs
    const spec = getDefensesList().find(d => d.key === defenseKey);
    if (!spec) {
      return formatError('INVALID_REQUEST', 'Unknown defense key', { field: 'defenseKey', value: defenseKey });
    }

    const techLevels = mapFromEmpireTechLevels(empire);
    const techCheck = evaluateDefenseTechPrereqs(techLevels, spec.techPrereqs);
    if (!techCheck.ok) {
      const reasons = techCheck.unmet.map(
        (u) => `Requires ${u.key} ${u.requiredLevel} (current ${u.currentLevel}).`,
      );
      return {
        ...formatError('TECH_REQUIREMENTS', 'Technology requirements not met', { unmet: techCheck.unmet }),
        reasons,
      } as any;
    }

    // New citizen-capacity driven queue
    // If an item is already in progress at this base (status=pending with completesAt in the future), we enqueue
    const now = Date.now();
    const inProgress = await DefenseQueue.findOne({
      empireId: new mongoose.Types.ObjectId(empireId),
      locationCoord,
      status: 'pending',
      completesAt: { $gt: new Date(now) }
    }).lean();

    if (!inProgress) {
      // Compute citizen capacity
      const caps = await CapacityService.getBaseCapacities(empireId, locationCoord);
      const perHour = Math.max(0, Number((caps as any)?.citizen?.value || 0));
      if (!(perHour > 0)) {
        return formatError('NO_CAPACITY', 'This base has no citizen capacity to build defenses.');
      }

      // Energy validation: ensure adding this defense won't push energy negative when including existing defenses
      const location = await Location.findOne({ coord: locationCoord });
      const solarEnergy = Math.max(0, Number((location as any)?.result?.solarEnergy ?? 0));
      const gasResource = Math.max(0, Number((location as any)?.result?.yields?.gas ?? 0));

      // Gather active buildings at base for current energy
      const buildings = await Building.find({ empireId: new mongoose.Types.ObjectId(empireId), locationCoord })
        .select('catalogKey level isActive pendingUpgrade')
        .lean();
      const activeBuildings: Array<{ key: string; level: number; isActive: boolean }> = [];
      for (const b of (buildings || [])) {
        const key = String((b as any).catalogKey || '');
        const level = Math.max(0, Number((b as any).level || 0));
        if (!key || !(level > 0)) continue;
        if ((b as any).isActive === true || (b as any).pendingUpgrade === true) {
          activeBuildings.push({ key, level, isActive: true });
        }
      }

      // Include completed defenses in energy baseline
      const completedDefs = await DefenseQueue.find({
        empireId: new mongoose.Types.ObjectId(empireId),
        locationCoord,
        status: 'completed',
      }).select('defenseKey').lean();

      let produced = 0, consumed = 0, balance = 0, reservedNegative = 0;
      {
        const base = computeEnergyBalance({
          buildingsAtBase: activeBuildings,
          location: { solarEnergy, gasYield: gasResource },
          includeQueuedReservations: false,
        });
        produced = base.produced; consumed = base.consumed; balance = base.balance;
        // Add defense contributions
        for (const it of (completedDefs || [])) {
          const k = String((it as any).defenseKey || '');
          const dSpec = getDefensesList().find((d) => String(d.key) === k);
          const d = Number(dSpec?.energyDelta || 0);
          if (d >= 0) produced += d; else consumed += Math.abs(d);
        }
        balance = produced - consumed;
      }

      // Projected energy after adding this defense
      const delta = Number(spec.energyDelta || 0);
      const projectedEnergy = balance + reservedNegative + delta;
      if (delta < 0 && projectedEnergy < 0) {
        return formatError('INSUFFICIENT_ENERGY', 'Insufficient energy capacity to start this defense.', { balance, delta, projectedEnergy });
      }

      // Deduct credits now
      const cost = Math.max(0, Number(spec.creditsCost || 0));
      const empireDoc = await Empire.findById(empireId);
      if (!empireDoc) return formatError('NOT_FOUND', 'Empire not found');
      const available = Number((empireDoc as any).resources?.credits || 0);
      if (available < cost) {
        return formatError('INSUFFICIENT_RESOURCES', `Insufficient credits. Requires ${cost}, you have ${available}.`, { required: cost, available });
      }
      (empireDoc as any).resources.credits = available - cost;
      await empireDoc.save();

      const seconds = Math.max(60, Math.ceil((cost / perHour) * 3600));
      const dq = await DefenseQueue.create({
        empireId: new mongoose.Types.ObjectId(empireId),
        locationCoord,
        defenseKey,
        status: 'pending',
        startedAt: new Date(now),
        completesAt: new Date(now + seconds * 1000),
      } as any);

      return formatSuccess({
        queueItem: { id: (dq._id as any).toString(), defenseKey, startedAt: dq.startedAt, completesAt: dq.completesAt },
      }, `${spec.name} construction started.`);
    } else {
      // Enqueue waiting item (will be scheduled when current completes)
      // Charge credits immediately to avoid free builds when scheduled later
      const cost = Math.max(0, Number(spec.creditsCost || 0));
      const empireDoc = await Empire.findById(empireId);
      if (!empireDoc) return formatError('NOT_FOUND', 'Empire not found');
      const available = Number((empireDoc as any).resources?.credits || 0);
      if (available < cost) {
        return formatError('INSUFFICIENT_RESOURCES', `Insufficient credits. Requires ${cost}, you have ${available}.`, { required: cost, available });
      }
      (empireDoc as any).resources.credits = available - cost;
      await empireDoc.save();

      const dq = await DefenseQueue.create({
        empireId: new mongoose.Types.ObjectId(empireId),
        locationCoord,
        defenseKey,
        status: 'pending',
      } as any);
      return formatSuccess({
        queueItem: { id: (dq._id as any).toString(), defenseKey },
      }, `${spec.name} queued.`);
    }
  }
}
