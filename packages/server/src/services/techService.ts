import mongoose from 'mongoose';
import { Empire, EmpireDocument } from '../models/Empire';
import { Building } from '../models/Building';
import {
  TechnologyKey,
  TechnologySpec,
  getTechnologyList,
  getTechSpec,
  canStartTechLevel,
  getTechCreditCostForLevel,
} from '@game/shared';
import { Location } from '../models/Location';
import { CapacityService } from './capacityService';
import { TechQueue } from '../models/TechQueue';
import { CreditLedgerService } from './creditLedgerService';

export interface TechStatus {
  techLevels: Partial<Record<TechnologyKey, number>>;
  baseLabTotal: number;
  eligibility: Record<TechnologyKey, { canStart: boolean; reasons: string[] }>;
  credits: number;
}

function mapFromEmpireTechLevels(empire: EmpireDocument): Partial<Record<TechnologyKey, number>> {
  const raw = (empire as any).techLevels as any;
  const out: Record<string, number> = {};

  // Support both Mongo Map type and plain objects (e.g., when using .lean())
  if (raw instanceof Map) {
    for (const [k, v] of raw.entries()) {
      out[k] = typeof v === 'number' ? v : Number(v || 0);
    }
    return out as Partial<Record<TechnologyKey, number>>;
  }

  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(raw)) {
      const v = (raw as any)[k];
      out[k] = typeof v === 'number' ? v : Number(v || 0);
    }
    return out as Partial<Record<TechnologyKey, number>>;
  }

  return {} as Partial<Record<TechnologyKey, number>>;
}

export class TechService {
  private static didSyncIndexes = false;
  static async getBaseLabTotal(empireId: string, locationCoord: string): Promise<number> {
    // Sum levels for research_labs at this base. Treat pendingUpgrade as active so current level remains counted while upgrading.
    const buildings = await Building.find({
      empireId: new mongoose.Types.ObjectId(empireId),
      locationCoord,
      catalogKey: 'research_labs',
      $or: [{ isActive: true }, { pendingUpgrade: true }],
    }).select('level');

    return buildings.reduce((sum: number, b: any) => sum + (b.level || 0), 0);
  }

  static async getStatus(empireId: string, locationCoord: string): Promise<TechStatus> {
    const empire = await Empire.findById(empireId);
    if (!empire) {
      throw new Error('Empire not found');
    }

    const techLevels = mapFromEmpireTechLevels(empire);
    const baseLabTotal = await this.getBaseLabTotal(empireId, locationCoord);
    const credits = empire.resources.credits;

    const eligibility: Record<TechnologyKey, { canStart: boolean; reasons: string[] }> = {} as any;
    const list = getTechnologyList();
    for (const spec of list) {
      const current = Math.max(0, techLevels[spec.key] ?? 0);
      const desired = current + 1;
      eligibility[spec.key] = canStartTechLevel(
        { techLevels, baseLabTotal, credits },
        spec,
        desired
      );
    }

    return { techLevels, baseLabTotal, eligibility, credits };
  }

  static async startResearchLevel1(empireId: string, locationCoord: string, techKey: TechnologyKey) {
    const empire = await Empire.findById(empireId);
    if (!empire) {
      return { success: false as const, error: 'Empire not found', reasons: ['empire_not_found'] };
    }

    const spec: TechnologySpec = getTechSpec(techKey);
    const techLevels = mapFromEmpireTechLevels(empire);

    // Current level check (legacy Phase A method)
    const currentLevel = Math.max(0, techLevels[techKey] ?? 0);
    if (currentLevel >= 1) {
      return { success: false as const, error: 'Technology already unlocked' };
    }

    const baseLabTotal = await this.getBaseLabTotal(empireId, locationCoord);
    const check = canStartTechLevel(
      { techLevels, baseLabTotal, credits: empire.resources.credits },
      spec,
      1
    );
    if (!check.canStart) {
      return { success: false as const, error: check.reasons.join(' ') };
    }

    // Deduct credits and set tech level to 1
    const l1Cost = getTechCreditCostForLevel(spec, 1);
    empire.resources.credits -= l1Cost;
    // Log immediate unlock charge
    CreditLedgerService.logTransaction({
      empireId,
      amount: -l1Cost,
      type: 'research',
      note: `Unlock ${techKey} level 1 at ${locationCoord}`,
      meta: { locationCoord, techKey, level: 1 },
      balanceAfter: empire.resources.credits,
    }).catch(() => {});

    // Set in Map
    const mapVal = (empire as any).techLevels as Map<string, number> | undefined;
    if (mapVal) {
      mapVal.set(techKey, 1);
    } else {
      // initialize
      (empire as any).techLevels = new Map<string, number>([[techKey, 1]]);
    }

    await empire.save();

    return {
      success: true as const,
      data: {
        empire,
        techKey,
        newLevel: 1,
      },
      message: `${spec.name} unlocked.`,
    };
  }

