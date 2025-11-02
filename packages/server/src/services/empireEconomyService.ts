import { ERROR_MESSAGES } from '../constants/response-formats';

// Constants imports for eliminating hardcoded values

import { supabase } from '../config/supabase';
import { ENV_VARS } from '@game/shared';
import { EconomyService } from './economy/EconomyService';
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';

/**
 * EmpireEconomyService - Manages cached empire economy values
 * 
 * This service implements the efficient approach:
 * - Cache empire economy when buildings change
 * - Use cached value during credit payouts
 * - Only recalculate when necessary
 */
export class EmpireEconomyService {

  /**
   * Update and cache the total economy for an empire
   * Call this when buildings are added/removed/upgraded
   */
  static async updateEmpireEconomy(empireId: string): Promise<number> {
    try {
      const { data: empire, error: fetchError } = await supabase
        .from(DB_TABLES.EMPIRES)
        .select(DB_FIELDS.EMPIRES.NAME)
        .eq(DB_FIELDS.BUILDINGS.ID, empireId)
        .single();

      if (fetchError || !empire) {
        throw new Error(ERROR_MESSAGES.EMPIRE_NOT_FOUND);
      }

      // Calculate fresh economy using existing service
      const economyBreakdown = await EconomyService.computeEmpireEconomy(empireId);
      const researchBonuses = await EconomyService.getResearchCreditBonuses(empireId);
      const totalEconomy = economyBreakdown.totalCreditsPerHour + researchBonuses;

      // Cache the result
      const { error: updateError } = await supabase
        .from(DB_TABLES.EMPIRES)
        .update({ economy_per_hour: totalEconomy })
        .eq(DB_FIELDS.BUILDINGS.ID, empireId);

      if (updateError) {
        throw new Error(`Failed to update empire economy: ${updateError.message}`);
      }

      if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
        console.log(`💰 Empire ${empireId} (${empire.name}) economy updated: ${totalEconomy} credits/hour (cached)`);
      }
      
      return totalEconomy;
    } catch (error) {
      console.error(`Error updating empire ${empireId} economy:`, error);
      throw error;
    }
  }

  /**
   * Get the cached empire economy (fast - no building queries)
   * Use this during credit payouts
   */
  static async getCachedEmpireEconomy(empireId: string): Promise<number> {
    try {
      const { data: empire, error: fetchError } = await supabase
        .from(DB_TABLES.EMPIRES)
        .select('economy_per_hour, name')
        .eq(DB_FIELDS.BUILDINGS.ID, empireId)
        .single();

      if (fetchError || !empire) {
        throw new Error(ERROR_MESSAGES.EMPIRE_NOT_FOUND);
      }

      // If economy hasn't been cached yet, calculate it once
      if (empire.economy_per_hour === undefined || empire.economy_per_hour === null) {
        if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
          console.log(`⚠️ Empire ${empireId} economy not cached, calculating...`);
        }
        return await this.updateEmpireEconomy(empireId);
      }

      return empire.economy_per_hour;
    } catch (error) {
      console.error(`Error getting cached empire ${empireId} economy:`, error);
      throw error;
    }
  }

  /**
   * Recalculate all empire economies (maintenance operation)
   * Use this sparingly - only for data fixes or migrations
   */
  static async recalculateAllEmpires(): Promise<void> {
    try {
      const { data: empires, error: fetchError } = await supabase
        .from(DB_TABLES.EMPIRES)
        .select('id, name');

      if (fetchError) {
        throw new Error(`Failed to fetch empires: ${fetchError.message}`);
      }

      if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
        console.log(`🔄 Recalculating economy for ${empires?.length ?? 0} empires...`);
      }

      if (!empires) return;

      for (const empire of empires) {
        try {
          await this.updateEmpireEconomy(empire.id);
        } catch (error) {
          console.error(`Error recalculating economy for empire ${empire.id}:`, error);
        }
      }

      if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
        console.log(`✅ Completed empire economy recalculation`);
      }
    } catch (error) {
      console.error('Error recalculating all empire economies:', error);
      throw error;
    }
  }

  /**
   * Update empire economy when a building changes
   * Call this from building service when buildings are created/updated/destroyed
   */
  static async onBuildingChange(empireId: string, changeDescription?: string): Promise<void> {
    try {
      if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
        console.log(`🏗️ Building change for empire ${empireId}: ${changeDescription || 'update'}`);
      }
      await this.updateEmpireEconomy(empireId);
    } catch (error) {
      console.error(`Error updating empire economy after building change:`, error);
    }
  }

  /**
   * Update empire economy when research completes
   * Call this from game loop when research projects finish
   */
  static async onResearchComplete(empireId: string, researchName?: string): Promise<void> {
    try {
      if (process.env[ENV_VARS.DEBUG_RESOURCES] === 'true') {
        console.log(`🔬 Research completed for empire ${empireId}: ${researchName || 'unknown'}`);
      }
      await this.updateEmpireEconomy(empireId);
    } catch (error) {
      console.error(`Error updating empire economy after research completion:`, error);
    }
  }
}


