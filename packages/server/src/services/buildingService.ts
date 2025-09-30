import mongoose from 'mongoose';
import { Building, type BuildingDocument } from '../models/Building';
import { Empire } from '../models/Empire';
import { CapacityService } from './capacityService';
import { getIO } from '../index';

/**
 * BuildingService
 *
 * Responsibilities aligned with "docs/Game Mechanics and Rules.md":
 * - Buildings are constructed over time using Construction Capacity (cred/h)
 *   Time (hours) = Structure Cost (credits) / Construction Capacity (cred/h)
 * - When construction completes, the building becomes active and immediately contributes
 *   to capacities/effects (these are computed using shared calculators that read active buildings).
 *
 * Notes:
 * - We intentionally do NOT track empire-level counters of mines/factories/labs/defenses.
 * - Effects are not applied here directly; they are derived by CapacityService/Shared calculators
 *   from active buildings at a base.
 */
export class BuildingService {
  /**
   * Compute ETA in minutes based on credits cost and construction capacity.
   * Per spec: hours = cost / constructionCapacity; minutes = ceil(hours * 60), min 1.
   */
  static etaMinutesFromCostAndCapacity(creditsCost: number, constructionCredPerHour: number): number {
    if (!isFinite(creditsCost) || creditsCost <= 0) return 1;
    if (!isFinite(constructionCredPerHour) || constructionCredPerHour <= 0) {
      // Caller should prevent starting with zero capacity; return a large sentinel
      return Number.POSITIVE_INFINITY;
    }
    const hours = creditsCost / constructionCredPerHour;
    return Math.max(1, Math.ceil(hours * 60));
  }

  /**
   * Activate all buildings whose constructionCompleted timestamp has passed.
   * Returns a summary so callers (e.g., the game loop) can log progress.
   */
  static async completeDueConstructions(): Promise<{
    activatedCount: number;
    activatedIds: string[];
  }> {
    const now = new Date();

    // Find all queued buildings that should now be active
    const dueDocs = await Building.find({
      isActive: false,
      constructionCompleted: { $lte: now },
    });

    if (!dueDocs || dueDocs.length === 0) {
      return { activatedCount: 0, activatedIds: [] };
    }

    const activatedIds: string[] = [];
    const basesToSchedule = new Set<string>();
    for (const doc of dueDocs) {
      try {
        // If this was an upgrade, bump level and clear flag
        if ((doc as any).pendingUpgrade === true) {
          doc.level = Math.max(1, Number(doc.level || 0)) + 1;
          (doc as any).pendingUpgrade = false;
        } else {
          // First-time activation: ensure level is at least 1
          doc.level = Math.max(1, Number(doc.level || 0));
        }

        // Activate the building
        doc.isActive = true;

        // Optional cleanup: clear constructionCompleted to avoid stale scheduling sorts
        doc.constructionCompleted = undefined as any;

        await doc.save();
        activatedIds.push((doc._id as mongoose.Types.ObjectId).toString());
        // Broadcast completion event
        try {
          const io = getIO();
          const empireIdStr = (doc.empireId as mongoose.Types.ObjectId).toString();
          (io as any)?.broadcastQueueUpdate?.(empireIdStr, doc.locationCoord, 'queue:item_completed', {
            buildingId: (doc._id as mongoose.Types.ObjectId).toString(),
            locationCoord: doc.locationCoord,
            catalogKey: (doc as any).catalogKey,
            pendingUpgrade: (doc as any).pendingUpgrade === true,
          });
        } catch {}
        try {
          const baseKey = `${(doc.empireId as mongoose.Types.ObjectId).toString()}|${doc.locationCoord}`;
          basesToSchedule.add(baseKey);
        } catch {}
      } catch (err) {
        // Continue processing other docs even if one fails
        // eslint-disable-next-line no-console
        console.error('Error activating building', doc._id, err);
      }
    }

    // After activating buildings, schedule the next queued item (if any) per base
    for (const key of basesToSchedule) {
      const [empireIdStr, coord] = key.split('|');
      try {
        await BuildingService.scheduleNextQueuedForBase(empireIdStr, coord);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[BuildingService] scheduleNextQueuedForBase error', { empireIdStr, coord }, err);
      }
    }

    return { activatedCount: activatedIds.length, activatedIds };
  }

