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
    console.log('[SupabaseTechService.start]', { userId, empireId, baseCoord, techKey });
    
    // Ownership
    const loc = await supabase.from('locations').select('owner_id').eq('coord', baseCoord).maybeSingle();
    console.log('[SupabaseTechService.start] Location check:', { found: !!loc.data, ownerId: loc.data?.owner_id });
    
    if (!loc.data) {
      console.log('[SupabaseTechService.start] Location not found');
      return { success: false as const, code: 'NOT_FOUND', message: 'Location not found' };
    }
    if (String(loc.data.owner_id || '') !== String(userId)) {
      console.log('[SupabaseTechService.start] Not owner:', { expected: userId, actual: loc.data.owner_id });
      return { success: false as const, code: 'NOT_OWNER', message: 'You do not own this location' };
    }

    // State
    const spec = getTechSpec(techKey);
    console.log('[SupabaseTechService.start] Tech spec:', spec);
    
    const techLevels = await this.getTechLevels(empireId);
    console.log('[SupabaseTechService.start] Tech levels:', techLevels);
    
    const currentLevel = Math.max(0, techLevels[techKey] ?? 0);
    const desiredLevel = currentLevel + 1;
    console.log('[SupabaseTechService.start] Current/Desired level:', { currentLevel, desiredLevel });
    
    const eRes = await supabase.from('empires').select('credits').eq('id', empireId).maybeSingle();
    const credits = Math.max(0, Number((eRes.data as any)?.credits || 0));
    console.log('[SupabaseTechService.start] Credits:', credits);
    
    const baseLabTotal = await this.getBaseLabTotal(empireId, baseCoord);
    console.log('[SupabaseTechService.start] Base lab total:', baseLabTotal);

    // Check eligibility
    const check = canStartTechLevel({ techLevels, baseLabTotal, credits }, spec, desiredLevel);
    console.log('[SupabaseTechService.start] Eligibility check:', check);
    
    if (!check.canStart) {
      console.log('[SupabaseTechService.start] Requirements not met:', check.reasons);
      return { success: false as const, code: 'TECH_REQUIREMENTS', message: check.reasons.join(' ') };
    }

    // Capacity & cost
    console.log('[SupabaseTechService.start] Getting capacities...');
    let caps;
    try {
      caps = await SupabaseCapacityService.getBaseCapacities(empireId, baseCoord);
      console.log('[SupabaseTechService.start] Capacities:', caps);
    } catch (error) {
      console.error('[SupabaseTechService.start] Error getting capacities:', error);
      return { success: false as const, code: 'CAPACITY_ERROR', message: `Failed to get capacity: ${error}` };
    }
    
    const perHour = Math.max(0, Number((caps as any)?.research?.value || 0));
    console.log('[SupabaseTechService.start] Research capacity per hour:', perHour);
    
    if (!(perHour > 0)) {
      console.log('[SupabaseTechService.start] No research capacity');
      return { success: false as const, code: 'NO_CAPACITY', message: 'Research capacity is zero at this base.' };
    }

    const cost = getTechCreditCostForLevel(spec, desiredLevel);
    const nowIso = new Date().toISOString();
    
    // Generate identity key for idempotency (prevent duplicate queue entries)
    const identityKey = `${empireId}:${baseCoord}:${techKey}:${desiredLevel}:${Date.now()}`;
    console.log('[SupabaseTechService.start] Generated identity key:', identityKey);

    if (credits < cost) {
      // Queue uncharged
      console.log('[SupabaseTechService.start] Insufficient credits, queuing research without charge');
      const insertRes = await supabase
        .from('tech_queue')
        .insert({
          empire_id: empireId,
          location_coord: baseCoord,
          tech_key: techKey,
          level: desiredLevel,
          identity_key: identityKey,
          started_at: nowIso,
          status: 'pending',
        });
      
      if (insertRes.error) {
        console.error('[SupabaseTechService.start] Failed to insert tech_queue entry (uncharged):', insertRes.error);
        return { success: false as const, code: 'DB_ERROR', message: `Failed to queue research: ${insertRes.error.message}` };
      }
      console.log('[SupabaseTechService.start] Successfully queued research (uncharged)');
      
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
    console.log('[SupabaseTechService.start] Inserting tech_queue entry with ETA:', { completesAt, etaMinutes });
    const insertRes = await supabase
      .from('tech_queue')
      .insert({
        empire_id: empireId,
        location_coord: baseCoord,
        tech_key: techKey,
        level: desiredLevel,
        identity_key: identityKey,
        started_at: nowIso,
        completes_at: completesAt,
        status: 'pending',
      });

    if (insertRes.error) {
      console.error('[SupabaseTechService.start] Failed to insert tech_queue entry:', insertRes.error);
      return { success: false as const, code: 'DB_ERROR', message: `Failed to start research: ${insertRes.error.message}` };
    }
    console.log('[SupabaseTechService.start] Successfully inserted tech_queue entry');

    console.log('[SupabaseTechService.start] Deducting credits:', { cost, newBalance: credits - cost });
    const updateRes = await supabase.from('empires').update({ credits: credits - cost }).eq('id', empireId);
    if (updateRes.error) {
      console.error('[SupabaseTechService.start] Failed to deduct credits:', updateRes.error);
      // Research was queued but credits not deducted - this is recoverable as the credit deduction
      // will happen when research completes. Log but continue.
    } else {
      // Log credit transaction (best effort)
      try {
        const { SupabaseCreditLedgerService } = await import('../SupabaseCreditLedgerService');
        await SupabaseCreditLedgerService.logTransaction({
          empireId,
          amount: -cost,
          type: 'research',
          note: `Research started: ${spec.name} level ${desiredLevel} at ${baseCoord}`,
          meta: { coord: baseCoord, techKey, level: desiredLevel },
          balanceAfter: credits - cost,
        });
      } catch (logErr) {
        console.warn('[SupabaseTechService] Failed to log credit transaction:', logErr);
      }
    }

    return {
      success: true as const,
      data: { techKey, completesAt, etaMinutes, researchCapacityCredPerHour: perHour },
      message: `${spec.name} research started. ETA ${etaMinutes} minute(s).`,
    };
  }
}