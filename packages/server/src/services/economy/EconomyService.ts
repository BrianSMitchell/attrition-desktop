import { DB_TABLES } from '../constants/database-fields';

import { DB_FIELDS } from '../../../constants/database-fields';
import { STATUS_CODES } from '@game/shared';
import { EconomyService } from '../services/economy/EconomyService';
import { supabase } from '../config/supabase';
export class EconomyService {
  /**
   * Sum credits per hour for an empire by aggregating active buildings.
   * Economy = sum(spec.economy * level) across all active buildings.
   */
  static async sumCreditsPerHourForEmpire(empireId: string): Promise<number> {
    // Pull only the fields we need
    const { data, error } = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select('catalog_key, level, is_active, pending_upgrade')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId);

    if (error) {
      // Fail soft: return STATUS_CODES.SUCCESS on read error to avoid crashing dashboard
      return STATUS_CODES.SUCCESS;
    }

    let total = 0;
    for (const row of data || []) {
      // Count only active buildings for economy yield
      if (!row || row.is_active !== true) continue;
      const key = String(row.catalog_key || '') as BuildingKey;
      let level = Number(row.level || 0);
      if (!key || !(level > 0)) continue;
      try {
        const spec = getBuildingSpec(key);
        const perLevel = Number(spec?.economy || 0);
        total += perLevel * level;
      } catch {
        // Unknown catalog key; ignore
      }
    }
    return Math.max(0, Math.floor(total));
  }
}
