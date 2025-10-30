import { supabase } from '../../config/supabase';
import { getTechSpec, TechnologyKey } from '@game/shared';
import { EconomyService } from '../economy/EconomyService';
import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
import { ENV_VARS } from '@game/shared';
import { STATUS_CODES } from '@game/shared';
/**
 * Service for handling complex resource and economy calculations.
 * Extracted from dashboard route to centralize resource computation logic.
 */
export class ResourceCalculationService {

  /**
   * Computes technology score from researched technologies in an empire.
   * @param empire - Empire object containing techLevels Map
   * @returns Total technology score based on researched technology costs
   */
  static computeTechnologyScore(empire: any): number {
    const techLevels = empire.techLevels as Map<string, number> | undefined;
    if (!techLevels) return STATUS_CODES.SUCCESS;

    let totalScore = 0;
    for (const [techKey, level] of techLevels.entries()) {
      if (level >= 1) {
        try {
          const spec = getTechSpec(techKey as TechnologyKey);
          totalScore += spec.creditsCost;
        } catch (error) {
          // Skip unknown tech keys
          console.warn(`Unknown tech key: ${techKey}`);
        }
      }
    }
    return totalScore;
  }

  /**
   * Computes economy per hour from active buildings using a simple catalog mapping.
   * @param buildings - Array of building objects with catalog_key, level, and is_active properties
   * @returns Total economy per hour from active buildings
   */
  static computeEconomyPerHourFromBuildings(buildings: Array<{ catalog_key?: string; level?: number; is_active?: boolean }>): number {
    let total = 0;
    for (const b of buildings) {
      if (!b.is_active) continue;
      const key = (b.catalog_key || '').toLowerCase();
      const lvl = Number(b.level || 1);
      // Simple mapping (can be refined later or loaded from shared catalog)
      switch (key) {
        case 'urban_structures':
        case 'habitat':
          total += 50 * lvl; // placeholder yield per hour per level
          break;
        default:
          break;
      }
    }
    return total;
  }

  /**
   * Performs complex credit accrual calculation with time-based increments and database updates.
   * @param empire - Empire object with credits, last_resource_update, and credits_remainder_milli
   * @param creditsPerHour - Credits per hour rate for the empire
   * @returns Object containing resourcesGained amount and updated empire data
   */
  static async performCreditAccrual(empire: any, creditsPerHour: number): Promise<{ resourcesGained: number; updatedEmpire: any }> {
    let resourcesGained = 0;

    try {
      const nowTs = Date.now();
      const lastUpdateRaw = (empire as any).last_resource_update as string | null | undefined;
      const lastTs = lastUpdateRaw ? new Date(lastUpdateRaw).getTime() : nowTs;
      let elapsedMs = Math.max(0, nowTs - (Number.isFinite(lastTs) ? lastTs : nowTs));

      // Carry remainder milliseconds
      let carryMs = Math.max(0, Number((empire as any).credits_remainder_milli || 0));

      if (creditsPerHour > 0) {
        const totalMs = elapsedMs + carryMs;
        const fractional = creditsPerHour * (totalMs / 3600000);
        const increment = Math.floor(fractional);
        const remainderMs = totalMs % 3600000;

        if (increment > 0 || elapsedMs > 0 || carryMs !== remainderMs) {
          const oldCredits = Math.max(0, Number((empire as any).credits || 0));
          const newCredits = Math.max(0, oldCredits + increment);
          resourcesGained = increment;

          const t0 = Date.now();
          const upd = await supabase
            .from(DB_TABLES.EMPIRES)
            .update({
              credits: newCredits,
              last_resource_update: new Date(nowTs).toISOString(),
              credits_remainder_milli: remainderMs,
            })
            .eq(DB_FIELDS.BUILDINGS.ID, (empire as any).id)
            .select('id, credits, last_resource_update, credits_remainder_milli')
            .single();
          const dt = Date.now() - t0;

          if (!upd.error && upd.data) {
            (empire as any).credits = upd.data.credits;
            (empire as any).last_resource_update = upd.data.last_resource_update;
            (empire as any).credits_remainder_milli = upd.data.credits_remainder_milli;
          }

          if (process.env[ENV_VARS.ECONOMY_DEBUG] === 'true') {
            console.log('[ACCRUAL]', {
              empireId: String((empire as any).id),
              creditsPerHour,
              elapsedMs,
              carryMs,
              increment,
              remainderMs,
              oldCredits,
              newCredits,
              updateMs: dt,
            });
          }
        }
      } else {
        // No economy rate; still advance the timestamp and clear remainder to avoid unbounded carry
        if (elapsedMs > 0 || carryMs !== 0 || !(empire as any).last_resource_update) {
          await supabase
            .from(DB_TABLES.EMPIRES)
            .update({
              last_resource_update: new Date(nowTs).toISOString(),
              credits_remainder_milli: 0,
            })
            .eq(DB_FIELDS.BUILDINGS.ID, (empire as any).id);
          (empire as any).last_resource_update = new Date(nowTs).toISOString();
          (empire as any).credits_remainder_milli = 0;
        }
      }
    } catch {
      // Non-fatal: leave credits unchanged
    }

    return { resourcesGained, updatedEmpire: empire };
  }

  /**
   * Calculates comprehensive dashboard resources including accrual, profile, and current state.
   * @param empire - Empire object
   * @param userId - User ID for context (currently unused but reserved for future features)
   * @returns Dashboard resources object with computed values
   */
  static async calculateDashboardResources(empire: any, userId: string): Promise<{
    resourcesGained: number;
    creditsPerHour: number;
    profile: {
      economyPerHour: number;
      fleetScore: number;
      technologyScore: number;
      level: number;
    };
    updatedEmpire: any;
  }> {
    // Compute credits per hour from Supabase buildings via catalog yields
    const creditsPerHour = await EconomyService.sumCreditsPerHourForEmpire(String((empire as any).id));

    // Perform credit accrual calculation
    const { resourcesGained, updatedEmpire } = await this.performCreditAccrual(empire, creditsPerHour);

    // Calculate profile scores (fleet score is currently hardcoded to 0)
    const technologyScore = this.computeTechnologyScore(empire);
    const fleetScore = 0;
    const level = Math.pow(creditsPerHour * 100 + fleetScore + technologyScore, 0.25);

    const profile = {
      economyPerHour: creditsPerHour,
      fleetScore,
      technologyScore,
      level,
    };

    return {
      resourcesGained,
      creditsPerHour,
      profile,
      updatedEmpire,
    };
  }

  /**
   * Legacy method for backward compatibility - computes credits per hour for a specific empire.
   * @param empireId - Empire ID string
   * @returns Credits per hour for the empire
   */
  static async computeCreditsPerHour(empireId: string): Promise<number> {
    return await EconomyService.sumCreditsPerHourForEmpire(empireId);
  }
}
