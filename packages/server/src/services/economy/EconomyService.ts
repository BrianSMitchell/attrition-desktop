import { supabase } from '../../config/supabase';
import { getBuildingSpec, BuildingKey } from '@game/shared';

export class EconomyService {
  /**
   * Sum credits per hour for an empire by aggregating active buildings.
   * Economy = sum(spec.economy * level) across all active buildings.
   */
  static async sumCreditsPerHourForEmpire(empireId: string): Promise<number> {
    // Pull only the fields we need
    const { data, error } = await supabase
      .from('buildings')
      .select('catalog_key, level, is_active, pending_upgrade')
      .eq('empire_id', empireId);

    if (error) {
      // Fail soft: return 0 on read error to avoid crashing dashboard
      return 0;
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