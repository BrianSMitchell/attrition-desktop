import { supabase } from '../config/supabase';

// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';

import { supabase } from '../config/supabase';
import { ResourceService } from './resources/ResourceService';
import { BuildingService } from './buildingService';
import { CapacityService } from './bases/CapacityService';
import { TechService } from './tech/TechService';
import { getTechSpec, getTechCreditCostForLevel, getUnitSpec } from '@game/shared';
import { emitFleetUpdate } from '../utils/socketManager';
import { FleetMovementService } from './fleets/FleetMovementService';
import { SupabaseCompletionService } from './completionService';
import { CitizenService } from './bases/CitizenService';

import { STATUS_CODES } from '@shared/constants/magic-numbers';
import { ENV_VARS } from '../../../shared/src/constants/env-vars';

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
      if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
        console.log('Hybrid game loop is already running');
      }
      return;
    }

    if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
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

    if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
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
    if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
      console.log('🛑 Hybrid game loop stopped');
    }
  }

  /**
   * REAL-TIME: Check for completions when user is actively playing
   * Call this whenever a user performs an action (login, build, etc.)
   */
  async checkUserCompletions(empireId: string): Promise<void> {
    if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
      console.log(`🔍 Checking completions for active empire: ${empireId}`);
    }
    
    try {
      const results = await Promise.all([
        this.processEmpireUnitCompletions(empireId),
        this.processEmpireTechCompletions(empireId),
        this.processEmpireBuildingCompletions(empireId),
        this.processEmpireDefenseCompletions(empireId),
        this.processEmpireFleetArrivals(empireId)
      ]);

      const [unitResults, techResults, buildingResults, defenseResults, fleetResults] = results;
      
      if (unitResults.completed > 0 || techResults.completed > 0 || buildingResults.completed > 0 || defenseResults.completed > 0 || fleetResults > 0) {
        console.log(`✅ Immediate completions for empire ${empireId}: units=${unitResults.completed} tech=${techResults.completed} buildings=${buildingResults.completed} defense=${defenseResults.completed} fleets=${fleetResults}`);
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
      const [techStats, unitStats, defenseStats, buildingStats, fleetArrivals] = await Promise.all([
        this.processTechQueue(),
        this.processUnitQueue(),
        this.processDefenseQueue(),
        this.processBuildingQueue(),
        this.processFleetArrivals()
      ]);

      // Only log if there was actual activity
      const totalActivity = techStats.completed + unitStats.completed + defenseStats.completed + buildingStats.activatedCount + fleetArrivals;
      if (totalActivity > 0) {
        if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
          console.log(
            `[HybridLoop] completions: tech=${techStats.completed} units=${unitStats.completed} defense=${defenseStats.completed} buildings=${buildingStats.activatedCount} fleets=${fleetArrivals}`
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
    try {
      // Get all empires that have been active in the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const { data: activeEmpires, error } = await supabase
        .from(DB_TABLES.EMPIRES)
        .select(DB_FIELDS.BUILDINGS.ID)
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
await ResourceService.updateEmpireResources(empireId);
await ResourceService.updateEmpireCreditsAligned(empireId);
          // Update per-base citizens for this empire
await CitizenService.updateEmpireBases(empireId);
          updated++;
        } catch (empError) {
          errors++;
          console.error(`Error updating resources for empire ${empire.id}:`, empError);
        }
      }

      if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
        console.log(`[HybridLoop] resources updated: ${updated}/${activeEmpires?.length || 0} empires`);
      }
    } catch (error) {
      console.error('Error in resource updates:', error);
    }
  }

  /**
   * INFREQUENT: Process maintenance tasks (5 minute interval)
   */
  private async processMaintenanceTasks(): Promise<void> {
    if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
      console.log('🧹 Running maintenance tasks...');
    }
    
    try {
      // Complete finished research projects
      const researchCompleted = await this.completeResearchProjects();
      
      // Activate any pending research if credits and capacity are available
      const techActivated = await this.activatePendingTech();

      if (researchCompleted > 0 || techActivated.activated > 0) {
        if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
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
      const { data: dueItems, error } = await supabase
        .from(DB_TABLES.UNIT_QUEUES)
        .select('*')
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending')
        .lte(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, now.toISOString());

      if (error) {
        console.error('Error fetching due unit items:', error);
        errors++;
        return { completed, errors };
      }

      for (const item of dueItems || []) {
        try {
          // Use existing completion logic adapted for Supabase
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
      const { data: dueItems, error } = await supabase
        .from(DB_TABLES.TECH_QUEUES)
        .select('*')
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending')
        .lte(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, now.toISOString());

      if (error) {
        console.error('Error fetching due tech items:', error);
        errors++;
        return { completed, errors };
      }

      for (const item of dueItems || []) {
        try {
          // Use existing completion logic adapted for Supabase
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
   * Check building completions for a specific empire
   */
  private async processEmpireBuildingCompletions(empireId: string): Promise<{ completed: number; errors: number }> {
    let completed = 0;
    let errors = 0;

    try {
      const now = new Date();

      const { data: buildings, error } = await supabase
        .from(DB_TABLES.BUILDINGS)
        .select('*')
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.BUILDINGS.IS_ACTIVE, false)
        .lte(DB_FIELDS.BUILDINGS.CONSTRUCTION_COMPLETED, now.toISOString());

      if (error) {
        console.error('Error fetching due buildings:', error);
        errors++;
        return { completed, errors };
      }

      for (const building of buildings || []) {
        try {
          // Handle upgrade vs new building
          const newLevel = building.pending_upgrade
            ? Math.max(1, Number(building.level || 0)) + 1
            : Math.max(1, Number(building.level || 0));

          // Update building as completed
          const { error: updateError } = await supabase
            .from(DB_TABLES.BUILDINGS)
            .update({
              level: newLevel,
              is_active: true,
              pending_upgrade: false,
              construction_completed: null
            })
            .eq(DB_FIELDS.BUILDINGS.ID, building.id);

          if (updateError) {
            console.error('Error updating building:', updateError);
            errors++;
            continue;
          }

          completed++;

          // Schedule next queued building at this base
          try {
            await BuildingService.scheduleNextQueuedForBase(empireId, building.location_coord);
          } catch (schedErr) {
            console.error('Error scheduling next building:', schedErr);
          }
        } catch (err) {
          errors++;
          console.error('Error completing building for empire:', err);
        }
      }
    } catch (error) {
      console.error(`Error processing empire ${empireId} building completions:`, error);
    }

    return { completed, errors };
  }

  /**
   * Check defense completions for a specific empire  
   */
  private async processEmpireDefenseCompletions(empireId: string): Promise<{ completed: number; errors: number }> {
    const now = new Date();
    let completed = 0;
    let errors = 0;

    try {
      const { data: dueItems, error } = await supabase
        .from(DB_TABLES.DEFENSE_QUEUES)
        .select('*')
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending')
        .lte(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, now.toISOString());

      if (error) {
        console.error('Error fetching due defense items:', error);
        errors++;
        return { completed, errors };
      }

      for (const item of dueItems || []) {
        try {
          const { error: updateError } = await supabase
            .from(DB_TABLES.DEFENSE_QUEUES)
            .update({ status: 'completed' })
            .eq(DB_FIELDS.BUILDINGS.ID, item.id);

          if (updateError) {
            console.error('Error updating defense item:', updateError);
            errors++;
          } else {
            completed++;
          }
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
      const { data: dueArrivals, error } = await supabase
        .from(DB_TABLES.FLEET_MOVEMENTS)
        .select('*')
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
        .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'travelling')
        .lte('estimated_arrival_time', now.toISOString());

      if (error) {
        console.error('Error fetching due fleet arrivals:', error);
        return completed;
      }

      if (dueArrivals && dueArrivals.length > 0) {
        // Use the existing SupabaseFleetMovementService to process arrivals
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
    // Your existing unit completion logic adapted for Supabase
    const { data: empire, error: empireError } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('*')
      .eq(DB_FIELDS.BUILDINGS.ID, item.empire_id)
      .maybeSingle();

    if (empireError || !empire) {
      // Mark as cancelled if empire is missing
      await supabase
        .from(DB_TABLES.UNIT_QUEUES)
        .update({ status: 'cancelled' })
        .eq(DB_FIELDS.BUILDINGS.ID, item.id);
      return;
    }

    // Mark unit queue item as completed
    await supabase
      .from(DB_TABLES.UNIT_QUEUES)
      .update({ status: 'completed' })
      .eq(DB_FIELDS.BUILDINGS.ID, item.id);

    // Add to fleet logic... (adapted for Supabase)
    const baseCoord = String(item.location_coord || '');
    const empireId = empire.id;

    // Find most recent stationed fleet at this base; if none, create a new one with auto-generated name
    const { data: existingFleets, error: fleetError } = await supabase
      .from(DB_TABLES.FLEETS)
      .select('*')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, baseCoord)
      .order(DB_FIELDS.BUILDINGS.CREATED_AT, { ascending: false })
      .limit(1);

    if (fleetError) {
      console.error('Error fetching existing fleets:', fleetError);
      return;
    }

    let fleet = existingFleets?.[0];

    if (!fleet) {
      const nextNum = Math.max(1, Number(empire.next_fleet_number || 1));
      const name = `Fleet ${nextNum}`;

      // Increment nextFleetNumber for the empire
      await supabase
        .from(DB_TABLES.EMPIRES)
        .update({ next_fleet_number: nextNum + 1 })
        .eq(DB_FIELDS.BUILDINGS.ID, empire.id);

      const { data: newFleet, error: createError } = await supabase
        .from(DB_TABLES.FLEETS)
        .insert({
          empire_id: empireId,
          location_coord: baseCoord,
          name,
          units: [],
          size_credits: 0
        })
        .select('*')
        .single();

      if (createError) {
        console.error('Error creating new fleet:', createError);
        return;
      }

      fleet = newFleet;
    }

    const key = String(item.unit_key || '');
    const spec = getUnitSpec(key as any);
    const unitCredits = Number(spec?.creditsCost || 0);

    const currentUnits = fleet.units || [];
    type UnitInfo = { unitKey: string; count: number };
    const existing = currentUnits.find((u: UnitInfo) => u.unitKey === key);

    let updatedUnits;
    if (existing) {
      updatedUnits = currentUnits.map((u: UnitInfo) =>
        u.unitKey === key ? { ...u, count: u.count + 1 } : u
      );
    } else {
      updatedUnits = [...currentUnits, { unitKey: key, count: 1 }];
    }

    const newSizeCredits = Math.max(0, Number(fleet.size_credits || 0)) + unitCredits;

    // Update fleet in database
    const { error: fleetUpdateError } = await supabase
      .from(DB_TABLES.FLEETS)
      .update({
        units: updatedUnits,
        size_credits: newSizeCredits
      })
      .eq(DB_FIELDS.BUILDINGS.ID, fleet.id);

    if (fleetUpdateError) {
      console.error('Error updating fleet:', fleetUpdateError);
      return;
    }

    // Emit Socket.IO event to notify client of fleet update
    const unitCount = updatedUnits.reduce((sum: number, u: UnitInfo) => sum + u.count, 0);
    const fleetId = fleet.id;
    emitFleetUpdate(empireId, {
      fleetId,
      locationCoord: fleet.location_coord,
      name: fleet.name,
      sizeCredits: newSizeCredits,
      unitCount,
      unitAdded: {
        unitKey: key,
        creditsCost: unitCredits
      }
    });
  }

  private async completeTechItem(item: any): Promise<void> {
    // Your existing tech completion logic adapted for Supabase
    const { data: empire, error: empireError } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('*')
      .eq(DB_FIELDS.BUILDINGS.ID, item.empire_id)
      .maybeSingle();

    if (empireError || !empire) {
      // Mark as cancelled if empire is missing
      await supabase
        .from(DB_TABLES.TECH_QUEUES)
        .update({ status: 'cancelled' })
        .eq(DB_FIELDS.BUILDINGS.ID, item.id);
      return;
    }

    // Promote tech level to the queued target level (multi-level support)
    const techLevels = (empire as any).tech_levels || {};
    const targetLevel = Math.max(1, Number(item.level || 1));
    const currentLevel = Number(techLevels[item.tech_key] || 0);
    techLevels[item.tech_key] = Math.max(currentLevel, targetLevel);

    // Update empire with new tech level
    const { error: empireUpdateError } = await supabase
      .from(DB_TABLES.EMPIRES)
      .update({ tech_levels: techLevels })
      .eq(DB_FIELDS.BUILDINGS.ID, empire.id);

    if (empireUpdateError) {
      console.error('Error updating empire tech levels:', empireUpdateError);
      return;
    }

    // Mark queue item as completed
    await supabase
      .from(DB_TABLES.TECH_QUEUES)
      .update({ status: 'completed' })
      .eq(DB_FIELDS.BUILDINGS.ID, item.id);
  }

  // ===== REAL IMPLEMENTATIONS FROM ORIGINAL GAME LOOP =====

  /**
   * Process technology queue completions
   */
  private async processTechQueue(): Promise<{ completed: number; cancelled: number; errors: number }> {
    // Use Supabase service for tech queue processing
    return await SupabaseCompletionService.completeTechQueue();
  }

  /**
   * Process unit queue completions
   */
  private async processUnitQueue(): Promise<{ completed: number; cancelled: number; errors: number }> {
    // Use Supabase service for unit queue processing
    return await SupabaseCompletionService.completeUnitQueue();
  }

  /**
   * Process building queue completions
   * Activates buildings whose construction time has completed
   */
  private async processBuildingQueue(): Promise<{ activatedCount: number; activatedIds: string[] }> {
    try {
      // Use the existing BuildingService method
      const result = await BuildingService.completeDueConstructions();
      
      if (result.activatedCount > 0) {
        console.log(`[HybridLoop] buildings activated: ${result.activatedCount}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error processing building queue:', error);
      return { activatedCount: 0, activatedIds: [] };
    }
  }

  /**
   * Defense queue (citizen capacity):
   * - Complete due items (status=pending, completesAt <= now). For now we just mark completed.
   * - For bases without an in-progress item, schedule the earliest pending waiting item using current citizen capacity
   */
  private async processDefenseQueue(): Promise<{ completed: number; activated: number; errors: number }> {
    // Use Supabase service for defense queue processing
    const result = await SupabaseCompletionService.completeDefenseQueue();
    return { completed: result.completed, activated: 0, errors: result.errors };
  }

  /**
   * Complete research projects that have finished
   */
  private async completeResearchProjects(): Promise<number> {
    let completedCount = 0;
    try {
      const now = new Date();

      // Find research projects that should be completed
      const { data: completedProjects, error } = await supabase
        .from(DB_TABLES.RESEARCH_PROJECTS)
        .select('*')
        .eq(DB_FIELDS.RESEARCH_PROJECTS.IS_COMPLETED, false)
        .filter('research_progress', 'gte', 'research_cost');

      if (error) {
        console.error('Error fetching completed research projects:', error);
        return completedCount;
      }

      for (const project of completedProjects || []) {
        try {
          // Update project as completed
          const { error: updateError } = await supabase
            .from(DB_TABLES.RESEARCH_PROJECTS)
            .update({
              is_completed: true,
              completed_at: now.toISOString()
            })
            .eq(DB_FIELDS.BUILDINGS.ID, project.id);

          if (updateError) {
            console.error('Error updating research project:', updateError);
            continue;
          }

          // Apply research benefits to empire
          await this.applyResearchBenefits(project);

          completedCount++;
          console.log(`[HybridLoop] research completed name="${project.name}" empire=${project.empire_id}`);
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
      const { data: empire, error } = await supabase
        .from(DB_TABLES.EMPIRES)
        .select('*')
        .eq(DB_FIELDS.BUILDINGS.ID, project.empire_id)
        .maybeSingle();

      if (error || !empire) {
        console.error('Error fetching empire for research benefits:', error);
        return;
      }

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
      const now = new Date();

      // Find pending items that are not yet scheduled (no completesAt) or not charged
      const { data: items, error } = await supabase
        .from(DB_TABLES.TECH_QUEUES)
        .select('*')
        .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending')
        .or('completes_at.is.null,completes_at.eq.,charged.eq.false')
        .order(DB_FIELDS.BUILDINGS.CREATED_AT, { ascending: true });

      if (error) {
        console.error('Error fetching pending tech items:', error);
        errors++;
        return { activated, skipped, errors };
      }

      for (const item of items || []) {
        try {
          const { data: empire, error: empireError } = await supabase
            .from(DB_TABLES.EMPIRES)
            .select('*')
            .eq(DB_FIELDS.BUILDINGS.ID, item.empire_id)
            .maybeSingle();

          if (empireError || !empire) {
            // Mark as cancelled if empire is missing
            const { error: cancelError } = await supabase
              .from(DB_TABLES.TECH_QUEUES)
              .update({ status: 'cancelled' })
              .eq(DB_FIELDS.BUILDINGS.ID, item.id);

            if (cancelError) {
              console.error('Error cancelling tech queue item:', cancelError);
            }

            // Defensive backfill: ensure identityKey exists for legacy docs missing it
            const empireIdStr = String(item.empire_id || '');
            const techKeyMissing = item.tech_key;
            const levelMissing = Math.max(1, Number(item.level || 1));
            if (!item.identity_key && techKeyMissing) {
              const { error: updateError } = await supabase
                .from(DB_TABLES.TECH_QUEUES)
                .update({ identity_key: `${empireIdStr}:${techKeyMissing}:${levelMissing}` })
                .eq(DB_FIELDS.BUILDINGS.ID, item.id);

              if (updateError) {
                console.error('Error updating identity_key:', updateError);
              }
            }

            skipped++;
            continue;
          }

          const empireIdStr = String(empire.id);
          const baseCoord = item.location_coord as string;

          // Re-evaluate capacity at this base
          const { research } = await CapacityService.getBaseCapacities(empireIdStr, baseCoord);
          const cap = Math.max(0, Number(research?.value || 0));
          if (cap <= 0) {
            skipped++;
            continue;
          }

          // Determine desired level and compute cost
          const techKey = item.tech_key;
          const desiredLevel = Math.max(1, Number(item.level || 1));
          const spec = getTechSpec(techKey);
          const creditsCost = getTechCreditCostForLevel(spec, desiredLevel);

          // Require sufficient credits now; otherwise remain pending
          if (empire.credits < creditsCost) {
            skipped++;
            continue;
          }

          // Schedule completesAt based on current capacity
          const hours = creditsCost / cap;
          const etaMinutes = Math.max(1, Math.ceil(hours * 60));
          const completesAt = new Date(now.getTime() + etaMinutes * 60 * 1000);

          // Update queue item with scheduling info
          const { error: updateError } = await supabase
            .from(DB_TABLES.TECH_QUEUES)
            .update({
              completes_at: completesAt.toISOString(),
              charged: true,
              identity_key: item.identity_key || `${empireIdStr}:${techKey}:${desiredLevel}`
            })
            .eq(DB_FIELDS.BUILDINGS.ID, item.id);

          if (updateError) {
            console.error('Error updating tech queue item:', updateError);
            errors++;
            continue;
          }

          // Charge credits after successful scheduling
          const { error: creditError } = await supabase
            .from(DB_TABLES.EMPIRES)
            .update({ credits: empire.credits - creditsCost })
            .eq(DB_FIELDS.BUILDINGS.ID, empire.id);

          if (creditError) {
            console.error('Error deducting credits for tech:', creditError);
            errors++;
            continue;
          }

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
    try {
      const currentTime = new Date();

      // Query arrivals from Supabase
      const { data: arrivals, error } = await supabase
        .from(DB_TABLES.FLEET_MOVEMENTS)
        .select(DB_FIELDS.BUILDINGS.ID)
        .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'travelling')
        .lte('estimated_arrival_time', currentTime.toISOString());

      if (error) {
        console.error('Error fetching fleet arrivals from Supabase:', error);
        return STATUS_CODES.SUCCESS;
      }

      // Process arrivals using SupabaseFleetMovementService
      if (arrivals && arrivals.length > 0) {
await FleetMovementService.processArrivals();
        console.log(`[HybridLoop] fleet arrivals processed: ${arrivals.length}`);
      }

      return arrivals?.length || 0;
    } catch (error) {
      console.error('Error processing fleet arrivals in hybrid loop:', error);
      return STATUS_CODES.SUCCESS;
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