  /**
   * Schedule the next queued construction at a base if none is currently in progress.
   * This enforces single-active construction per base and sequential queuing.
   */
  static async scheduleNextQueuedForBase(empireId: string, locationCoord: string): Promise<void> {
    const now = new Date();

    // If there is already a queued item with a future completion, do nothing (one active at a time).
    const inProgress = await Building.findOne({
      empireId: new mongoose.Types.ObjectId(empireId),
      locationCoord,
      isActive: false,
      constructionCompleted: { $gt: now }
    }).select('_id');
    if (inProgress) return;

    // Find the earliest queued item that has not been scheduled yet
    const nextQueued = await Building.findOne({
      empireId: new mongoose.Types.ObjectId(empireId),
      locationCoord,
      isActive: false,
      $or: [{ constructionCompleted: { $exists: false } }, { constructionCompleted: null }]
    }).sort({ createdAt: 1 });

    if (!nextQueued) return;

    // Credits gating and deduction at schedule-time (top-of-queue only)
    const empireDoc = await Empire.findById(empireId);
    if (!empireDoc) {
      return;
    }
    const required = Number(nextQueued.creditsCost || 0);
    const available = Number((empireDoc as any).resources?.credits || 0);
    if (available < required) {
      try {
        console.log(
          `[BuildingService.scheduleNext] credits gating: needed=${required} available=${available} coord=${locationCoord}`
        );
      } catch {}
      // Insufficient credits — leave unscheduled; game loop will retry later
      return;
    }
    // Deduct credits at start-time
    (empireDoc as any).resources.credits = available - required;
    await empireDoc.save();

    // Compute ETA from current construction capacity at this base
    const { construction } = await CapacityService.getBaseCapacities(empireId, locationCoord);
    const cap = Math.max(0, Number(construction?.value || 0));
    if (cap <= 0) {
      // No capacity right now; leave unscheduled and try again in a future tick
      return;
    }

    const minutes = BuildingService.etaMinutesFromCostAndCapacity(Number(nextQueued.creditsCost || 0), cap);
    if (!isFinite(minutes) || minutes === Number.POSITIVE_INFINITY) {
      // Cannot schedule without a finite ETA
      return;
    }

    // Deterministic scheduling: chain from last scheduled completion at this base
    const lastScheduled = await Building.findOne({
      empireId: new mongoose.Types.ObjectId(empireId),
      locationCoord,
      isActive: false,
      constructionCompleted: { $ne: null }
    })
      .sort({ constructionCompleted: -1 })
      .select('constructionCompleted')
      .lean();

    const startAt = lastScheduled 
      ? new Date((lastScheduled as any).constructionCompleted)
      : now;

    nextQueued.constructionStarted = startAt;
    nextQueued.constructionCompleted = new Date(startAt.getTime() + minutes * 60 * 1000);
    await nextQueued.save();

    // Broadcast schedule event
    try {
      const io = getIO();
      const empireIdStr = (nextQueued.empireId as mongoose.Types.ObjectId).toString();
      (io as any)?.broadcastQueueUpdate?.(empireIdStr, nextQueued.locationCoord, 'queue:item_scheduled', {
        buildingId: (nextQueued._id as mongoose.Types.ObjectId).toString(),
        locationCoord: nextQueued.locationCoord,
        catalogKey: (nextQueued as any).catalogKey,
        constructionStarted: nextQueued.constructionStarted,
        constructionCompleted: nextQueued.constructionCompleted,
      });
    } catch {}
  }

  /**
   * Convenience helper to fetch buildings at a base for an empire.
   * You can filter by active state to get only completed buildings.
   */
  static async getBaseBuildings(
    empireId: string,
    locationCoord: string,
    options?: { onlyActive?: boolean }
  ): Promise<BuildingDocument[]> {
    const filter: any = {
      empireId: new mongoose.Types.ObjectId(empireId),
      locationCoord,
    };
    if (options?.onlyActive === true) {
      filter.isActive = true;
    }
    return await Building.find(filter).sort({ constructionCompleted: 1 });
  }
}
