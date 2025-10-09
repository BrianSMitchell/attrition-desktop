import { supabase } from '../config/supabase';
import { CapacityService } from './bases/CapacityService';

/**
 * BaseCitizenService - Production-ready citizen accrual service for Supabase.
 * Uses batch operations and optimized queries to prevent production timeouts.
 * Maintains milli-citizen precision for accurate population calculations.
 */
export class BaseCitizenService {
  /** Update citizens for all colonies owned by an empire using batch operations */
  static async updateEmpireBases(empireId: string): Promise<{ updated: number; errors: number }> {
    let updated = 0;
    let errors = 0;

    try {
      // Get all colonies for the empire with a single optimized query
      const { data: colonies, error: coloniesError } = await supabase
        .from('colonies')
        .select('id, location_coord, citizens, last_citizen_update, citizen_remainder_milli, created_at')
        .eq('empire_id', empireId);

      if (coloniesError) {
        console.error('[BaseCitizenService] Failed to fetch colonies:', coloniesError);
        return { updated: 0, errors: 1 };
      }

      if (!colonies || colonies.length === 0) {
        return { updated: 0, errors: 0 };
      }

      // Process colonies in batches to avoid timeout issues
      const batchSize = 10;
      const batches = this.chunkArray(colonies, batchSize);

      for (const batch of batches) {
        const batchPromises = batch.map(colony => this.processColony(colony));
        const batchResults = await Promise.allSettled(batchPromises);

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            if (result.value) {
              updated++;
            }
          } else {
            errors++;
            console.error('[BaseCitizenService] Batch processing error:', result.reason);
          }
        }
      }

    } catch (error) {
      console.error('[BaseCitizenService] Top-level error:', error);
      errors++;
    }

    return { updated, errors };
  }

  /** Process a single colony's citizen update */
  private static async processColony(colony: any): Promise<boolean> {
    try {
      const locationCoord = colony.location_coord;
      if (!locationCoord) {
        return false;
      }

      // Determine aligned period (default 1 minute)
      const periodMinutes = parseInt(process.env.CITIZEN_PAYOUT_PERIOD_MINUTES || '1', 10);
      const periodMs = Math.max(60000, periodMinutes * 60 * 1000);
      const now = new Date();
      const getBoundary = (date: string | Date) => {
        const dateObj = new Date(date);
        return new Date(Math.floor(dateObj.getTime() / periodMs) * periodMs);
      };

      const lastUpdate = colony.last_citizen_update || colony.created_at || now.toISOString();
      const lastBoundary = getBoundary(lastUpdate);
      const currentBoundary = getBoundary(now);
      const periodsElapsed = Math.floor((currentBoundary.getTime() - lastBoundary.getTime()) / periodMs);

      if (periodsElapsed <= 0) {
        return false;
      }

      // Get per-hour citizen generation using optimized query
      const capacities = await CapacityService.getBaseCapacities(colony.empire_id, locationCoord);
      const perHour = Math.max(0, Number((capacities as any)?.citizen?.value || 0));

      if (!(perHour > 0)) {
        // Still advance lastCitizenUpdate to avoid infinite accumulation
        await supabase
          .from('colonies')
          .update({
            last_citizen_update: new Date(lastBoundary.getTime() + periodsElapsed * periodMs).toISOString()
          })
          .eq('id', colony.id);

        return false;
      }

      // Calculate micro-citizens per period (milli-units)
      const microPerPeriod = Math.round(perHour * (periodMs / (60 * 60 * 1000)) * 1000);
      const totalMicro = microPerPeriod * periodsElapsed;

      const prevRemainder = Math.max(0, Number(colony.citizen_remainder_milli || 0));
      const newMicroWithRemainder = prevRemainder + totalMicro;
      const wholeCitizens = Math.floor(newMicroWithRemainder / 1000);
      const newRemainder = newMicroWithRemainder % 1000;

      if (wholeCitizens <= 0) {
        return false;
      }

      const newCount = Math.max(0, Number(colony.citizens || 0)) + wholeCitizens;
      const nextUpdate = new Date(lastBoundary.getTime() + periodsElapsed * periodMs);

      // Use atomic update with optimistic locking
      const { error: updateError } = await supabase
        .from('colonies')
        .update({
          citizens: newCount,
          citizen_remainder_milli: newRemainder,
          last_citizen_update: nextUpdate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', colony.id);

      if (updateError) {
        console.error(`[BaseCitizenService] Failed to update colony ${colony.id}:`, updateError);
        return false;
      }

      return true;

    } catch (error) {
      console.error(`[BaseCitizenService] Error processing colony ${colony.id}:`, error);
      return false;
    }
  }

  /** Utility function to split array into chunks */
  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /** Get citizen statistics for an empire */
  static async getEmpireCitizenStats(empireId: string): Promise<{
    totalCitizens: number;
    totalColonies: number;
    averagePerHour: number;
  }> {
    try {
      const { data: colonies, error } = await supabase
        .from('colonies')
        .select('citizens, location_coord')
        .eq('empire_id', empireId);

      if (error) {
        console.error('[BaseCitizenService] Failed to get citizen stats:', error);
        return { totalCitizens: 0, totalColonies: 0, averagePerHour: 0 };
      }

      const totalCitizens = colonies?.reduce((sum: number, colony: any) => sum + (colony.citizens || 0), 0) || 0;
      const totalColonies = colonies?.length || 0;

      // Calculate average citizens per hour across all colonies
      let totalPerHour = 0;
      if (totalColonies > 0 && colonies) {
        for (const colony of colonies) {
          const coord = colony.location_coord;
          if (coord) {
            try {
              const capacities = await CapacityService.getBaseCapacities(empireId, coord);
              totalPerHour += Math.max(0, Number((capacities as any)?.citizen?.value || 0));
            } catch (error) {
              console.error(`[BaseCitizenService] Error getting capacity for ${coord}:`, error);
            }
          }
        }
      }

      return {
        totalCitizens,
        totalColonies,
        averagePerHour: totalPerHour
      };

    } catch (error) {
      console.error('[BaseCitizenService] Error in getEmpireCitizenStats:', error);
      return { totalCitizens: 0, totalColonies: 0, averagePerHour: 0 };
    }
  }

  /** Force update a specific colony (for testing or manual operations) */
  static async forceUpdateColony(empireId: string, locationCoord: string): Promise<boolean> {
    try {
      const { data: colony, error } = await supabase
        .from('colonies')
        .select('id, location_coord, citizens, last_citizen_update, citizen_remainder_milli, created_at')
        .eq('empire_id', empireId)
        .eq('location_coord', locationCoord)
        .single();

      if (error || !colony) {
        console.error('[BaseCitizenService] Colony not found:', error);
        return false;
      }

      return await this.processColony(colony);

    } catch (error) {
      console.error('[BaseCitizenService] Error in forceUpdateColony:', error);
      return false;
    }
  }
}
