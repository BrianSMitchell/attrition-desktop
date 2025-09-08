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
    console.log('🔄 Running game loop iteration...');

    try {
      // Complete finished research projects
      const researchCompleted = await this.completeResearchProjects();

      // Activate any pending (uncharged / unscheduled) research if credits and capacity are available
      const techActivated = await this.activatePendingTech();

      // Complete technology queue items (capacity-driven tech)
      const techStats = await this.processTechQueue();

      // Complete unit queue items (capacity-driven production)
      const unitStats = await this.processUnitQueue();

      // Activate completed building constructions (capacity-driven construction)
      const { activatedCount } = await BuildingService.completeDueConstructions();
      if (activatedCount > 0) {
        console.log(`[GameLoop] buildings activated=${activatedCount}`);
      }

      // Update empire resources for active empires
      const resourceStats = await this.updateEmpireResources();

      // Structured tick summary
      console.log(
        `[GameLoop] tick summary researchCompleted=${researchCompleted} ` +
        `techActivated=${techActivated.activated} ` +
        `techCompleted=${techStats.completed} techCancelled=${techStats.cancelled} techErrors=${techStats.errors} ` +
        `unitCompleted=${unitStats.completed} unitCancelled=${unitStats.cancelled} unitErrors=${unitStats.errors} ` +
        `activatedBuildings=${activatedCount} resourcesUpdated=${resourceStats.updated} resourceErrors=${resourceStats.errors}`
      );

      console.log('✅ Game loop iteration completed');
    } catch (error) {
      console.error('❌ Error in game loop iteration:', error);
    }
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

      const dueItems = await UnitQueue.find({
        status: 'pending',
        completesAt: { $lte: now },
      });

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
          item.status = 'completed';
          await item.save();

          try {
            const baseCoord = String(item.locationCoord || '');
            const empireId = empire._id as mongoose.Types.ObjectId;

            // Find most recent stationed fleet at this base; if none, create a new one with auto-generated name
            let fleet = await Fleet.findOne({ empireId, locationCoord: baseCoord }).sort({ createdAt: -1 });

            if (!fleet) {
              const nextNum = Math.max(1, Number((empire as any).nextFleetNumber || 1));
              const name = `Fleet ${nextNum}`;

              // Increment nextFleetNumber for the empire
              (empire as any).nextFleetNumber = nextNum + 1;
              await empire.save();

              fleet = new Fleet({
                empireId,
                locationCoord: baseCoord,
                name,
                units: [],
                sizeCredits: 0
              });
            }

            // Add the completed unit to the fleet composition and update sizeCredits
            const key = String(item.unitKey || '');
            const spec = getUnitSpec(key as any);
            const unitCredits = Number(spec?.creditsCost || 0);

            const existing = fleet.units.find(u => u.unitKey === key);
            if (existing) {
              existing.count += 1;
            } else {
              fleet.units.push({ unitKey: key as any, count: 1 });
            }

            fleet.sizeCredits = Math.max(0, Number(fleet.sizeCredits || 0)) + unitCredits;

            await fleet.save();
          } catch (e) {
            console.error('[GameLoop] error updating fleet for completed unit', {
              unitKey: String(item.unitKey || ''),
              empireId: String(empire._id || ''),
              base: String(item.locationCoord || ''),
              err: (e as any)?.message
            });
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
