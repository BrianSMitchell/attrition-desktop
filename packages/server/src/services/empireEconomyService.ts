import mongoose from 'mongoose';
import { Empire } from '../models/Empire';
import { EconomyService } from './economyService';

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
      const empire = await Empire.findById(empireId);
      if (!empire) {
        throw new Error('Empire not found');
      }

      // Calculate fresh economy using existing service
      const economyBreakdown = await EconomyService.computeEmpireEconomy(empireId);
      const researchBonuses = await EconomyService.getResearchCreditBonuses(empireId);
      const totalEconomy = economyBreakdown.totalCreditsPerHour + researchBonuses;

      // Cache the result
      empire.economyPerHour = totalEconomy;
      await empire.save();

      if (process.env.DEBUG_RESOURCES === 'true') {
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
      const empire = await Empire.findById(empireId).select('economyPerHour name');
      if (!empire) {
        throw new Error('Empire not found');
      }

      // If economy hasn't been cached yet, calculate it once
      if (empire.economyPerHour === undefined || empire.economyPerHour === null) {
        if (process.env.DEBUG_RESOURCES === 'true') {
          console.log(`⚠️ Empire ${empireId} economy not cached, calculating...`);
        }
        return await this.updateEmpireEconomy(empireId);
      }

      return empire.economyPerHour;
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
      const empires = await Empire.find().select('_id name');
      if (process.env.DEBUG_RESOURCES === 'true') {
        console.log(`🔄 Recalculating economy for ${empires.length} empires...`);
      }

      for (const empire of empires) {
        try {
          await this.updateEmpireEconomy((empire._id as mongoose.Types.ObjectId).toString());
        } catch (error) {
          console.error(`Error recalculating economy for empire ${empire._id}:`, error);
        }
      }

      if (process.env.DEBUG_RESOURCES === 'true') {
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
      if (process.env.DEBUG_RESOURCES === 'true') {
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
      if (process.env.DEBUG_RESOURCES === 'true') {
        console.log(`🔬 Research completed for empire ${empireId}: ${researchName || 'unknown'}`);
      }
      await this.updateEmpireEconomy(empireId);
    } catch (error) {
      console.error(`Error updating empire economy after research completion:`, error);
    }
  }
}