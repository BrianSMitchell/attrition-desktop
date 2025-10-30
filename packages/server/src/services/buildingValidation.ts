import { supabase } from '../config/supabase';
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';

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

    // Fetch buildings with pending upgrades from Supabase
    let query = supabase
      .from(DB_TABLES.BUILDINGS)
      .select('*')
      .eq('pending_upgrade', true);

    if (empireId) query = query.eq('empire_id', empireId);
    if (locationCoord) query = query.eq('location_coord', locationCoord);

    const { data: pendingBuildings, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch pending buildings: ${error.message}`);
    }

    for (const building of pendingBuildings) {
      // Check if construction is complete but flag wasn't cleared
      if (building.constructionCompleted && new Date(building.constructionCompleted) < new Date()) {
        issues.push({
          id: building.id,
          issue: 'pendingUpgrade=true but construction completed'
        });

        // Fix the issue
        const { error: updateError } = await supabase
          .from(DB_TABLES.BUILDINGS)
          .update({
            pending_upgrade: false,
            construction_started: null,
            construction_completed: null
          })
          .eq('id', building.id);

        if (updateError) {
          throw new Error(`Failed to update building: ${updateError.message}`);
        }
        fixed++;
      }
      // Check if there's no construction data but flag is set
      else if (!building.constructionStarted && !building.constructionCompleted) {
        issues.push({
          id: building._id.toString(),
          issue: 'pendingUpgrade=true but no construction data'
        });

        // Fix the issue
        const { error: updateError } = await supabase
          .from(DB_TABLES.BUILDINGS)
          .update({
            pending_upgrade: false
          })
          .eq('id', building.id);

        if (updateError) {
          throw new Error(`Failed to update building: ${updateError.message}`);
        }
        fixed++;
      }
    }

    return { fixed, issues };
  }

  /**
   * Ensure a building's state is consistent after construction completion
   */
  static async ensureConstructionCompleted(buildingId: string): Promise<void> {
    const { data: building, error } = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select('*')
      .eq('id', buildingId)
      .single();

    if (error || !building) return;

    // If construction is complete, ensure all flags are cleared
    if (building.constructionCompleted && new Date(building.constructionCompleted) < new Date()) {
      const { error: updateError } = await supabase
        .from(DB_TABLES.BUILDINGS)
        .update({
          pending_upgrade: false,
          construction_started: null,
          construction_completed: null
        })
        .eq('id', buildingId);

      if (updateError) {
        throw new Error(`Failed to update building: ${updateError.message}`);
      }
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
    const { data: existing, error } = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select('*')
      .eq('empire_id', empireId)
      .eq('location_coord', locationCoord)
      .eq('catalog_key', buildingKey)
      .eq('pending_upgrade', true)
      .single();

    if (error && (error as any).code !== 'PGRST116') { // PGRST116: no rows returned
      throw new Error(`Failed to check existing building: ${error.message}`);
    }

    if (existing) {
      // Check if this is a stale flag
      if (existing.constructionCompleted && new Date(existing.constructionCompleted) < new Date()) {
        // Clean it up
        const { error: updateError } = await supabase
          .from(DB_TABLES.BUILDINGS)
          .update({
            pending_upgrade: false,
            construction_started: null,
            construction_completed: null
          })
          .eq('id', existing.id);

        if (updateError) {
          throw new Error(`Failed to update building: ${updateError.message}`);
        }
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
