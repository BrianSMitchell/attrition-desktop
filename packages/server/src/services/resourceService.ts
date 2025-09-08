import { Empire } from '../models/Empire';
import { EconomyService } from './economyService';
import { ResourceCost } from '@game/shared';

export class ResourceService {
  
  /**
   * Calculate resource production for an empire based on buildings and technology
   */
  private static async calculateCreditsPerHour(empireId: string): Promise<number> {
    const empire = await Empire.findById(empireId);
    if (!empire) {
      throw new Error('Empire not found');
    }

    const economyBreakdown = await EconomyService.computeEmpireEconomy(empireId);
    const researchCreditBonuses = await EconomyService.getResearchCreditBonuses(empireId);
    const creditsPerHour = economyBreakdown.totalCreditsPerHour + researchCreditBonuses;

    // Diagnostic logging
    console.log(`📊 Empire ${empireId} (${empire.name}) credits/hour: ${creditsPerHour} (structures: ${economyBreakdown.structuresEconomy}, research bonuses: ${researchCreditBonuses})`);

    return creditsPerHour;
  }

  /**
   * Update empire resources based on time elapsed since last update (metal, energy, research only)
   */
  static async updateEmpireResources(empireId: string): Promise<{ empire: any; resourcesGained: Partial<ResourceCost>; creditsPerHour: number }> {
    const empire = await Empire.findById(empireId);
    if (!empire) {
      throw new Error('Empire not found');
    }

    const now = new Date();
    const lastUpdate = empire.lastResourceUpdate || empire.createdAt;
    const hoursElapsed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

    // Even though we compute hoursElapsed, legacy non-credit resources no longer accumulate.
    // We still respect a minimal cadence for recomputing production for diagnostics.
    if (hoursElapsed < 1/60) {
      const creditsPerHour = await this.calculateCreditsPerHour(empireId);
      return { empire, resourcesGained: {}, creditsPerHour };
    }

    // Calculate current production (credits only; non-credit are fixed at 0)
    const creditsPerHour = await this.calculateCreditsPerHour(empireId);

    // Do NOT mutate metal/energy/research; they are deprecated as ticking resources.
    // Legacy resourceProduction fields have been removed from the model.

    empire.lastResourceUpdate = now;
    await empire.save();

    return { empire, resourcesGained: {}, creditsPerHour };
  }

  /**
   * Update empire credits based on aligned time periods (top-of-period payouts)
   * Uses microcredit accumulation to prevent fractional loss
   */
  static async updateEmpireCreditsAligned(empireId: string): Promise<{ empire: any; creditsGained: number }> {
    const empire = await Empire.findById(empireId);
    if (!empire) {
      throw new Error('Empire not found');
    }

    const now = new Date();
    const periodMinutes = parseInt(process.env.CREDIT_PAYOUT_PERIOD_MINUTES || '1', 10);
    const periodMs = periodMinutes * 60 * 1000;

    // Calculate aligned boundaries
    const getBoundary = (date: Date) => new Date(Math.floor(date.getTime() / periodMs) * periodMs);

    const currentBoundary = getBoundary(now);
    const lastPayout = empire.lastCreditPayout || empire.createdAt;
    const lastBoundary = getBoundary(lastPayout);

    // Calculate how many complete periods have elapsed
    const periodsElapsed = Math.floor((currentBoundary.getTime() - lastBoundary.getTime()) / periodMs);

    if (periodsElapsed <= 0) {
      // No complete periods have elapsed
      return { empire, creditsGained: 0 };
    }

    // Calculate production and microcredits
    const creditsPerHour = await this.calculateCreditsPerHour(empireId);

    // Convert to microcredits (milli-credits) for precise calculation
    const microCreditsPerPeriod = Math.round(creditsPerHour * (periodMs / (60 * 60 * 1000)) * 1000);
    const totalMicroCredits = microCreditsPerPeriod * periodsElapsed;

    // Add to accumulated remainder
    const currentRemainder = empire.creditsRemainderMilli || 0;
    const totalMicroCreditsWithRemainder = currentRemainder + totalMicroCredits;

    // Extract whole credits and new remainder
    const wholeCredits = Math.floor(totalMicroCreditsWithRemainder / 1000);
    const newRemainder = totalMicroCreditsWithRemainder % 1000;

    // Update empire credits and remainder
    // Note: wholeCredits should be positive or zero, never negative
    if (wholeCredits > 0) {
      empire.resources.credits += wholeCredits;
    }
    empire.creditsRemainderMilli = newRemainder;

    // Update last payout to the most recent boundary we've paid for
    empire.lastCreditPayout = new Date(lastBoundary.getTime() + (periodsElapsed * periodMs));

    // Debug: Log the empire state before saving
    console.log(`   DEBUG - Before save: credits=${empire.resources.credits}, remainder=${empire.creditsRemainderMilli}`);

    await empire.save();

    // Debug: Verify the save worked
    const savedEmpire = await Empire.findById(empireId);
    console.log(`   DEBUG - After save: credits=${savedEmpire?.resources.credits}, remainder=${savedEmpire?.creditsRemainderMilli}`);

    // Diagnostic logging
    console.log(`💰 Empire ${empireId} (${empire.name}):`);
    console.log(`   Credits/Hour: ${creditsPerHour}`);
    console.log(`   Periods Elapsed: ${periodsElapsed} (${periodMinutes}min each)`);
    console.log(`   Microcredits/Period: ${microCreditsPerPeriod}`);
    console.log(`   Total Microcredits: ${totalMicroCredits}`);
    console.log(`   Previous Remainder: ${currentRemainder}`);
    console.log(`   Whole Credits Awarded: ${wholeCredits}`);
    console.log(`   New Remainder: ${newRemainder}`);
    console.log(`   Final Credits: ${empire.resources.credits}`);

    return { empire, creditsGained: wholeCredits };
  }




  /**
   * Check if empire has enough resources for a cost
   */
  static async canAfford(empireId: string, cost: ResourceCost): Promise<boolean> {
    const empire = await Empire.findById(empireId);
    if (!empire) return false;

    // Credits-only affordability in the modern economy model.
    return empire.resources.credits >= cost.credits;
  }

  /**
   * Deduct resources from empire
   */
  static async deductResources(empireId: string, cost: ResourceCost): Promise<boolean> {
    const empire = await Empire.findById(empireId);
    if (!empire) return false;

    if (!(await this.canAfford(empireId, cost))) {
      return false;
    }

    // Credits-only deduction in the modern economy model.
    empire.resources.credits -= cost.credits;

    await empire.save();
    return true;
  }

}
