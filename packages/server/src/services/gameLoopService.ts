import { ResourceService } from './resourceService';
import { ResearchProject } from '../models/ResearchProject';
import { Empire } from '../models/Empire';
import mongoose from 'mongoose';
import { TechQueue } from '../models/TechQueue';
import { UnitQueue } from '../models/UnitQueue';
import { Fleet } from '../models/Fleet';
import { BuildingService } from './buildingService';
import { CapacityService } from './capacityService';
import { TechService } from './techService';
import { getTechSpec, getTechCreditCostForLevel, getUnitSpec } from '@game/shared';
import { emitFleetUpdate } from '../utils/socketManager';
import { BaseCitizenService } from './baseCitizenService';
import { FleetMovementService } from './fleetMovementService';

export class GameLoopService {
  private static instance: GameLoopService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): GameLoopService {
    if (!GameLoopService.instance) {
      GameLoopService.instance = new GameLoopService();
    }
    return GameLoopService.instance;
  }

  /**
   * Start the game loop with specified interval
   */
  start(intervalMs: number = 60000): void { // Default: 1 minute
    if (this.isRunning) {
      console.log('Game loop is already running');
      return;
    }

    console.log(`🎮 Starting game loop with ${intervalMs}ms interval`);
    this.isRunning = true;

    this.intervalId = setInterval(async () => {
      try {
        await this.runGameLoop();
      } catch (error) {
        console.error('Error in game loop:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('🛑 Game loop stopped');
    }
  }

  /**
   * Check if game loop is running
   */
  isGameLoopRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Run one iteration of the game loop
   */
  private async runGameLoop(): Promise<void> {
    try {
      // Complete finished research projects
      const researchCompleted = await this.completeResearchProjects();

      // Activate any pending (uncharged / unscheduled) research if credits and capacity are available
      const techActivated = await this.activatePendingTech();

      // Complete technology queue items (capacity-driven tech)
      const techStats = await this.processTechQueue();

      // Complete unit queue items (capacity-driven production)
      const unitStats = await this.processUnitQueue();

      // Complete and activate buildings that have finished construction
      const buildingStats = await BuildingService.completeDueConstructions();
      const activatedCount = buildingStats.activatedCount;

      // Process defense queue activations and completions (citizen capacity)
      const defenseStats = await this.processDefenseQueue();

      // Update empire resources for active empires
      const resourceStats = await this.updateEmpireResources();

      // Process fleet arrivals
      const fleetStats = await this.processFleetArrivals();

      // Structured tick summary
      console.log(
        `[GameLoop] tick summary researchCompleted=${researchCompleted} ` +
        `techActivated=${techActivated.activated} ` +
        `techCompleted=${techStats.completed} techCancelled=${techStats.cancelled} techErrors=${techStats.errors} ` +
        `unitCompleted=${unitStats.completed} unitCancelled=${unitStats.cancelled} unitErrors=${unitStats.errors} ` +
        `defenseCompleted=${defenseStats.completed} defenseActivated=${defenseStats.activated} defenseErrors=${defenseStats.errors} ` +
        `fleetArrivals=${fleetStats.processed} fleetErrors=${fleetStats.errors} ` +
        `activatedBuildings=${activatedCount} resourcesUpdated=${resourceStats.updated} resourceErrors=${resourceStats.errors}`
      );

      console.log('✅ Game loop iteration completed');
    } catch (error) {
      console.error('❌ Error in game loop iteration:', error);
    }
  }

  /**
   * Defense queue (citizen capacity):
   * - Complete due items (status=pending, completesAt <= now). For now we just mark completed.
   * - For bases without an in-progress item, schedule the earliest pending waiting item using current citizen capacity
   */
  private async processDefenseQueue(): Promise<{ completed: number; activated: number; errors: number }> {
    const { DefenseQueue } = await import('../models/DefenseQueue');
    let completed = 0;
    let activated = 0;
    let errors = 0;
    try {
      const now = new Date();

      // 1) Complete all due items
      const due = await DefenseQueue.find({ status: 'pending', completesAt: { $lte: now } }).lean();
      for (const it of due || []) {
        try {
          await DefenseQueue.updateOne({ _id: (it as any)._id }, { $set: { status: 'completed' } });
          completed++;
        } catch (e) {
          errors++;
          console.error('[GameLoop] defense completion error', e);
        }
      }

      // 2) Schedule waiting items per base that currently have no in-progress item
      const waiting = await DefenseQueue.find({ status: 'pending', $or: [{ completesAt: { $exists: false } }, { completesAt: null }] })
        .sort({ createdAt: 1 })
        .lean();

      // Group by base
      const byBase = new Map<string, any[]>();
      for (const it of waiting || []) {
        const key = `${(it as any).empireId}:${(it as any).locationCoord}`;
        if (!byBase.has(key)) byBase.set(key, []);
        byBase.get(key)!.push(it);
      }

      for (const [key, items] of byBase.entries()) {
        const [empireIdStr, baseCoord] = key.split(':');
        // Skip if already in progress
        const inProgress = await DefenseQueue.findOne({ empireId: new mongoose.Types.ObjectId(empireIdStr), locationCoord: baseCoord, status: 'pending', completesAt: { $gt: now } }).select('_id').lean();
        if (inProgress) continue;

        // Take earliest waiting
        const next = items[0];
        if (!next) continue;

        try {
          const caps = await CapacityService.getBaseCapacities(empireIdStr, baseCoord);
          const perHour = Math.max(0, Number((caps as any)?.citizen?.value || 0));
          if (!(perHour > 0)) continue;
          const cost = (() => {
            try {
              const { getDefensesList } = require('@game/shared');
              const spec = getDefensesList().find((d: any) => d.key === (next as any).defenseKey);
              const c = Number(spec?.creditsCost || 0);
              return c > 0 ? c : 100;
            } catch { return 100; }
          })();
          const seconds = Math.max(60, Math.ceil((cost / perHour) * 3600));
          await DefenseQueue.updateOne({ _id: (next as any)._id }, { $set: { startedAt: now, completesAt: new Date(now.getTime() + seconds * 1000) } });
          activated++;
        } catch (e) {
          errors++;
          console.error('[GameLoop] defense activation error', e);
        }
      }
    } catch (e) {
      console.error('[GameLoop] processDefenseQueue top-level error', e);
    }
    return { completed, activated, errors };
  }

  /**
   * Complete research projects that have finished
   */
  private async completeResearchProjects(): Promise<number> {
    let completedCount = 0;
    try {
      const now = new Date();
      
      // Find research projects that should be completed
      const completedProjects = await ResearchProject.find({
        isCompleted: false,
        $expr: {
          $gte: ['$researchProgress', '$researchCost']
        }
      });

      for (const project of completedProjects) {
        try {
          project.isCompleted = true;
          project.completedAt = now;
          await project.save();

          // Apply research benefits to empire
          await this.applyResearchBenefits(project);

          completedCount++;
          console.log(`[GameLoop] research completed name="${project.name}" empire=${project.empireId}`);
        } catch (err) {
          console.error('Error finalizing research project:', err);
        }
      }
    } catch (error) {
      console.error('Error completing research projects:', error);
    }
    return completedCount;
  }

  /**
   * Apply research project benefits to empire
   */
  private async applyResearchBenefits(project: any): Promise<void> {
    try {
      const empire = await Empire.findById(project.empireId);
      if (!empire) return;

      // Phase A: No direct empire.technology mutation.
      // Completed ResearchProjects contribute via EconomyService.getResearchCreditBonuses().
      // Placeholder for future benefits application (e.g., unlocking buildings/units).
      return;
    } catch (error) {
      console.error('Error applying research benefits:', error);
    }
  }

  /**
   * Try to activate earliest pending research items that are waiting for credits/capacity.
   * For each pending item without completesAt or not charged:
   * - Check base research capacity > 0
   * - Check empire credits >= cost for desired level
   * - Charge credits, compute ETA, and set completesAt
   */
  private async activatePendingTech(): Promise<{ activated: number; skipped: number; errors: number }> {
    let activated = 0;
    let skipped = 0;
    let errors = 0;
    try {
      // Find pending items that are not yet scheduled (no completesAt) or not charged
      const items = await TechQueue.find({
        status: 'pending',
        $or: [
          { completesAt: { $exists: false } },
          { completesAt: null },
          { charged: false },
          { charged: { $exists: false } }
        ]
      }).sort({ createdAt: 1 });

      for (const item of items) {
        try {
          const empire = await Empire.findById(item.empireId);
          if (!empire) {
            item.status = 'cancelled';
            // Defensive backfill: ensure identityKey exists for legacy docs missing it
            {
              const empireIdStr =
                (item as any).empireId?.toString?.() || String((item as any).empireId || '');
              const techKeyMissing = (item as any).techKey;
              const levelMissing = Math.max(1, Number((item as any).level || 1));
              if (!(item as any).identityKey && techKeyMissing) {
                (item as any).identityKey = `${empireIdStr}:${techKeyMissing}:${levelMissing}`;
              }
            }
            await item.save();
            skipped++;
            continue;
          }

          const empireIdStr = (empire._id as mongoose.Types.ObjectId).toString();
          const baseCoord = (item as any).locationCoord as string;

          // Re-evaluate capacity at this base
          const { research } = await CapacityService.getBaseCapacities(empireIdStr, baseCoord);
          const cap = Math.max(0, Number(research?.value || 0));
          if (cap <= 0) {
            skipped++;
            continue;
          }

          // Determine desired level and compute cost
          const techKey = (item as any).techKey;
          const desiredLevel = Math.max(1, Number((item as any).level || 1));
          const spec = getTechSpec(techKey);
          const creditsCost = getTechCreditCostForLevel(spec, desiredLevel);

          // Require sufficient credits now; otherwise remain pending
          if (empire.resources.credits < creditsCost) {
            skipped++;
            continue;
          }

          // Schedule completesAt based on current capacity
          const hours = creditsCost / cap;
          const etaMinutes = Math.max(1, Math.ceil(hours * 60));
          const now = new Date();
          (item as any).completesAt = new Date(now.getTime() + etaMinutes * 60 * 1000);
          (item as any).charged = true;
          // Defensive backfill: ensure identityKey exists for legacy docs
          if (!(item as any).identityKey) {
            (item as any).identityKey = `${empireIdStr}:${techKey}:${desiredLevel}`;
          }
          await item.save();

          // Charge credits after successful scheduling
          empire.resources.credits -= creditsCost;
          await empire.save();

          activated++;
          console.log(`[GameLoop] tech activated key=${techKey} base=${baseCoord} level=${desiredLevel} etaMinutes=${etaMinutes}`);
        } catch (err) {
          errors++;
          console.error('Error activating tech queue item:', err);
        }
      }
    } catch (err) {
      console.error('Error in activatePendingTech:', err);
    }
    return { activated, skipped, errors };
  }

  /**
   * Process technology queue completions
   */
  private async processTechQueue(): Promise<{ completed: number; cancelled: number; errors: number }> {
    let completed = 0;
    let cancelled = 0;
    let errors = 0;
    try {
      const now = new Date();

      // Find all pending items that have completed
      const dueItems = await TechQueue.find({
        status: 'pending',
        completesAt: { $lte: now },
      });

      for (const item of dueItems) {
        try {
          const empire = await Empire.findById(item.empireId);
          if (!empire) {
            // Mark as cancelled if empire is missing
            item.status = 'cancelled';
            // Defensive backfill: ensure identityKey exists for legacy docs missing it
            {
              const empireIdStr =
                (item as any).empireId?.toString?.() || String((item as any).empireId || '');
              const techKeyMissing = (item as any).techKey;
              const levelMissing = Math.max(1, Number((item as any).level || 1));
              if (!(item as any).identityKey && techKeyMissing) {
                (item as any).identityKey = `${empireIdStr}:${techKeyMissing}:${levelMissing}`;
              }
            }
            await item.save();
            cancelled++;
            console.warn(`[GameLoop] tech cancel missingEmpire techKey=${(item as any).techKey} location=${(item as any).locationCoord}`);
            continue;
          }

          // Promote tech level to the queued target level (multi-level support)
          const mapVal = (empire as any).techLevels as Map<string, number> | undefined;
          const targetLevel = Math.max(1, Number((item as any).level || 1));
          if (mapVal) {
            const current = Number(mapVal.get(item.techKey as any) || 0);
            mapVal.set(item.techKey as any, Math.max(current, targetLevel));
          } else {
            (empire as any).techLevels = new Map<string, number>([[item.techKey as any, targetLevel]]);
          }

          await empire.save();

          // Mark queue item as completed
          item.status = 'completed';
          // Defensive backfill: ensure identityKey exists for legacy docs
          {
            const empireIdStr = (empire._id as mongoose.Types.ObjectId).toString();
            if (!(item as any).identityKey) {
              (item as any).identityKey = `${empireIdStr}:${item.techKey}:${targetLevel}`;
            }
          }
          await item.save();
          completed++;

          console.log(`[GameLoop] tech completed key=${item.techKey} empire=${empire._id} location=${item.locationCoord} level=${(item as any).level || 1}`);
        } catch (err) {
          errors++;
          console.error('Error completing tech queue item:', err);
        }
      }
    } catch (error) {
      console.error('Error processing tech queue:', error);
    }
    return { completed, cancelled, errors };
  }

  /**
   * Process unit queue completions
   */
  private async processUnitQueue(): Promise<{ completed: number; cancelled: number; errors: number }> {
    let completed = 0;
    let cancelled = 0;
    let errors = 0;

    try {
      const now = new Date();
      console.log(`[GameLoop] processUnitQueue: now=${now.toISOString()}`);

      // Debug: Check ALL pending units first
      const allPending = await UnitQueue.find({ status: 'pending' }).lean();
      console.log(`[GameLoop] Total pending units: ${allPending.length}`);
      for (const u of allPending) {
        console.log(`[GameLoop] Pending unit: _id=${(u as any)._id} unitKey=${(u as any).unitKey} completesAt=${(u as any).completesAt?.toISOString() || 'null'} status=${(u as any).status}`);
      }

      const dueItems = await UnitQueue.find({
        status: 'pending',
        completesAt: { $lte: now },
      });
      console.log(`[GameLoop] Due items found: ${dueItems.length}`);
      for (const d of dueItems) {
        console.log(`[GameLoop] Due unit: _id=${d._id} unitKey=${(d as any).unitKey} completesAt=${(d as any).completesAt?.toISOString()}`);
      }

      for (const item of dueItems) {
        try {
          const empire = await Empire.findById(item.empireId);
          if (!empire) {
            // Mark as cancelled if empire is missing
            item.status = 'cancelled';
            await item.save();
            cancelled++;
            console.warn(`[GameLoop] unit cancel missingEmpire unitKey=${(item as any).unitKey} location=${(item as any).locationCoord}`);
            continue;
          }

          // Mark unit production as completed and accumulate into a stationed fleet at this base
          console.log(`[GameLoop] Processing completed unit: unitKey=${item.unitKey} base=${item.locationCoord} empireId=${empire._id}`);
          
          item.status = 'completed';
          await item.save();
          console.log(`[GameLoop] Unit queue item marked completed: _id=${item._id}`);

          try {
            const baseCoord = String(item.locationCoord || '');
            const empireId = empire._id as mongoose.Types.ObjectId;
            console.log(`[GameLoop] Looking for existing fleet at base=${baseCoord} empireId=${empireId}`);

            // Find most recent stationed fleet at this base; if none, create a new one with auto-generated name
            let fleet = await Fleet.findOne({ empireId, locationCoord: baseCoord }).sort({ createdAt: -1 });

            if (!fleet) {
              console.log(`[GameLoop] No existing fleet found, creating new fleet`);
              const nextNum = Math.max(1, Number((empire as any).nextFleetNumber || 1));
              const name = `Fleet ${nextNum}`;

              // Increment nextFleetNumber for the empire
              (empire as any).nextFleetNumber = nextNum + 1;
              await empire.save();
              console.log(`[GameLoop] Empire nextFleetNumber incremented to ${nextNum + 1}`);

              fleet = new Fleet({
                empireId,
                locationCoord: baseCoord,
                name,
                units: [],
                sizeCredits: 0
              });
              console.log(`[GameLoop] Created new fleet: name="${name}" base=${baseCoord}`);
            } else {
              console.log(`[GameLoop] Found existing fleet: _id=${fleet._id} name="${fleet.name}" unitCount=${fleet.units.length}`);
            }

            // Add the completed unit to the fleet composition and update sizeCredits
            const key = String(item.unitKey || '');
            const spec = getUnitSpec(key as any);
            const unitCredits = Number(spec?.creditsCost || 0);
            console.log(`[GameLoop] Adding unit to fleet: unitKey=${key} creditsCost=${unitCredits}`);

            const existing = fleet.units.find(u => u.unitKey === key);
            if (existing) {
              existing.count += 1;
              console.log(`[GameLoop] Incremented existing unit count to ${existing.count}`);
            } else {
              fleet.units.push({ unitKey: key as any, count: 1 });
              console.log(`[GameLoop] Added new unit type to fleet`);
            }

            fleet.sizeCredits = Math.max(0, Number(fleet.sizeCredits || 0)) + unitCredits;
            console.log(`[GameLoop] Fleet size updated to ${fleet.sizeCredits} credits, unit types: ${fleet.units.length}`);

            await fleet.save();
            console.log(`[GameLoop] Fleet saved successfully: _id=${fleet._id}`);

            // Emit Socket.IO event to notify client of fleet update
            const unitCount = fleet.units.reduce((sum, u) => sum + u.count, 0);
            const fleetId = (fleet._id as mongoose.Types.ObjectId).toString();
            const emitted = emitFleetUpdate(empireId.toString(), {
              fleetId,
              locationCoord: fleet.locationCoord,
              name: fleet.name,
              sizeCredits: fleet.sizeCredits,
              unitCount,
              unitAdded: {
                unitKey: key,
                creditsCost: unitCredits
              }
            });
            
            if (emitted) {
              console.log(`[GameLoop] ✅ Emitted fleet:updated event for fleet ${fleet._id} to empire:${empireId} (${unitCount} units)`);
            } else {
              console.warn(`[GameLoop] ⚠️ Failed to emit fleet:updated event - Socket.IO may not be initialized`);
            }
          } catch (e) {
            console.error('[GameLoop] ❌ ERROR updating fleet for completed unit', {
              unitKey: String(item.unitKey || ''),
              empireId: String(empire._id || ''),
              base: String(item.locationCoord || ''),
              errorMessage: (e as any)?.message,
              errorStack: (e as any)?.stack
            });
            // Re-throw to ensure we know about fleet creation failures
            throw e;
          }

          completed++;

          console.log(`[GameLoop] unit completed key=${item.unitKey} empire=${empire._id} location=${item.locationCoord}`);
        } catch (err) {
          errors++;
          console.error('Error completing unit queue item:', err);
        }
      }
    } catch (error) {
      console.error('Error processing unit queue:', error);
    }
    return { completed, cancelled, errors };
  }

  /**
   * Update resources for all active empires
   */
  private async updateEmpireResources(): Promise<{ updated: number; errors: number }> {
    let updated = 0;
    let errors = 0;
    try {
      // Get all empires that have been active in the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const activeEmpires = await Empire.find({
        $or: [
          { lastResourceUpdate: { $gte: oneDayAgo } },
          { lastResourceUpdate: { $exists: false } }
        ]
      });

      for (const empire of activeEmpires) {
        try {
          const empireId = (empire._id as mongoose.Types.ObjectId).toString();
          await ResourceService.updateEmpireResources(empireId);
          await ResourceService.updateEmpireCreditsAligned(empireId);
          // NEW: accrue base citizens per empire across all owned bases
          try {
            await BaseCitizenService.updateEmpireBases(empireId);
          } catch (e) {
            console.error('[GameLoop] citizen accrual error', e);
          }
          updated++;
        } catch (error) {
          errors++;
          console.error(`Error updating resources for empire ${empire._id}:`, error);
        }
      }

      console.log(`[GameLoop] resources updated count=${updated} scanned=${activeEmpires.length}`);
    } catch (error) {
      console.error('Error updating empire resources:', error);
    }
    return { updated, errors };
  }

  /**
   * Process fleet arrivals
   */
  private async processFleetArrivals(): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    try {
      await FleetMovementService.processArrivals();
      processed++;
    } catch (error) {
      errors++;
      console.error('Error processing fleet arrivals:', error);
    }

    return { processed, errors };
  }

  /**
   * Process research progress for all active research projects
   */
  private async processResearchProgress(): Promise<void> {
    try {
      // Find all active research projects
      const activeProjects = await ResearchProject.find({
        isCompleted: false
      });

      for (const project of activeProjects) {
        try {
          const empire = await Empire.findById(project.empireId);
          if (!empire) continue;

          // Calculate research progress based on empire's research production
          // Note: Legacy resourceProduction fields have been removed from Empire model
          // Research progress is now calculated through capacity-based systems
          const researchPerMinute = 0; // Placeholder until capacity system is implemented
          project.researchProgress += researchPerMinute;

          // Cap progress at research cost
          if (project.researchProgress >= project.researchCost) {
            project.researchProgress = project.researchCost;
          }

          await project.save();
        } catch (error) {
          console.error(`Error processing research for project ${project._id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing research progress:', error);
    }
  }

  /**
   * Run a manual game loop iteration (for testing)
   */
  async runManualIteration(): Promise<void> {
    console.log('🔧 Running manual game loop iteration...');
    await this.runGameLoop();
  }

  /**
   * Get game loop status
   */
  getStatus(): { isRunning: boolean; intervalMs?: number } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalId ? 60000 : undefined // Default interval
    };
  }
}

// Export singleton instance
export const gameLoop = GameLoopService.getInstance();
