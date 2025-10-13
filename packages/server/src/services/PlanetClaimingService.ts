import { supabase } from '../config/supabase';

// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';

/**
 * PlanetClaimingService - Handles planet claiming and starter setup logic
 * Eliminates feature envy by centralizing planet-related operations for new users
 */
export class PlanetClaimingService {
  /**
   * Find an available starter planet for new users
   * @returns Promise<string | null> - Coordinate of available planet or null
   */
  static async findAvailableStarterPlanet(): Promise<string | null> {
    const candidate = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select('coord')
      .eq(DB_FIELDS.CREDIT_TRANSACTIONS.TYPE, 'planet')
      .is(DB_FIELDS.LOCATIONS.OWNER_ID, null)
      .limit(1)
      .single();

    return candidate.data?.coord || null;
  }

  /**
   * Claim a planet atomically for a user
   * @param coord - Planet coordinate to claim
   * @param userId - User ID claiming the planet
   * @returns Promise<boolean> - true if claim was successful
   */
  static async claimPlanet(coord: string, userId: string): Promise<boolean> {
    const claim = await supabase
      .from(DB_TABLES.LOCATIONS)
      .update({ owner_id: userId })
      .eq('coord', coord)
      .is(DB_FIELDS.LOCATIONS.OWNER_ID, null)
      .select('coord')
      .single();

    return !!claim.data;
  }

  /**
   * Setup starter colony for new user
   * @param empireId - Empire ID for the colony
   * @param locationCoord - Coordinate where colony will be placed
   * @returns Promise<void>
   */
  static async createStarterColony(empireId: string, locationCoord: string): Promise<void> {
    await supabase
      .from(DB_TABLES.COLONIES)
      .insert({
        empire_id: empireId,
        location_coord: locationCoord,
        name: 'Home Base'
      });
  }

  /**
   * Place starter building on planet for new user
   * @param locationCoord - Planet coordinate for building placement
   * @param empireId - Empire ID that owns the building
   * @returns Promise<void>
   */
  static async placeStarterBuilding(locationCoord: string, empireId: string): Promise<void> {
    await supabase
      .from(DB_TABLES.BUILDINGS)
      .insert({
        location_coord: locationCoord,
        empire_id: empireId,
        type: 'habitat',
        display_name: 'Urban Structures',
        catalog_key: 'urban_structures',
        level: 1,
        construction_completed: new Date().toISOString(),
        is_active: true,
        credits_cost: 0,
      });
  }

  /**
   * Setup complete starter planet with colony and building
   * @param empireId - Empire ID for the setup
   * @param locationCoord - Planet coordinate for setup
   * @returns Promise<void>
   */
  static async setupStarterPlanet(empireId: string, locationCoord: string): Promise<void> {
    // Create colony and starter building (best-effort - don't fail if building creation fails)
    await this.createStarterColony(empireId, locationCoord);

    try {
      await this.placeStarterBuilding(locationCoord, empireId);
    } catch (error) {
      // Log but don't fail - colony creation is more critical
      console.warn('[PlanetClaimingService] Failed to place starter building:', error);
    }
  }

  /**
   * Complete onboarding process for new user
   * @param userId - User ID for onboarding
   * @param empireId - Empire ID for the user
   * @param startingCoordinate - Starting coordinate for the user
   * @returns Promise<void>
   */
  static async completeUserOnboarding(userId: string, empireId: string, startingCoordinate: string): Promise<void> {
    await supabase
      .from(DB_TABLES.USERS)
      .update({
        empire_id: empireId,
        starting_coordinate: startingCoordinate
      })
      .eq(DB_FIELDS.BUILDINGS.ID, userId);
  }

  /**
   * Get planet details by coordinate
   * @param coord - Planet coordinate to lookup
   * @returns Promise<Planet | null> - Planet details or null if not found
   */
  static async getPlanetByCoord(coord: string): Promise<any | null> {
    const planet = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select('*')
      .eq('coord', coord)
      .eq(DB_FIELDS.CREDIT_TRANSACTIONS.TYPE, 'planet')
      .single();

    return planet.data;
  }

  /**
   * Check if planet is available for claiming
   * @param coord - Planet coordinate to check
   * @returns Promise<boolean> - true if planet is available
   */
  static async isPlanetAvailable(coord: string): Promise<boolean> {
    const planet = await this.getPlanetByCoord(coord);
    return planet !== null && planet.owner_id === null;
  }
}