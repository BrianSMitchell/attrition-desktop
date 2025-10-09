import { supabase } from '../config/supabase';
import { ResourceService } from './resources/ResourceService';
import { BuildingService } from './buildingService';
import { CapacityService } from './bases/CapacityService';
import { TechService } from './tech/TechService';
import { getTechSpec, getTechCreditCostForLevel, getUnitSpec } from '@game/shared';
import { emitFleetUpdate } from '../utils/socketManager';
import { BaseCitizenService } from './baseCitizenService';
import { FleetMovementService } from './fleets/FleetMovementService';

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
    let completed = 0;
    let activated = 0;
    let errors = 0;
    try {
      const now = new Date();

      // 1) Complete all due items
      const { data: due, error: dueError } = await supabase
        .from('defense_queues')
        .select('*')
        .eq('status', 'pending')
        .lte('completes_at', now.toISOString());

      if (dueError) {
        console.error('[GameLoop] Error fetching due defense items:', dueError);
        errors++;
      } else {
        for (const it of due || []) {
          try {
            const { error } = await supabase
              .from('defense_queues')
              .update({ status: 'completed' })
              .eq('id', it.id);

            if (error) {
              errors++;
              console.error('[GameLoop] defense completion error', error);
            } else {
              completed++;
            }
          } catch (e) {
            errors++;
            console.error('[GameLoop] defense completion error', e);
          }
        }
      }

      // 2) Schedule waiting items per base that currently have no in-progress item
      const { data: waiting, error: waitingError } = await supabase
        .from('defense_queues')
        .select('*')
        .eq('status', 'pending')
        .or('completes_at.is.null,completes_at.eq.')
        .order('created_at', { ascending: true });

      if (waitingError) {
        console.error('[GameLoop] Error fetching waiting defense items:', waitingError);
        errors++;
      } else {
        // Group by base
        const byBase = new Map<string, any[]>();
        for (const it of waiting || []) {
          const key = `${it.empire_id}:${it.location_coord}`;
          if (!byBase.has(key)) byBase.set(key, []);
          byBase.get(key)!.push(it);
        }

        for (const [key, items] of byBase.entries()) {
          const [empireIdStr, baseCoord] = key.split(':');
          // Skip if already in progress
          const { data: inProgress, error: inProgressError } = await supabase
            .from('defense_queues')
            .select('id')
            .eq('empire_id', empireIdStr)
            .eq('location_coord', baseCoord)
            .eq('status', 'pending')
            .gt('completes_at', now.toISOString())
            .limit(1);

          if (inProgressError) {
            console.error('[GameLoop] Error checking in progress defense items:', inProgressError);
            errors++;
            continue;
          }

          if (inProgress && inProgress.length > 0) continue;

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
                const spec = getDefensesList().find((d: any) => d.key === next.defense_key);
                const c = Number(spec?.creditsCost || 0);
                return c > 0 ? c : 100;
              } catch { return 100; }
            })();
            const seconds = Math.max(60, Math.ceil((cost / perHour) * 3600));

            const { error } = await supabase
              .from('defense_queues')
              .update({
                started_at: now.toISOString(),
                completes_at: new Date(now.getTime() + seconds * 1000).toISOString()
              })
              .eq('id', next.id);

            if (error) {
              errors++;
              console.error('[GameLoop] defense activation error', error);
            } else {
              activated++;
            }
          } catch (e) {
            errors++;
            console.error('[GameLoop] defense activation error', e);
          }
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
      const { data: completedProjects, error } = await supabase
        .from('research_projects')
        .select('*')
        .eq('is_completed', false)
        .filter('research_progress', 'gte', 'research_cost');

      if (error) {
        console.error('Error fetching completed research projects:', error);
        return completedCount;
      }

      for (const project of completedProjects || []) {
        try {
          // Update project as completed
          const { error: updateError } = await supabase
            .from('research_projects')
            .update({
              is_completed: true,
              completed_at: now.toISOString()
            })
            .eq('id', project.id);

          if (updateError) {
            console.error('Error updating research project:', updateError);
            continue;
          }

          // Apply research benefits to empire
          await this.applyResearchBenefits(project);

          completedCount++;
          console.log(`[GameLoop] research completed name="${project.name}" empire=${project.empire_id}`);
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
        .from('empires')
        .select('*')
        .eq('id', project.empire_id)
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
        .from('tech_queues')
        .select('*')
        .eq('status', 'pending')
        .or('completes_at.is.null,completes_at.eq.,charged.eq.false')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching pending tech items:', error);
        errors++;
        return { activated, skipped, errors };
      }

      for (const item of items || []) {
        try {
          const { data: empire, error: empireError } = await supabase
            .from('empires')
            .select('*')
            .eq('id', item.empire_id)
            .maybeSingle();

          if (empireError || !empire) {
            // Mark as cancelled if empire is missing
            const { error: cancelError } = await supabase
              .from('tech_queues')
              .update({ status: 'cancelled' })
              .eq('id', item.id);

            if (cancelError) {
              console.error('Error cancelling tech queue item:', cancelError);
            }

            // Defensive backfill: ensure identityKey exists for legacy docs missing it
            const empireIdStr = String(item.empire_id || '');
            const techKeyMissing = item.tech_key;
            const levelMissing = Math.max(1, Number(item.level || 1));
            if (!item.identity_key && techKeyMissing) {
              const { error: updateError } = await supabase
                .from('tech_queues')
                .update({ identity_key: `${empireIdStr}:${techKeyMissing}:${levelMissing}` })
                .eq('id', item.id);

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
            .from('tech_queues')
            .update({
              completes_at: completesAt.toISOString(),
              charged: true,
              identity_key: item.identity_key || `${empireIdStr}:${techKey}:${desiredLevel}`
            })
            .eq('id', item.id);

          if (updateError) {
            console.error('Error updating tech queue item:', updateError);
            errors++;
            continue;
          }

          // Charge credits after successful scheduling
          const { error: creditError } = await supabase
            .from('empires')
            .update({ credits: empire.credits - creditsCost })
            .eq('id', empire.id);

          if (creditError) {
            console.error('Error deducting credits for tech:', creditError);
            errors++;
            continue;
          }

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
      const { data: dueItems, error } = await supabase
        .from('tech_queues')
        .select('*')
        .eq('status', 'pending')
        .lte('completes_at', now.toISOString());

      if (error) {
        console.error('Error fetching due tech items:', error);
        errors++;
        return { completed, cancelled, errors };
      }

      for (const item of dueItems || []) {
        try {
          const { data: empire, error: empireError } = await supabase
            .from('empires')
            .select('*')
            .eq('id', item.empire_id)
            .maybeSingle();

          if (empireError || !empire) {
            // Mark as cancelled if empire is missing
            const { error: cancelError } = await supabase
              .from('tech_queues')
              .update({ status: 'cancelled' })
              .eq('id', item.id);

            if (cancelError) {
              console.error('Error cancelling tech queue item:', cancelError);
            }

            // Defensive backfill: ensure identityKey exists for legacy docs missing it
            const empireIdStr = String(item.empire_id || '');
            const techKeyMissing = item.tech_key;
            const levelMissing = Math.max(1, Number(item.level || 1));
            if (!item.identity_key && techKeyMissing) {
              const { error: updateError } = await supabase
                .from('tech_queues')
                .update({ identity_key: `${empireIdStr}:${techKeyMissing}:${levelMissing}` })
                .eq('id', item.id);

              if (updateError) {
                console.error('Error updating identity_key:', updateError);
              }
            }

            cancelled++;
            console.warn(`[GameLoop] tech cancel missingEmpire techKey=${item.tech_key} location=${item.location_coord}`);
            continue;
          }

          // Promote tech level to the queued target level (multi-level support)
          const techLevels = (empire as any).tech_levels || {};
          const targetLevel = Math.max(1, Number(item.level || 1));
          const currentLevel = Number(techLevels[item.tech_key] || 0);
          techLevels[item.tech_key] = Math.max(currentLevel, targetLevel);

          // Update empire with new tech level
          const { error: empireUpdateError } = await supabase
            .from('empires')
            .update({ tech_levels: techLevels })
            .eq('id', empire.id);

          if (empireUpdateError) {
            console.error('Error updating empire tech levels:', empireUpdateError);
            errors++;
            continue;
          }

          // Mark queue item as completed
          const { error: itemUpdateError } = await supabase
            .from('tech_queues')
            .update({
              status: 'completed',
              identity_key: item.identity_key || `${empire.id}:${item.tech_key}:${targetLevel}`
            })
            .eq('id', item.id);

          if (itemUpdateError) {
            console.error('Error updating tech queue item:', itemUpdateError);
            errors++;
            continue;
          }

          completed++;
          console.log(`[GameLoop] tech completed key=${item.tech_key} empire=${empire.id} location=${item.location_coord} level=${item.level || 1}`);
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
      const { data: allPending, error: allPendingError } = await supabase
        .from('unit_queues')
        .select('*')
        .eq('status', 'pending');

      if (allPendingError) {
        console.error('Error fetching all pending units:', allPendingError);
      } else {
        console.log(`[GameLoop] Total pending units: ${allPending?.length || 0}`);
        for (const u of allPending || []) {
          console.log(`[GameLoop] Pending unit: id=${u.id} unitKey=${u.unit_key} completesAt=${u.completes_at || 'null'} status=${u.status}`);
        }
      }

      const { data: dueItems, error } = await supabase
        .from('unit_queues')
        .select('*')
        .eq('status', 'pending')
        .lte('completes_at', now.toISOString());

      if (error) {
        console.error('Error fetching due unit items:', error);
        errors++;
        return { completed, cancelled, errors };
      }

      console.log(`[GameLoop] Due items found: ${dueItems?.length || 0}`);
      for (const d of dueItems || []) {
        console.log(`[GameLoop] Due unit: id=${d.id} unitKey=${d.unit_key} completesAt=${d.completes_at}`);
      }

      for (const item of dueItems || []) {
        try {
          const { data: empire, error: empireError } = await supabase
            .from('empires')
            .select('*')
            .eq('id', item.empire_id)
            .maybeSingle();

          if (empireError || !empire) {
            // Mark as cancelled if empire is missing
            const { error: cancelError } = await supabase
              .from('unit_queues')
              .update({ status: 'cancelled' })
              .eq('id', item.id);

            if (cancelError) {
              console.error('Error cancelling unit queue item:', cancelError);
            }

            cancelled++;
            console.warn(`[GameLoop] unit cancel missingEmpire unitKey=${item.unit_key} location=${item.location_coord}`);
            continue;
          }

          // Mark unit production as completed and accumulate into a stationed fleet at this base
          console.log(`[GameLoop] Processing completed unit: unitKey=${item.unit_key} base=${item.location_coord} empireId=${empire.id}`);

          // Mark unit queue item as completed
          const { error: itemUpdateError } = await supabase
            .from('unit_queues')
            .update({ status: 'completed' })
            .eq('id', item.id);

          if (itemUpdateError) {
            console.error('Error updating unit queue item:', itemUpdateError);
            errors++;
            continue;
          }

          console.log(`[GameLoop] Unit queue item marked completed: id=${item.id}`);

          try {
            const baseCoord = String(item.location_coord || '');
            const empireId = empire.id;
            console.log(`[GameLoop] Looking for existing fleet at base=${baseCoord} empireId=${empireId}`);

            // Find most recent stationed fleet at this base; if none, create a new one with auto-generated name
            const { data: existingFleets, error: fleetError } = await supabase
              .from('fleets')
              .select('*')
              .eq('empire_id', empireId)
              .eq('location_coord', baseCoord)
              .order('created_at', { ascending: false })
              .limit(1);

            if (fleetError) {
              console.error('Error fetching existing fleets:', fleetError);
              errors++;
              continue;
            }

            let fleet = existingFleets?.[0];

            if (!fleet) {
              console.log(`[GameLoop] No existing fleet found, creating new fleet`);
              const nextNum = Math.max(1, Number(empire.next_fleet_number || 1));
              const name = `Fleet ${nextNum}`;

              // Increment nextFleetNumber for the empire
              const { error: empireUpdateError } = await supabase
                .from('empires')
                .update({ next_fleet_number: nextNum + 1 })
                .eq('id', empire.id);

              if (empireUpdateError) {
                console.error('Error updating empire fleet number:', empireUpdateError);
                errors++;
                continue;
              }

              console.log(`[GameLoop] Empire nextFleetNumber incremented to ${nextNum + 1}`);

              const { data: newFleet, error: createError } = await supabase
                .from('fleets')
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
                errors++;
                continue;
              }

              fleet = newFleet;
              console.log(`[GameLoop] Created new fleet: name="${name}" base=${baseCoord}`);
            } else {
              console.log(`[GameLoop] Found existing fleet: id=${fleet.id} name="${fleet.name}" unitCount=${fleet.units?.length || 0}`);
            }

            // Add the completed unit to the fleet composition and update sizeCredits
            const key = String(item.unit_key || '');
            const spec = getUnitSpec(key as any);
            const unitCredits = Number(spec?.creditsCost || 0);
            console.log(`[GameLoop] Adding unit to fleet: unitKey=${key} creditsCost=${unitCredits}`);

            const currentUnits = fleet.units || [];
            type UnitInfo = { unitKey: string; count: number };
            const existing = currentUnits.find((u: UnitInfo) => u.unitKey === key);

            let updatedUnits;
            if (existing) {
              updatedUnits = currentUnits.map((u: UnitInfo) =>
                u.unitKey === key ? { ...u, count: u.count + 1 } : u
              );
              console.log(`[GameLoop] Incremented existing unit count to ${existing.count + 1}`);
            } else {
              updatedUnits = [...currentUnits, { unitKey: key, count: 1 }];
              console.log(`[GameLoop] Added new unit type to fleet`);
            }

            const newSizeCredits = Math.max(0, Number(fleet.size_credits || 0)) + unitCredits;
            console.log(`[GameLoop] Fleet size updated to ${newSizeCredits} credits, unit types: ${updatedUnits.length}`);

            // Update fleet in database
            const { error: fleetUpdateError } = await supabase
              .from('fleets')
              .update({
                units: updatedUnits,
                size_credits: newSizeCredits
              })
              .eq('id', fleet.id);

            if (fleetUpdateError) {
              console.error('Error updating fleet:', fleetUpdateError);
              errors++;
              continue;
            }

            console.log(`[GameLoop] Fleet saved successfully: id=${fleet.id}`);

            // Emit Socket.IO event to notify client of fleet update
            const unitCount = updatedUnits.reduce((sum: number, u: UnitInfo) => sum + u.count, 0);
            const fleetId = fleet.id;
            const emitted = emitFleetUpdate(empireId, {
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

            if (emitted) {
              console.log(`[GameLoop] ✅ Emitted fleet:updated event for fleet ${fleet.id} to empire:${empireId} (${unitCount} units)`);
            } else {
              console.warn(`[GameLoop] ⚠️ Failed to emit fleet:updated event - Socket.IO may not be initialized`);
            }
          } catch (e) {
            console.error('[GameLoop] ❌ ERROR updating fleet for completed unit', {
              unitKey: String(item.unit_key || ''),
              empireId: String(empire.id || ''),
              base: String(item.location_coord || ''),
              errorMessage: (e as any)?.message,
              errorStack: (e as any)?.stack
            });
            // Re-throw to ensure we know about fleet creation failures
            throw e;
          }

          completed++;

          console.log(`[GameLoop] unit completed key=${item.unit_key} empire=${empire.id} location=${item.location_coord}`);
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

      const { data: activeEmpires, error } = await supabase
        .from('empires')
        .select('*')
        .or(`last_resource_update.gte.${oneDayAgo.toISOString()},last_resource_update.is.null`);

      if (error) {
        console.error('Error fetching active empires:', error);
        errors++;
        return { updated, errors };
      }

      for (const empire of activeEmpires || []) {
        try {
          const empireId = empire.id;
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
          console.error(`Error updating resources for empire ${empire.id}:`, error);
        }
      }

      console.log(`[GameLoop] resources updated count=${updated} scanned=${activeEmpires?.length || 0}`);
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
      const { data: activeProjects, error } = await supabase
        .from('research_projects')
        .select('*')
        .eq('is_completed', false);

      if (error) {
        console.error('Error fetching active research projects:', error);
        return;
      }

      for (const project of activeProjects || []) {
        try {
          const { data: empire, error: empireError } = await supabase
            .from('empires')
            .select('*')
            .eq('id', project.empire_id)
            .maybeSingle();

          if (empireError || !empire) continue;

          // Calculate research progress based on empire's research production
          // Note: Legacy resourceProduction fields have been removed from Empire model
          // Research progress is now calculated through capacity-based systems
          const researchPerMinute = 0; // Placeholder until capacity system is implemented
          const newProgress = project.research_progress + researchPerMinute;

          // Cap progress at research cost
          const cappedProgress = Math.min(newProgress, project.research_cost);

          // Update project progress
          const { error: updateError } = await supabase
            .from('research_projects')
            .update({ research_progress: cappedProgress })
            .eq('id', project.id);

          if (updateError) {
            console.error(`Error updating research progress for project ${project.id}:`, updateError);
          }
        } catch (error) {
          console.error(`Error processing research for project ${project.id}:`, error);
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
