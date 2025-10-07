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
import { FleetMovementService } from './fleetMovementService';
import { getDatabaseType } from '../config/database';
import { SupabaseCompletionService } from './supabaseCompletionService';
import { SupabaseResourceService } from './resources/SupabaseResourceService';
import { SupabaseFleetMovementService } from './fleets/SupabaseFleetMovementService';
import { SupabaseBaseCitizenService } from './bases/SupabaseBaseCitizenService';

export class HybridGameLoopService {
  private static instance: HybridGameLoopService;
  private completionCheckInterval: NodeJS.Timeout | null = null;
  private resourceUpdateInterval: NodeJS.Timeout | null = null;
  private maintenanceInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): HybridGameLoopService {
    if (!HybridGameLoopService.instance) {
      HybridGameLoopService.instance = new HybridGameLoopService();
    }
    return HybridGameLoopService.instance;
  }

  /**
   * Start the hybrid game loop with different intervals for different systems
   */
  start(): void {
    if (this.isRunning) {
      if (process.env.DEBUG_RESOURCES === 'true') {
        console.log('Hybrid game loop is already running');
      }
      return;
    }

    if (process.env.DEBUG_RESOURCES === 'true') {
      console.log('🎮 Starting HYBRID game loop with optimized intervals');
    }
    this.isRunning = true;

    // CRITICAL SYSTEMS: Check completions frequently (10 seconds)
    // This makes the game feel responsive for unit/tech completions
    this.completionCheckInterval = setInterval(async () => {
      try {
        await this.processCompletions();
      } catch (error) {
        console.error('Error in completion processing:', error);
      }
    }, 10000); // 10 seconds - much more responsive!

    // RESOURCE SYSTEMS: Update resources moderately (60 seconds) 
    // Resources don't need to be instant - 1 minute is fine
    this.resourceUpdateInterval = setInterval(async () => {
      try {
        await this.updateEmpireResources();
      } catch (error) {
        console.error('Error in resource updates:', error);
      }
    }, 60000); // 1 minute

    // MAINTENANCE SYSTEMS: Run cleanup infrequently (5 minutes)
    // Things like research completion, cleanup, etc.
    this.maintenanceInterval = setInterval(async () => {
      try {
        await this.processMaintenanceTasks();
      } catch (error) {
        console.error('Error in maintenance tasks:', error);
      }
    }, 300000); // 5 minutes

    if (process.env.DEBUG_RESOURCES === 'true') {
      console.log('✅ Hybrid game loop started:');
      console.log('   🔄 Completions: Every 10 seconds (responsive)');
      console.log('   💰 Resources: Every 60 seconds (efficient)');
      console.log('   🧹 Maintenance: Every 5 minutes (lightweight)');
    }
  }

  /**
   * Stop all game loop intervals
   */
  stop(): void {
    if (this.completionCheckInterval) {
      clearInterval(this.completionCheckInterval);
      this.completionCheckInterval = null;
    }
    if (this.resourceUpdateInterval) {
      clearInterval(this.resourceUpdateInterval);
      this.resourceUpdateInterval = null;
    }
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }
    
    this.isRunning = false;
    if (process.env.DEBUG_RESOURCES === 'true') {
      console.log('🛑 Hybrid game loop stopped');
    }
  }

  /**
   * REAL-TIME: Check for completions when user is actively playing
   * Call this whenever a user performs an action (login, build, etc.)
   */
  async checkUserCompletions(empireId: string): Promise<void> {
    if (process.env.DEBUG_RESOURCES === 'true') {
      console.log(`🔍 Checking completions for active empire: ${empireId}`);
    }
    
    try {
      const results = await Promise.all([
        this.processEmpireUnitCompletions(empireId),
        this.processEmpireTechCompletions(empireId),
        this.processEmpireDefenseCompletions(empireId),
        this.processEmpireFleetArrivals(empireId)
      ]);

      const [unitResults, techResults, defenseResults, fleetResults] = results;
      
      if (unitResults.completed > 0 || techResults.completed > 0 || defenseResults.completed > 0 || fleetResults > 0) {
        console.log(`✅ Immediate completions for empire ${empireId}: units=${unitResults.completed} tech=${techResults.completed} defense=${defenseResults.completed} fleets=${fleetResults}`);
      }
    } catch (error) {
      console.error(`Error checking user completions for empire ${empireId}:`, error);
    }
  }

  /**
   * FREQUENT: Process all completion systems (10 second interval)
   */
  private async processCompletions(): Promise<void> {
    try {
      const [techStats, unitStats, defenseStats, fleetArrivals] = await Promise.all([
        this.processTechQueue(),
        this.processUnitQueue(),
        this.processDefenseQueue(),
        this.processFleetArrivals()
      ]);

      // Only log if there was actual activity
      const totalActivity = techStats.completed + unitStats.completed + defenseStats.completed + fleetArrivals;
      if (totalActivity > 0) {
        if (process.env.DEBUG_RESOURCES === 'true') {
          console.log(
            `[HybridLoop] completions: tech=${techStats.completed} units=${unitStats.completed} defense=${defenseStats.completed} fleets=${fleetArrivals}`
          );
        }
      }
    } catch (error) {
      console.error('❌ Error in completion processing:', error);
    }
  }

  /**
   * MODERATE: Update empire resources (60 second interval)
   */
  private async updateEmpireResources(): Promise<void> {
    const dbType = getDatabaseType();
    
    try {
      if (dbType === 'supabase') {
        // Supabase path: Query active empires from Supabase
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const { supabase } = await import('../config/supabase');
        
        const { data: activeEmpires, error } = await supabase
          .from('empires')
          .select('id')
          .or(`last_resource_update.gte.${oneDayAgo.toISOString()},last_resource_update.is.null`);

        if (error) {
          console.error('Error fetching active empires from Supabase:', error);
          return;
        }

        let updated = 0;
        let errors = 0;

        for (const empire of activeEmpires || []) {
          try {
            const empireId = empire.id;
            await SupabaseResourceService.updateEmpireResources(empireId);
            await SupabaseResourceService.updateEmpireCreditsAligned(empireId);
            // Update per-base citizens for this empire
            await SupabaseBaseCitizenService.updateEmpireBases(empireId);
            updated++;
          } catch (empError) {
            errors++;
            console.error(`Error updating resources for empire ${empire.id}:`, empError);
          }
        }

        if (process.env.DEBUG_RESOURCES === 'true') {
          console.log(`[HybridLoop] resources updated: ${updated}/${activeEmpires?.length || 0} empires (Supabase)`);
        }
      } else {
        // MongoDB path
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const activeEmpires = await Empire.find({
          $or: [
            { lastResourceUpdate: { $gte: oneDayAgo } },
            { lastResourceUpdate: { $exists: false } }
          ]
        });

        let updated = 0;
        let errors = 0;

        for (const empire of activeEmpires) {
          try {
            const empireId = (empire._id as mongoose.Types.ObjectId).toString();
            await ResourceService.updateEmpireResources(empireId);
            await ResourceService.updateEmpireCreditsAligned(empireId);
            // Update per-base citizens for this empire
            const { BaseCitizenService } = await import('./baseCitizenService');
            await BaseCitizenService.updateEmpireBases(empireId);
            updated++;
          } catch (error) {
            errors++;
            console.error(`Error updating resources for empire ${empire._id}:`, error);
          }
        }

        if (process.env.DEBUG_RESOURCES === 'true') {
          console.log(`[HybridLoop] resources updated: ${updated}/${activeEmpires.length} empires (MongoDB)`);
        }
      }
    } catch (error) {
      console.error('Error in resource updates:', error);
    }
  }

  /**
   * INFREQUENT: Process maintenance tasks (5 minute interval)
   */
  private async processMaintenanceTasks(): Promise<void> {
    if (process.env.DEBUG_RESOURCES === 'true') {
      console.log('🧹 Running maintenance tasks...');
    }
    
    try {
      // Complete finished research projects
      const researchCompleted = await this.completeResearchProjects();
      
      // Activate any pending research if credits and capacity are available
      const techActivated = await this.activatePendingTech();

      if (researchCompleted > 0 || techActivated.activated > 0) {
        if (process.env.DEBUG_RESOURCES === 'true') {
          console.log(`[HybridLoop] maintenance: research=${researchCompleted} techActivated=${techActivated.activated}`);
        }
      }
    } catch (error) {
      console.error('❌ Error in maintenance tasks:', error);
    }
  }

  // ===== EMPIRE-SPECIFIC COMPLETION METHODS =====
  
  /**
   * Check unit completions for a specific empire
   */
  private async processEmpireUnitCompletions(empireId: string): Promise<{ completed: number; errors: number }> {
    const now = new Date();
    let completed = 0;
    let errors = 0;

    try {
      const dueItems = await UnitQueue.find({
        empireId: new mongoose.Types.ObjectId(empireId),
        status: 'pending',
        completesAt: { $lte: now }
      });

      for (const item of dueItems) {
        try {
          // Use your existing completion logic
          await this.completeUnitItem(item);
          completed++;
        } catch (err) {
          errors++;
          console.error('Error completing unit for empire:', err);
        }
      }
    } catch (error) {
      console.error(`Error processing empire ${empireId} unit completions:`, error);
    }

    return { completed, errors };
  }

  /**
   * Check tech completions for a specific empire
   */
  private async processEmpireTechCompletions(empireId: string): Promise<{ completed: number; errors: number }> {
    const now = new Date();
    let completed = 0;
    let errors = 0;

    try {
      const dueItems = await TechQueue.find({
        empireId: new mongoose.Types.ObjectId(empireId),
        status: 'pending',
        completesAt: { $lte: now }
      });

      for (const item of dueItems) {
        try {
          // Use your existing completion logic
          await this.completeTechItem(item);
          completed++;
        } catch (err) {
          errors++;
          console.error('Error completing tech for empire:', err);
        }
      }
    } catch (error) {
      console.error(`Error processing empire ${empireId} tech completions:`, error);
    }

    return { completed, errors };
  }

  /**
   * Check defense completions for a specific empire  
   */
  private async processEmpireDefenseCompletions(empireId: string): Promise<{ completed: number; errors: number }> {
    const { DefenseQueue } = await import('../models/DefenseQueue');
    const now = new Date();
    let completed = 0;
    let errors = 0;

    try {
      const dueItems = await DefenseQueue.find({
        empireId: new mongoose.Types.ObjectId(empireId),
        status: 'pending',
        completesAt: { $lte: now }
      });

      for (const item of dueItems) {
        try {
          await DefenseQueue.updateOne({ _id: item._id }, { $set: { status: 'completed' } });
          completed++;
        } catch (err) {
          errors++;
          console.error('Error completing defense for empire:', err);
        }
      }
    } catch (error) {
      console.error(`Error processing empire ${empireId} defense completions:`, error);
    }

    return { completed, errors };
  }

  /**
   * Check fleet arrivals for a specific empire
   */
  private async processEmpireFleetArrivals(empireId: string): Promise<number> {
    const now = new Date();
    let completed = 0;

    try {
      const { FleetMovement } = await import('../models/FleetMovement');
      const dueArrivals = await FleetMovement.find({
        empireId: new mongoose.Types.ObjectId(empireId),
        status: 'travelling',
        estimatedArrivalTime: { $lte: now }
      });

      if (dueArrivals.length > 0) {
        // Use the existing FleetMovementService to process arrivals
        await FleetMovementService.processArrivals();
        completed = dueArrivals.length;
      }
    } catch (error) {
      console.error(`Error processing empire ${empireId} fleet arrivals:`, error);
    }

    return completed;
  }

  // ===== HELPER METHODS (Extracted from your original code) =====

  private async completeUnitItem(item: any): Promise<void> {
    // Your existing unit completion logic from processUnitQueue
    const empire = await Empire.findById(item.empireId);
    if (!empire) {
      item.status = 'cancelled';
      await item.save();
      return;
    }

    item.status = 'completed';
    await item.save();

    // Add to fleet logic... (your existing code)
    const baseCoord = String(item.locationCoord || '');
    const empireId = empire._id as mongoose.Types.ObjectId;
    
    let fleet = await Fleet.findOne({ empireId, locationCoord: baseCoord }).sort({ createdAt: -1 });
    
    if (!fleet) {
      const nextNum = Math.max(1, Number((empire as any).nextFleetNumber || 1));
      const name = `Fleet ${nextNum}`;
      
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

    // Emit Socket.IO event
    const unitCount = fleet.units.reduce((sum, u) => sum + u.count, 0);
    const fleetId = (fleet._id as mongoose.Types.ObjectId).toString();
    emitFleetUpdate(empireId.toString(), {
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
  }

  private async completeTechItem(item: any): Promise<void> {
    // Your existing tech completion logic from processTechQueue
    const empire = await Empire.findById(item.empireId);
    if (!empire) {
      item.status = 'cancelled';
      await item.save();
      return;
    }

    const mapVal = (empire as any).techLevels as Map<string, number> | undefined;
    const targetLevel = Math.max(1, Number((item as any).level || 1));
    if (mapVal) {
      const current = Number(mapVal.get(item.techKey as any) || 0);
      mapVal.set(item.techKey as any, Math.max(current, targetLevel));
    } else {
      (empire as any).techLevels = new Map<string, number>([[item.techKey as any, targetLevel]]);
    }

    await empire.save();

    item.status = 'completed';
    await item.save();
  }

  // ===== REAL IMPLEMENTATIONS FROM ORIGINAL GAME LOOP =====

  /**
   * Process technology queue completions
   */
  private async processTechQueue(): Promise<{ completed: number; cancelled: number; errors: number }> {
    // Use Supabase service if using Supabase database
    if (getDatabaseType() === 'supabase') {
      return await SupabaseCompletionService.completeTechQueue();
    }

    // MongoDB path
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
            console.warn(`[HybridLoop] tech cancel missingEmpire techKey=${(item as any).techKey} location=${(item as any).locationCoord}`);
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

          console.log(`[HybridLoop] tech completed key=${item.techKey} empire=${empire._id} location=${item.locationCoord} level=${(item as any).level || 1}`);
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
    // Use Supabase service if using Supabase database
    if (getDatabaseType() === 'supabase') {
      return await SupabaseCompletionService.completeUnitQueue();
    }

    // MongoDB path
    let completed = 0;
    let cancelled = 0;
    let errors = 0;

    try {
      const now = new Date();

      // Find all pending items that have completed (reduced logging for performance)
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
            console.warn(`[HybridLoop] unit cancel missingEmpire unitKey=${(item as any).unitKey} location=${(item as any).locationCoord}`);
            continue;
          }

          // Use the existing completeUnitItem method
          await this.completeUnitItem(item);
          completed++;
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
   * Defense queue (citizen capacity):
   * - Complete due items (status=pending, completesAt <= now). For now we just mark completed.
   * - For bases without an in-progress item, schedule the earliest pending waiting item using current citizen capacity
   */
  private async processDefenseQueue(): Promise<{ completed: number; activated: number; errors: number }> {
    // Use Supabase service if using Supabase database
    if (getDatabaseType() === 'supabase') {
      const result = await SupabaseCompletionService.completeDefenseQueue();
      return { completed: result.completed, activated: 0, errors: result.errors };
    }

    // MongoDB path
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
          console.error('[HybridLoop] defense completion error', e);
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
          console.error('[HybridLoop] defense activation error', e);
        }
      }
    } catch (e) {
      console.error('[HybridLoop] processDefenseQueue top-level error', e);
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
          console.log(`[HybridLoop] research completed name="${project.name}" empire=${project.empireId}`);
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
          console.log(`[HybridLoop] tech activated key=${techKey} base=${baseCoord} level=${desiredLevel} etaMinutes=${etaMinutes}`);
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
   * Process fleet arrivals - fleets that have completed their travel time
   * This is critical for MMO gameplay - fleets need to arrive promptly!
   */
  private async processFleetArrivals(): Promise<number> {
    const dbType = getDatabaseType();
    
    try {
      const currentTime = new Date();
      
      if (dbType === 'supabase') {
        // Supabase path: Query arrivals from Supabase
        const { supabase } = await import('../config/supabase');
        const { data: arrivals, error } = await supabase
          .from('fleet_movements')
          .select('id')
          .eq('status', 'travelling')
          .lte('estimated_arrival_time', currentTime.toISOString());

        if (error) {
          console.error('Error fetching fleet arrivals from Supabase:', error);
          return 0;
        }

        // Process arrivals using SupabaseFleetMovementService
        if (arrivals && arrivals.length > 0) {
          await SupabaseFleetMovementService.processArrivals();
          console.log(`[HybridLoop] fleet arrivals processed: ${arrivals.length} (Supabase)`);
        }

        return arrivals?.length || 0;
      } else {
        // MongoDB path
        const { FleetMovement } = await import('../models/FleetMovement');
        const arrivals = await FleetMovement.find({
          status: 'travelling',
          estimatedArrivalTime: { $lte: currentTime }
        });

        // Process arrivals using the existing FleetMovementService
        if (arrivals.length > 0) {
          await FleetMovementService.processArrivals();
          console.log(`[HybridLoop] fleet arrivals processed: ${arrivals.length} (MongoDB)`);
        }

        return arrivals.length;
      }
    } catch (error) {
      console.error('Error processing fleet arrivals in hybrid loop:', error);
      return 0;
    }
  }

  isGameLoopRunning(): boolean {
    return this.isRunning;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      intervals: {
        completions: '10 seconds',
        resources: '60 seconds', 
        maintenance: '300 seconds'
      }
    };
  }
}

// Export singleton instance
export const hybridGameLoop = HybridGameLoopService.getInstance();