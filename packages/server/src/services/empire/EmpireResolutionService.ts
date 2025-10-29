import { Empire, Location } from '@game/shared';
import { supabase } from '../../config/supabase';
import { DB_TABLES } from '../constants/database-fields';

import { DB_FIELDS } from '../../../constants/database-fields';
/**
 * Service for resolving empire-related operations and validations
 */
export interface UserObject {
  _id?: string;
  id?: string;
  email: string;
  empire_id?: string;
}

export class EmpireResolutionService {
  constructor(
    private locations: Map<string, Location>,
    private empires: Map<string, Empire>
  ) {}

  /**
   * Resolve an empire by ID
   */
  public resolveEmpire(empireId: string): Empire | undefined {
    return this.empires.get(empireId);
  }

  /**
   * Resolve a location by coordinate
   */
  public resolveLocation(coord: string): Location | undefined {
    return this.locations.get(coord);
  }

  /**
   * Check if an empire owns a location
   */
  public ownsLocation(empireId: string, coord: string): boolean {
    const location = this.resolveLocation(coord);
    return location?.owner === empireId;
  }

  /**
   * Check if a location is owned by any empire
   */
  public locationIsOwned(coord: string): boolean {
    const location = this.resolveLocation(coord);
    return !!location?.owner;
  }

  /**
   * Resolve empire by user object.
   * First checks user.empire_id, then looks up by user_id in empires table.
   * Returns complete empire data needed by routes.
   */
  public static async resolveEmpireByUserObject(user: UserObject): Promise<any | null> {
    const userId = user._id || user.id;
    if (!userId) return null;

    // Try user.empire_id first
    if (user.empire_id) {
      const { data: empireRow } = await supabase
        .from(DB_TABLES.EMPIRES)
        .select('id, name, territories, credits, energy, user_id')
        .eq(DB_FIELDS.BUILDINGS.ID, user.empire_id)
        .maybeSingle();

      if (empireRow?.id) return empireRow;
    }

    // Try looking up by user_id
    const { data: empireRow } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('id, name, territories, credits, energy, user_id')
      .eq(DB_FIELDS.EMPIRES.USER_ID, userId)
      .maybeSingle();

    return empireRow || null;
  }
}

