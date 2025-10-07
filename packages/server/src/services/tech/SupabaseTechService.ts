import { supabase } from '../../config/supabase';
import { SupabaseCapacityService } from '../bases/SupabaseCapacityService';
import { getTechnologyList, getTechSpec, canStartTechLevel, getTechCreditCostForLevel, type TechnologyKey } from '@game/shared';

export class SupabaseTechService {
  static async getTechLevels(empireId: string): Promise<Record<string, number>> {
    const { data } = await supabase
      .from('tech_levels')
      .select('tech_key, level')
      .eq('empire_id', empireId);
    const out: Record<string, number> = {};
    for (const row of data || []) {
      const key = String((row as any).tech_key || '');
      const level = Math.max(0, Number((row as any).level || 0));
      if (key) out[key] = level;
    }
    return out;
  }

  static async getBaseLabTotal(empireId: string, coord: string): Promise<number> {
    // Sum levels of research_labs where active/effective
    const bRes = await supabase
      .from('buildings')
      .select('level, is_active, pending_upgrade, construction_completed, catalog_key')
      .eq('empire_id', empireId)
      .eq('location_coord', coord)
      .eq('catalog_key', 'research_labs');
    const now = Date.now();
    let total = 0;
    for (const b of bRes.data || []) {
      const lvl = Math.max(0, Number((b as any).level || 0));
      const isActive = (b as any).is_active === true;
      const pending = (b as any).pending_upgrade === true;
      const completes = (b as any).construction_completed ? new Date((b as any).construction_completed).getTime() : 0;
      const effective = isActive || pending || (completes && completes <= now);
      if (effective) total += lvl;
    }
    return total;
  }

  static async getStatus(userId: string, empireId: string, baseCoord: string) {
    // credits
    const eRes = await supabase.from('empires').select('credits').eq('id', empireId).maybeSingle();
    const credits = Math.max(0, Number((eRes.data as any)?.credits || 0));

    const [techLevels, baseLabTotal] = await Promise.all([
      this.getTechLevels(empireId),
      this.getBaseLabTotal(empireId, baseCoord),
    ]);

    const eligibility: Record<string, { canStart: boolean; reasons: string[] }> = {} as any;
    const list = getTechnologyList();
    for (const spec of list) {
      const current = Math.max(0, techLevels[spec.key] ?? 0);
      const desired = current + 1;
      eligibility[spec.key] = canStartTechLevel({ techLevels, baseLabTotal, credits }, spec, desired);
    }

    return { techLevels, baseLabTotal, eligibility, credits };
  }

  static async getQueue(empireId: string, baseCoord?: string) {
    let q = supabase
      .from('tech_queue')
      .select('id, tech_key, level, started_at, completes_at, status, location_coord')
      .eq('empire_id', empireId)
      .eq('status', 'pending')
      .order('completes_at', { ascending: true });
    if (baseCoord) {
      q = q.eq('location_coord', baseCoord);
    }
    const { data } = await q;
    return data || [];
  }

  static async start(userId: string, empireId: string, baseCoord: string, techKey: TechnologyKey) {
    // Ownership
    const loc = await supabase.from('locations').select('owner_id').eq('coord', baseCoord).maybeSingle();
    if (!loc.data) return { success: false as const, code: 'NOT_FOUND', message: 'Location not found' };
    if (String(loc.data.owner_id || '') !== String(userId)) {
      return { success: false as const, code: 'NOT_OWNER', message: 'You do not own this location' };
    }

    // State
    const spec = getTechSpec(techKey);
    const techLevels = await this.getTechLevels(empireId);
    const currentLevel = Math.max(0, techLevels[techKey] ?? 0);
    const desiredLevel = currentLevel + 1;
    const eRes = await supabase.from('empires').select('credits').eq('id', empireId).maybeSingle();
    const credits = Math.max(0, Number((eRes.data as any)?.credits || 0));
    const baseLabTotal = await this.getBaseLabTotal(empireId, baseCoord);

    // Check eligibility
    const check = canStartTechLevel({ techLevels, baseLabTotal, credits }, spec, desiredLevel);
    if (!check.canStart) {
      return { success: false as const, code: 'TECH_REQUIREMENTS', message: check.reasons.join(' ') };
    }

    // Capacity & cost
    const caps = await SupabaseCapacityService.getBaseCapacities(empireId, baseCoord);
    const perHour = Math.max(0, Number((caps as any)?.research?.value || 0));
    if (!(perHour > 0)) {
      return { success: false as const, code: 'NO_CAPACITY', message: 'Research capacity is zero at this base.' };
    }

    const cost = getTechCreditCostForLevel(spec, desiredLevel);
    const nowIso = new Date().toISOString();

    if (credits < cost) {
      // Queue uncharged
      await supabase
        .from('tech_queue')
        .insert({
          empire_id: empireId,
          location_coord: baseCoord,
          tech_key: techKey,
          level: desiredLevel,
          started_at: nowIso,
          status: 'pending',
        });
      return {
        success: true as const,
        data: { techKey, etaMinutes: null, researchCapacityCredPerHour: perHour },
        message: `${spec.name} queued. Will start automatically when sufficient credits are available.`,
      };
    }

    const hours = cost / perHour;
    const etaMinutes = Math.max(1, Math.ceil(hours * 60));
    const completesAt = new Date(Date.now() + etaMinutes * 60000).toISOString();

    // Insert queue charged and deduct credits
    await supabase
      .from('tech_queue')
      .insert({
        empire_id: empireId,
        location_coord: baseCoord,
        tech_key: techKey,
        level: desiredLevel,
        started_at: nowIso,
        completes_at: completesAt,
        status: 'pending',
      });

    await supabase.from('empires').update({ credits: credits - cost }).eq('id', empireId);

    return {
      success: true as const,
      data: { techKey, completesAt, etaMinutes, researchCapacityCredPerHour: perHour },
      message: `${spec.name} research started. ETA ${etaMinutes} minute(s).`,
    };
  }
}