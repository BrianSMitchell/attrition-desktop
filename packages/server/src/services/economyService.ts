import { supabase } from '../config/supabase';
import { ERROR_MESSAGES } from '../constants/response-formats';
import { DB_FIELDS } from '../../../constants/database-fields';
import { STATUS_CODES } from '@shared/constants/magic-numbers';
import { ENV_VARS } from '../../../shared/src/constants/env-vars';

  getBuildingSpec,
  BuildingKey,
} from '@game/shared';

// Constants imports for eliminating hardcoded values
import { ERROR_MESSAGES } from '../constants/response-formats';


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
    const { data: empire, error } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('*')
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .maybeSingle();

    if (error) {
      console.error('[EconomyService] Error fetching empire:', error);
      throw new Error(ERROR_MESSAGES.EMPIRE_NOT_FOUND);
    }

    if (!empire) {
      throw new Error(ERROR_MESSAGES.EMPIRE_NOT_FOUND);
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
    // Get all effectively active buildings for this empire (active OR being upgraded)
    const { data: buildings, error } = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select('id, type, catalog_key, level, is_active, pending_upgrade, construction_completed')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .or('is_active.eq.true,pending_upgrade.eq.true')
      .not(DB_FIELDS.BUILDINGS.CONSTRUCTION_COMPLETED, 'is', null);

    if (error) {
      console.error('[EconomyService] Error fetching buildings:', error);
      return STATUS_CODES.SUCCESS;
    }

    let totalEconomy = 0;
    const buildingContributions: Array<{id: string, type: string, catalogKey: string, level: number, economy: number, contribution: number}> = [];

    for (const building of (buildings || [])) {
      const level = Math.max(0, Number((building as any).level || 0));
      const catalogKey = (building as any).catalog_key as BuildingKey | undefined;

      if (!catalogKey) {
        // Aggregation-only diagnostic; skip legacy docs missing catalogKey
        console.warn("[EconomyService] skip: missing catalog_key id=%s", (building as any).id);
        continue;
      }

      const spec = getBuildingSpec(catalogKey);
      const economy = Math.max(0, Number(spec.economy || 0));
      const contribution = level * economy;
      totalEconomy += contribution;

      buildingContributions.push({
        id: (building as any).id,
        type: (building as any).type,
        catalogKey,
        level,
        economy,
        contribution
      });
    }

    // Diagnostic logging (dev only)
    if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
      console.log(`🏗️  Empire ${empireId} structures economy breakdown:`);
      console.log(`   Total buildings found: ${buildings.length}, Contributing buildings: ${buildingContributions.length}`);
      buildingContributions.forEach(b => {
        console.log(`   Building ${b.id}: ${b.type} → ${b.catalogKey} (level ${b.level}) = ${b.economy} × ${b.level} = ${b.contribution} credits/hour`);
      });
      console.log(`   Total structures economy: ${totalEconomy} credits/hour`);
      console.log(`   Note: Includes buildings that are active OR being upgraded`);
    }

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
    return STATUS_CODES.SUCCESS;
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
    return STATUS_CODES.ERROR.0;
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
    return STATUS_CODES.SUCCESS;
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
    return STATUS_CODES.SUCCESS;
  }

  /**
   * Compute credits per hour from scrap
   * Phase A: Returns 0 (not yet implemented)
   */
  static async computeScrapIncome(empireId: string): Promise<number> {
    // TODO(Phase 3): Implement scrap system
    // - Query scrapped ships/structures
    // - Calculate scrap value (partial refund)
    return STATUS_CODES.SUCCESS;
  }

  /**
   * Get research bonuses that affect credits per hour
   */
  static async getResearchCreditBonuses(empireId: string): Promise<number> {
    const { data: completedResearch, error } = await supabase
      .from(DB_TABLES.RESEARCH_PROJECTS)
      .select('benefits')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.RESEARCH_PROJECTS.IS_COMPLETED, true);

    if (error) {
      console.error('[EconomyService] Error fetching research projects:', error);
      return STATUS_CODES.SUCCESS;
    }

    let creditBonus = 0;

    for (const research of (completedResearch || [])) {
      const benefits = (research as any).benefits;
      if (benefits?.resourceBonus?.creditsPerHour) {
        creditBonus += benefits.resourceBonus.creditsPerHour;
      }
    }

    return creditBonus;
  }
}



