import mongoose from 'mongoose';
import { Empire } from '../models/Empire';
import { Building } from '../models/Building';
import { ResearchProject } from '../models/ResearchProject';
import {
  getBuildingSpec,
  BuildingKey,
} from '@game/shared';


export interface EconomyBreakdown {
  structuresEconomy: number;
  tradeRoutesEconomy: number;
  occupationModifier: number;
  debrisSalvageIncome: number;
  plunderPillageIncome: number;
  scrapIncome: number;
  totalCreditsPerHour: number;
}

/**
 * Economy Service - Centralizes all credit income calculations
 * Phase A: Structures economy + research bonuses
 * Future: Trade routes, occupation modifiers, debris/recycling, plunder/pillage, scrap
 */
export class EconomyService {

  /**
   * Compute total credits per hour for an empire
   */
  static async computeEmpireEconomy(empireId: string): Promise<EconomyBreakdown> {
    // Verify empire exists
    const empire = await Empire.findById(empireId);
    if (!empire) {
      throw new Error('Empire not found');
    }

    const structuresEconomy = await this.computeStructuresEconomy(empireId);
    const tradeRoutesEconomy = await this.computeTradeRoutesEconomy(empireId);
    const occupationModifier = await this.computeOccupationModifier(empireId);
    const debrisSalvageIncome = await this.computeDebrisSalvageIncome(empireId);
    const plunderPillageIncome = await this.computePlunderPillageIncome(empireId);
    const scrapIncome = await this.computeScrapIncome(empireId);

    // Apply occupation modifier to all income sources
    const totalCreditsPerHour = occupationModifier * (
      structuresEconomy +
      tradeRoutesEconomy +
      debrisSalvageIncome +
      plunderPillageIncome +
      scrapIncome
    );

    return {
      structuresEconomy,
      tradeRoutesEconomy,
      occupationModifier,
      debrisSalvageIncome,
      plunderPillageIncome,
      scrapIncome,
      totalCreditsPerHour
    };
  }

  /**
   * Compute credits per hour from structures (buildings)
   */
  static async computeStructuresEconomy(empireId: string): Promise<number> {
    // Get all active buildings for this empire
    const buildings = await Building.find({
      empireId: new mongoose.Types.ObjectId(empireId),
      isActive: true,
      constructionCompleted: { $exists: true, $ne: null }
    });

    let totalEconomy = 0;
    const buildingContributions: Array<{id: string, type: string, catalogKey: string, level: number, economy: number, contribution: number}> = [];

    for (const building of buildings) {
      const level = Math.max(0, Number((building as any).level || 0));
      const catalogKey = (building as any).catalogKey as BuildingKey | undefined;

      if (!catalogKey) {
        // Aggregation-only diagnostic; skip legacy docs missing catalogKey
        console.warn("[EconomyService] skip: missing catalogKey _id=%s", (building as any)._id?.toString?.());
        continue;
      }

      const spec = getBuildingSpec(catalogKey);
      const economy = Math.max(0, Number(spec.economy || 0));
      const contribution = level * economy;
      totalEconomy += contribution;

      buildingContributions.push({
        id: (building as any)._id.toString(),
        type: (building as any).type,
        catalogKey,
        level,
        economy,
        contribution
      });
    }

    // Diagnostic logging
    console.log(`🏗️  Empire ${empireId} structures economy breakdown:`);
    console.log(`   Total buildings: ${buildings.length}, Active buildings: ${buildingContributions.length}`);
    buildingContributions.forEach(b => {
      console.log(`   Building ${b.id}: ${b.type} → ${b.catalogKey} (level ${b.level}) = ${b.economy} × ${b.level} = ${b.contribution} credits/hour`);
    });
    console.log(`   Total structures economy: ${totalEconomy} credits/hour`);

    return totalEconomy;
  }

  /**
   * Compute credits per hour from trade routes
   * Phase A: Returns 0 (not yet implemented)
   */
  static async computeTradeRoutesEconomy(empireId: string): Promise<number> {
    // TODO(Phase 2): Implement trade routes
    // - Query TradeRoute model for active routes
    // - Calculate income based on distance, setup cost, and route efficiency
    // - Apply any modifiers (plunder, etc.)
    return 0;
  }

  /**
   * Compute occupation modifier (affects all income sources)
   * Phase A: Returns 1.0 (no occupation effects yet)
   */
  static async computeOccupationModifier(empireId: string): Promise<number> {
    // TODO(Phase 3): Implement occupation/unrest system
    // - Check for occupied territories
    // - Apply 30% income transfer to occupier
    // - Apply unrest penalties (-10%/day, max 100% revolt)
    return 1.0;
  }

  /**
   * Compute credits per hour from debris salvage
   * Phase A: Returns 0 (not yet implemented)
   */
  static async computeDebrisSalvageIncome(empireId: string): Promise<number> {
    // TODO(Phase 3): Implement debris/recycling system
    // - Query DebrisField model for active fields
    // - Calculate salvage income based on recycler count and field size
    // - Process at hh:30 intervals
    return 0;
  }

  /**
   * Compute credits per hour from plunder/pillage
   * Phase A: Returns 0 (not yet implemented)
   */
  static async computePlunderPillageIncome(empireId: string): Promise<number> {
    // TODO(Phase 3): Implement plunder/pillage system
    // - Query recent combat events
    // - Calculate loot from destroyed ships (20% of value)
    // - Calculate pillage from conquered bases
    return 0;
  }

  /**
   * Compute credits per hour from scrap
   * Phase A: Returns 0 (not yet implemented)
   */
  static async computeScrapIncome(empireId: string): Promise<number> {
    // TODO(Phase 3): Implement scrap system
    // - Query scrapped ships/structures
    // - Calculate scrap value (partial refund)
    return 0;
  }

  /**
   * Get research bonuses that affect credits per hour
   */
  static async getResearchCreditBonuses(empireId: string): Promise<number> {
    const completedResearch = await ResearchProject.find({
      empireId: new mongoose.Types.ObjectId(empireId),
      isCompleted: true
    });

    let creditBonus = 0;

    for (const research of completedResearch) {
      if (research.benefits.resourceBonus?.creditsPerHour) {
        creditBonus += research.benefits.resourceBonus.creditsPerHour;
      }
    }

    return creditBonus;
  }
}
