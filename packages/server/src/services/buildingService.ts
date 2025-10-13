import { CapacityService } from './bases/CapacityService';
import { getIO } from '../index';
import { supabase } from '../config/supabase';

// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';

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

     const { data: dueBuildings, error } = await supabase
       .from(DB_TABLES.BUILDINGS)
       .select('id, empire_id, location_coord, catalog_key, level, pending_upgrade, construction_started, construction_completed')
       .eq('is_active', false)
       .lte('construction_completed', now.toISOString());

     if (error || !dueBuildings || dueBuildings.length === 0) {
       return { activatedCount: 0, activatedIds: [] };
     }

     const activatedIds: string[] = [];

     for (const building of dueBuildings) {
       try {
         const isPendingUpgrade = building.pending_upgrade === true;
         const currentLevel = Math.max(0, Number(building.level || 0));
         const newLevel = isPendingUpgrade ? currentLevel + 1 : Math.max(1, currentLevel);

         const { error: updateError } = await supabase
           .from(DB_TABLES.BUILDINGS)
           .update({
             is_active: true,
             level: newLevel,
             pending_upgrade: false
             // Keep construction_started and construction_completed for history
             // Supabase schema has NOT NULL constraints on these fields
           })
           .eq('id', building.id);

         if (updateError) {
           console.error('[BuildingService] Error activating building:', building.id, updateError);
           continue;
         }

         activatedIds.push(building.id);

         // Broadcast completion event
         try {
           const io = getIO();
           (io as any)?.broadcastQueueUpdate?.(building.empire_id, building.location_coord, 'queue:item_completed', {
             buildingId: building.id,
             locationCoord: building.location_coord,
             catalogKey: building.catalog_key,
             pendingUpgrade: isPendingUpgrade,
           });
         } catch {}
       } catch (err) {
         console.error('[BuildingService] Error processing building:', building.id, err);
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
     const nowIso = now.toISOString();

     // Check if there's already an item in progress
     const { data: inProgress } = await supabase
       .from(DB_TABLES.BUILDINGS)
       .select('id')
       .eq('empire_id', empireId)
       .eq('location_coord', locationCoord)
       .eq('is_active', false)
       .not('construction_completed', 'is', null)
       .gt('construction_completed', nowIso)
       .limit(1)
       .maybeSingle();

     if (inProgress) return; // Already has active construction

     // Find earliest unscheduled item
     const { data: nextQueued } = await supabase
       .from(DB_TABLES.BUILDINGS)
       .select('id, catalog_key, level, pending_upgrade, credits_cost')
       .eq('empire_id', empireId)
       .eq('location_coord', locationCoord)
       .eq('is_active', false)
       .is('construction_completed', null)
       .order('created_at', { ascending: true })
       .limit(1)
       .maybeSingle();

     if (!nextQueued) return; // No items to schedule

     const required = Math.max(0, Number(nextQueued.credits_cost || 0));

     // Get empire credits
     const { data: empire } = await supabase
       .from(DB_TABLES.EMPIRES)
       .select('credits')
       .eq('id', empireId)
       .maybeSingle();

     if (!empire) return;

     const available = Math.max(0, Number(empire.credits || 0));
     if (available < required) {
       console.log(`[BuildingService.scheduleNext] Supabase credits gating: needed=${required} available=${available}`);
       return; // Insufficient credits
     }

     // Deduct credits
     const newBalance = available - required;
     await supabase
       .from(DB_TABLES.EMPIRES)
       .update({ credits: newBalance })
       .eq('id', empireId);

     // Log credit transaction
     try {
       const catalogKey = String(nextQueued.catalog_key || '');
       const { CreditLedgerService } = await import('./creditLedgerService');
       await CreditLedgerService.logTransaction({
         empireId,
         amount: -required,
         type: 'construction',
         note: `Construction started: ${catalogKey} at ${locationCoord}`,
         meta: { coord: locationCoord, key: catalogKey },
         balanceAfter: newBalance,
       });
     } catch (logErr) {
       console.warn('[BuildingService] Failed to log credit transaction:', logErr);
     }

     // Get construction capacity
     const caps = await CapacityService.getBaseCapacities(empireId, locationCoord);
     const cap = Math.max(0, Number((caps as any)?.construction?.value || 0));
     if (cap <= 0) return; // No capacity

     const minutes = BuildingService.etaMinutesFromCostAndCapacity(required, cap);
     if (!isFinite(minutes) || minutes === Number.POSITIVE_INFINITY) return;

     // Find last scheduled completion for chaining
     const { data: lastScheduled } = await supabase
       .from(DB_TABLES.BUILDINGS)
       .select('construction_completed')
       .eq('empire_id', empireId)
       .eq('location_coord', locationCoord)
       .eq('is_active', false)
       .not('construction_completed', 'is', null)
       .order('construction_completed', { ascending: false })
       .limit(1)
       .maybeSingle();

     const startAt = lastScheduled?.construction_completed
       ? new Date(lastScheduled.construction_completed)
       : now;

     const completesAt = new Date(startAt.getTime() + minutes * 60 * 1000);

     // Update building with schedule
     await supabase
       .from(DB_TABLES.BUILDINGS)
       .update({
         construction_started: startAt.toISOString(),
         construction_completed: completesAt.toISOString(),
       })
       .eq('id', nextQueued.id);

     // Broadcast
     try {
       const io = getIO();
       (io as any)?.broadcastQueueUpdate?.(empireId, locationCoord, 'queue:item_scheduled', {
         buildingId: nextQueued.id,
         locationCoord,
         catalogKey: nextQueued.catalog_key,
         constructionStarted: startAt.toISOString(),
         constructionCompleted: completesAt.toISOString(),
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
   ): Promise<any[]> {
     let query = supabase
       .from(DB_TABLES.BUILDINGS)
       .select('*')
       .eq('empire_id', empireId)
       .eq('location_coord', locationCoord);

     if (options?.onlyActive === true) {
       query = query.eq('is_active', true);
     }

     const { data, error } = await query.order('construction_completed', { ascending: true });

     if (error) {
       console.error('[BuildingService] Error fetching buildings:', error);
       return [];
     }

     return data || [];
   }
}
