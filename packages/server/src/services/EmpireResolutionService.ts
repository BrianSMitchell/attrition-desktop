import { supabase } from '../config/supabase';

// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';

import { GAME_CONSTANTS } from '@shared/constants/magic-numbers';
/**
 * EmpireResolutionService - Handles empire lookup and auto-bootstrap logic
 * Eliminates code duplication by providing centralized empire resolution methods
 */
export class EmpireResolutionService {
  /**
   * Resolve empire by user ID with fallback to users.empire_id
   * @param userId - The user ID to resolve empire for
   * @returns Promise<Empire | null>
   */
  static async resolveEmpireByUserId(userId: string): Promise<any | null> {
    // Try to fetch empire by user_id first
    let { data: empireRow } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('*')
      .eq(DB_FIELDS.EMPIRES.USER_ID, userId)
      .maybeSingle();

    // Fallback: if user has an explicit empire_id, read by id
    if (!empireRow) {
      const { data: userRow } = await supabase
        .from(DB_TABLES.USERS)
        .select(DB_FIELDS.BUILDINGS.EMPIRE_ID)
        .eq(DB_FIELDS.BUILDINGS.ID, userId)
        .maybeSingle();

      if (userRow?.empire_id) {
        const byId = await supabase
          .from(DB_TABLES.EMPIRES)
          .select('*')
          .eq(DB_FIELDS.BUILDINGS.ID, userRow.empire_id)
          .maybeSingle();
        empireRow = byId.data as any;
      }
    }

    return empireRow;
  }

  /**
   * Resolve empire by user object with fallback logic
   * @param user - User object containing id or _id field
   * @returns Promise<Empire | null>
   */
  static async resolveEmpireByUserObject(user: any): Promise<any | null> {
    const userId = user?._id || user?.id;
    return this.resolveEmpireByUserId(userId);
  }

  /**
   * Auto-bootstrap empire for new users
   * Creates empire, colony, and starter building if no empire exists
   * @param userId - The user ID to bootstrap empire for
   * @returns Promise<Empire>
   */
  static async autoBootstrapEmpire(userId: string): Promise<any> {
    // Pick an unowned planet
    const pick = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select('coord')
      .eq(DB_FIELDS.CREDIT_TRANSACTIONS.TYPE, 'planet')
      .is(DB_FIELDS.LOCATIONS.OWNER_ID, null)
      .limit(1)
      .single();

    if (!pick.data?.coord) {
      throw new Error('No available starter planets');
    }

    const coord = pick.data.coord as string;

    // Claim the planet
    await supabase
      .from(DB_TABLES.LOCATIONS)
      .update({ owner_id: userId })
      .eq('coord', coord)
      .is(DB_FIELDS.LOCATIONS.OWNER_ID, null);

    // Get user info for empire name
    const { data: userRow } = await supabase
      .from(DB_TABLES.USERS)
      .select('username, email')
      .eq(DB_FIELDS.BUILDINGS.ID, userId)
      .single();

    // Create empire
    const displayName = (userRow?.username || userRow?.email?.split?.('@')?.[0] || 'Commander') as string;
    const insertEmpire = await supabase
      .from(DB_TABLES.EMPIRES)
      .insert({
        user_id: userId,
        name: `${displayName}`,
        home_system: coord,
        territories: [coord],
        credits: GAME_CONSTANTS.STARTING_CREDITS,
        energy: 0,
      })
      .select('*')
      .single();

    if (!insertEmpire.data) {
      throw new Error('Failed to create empire');
    }

    const empireRow = insertEmpire.data as any;

    // Create colony and starter building (best-effort)
    await supabase
      .from(DB_TABLES.COLONIES)
      .insert({ empire_id: empireRow.id, location_coord: coord, name: 'Home Base' });

    await supabase
      .from(DB_TABLES.BUILDINGS)
      .insert({
        empire_id: empireRow.id,
        location_coord: coord,
        catalog_key: 'urban_structures',
        level: 1,
        is_active: true,
        construction_completed: new Date().toISOString(),
        credits_cost: 0,
      });

    // Update user linkage
    await supabase
      .from(DB_TABLES.USERS)
      .update({ empire_id: empireRow.id, starting_coordinate: coord })
      .eq(DB_FIELDS.BUILDINGS.ID, userId);

    return empireRow;
  }
}