import { supabase } from '../config/supabase';
import { getTechSpec } from '@game/shared';

// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';

export interface CompletionStats {
  completed: number;
  cancelled: number;
  errors: number;
}

export class SupabaseCompletionService {
  /**
   * Complete tech queue items that have finished
   */
  static async completeTechQueue(): Promise<CompletionStats> {
    let completed = 0;
    let cancelled = 0;
    let errors = 0;

    try {
      const now = new Date().toISOString();

      // Find all pending items that have completed
      const { data: dueItems, error } = await supabase
        .from(DB_TABLES.TECH_QUEUE)
        .select('id, empire_id, tech_key, level, location_coord')
        .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending')
        .not(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, 'is', null)
        .lte(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, now);

      if (error) {
        console.error('[SupabaseCompletion] Error fetching due tech items:', error);
        return { completed: 0, cancelled: 0, errors: 1 };
      }

      for (const item of dueItems || []) {
        try {
          const empireId = item.empire_id;
          const techKey = item.tech_key;
          const targetLevel = Math.max(1, Number(item.level || 1));

          // Check if empire exists
          const { data: empire, error: empireError } = await supabase
            .from(DB_TABLES.EMPIRES)
            .select(DB_FIELDS.BUILDINGS.ID)
            .eq(DB_FIELDS.BUILDINGS.ID, empireId)
            .maybeSingle();

          if (empireError || !empire) {
            // Mark as cancelled if empire is missing
            await supabase
              .from(DB_TABLES.TECH_QUEUE)
              .update({ status: 'cancelled' })
              .eq(DB_FIELDS.BUILDINGS.ID, item.id);
            cancelled++;
            console.warn(`[SupabaseCompletion] Tech cancelled - missing empire: techKey=${techKey}`);
            continue;
          }

          // Upsert tech level (insert or update to max level)
          const { error: upsertError } = await supabase
            .from(DB_TABLES.TECH_LEVELS)
            .upsert({
              empire_id: empireId,
              tech_key: techKey,
              level: targetLevel
            }, {
              onConflict: 'empire_id,tech_key',
              ignoreDuplicates: false
            });

          if (upsertError) {
            // Try updating existing record
            const { data: existing } = await supabase
              .from(DB_TABLES.TECH_LEVELS)
              .select(DB_FIELDS.BUILDINGS.LEVEL)
              .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
              .eq(DB_FIELDS.TECH_QUEUE.TECH_KEY, techKey)
              .maybeSingle();

            const currentLevel = existing ? Number(existing.level || 0) : 0;
            const newLevel = Math.max(currentLevel, targetLevel);

            await supabase
              .from(DB_TABLES.TECH_LEVELS)
              .update({ level: newLevel })
              .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
              .eq(DB_FIELDS.TECH_QUEUE.TECH_KEY, techKey);
          }

          // Mark queue item as completed
          await supabase
            .from(DB_TABLES.TECH_QUEUE)
            .update({ status: 'completed' })
            .eq(DB_FIELDS.BUILDINGS.ID, item.id);

          completed++;
          console.log(`[SupabaseCompletion] Tech completed: key=${techKey} empire=${empireId} location=${item.location_coord} level=${targetLevel}`);
        } catch (err) {
          errors++;
          console.error('[SupabaseCompletion] Error completing tech item:', err);
        }
      }
    } catch (error) {
      console.error('[SupabaseCompletion] Error in completeTechQueue:', error);
    }

    return { completed, cancelled, errors };
  }