  /**
   * Phase 3: Start research (capacity-driven ETA).
   * Validates credits, labs, and tech prereqs using shared helpers.
   * Computes ETA from research capacity (cred/hour) at the specified base.
   * Deducts credits and enqueues a TechQueue item to complete later.
   */
  static async start(empireId: string, locationCoord: string, techKey: TechnologyKey) {
    const empire = await Empire.findById(empireId);
    if (!empire) {
      return {
        success: false as const,
        code: 'NOT_FOUND',
        message: 'Empire not found',
        error: 'Empire not found',
        details: { field: 'empireId' }
      };
    }

    // Validate location and ownership
    const location = await Location.findOne({ coord: locationCoord });
    if (!location) {
      return {
        success: false as const,
        code: 'NOT_FOUND',
        message: 'Location not found',
        error: 'Location not found',
        details: { field: 'locationCoord', locationCoord },
        reasons: ['location_not_found']
      };
    }
    if (location.owner?.toString() !== empire.userId.toString()) {
      return {
        success: false as const,
        code: 'NOT_OWNER',
        message: 'You do not own this location',
        error: 'You do not own this location',
        details: { locationCoord },
        reasons: ['not_owner']
      };
    }

    // Spec and current state
    let spec: TechnologySpec;
    try {
      spec = getTechSpec(techKey);
    } catch {
      return {
        success: false as const,
        code: 'INVALID_REQUEST',
        message: 'catalogKey is required or invalid',
        error: 'catalogKey is required or invalid',
        details: { field: 'catalogKey', catalogKey: techKey }
      };
    }
    const techLevels = mapFromEmpireTechLevels(empire);
    const baseLabTotal = await this.getBaseLabTotal(empireId, locationCoord);

    // Determine desired (next) level for this tech
    const currentLevel = Math.max(0, (mapFromEmpireTechLevels(empire) as any)[techKey] ?? techLevels[techKey] ?? 0);
    const desiredLevel = currentLevel + 1;

    // Gating via shared helper for target level
    const check = canStartTechLevel(
      { techLevels, baseLabTotal, credits: empire.resources.credits },
      spec,
      desiredLevel
    );
    if (!check.canStart) {
      return {
        success: false as const,
        code: 'TECH_REQUIREMENTS',
        message: 'Technology requirements not met',
        error: check.reasons.join(' '),
        details: {
          catalogKey: techKey,
          desiredLevel,
          baseLabTotal,
          credits: empire.resources.credits,
          reasons: check.reasons
        },
        reasons: check.reasons
      };
    }

    // Compute capacity-based ETA
    const { research } = await CapacityService.getBaseCapacities(empireId, locationCoord);
    const cap = Math.max(0, Number(research?.value || 0));
    if (cap <= 0) {
      const msg = 'Research capacity is zero at this base.';
      return {
        success: false as const,
        code: 'NO_CAPACITY',
        message: msg,
        error: `Cannot start: ${msg}`,
        details: { capacityType: 'research', locationCoord, capacityValue: cap },
        reasons: ['no_research_capacity', msg]
      };
    }

    // Cost for the desired level
    const creditsCost = getTechCreditCostForLevel(spec, desiredLevel);
    if (empire.resources.credits < creditsCost) {
    // Insufficient credits: enqueue a pending item that will auto-start later
    const identityKeyInsufficient = `${empireId}:${techKey}:${desiredLevel}`;
    const now = new Date();
    const queueItem = new TechQueue({
      empireId: new mongoose.Types.ObjectId(empireId),
      locationCoord,
      techKey,
      level: desiredLevel,
      identityKey: identityKeyInsufficient,
      startedAt: now,
      // No completesAt yet; will be set by game loop on activation
      status: 'pending',
      charged: false
    });

      if (!TechService.didSyncIndexes) {
        try {
          await TechQueue.syncIndexes();
        } catch {
          // ignore sync errors in dev
        } finally {
          TechService.didSyncIndexes = true;
        }
      }

      await queueItem.save();

      return {
        success: true as const,
        data: {
          queueId: queueItem._id?.toString(),
          techKey,
          etaMinutes: null,
          researchCapacityCredPerHour: cap
        },
        message: `${spec.name} queued. Will start automatically when sufficient credits are available.`
      };
    }

    const hours = creditsCost / cap;
    const etaMinutes = Math.max(1, Math.ceil(hours * 60));

    // Compute identityKey for queue idempotency
    const identityKey = `${empireId}:${techKey}:${desiredLevel}`;

    // Idempotency check: if an identical pending item already exists, return canonical conflict payload
    try {
      const existingPending: any = await TechQueue.findOne({ identityKey, status: "pending" });
      if (existingPending) {
        const startedAt = existingPending.startedAt ? new Date(existingPending.startedAt) : null;
        const completesAt = existingPending.completesAt ? new Date(existingPending.completesAt) : null;
        const etaSeconds =
          completesAt ? Math.max(0, Math.floor((completesAt.getTime() - Date.now()) / 1000)) : null;

        return {
          success: false as const,
          code: "ALREADY_IN_PROGRESS",
          message: "An identical item is already queued or active.",
          error: "An identical item is already queued or active.",
          details: {
            queueType: "research",
            identityKey,
            catalogKey: techKey,
            existing: {
              _id: existingPending._id?.toString?.(),
              state: existingPending.status,
              startedAt,
              etaSeconds,
              catalogKey: techKey,
            },
          },
        };
      }
    } catch {
      // On any unexpected lookup error, skip idempotency check (will either save cleanly or throw on unique index)
    }

    // Enqueue first, then deduct credits after successful insert to avoid race-condition double-charge
    const now = new Date();
    const completesAt = new Date(now.getTime() + etaMinutes * 60 * 1000);

    const queueItem = new TechQueue({
      empireId: new mongoose.Types.ObjectId(empireId),
      locationCoord,
      techKey,
      level: desiredLevel,
      identityKey,
      startedAt: now,
      completesAt,
      status: 'pending',
      charged: true
    });

    // Ensure indexes are synced once to enforce idempotency in dev/test before first save
    if (!TechService.didSyncIndexes) {
      try {
        await TechQueue.syncIndexes();
      } catch {
        // ignore sync errors in dev
      } finally {
        TechService.didSyncIndexes = true;
      }
    }

    try {
      await queueItem.save();
    } catch (err: any) {
      // Log error but allow the operation to continue for non-duplicate issues
      console.error(`[TechService.start] queue save failed:`, err);
      throw err;
    }

    // Deduct credits only after queue creation succeeds
    empire.resources.credits -= creditsCost;
    await empire.save();
    // Log queued research charge
    CreditLedgerService.logTransaction({
      empireId,
      amount: -creditsCost,
      type: 'research',
      note: `Start research ${techKey}→${desiredLevel} at ${locationCoord}`,
      meta: { locationCoord, techKey, level: desiredLevel, queueId: queueItem._id?.toString?.() },
    }).catch(() => {});

    return {
      success: true as const,
      data: {
        queueId: queueItem._id?.toString(),
        techKey,
        completesAt,
        etaMinutes,
        researchCapacityCredPerHour: cap
      },
      message: `${spec.name} research started. ETA ${etaMinutes} minute(s).`
    };
  }
}
