import { Building } from '../models/Building';
import mongoose from 'mongoose';

/**
 * Building validation helpers to ensure data consistency
 * and prevent stale pendingUpgrade flags
 */
export class BuildingValidation {
  /**
   * Validate and clean up any stale pendingUpgrade flags
   * This should be called periodically or after construction events
   */
  static async validatePendingUpgrades(empireId?: string, locationCoord?: string): Promise<{
    fixed: number;
    issues: Array<{ id: string; issue: string }>;
  }> {
    const issues: Array<{ id: string; issue: string }> = [];
    let fixed = 0;

    // Build query filter
    const filter: any = {};
    if (empireId) filter.empireId = new mongoose.Types.ObjectId(empireId);
    if (locationCoord) filter.locationCoord = locationCoord;

    // Find all buildings with pendingUpgrade=true
    const pendingBuildings = await Building.find({
      ...filter,
      pendingUpgrade: true
    });

    for (const building of pendingBuildings) {
      // Check if construction is complete but flag wasn't cleared
      if (building.constructionCompleted && new Date(building.constructionCompleted) < new Date()) {
        issues.push({
          id: building._id.toString(),
          issue: 'pendingUpgrade=true but construction completed'
        });

        // Fix the issue
        building.pendingUpgrade = false;
        building.constructionStarted = undefined as any;
        building.constructionCompleted = undefined as any;
        await building.save();
        fixed++;
      }
      // Check if there's no construction data but flag is set
      else if (!building.constructionStarted && !building.constructionCompleted) {
        issues.push({
          id: building._id.toString(),
          issue: 'pendingUpgrade=true but no construction data'
        });

        // Fix the issue
        building.pendingUpgrade = false;
        await building.save();
        fixed++;
      }
    }

    return { fixed, issues };
  }

  /**
   * Ensure a building's state is consistent after construction completion
   */
  static async ensureConstructionCompleted(buildingId: string): Promise<void> {
    const building = await Building.findById(buildingId);
    if (!building) return;

    // If construction is complete, ensure all flags are cleared
    if (building.constructionCompleted && new Date(building.constructionCompleted) < new Date()) {
      building.pendingUpgrade = false;
      building.constructionStarted = undefined as any;
      building.constructionCompleted = undefined as any;
      await building.save();
    }
  }

  /**
   * Validate building state before starting construction
   */
  static async validateBeforeConstruction(
    empireId: string, 
    locationCoord: string, 
    buildingKey: string
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check for any buildings with stale pendingUpgrade flags
    const existing = await Building.findOne({
      empireId: new mongoose.Types.ObjectId(empireId),
      locationCoord,
      catalogKey: buildingKey,
      pendingUpgrade: true
    });

    if (existing) {
      // Check if this is a stale flag
      if (existing.constructionCompleted && new Date(existing.constructionCompleted) < new Date()) {
        // Clean it up
        existing.pendingUpgrade = false;
        existing.constructionStarted = undefined as any;
        existing.constructionCompleted = undefined as any;
        await existing.save();
        return { valid: true };
      }
      
      // If construction is still in progress, block
      if (existing.constructionCompleted && new Date(existing.constructionCompleted) > new Date()) {
        return { 
          valid: false, 
          reason: 'Construction already in progress for this building' 
        };
      }
    }

    return { valid: true };
  }
}