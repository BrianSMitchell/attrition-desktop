import { supabase } from '../../config/supabase';
import { CapacityService } from './CapacityService';

import { DB_FIELDS } from '../../../constants/database-fields';
import { ENV_VARS } from '../../../shared/src/constants/env-vars';

/**
 * CitizenService - maintains citizen accrual per base.
 * Uses aligned payout periods with milli-citizens remainder to avoid fractional loss,
 * similar to Empire credits.
 */
export class CitizenService {
  /** Update citizens for all colonies owned by an empire */
  static async updateEmpireBases(empireId: string): Promise<{ updated: number; errors: number }> {
    let updated = 0;
    let errors = 0;
    try {
      // Fetch all colonies for this empire
      const { data: colonies, error: fetchError } = await supabase
        .from(DB_TABLES.COLONIES)
        .select('id, location_coord, citizens, last_citizen_update, citizen_remainder_milli, created_at')
        .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId);

      if (fetchError) {
        console.error('[CitizenService] Error fetching colonies:', fetchError);
        return { updated: 0, errors: 1 };
      }

      for (const c of colonies || []) {
        try {
          const coord = String(c.location_coord || '');
          if (!coord) continue;

          // Determine aligned period (default 1 minute)
          const periodMinutes = parseInt(process.env.CITIZEN_PAYOUT_PERIOD_MINUTES || '1', 10);
          const periodMs = Math.max(60000, periodMinutes * 60 * 1000); // ensure >= 60s
          const now = new Date();
          const getBoundary = (date: Date) => new Date(Math.floor(date.getTime() / periodMs) * periodMs);

          const lastUpdate: Date = c.last_citizen_update ? new Date(c.last_citizen_update) : new Date(c.created_at);
          const lastBoundary = getBoundary(lastUpdate);
          const currentBoundary = getBoundary(now);
          const periodsElapsed = Math.floor((currentBoundary.getTime() - lastBoundary.getTime()) / periodMs);

          if (periodsElapsed <= 0) {
            continue;
          }

          // Get per-hour citizen generation
          const caps = await CapacityService.getBaseCapacities(empireId, coord);
          const perHour = Math.max(0, Number(caps?.citizen?.value || 0));

          if (!(perHour > 0)) {
            // Still advance last_citizen_update so we don't accumulate infinite periods
            await supabase
              .from(DB_TABLES.COLONIES)
              .update({
                last_citizen_update: new Date(lastBoundary.getTime() + periodsElapsed * periodMs).toISOString(),
              })
              .eq(DB_FIELDS.BUILDINGS.ID, c.id);
            continue;
          }

          // Micro-citizens per period (milli-units)
          const microPerPeriod = Math.round(perHour * (periodMs / (60 * 60 * 1000)) * 1000);
          const totalMicro = microPerPeriod * periodsElapsed;

          const prevRema = Math.max(0, Number(c.citizen_remainder_milli || 0));
          const newMicroWithRema = prevRema + totalMicro;
          const wholeCitizens = Math.floor(newMicroWithRema / 1000);
          const newRema = newMicroWithRema % 1000;

          const newCount = Math.max(0, Number(c.citizens || 0)) + wholeCitizens;

          // Update colony
          const { error: updateError } = await supabase
            .from(DB_TABLES.COLONIES)
            .update({
              citizens: newCount,
              citizen_remainder_milli: newRema,
              last_citizen_update: new Date(lastBoundary.getTime() + periodsElapsed * periodMs).toISOString(),
            })
            .eq(DB_FIELDS.BUILDINGS.ID, c.id);

          if (updateError) {
            console.error(`[CitizenService] Error updating colony ${c.id}:`, updateError);
            errors++;
            continue;
          }

          updated++;

          // Debug logging
          if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true' && wholeCitizens > 0) {
            console.log(`👥 Colony ${coord}:`);
            console.log(`   Citizens/Hour: ${perHour}`);
            console.log(`   Periods Elapsed: ${periodsElapsed} (${periodMinutes}min each)`);
            console.log(`   Whole Citizens Added: ${wholeCitizens}`);
            console.log(`   New Total: ${newCount}`);
          }
        } catch (e) {
          errors++;
          console.error('[CitizenService] update colony error', e);
        }
      }
    } catch (e) {
      console.error('[CitizenService] top-level error', e);
    }
    return { updated, errors };
  }
}