  /**
   * Complete unit queue items that have finished
   */
  static async completeUnitQueue(): Promise<CompletionStats> {
    let completed = 0;
    let cancelled = 0;
    let errors = 0;

    try {
      const now = new Date().toISOString();

      // Find all pending items that have completed
      const { data: dueItems, error } = await supabase
        .from(DB_TABLES.UNIT_QUEUE)
        .select('id, empire_id, unit_key, location_coord')
        .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending')
        .not(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, 'is', null)
        .lte(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, now);

      if (error) {
        console.error('[SupabaseCompletion] Error fetching due unit items:', error);
        return { completed: 0, cancelled: 0, errors: 1 };
      }

      for (const item of dueItems || []) {
        try {
          const empireId = item.empire_id;
          const unitKey = item.unit_key;
          const baseCoord = item.location_coord;

          // Check if empire exists
          const { data: empire, error: empireError } = await supabase
            .from(DB_TABLES.EMPIRES)
            .select('id, next_fleet_number')
            .eq(DB_FIELDS.BUILDINGS.ID, empireId)
            .maybeSingle();

          if (empireError || !empire) {
            // Mark as cancelled if empire is missing
            await supabase
              .from(DB_TABLES.UNIT_QUEUE)
              .update({ status: 'cancelled' })
              .eq(DB_FIELDS.BUILDINGS.ID, item.id);
            cancelled++;
            console.warn(`[SupabaseCompletion] Unit cancelled - missing empire: unitKey=${unitKey}`);
            continue;
          }

          // Mark unit production as completed
          await supabase
            .from(DB_TABLES.UNIT_QUEUE)
            .update({ status: 'completed' })
            .eq(DB_FIELDS.BUILDINGS.ID, item.id);

          // Find or create fleet at this base
          const { data: existingFleets } = await supabase
            .from(DB_TABLES.FLEETS)
            .select('id, name, units, size_credits')
            .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
            .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, baseCoord)
            .order(DB_FIELDS.BUILDINGS.CREATED_AT, { ascending: false })
            .limit(1);

          let fleetId: string;
          let units: Array<{ unit_key: string; count: number }> = [];
          let sizeCredits = 0;

          if (existingFleets && existingFleets.length > 0) {
            // Add to existing fleet
            const fleet = existingFleets[0];
            fleetId = fleet.id;
            units = Array.isArray(fleet.units) ? fleet.units : [];
            sizeCredits = Number(fleet.size_credits || 0);
          } else {
            // Create new fleet
            const nextNum = Math.max(1, Number(empire.next_fleet_number || 1));
            const name = `Fleet ${nextNum}`;

            const { data: newFleet, error: fleetError } = await supabase
              .from(DB_TABLES.FLEETS)
              .insert({
                empire_id: empireId,
                location_coord: baseCoord,
                name,
                units: [],
                size_credits: 0
              })
              .select(DB_FIELDS.BUILDINGS.ID)
              .single();

            if (fleetError || !newFleet) {
              errors++;
              console.error('[SupabaseCompletion] Error creating fleet:', fleetError);
              continue;
            }

            fleetId = newFleet.id;

            // Increment empire's next fleet number
            await supabase
              .from(DB_TABLES.EMPIRES)
              .update({ next_fleet_number: nextNum + 1 })
              .eq(DB_FIELDS.BUILDINGS.ID, empireId);
          }

          // Add unit to fleet
          const { getUnitSpec } = await import('@game/shared');
          const spec = getUnitSpec(unitKey as any);
          const unitCredits = Number(spec?.creditsCost || 0);

          const existing = units.find(u => u.unit_key === unitKey);
          if (existing) {
            existing.count += 1;
          } else {
            units.push({ unit_key: unitKey, count: 1 });
          }

          sizeCredits += unitCredits;

          // Update fleet
          await supabase
            .from(DB_TABLES.FLEETS)
            .update({
              units,
              size_credits: sizeCredits
            })
            .eq(DB_FIELDS.BUILDINGS.ID, fleetId);

          completed++;
          console.log(`[SupabaseCompletion] Unit completed: unitKey=${unitKey} empire=${empireId} base=${baseCoord}`);
        } catch (err) {
          errors++;
          console.error('[SupabaseCompletion] Error completing unit item:', err);
        }
      }
    } catch (error) {
      console.error('[SupabaseCompletion] Error in completeUnitQueue:', error);
    }

    return { completed, cancelled, errors };
  }

  /**
   * Complete defense queue items that have finished
   */
  static async completeDefenseQueue(): Promise<{ completed: number; errors: number }> {
    let completed = 0;
    let errors = 0;

    try {
      const now = new Date().toISOString();

      // Find all pending items that have completed
      const { data: dueItems, error } = await supabase
        .from(DB_TABLES.DEFENSE_QUEUE)
        .select(DB_FIELDS.BUILDINGS.ID)
        .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending')
        .not(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, 'is', null)
        .lte(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, now);

      if (error) {
        console.error('[SupabaseCompletion] Error fetching due defense items:', error);
        return { completed: 0, errors: 1 };
      }

      for (const item of dueItems || []) {
        try {
          await supabase
            .from(DB_TABLES.DEFENSE_QUEUE)
            .update({ status: 'completed' })
            .eq(DB_FIELDS.BUILDINGS.ID, item.id);
          completed++;
        } catch (err) {
          errors++;
          console.error('[SupabaseCompletion] Error completing defense item:', err);
        }
      }
    } catch (error) {
      console.error('[SupabaseCompletion] Error in completeDefenseQueue:', error);
    }

    return { completed, errors };
  }
}
