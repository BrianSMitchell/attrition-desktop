import { supabase } from '../../config/supabase';
import { ERROR_MESSAGES } from '../../constants/response-formats';

import { DB_FIELDS } from '../../../constants/database-fields';
import { GAME_CONSTANTS } from '@game/shared';
import { ENV_VARS } from '@game/shared';
import { EconomyService } from '../services/economy/EconomyService';
import { ResourceService } from '../services/resources/ResourceService';
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';

export class ResourceService {
  /**
   * Calculate credits per hour for an empire based on buildings
   */
  private static async calculateCreditsPerHour(empireId: string): Promise<number> {
    // Use Supabase economy service to calculate from buildings
const creditsPerHour = await EconomyService.sumCreditsPerHourForEmpire(empireId);

    // Debug logging
    if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
      const { data: empire } = await supabase
        .from(DB_TABLES.EMPIRES)
        .select(DB_FIELDS.BUILDINGS.ID)
        .eq(DB_FIELDS.BUILDINGS.ID, empireId)
        .maybeSingle();
      console.log(`📊 Empire ${empireId} credits/hour: ${creditsPerHour}`);
    }

    return creditsPerHour;
  }

  /**
   * Update empire resources (legacy - mainly updates last update timestamp)
   */
  static async updateEmpireResources(empireId: string): Promise<{
    creditsPerHour: number;
    resourcesGained: Record<string, number>;
  }> {
    const { data: empire, error } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('id, created_at, last_resource_update')
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .maybeSingle();

    if (error || !empire) {
      throw new Error(ERROR_MESSAGES.EMPIRE_NOT_FOUND);
    }

    const now = new Date();
    const lastUpdate = empire.last_resource_update 
      ? new Date(empire.last_resource_update)
      : new Date(empire.created_at);
    const hoursElapsed = (now.getTime() - lastUpdate.getTime()) / (GAME_CONSTANTS.MILLISECONDS_PER_SECOND * GAME_CONSTANTS.SECONDS_PER_MINUTE * 60);

    // Get credits per hour for diagnostics
    const creditsPerHour = await this.calculateCreditsPerHour(empireId);

    // Check if enough time has elapsed (at least 1 second)
    if (hoursElapsed < 1 / 60) {
      return { creditsPerHour, resourcesGained: {} };
    }

    // Update last resource update timestamp
    await supabase
      .from(DB_TABLES.EMPIRES)
      .update({ last_resource_update: now.toISOString() })
      .eq(DB_FIELDS.BUILDINGS.ID, empireId);

    return { creditsPerHour, resourcesGained: {} };
  }

  /**
   * Update empire credits based on aligned time periods (top-of-period payouts)
   * Uses microcredit accumulation to prevent fractional loss
   */
  static async updateEmpireCreditsAligned(empireId: string): Promise<{
    creditsGained: number;
  }> {
    const { data: empire, error } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('id, credits, credits_remainder_milli, last_credit_payout, created_at')
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .maybeSingle();

    if (error || !empire) {
      throw new Error(ERROR_MESSAGES.EMPIRE_NOT_FOUND);
    }

    const now = new Date();
    const periodMinutes = parseInt(process.env.CREDIT_PAYOUT_PERIOD_MINUTES || '1', 10);
    const periodMs = periodMinutes * 60 * 1000;

    // Calculate aligned boundaries
    const getBoundary = (date: Date) => new Date(Math.floor(date.getTime() / periodMs) * periodMs);

    const currentBoundary = getBoundary(now);
    const lastPayout = empire.last_credit_payout
      ? new Date(empire.last_credit_payout)
      : new Date(empire.created_at);
    const lastBoundary = getBoundary(lastPayout);

    // Calculate how many complete periods have elapsed
    const periodsElapsed = Math.floor((currentBoundary.getTime() - lastBoundary.getTime()) / periodMs);

    if (periodsElapsed <= 0) {
      // No complete periods have elapsed
      return { creditsGained: 0 };
    }

    // Calculate production
    const creditsPerHour = await this.calculateCreditsPerHour(empireId);

    // Convert to microcredits (milli-credits) for precise calculation
    const microCreditsPerPeriod = Math.round(creditsPerHour * (periodMs / (60 * 60 * 1000)) * 1000);
    const totalMicroCredits = microCreditsPerPeriod * periodsElapsed;

    // Add to accumulated remainder
    const currentRemainder = empire.credits_remainder_milli || 0;
    const totalMicroCreditsWithRemainder = currentRemainder + totalMicroCredits;

    // Extract whole credits and new remainder
    const wholeCredits = Math.floor(totalMicroCreditsWithRemainder / 1000);
    const newRemainder = totalMicroCreditsWithRemainder % 1000;

    // Current credits
    const currentCredits = Number(empire.credits || 0);
    const newCredits = currentCredits + wholeCredits;

    // Update last payout to the most recent boundary we've paid for
    const newLastPayout = new Date(lastBoundary.getTime() + periodsElapsed * periodMs);

    // Debug logging (only in debug mode)
    if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
      console.log(`   DEBUG - Before update: credits=${currentCredits}, remainder=${currentRemainder}`);
    }

    // Update empire credits and remainder
    if (wholeCredits > 0) {
      await supabase
        .from(DB_TABLES.EMPIRES)
        .update({
          credits: newCredits,
          credits_remainder_milli: newRemainder,
          last_credit_payout: newLastPayout.toISOString(),
        })
        .eq(DB_FIELDS.BUILDINGS.ID, empireId);
    } else {
      // Even if no credits awarded, update the payout timestamp and remainder
      await supabase
        .from(DB_TABLES.EMPIRES)
        .update({
          credits_remainder_milli: newRemainder,
          last_credit_payout: newLastPayout.toISOString(),
        })
        .eq(DB_FIELDS.BUILDINGS.ID, empireId);
    }

    // Log payout transaction (non-blocking)
    if (wholeCredits > 0) {
      // Note: CreditLedgerService would need Supabase support too
      // For now, skip ledger logging in Supabase mode
      // TODO: Implement SupabaseCreditLedgerService
    }

    // Debug: Log final state (only in debug mode)
    if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
      console.log(`   DEBUG - After update: credits=${newCredits}, remainder=${newRemainder}`);
    }

    // Diagnostic logging (only in debug mode or for significant payouts)
    const shouldLogPayout = process.env[ENV_VARS.DEBUG_RESOURCES] === 'true' || wholeCredits >= 10;
    if (shouldLogPayout) {
      console.log(`💰 Empire ${empireId}:`);
      console.log(`   Credits/Hour: ${creditsPerHour}`);
      console.log(`   Periods Elapsed: ${periodsElapsed} (${periodMinutes}min each)`);
      console.log(`   Microcredits/Period: ${microCreditsPerPeriod}`);
      console.log(`   Total Microcredits: ${totalMicroCredits}`);
      console.log(`   Previous Remainder: ${currentRemainder}`);
      console.log(`   Whole Credits Awarded: ${wholeCredits}`);
      console.log(`   New Remainder: ${newRemainder}`);
      console.log(`   Final Credits: ${newCredits}`);
    }

    return { creditsGained: wholeCredits };
  }

  /**
   * Check if empire has enough credits
   */
  static async canAfford(empireId: string, creditsNeeded: number): Promise<boolean> {
    const { data: empire, error } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select(DB_FIELDS.EMPIRES.CREDITS)
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .maybeSingle();

    if (error || !empire) {
      return false;
    }

    const currentCredits = Number(empire.credits || 0);
    return currentCredits >= creditsNeeded;
  }

  /**
   * Deduct credits from empire
   */
  static async deductCredits(empireId: string, amount: number): Promise<boolean> {
    // Check if can afford
    const canAfford = await this.canAfford(empireId, amount);
    if (!canAfford) {
      return false;
    }

    // Get current credits
    const { data: empire, error } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select(DB_FIELDS.EMPIRES.CREDITS)
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .maybeSingle();

    if (error || !empire) {
      return false;
    }

    const currentCredits = Number(empire.credits || 0);
    const newCredits = currentCredits - amount;

    // Update credits
    await supabase
      .from(DB_TABLES.EMPIRES)
      .update({ credits: newCredits })
      .eq(DB_FIELDS.BUILDINGS.ID, empireId);

    return true;
  }
}


