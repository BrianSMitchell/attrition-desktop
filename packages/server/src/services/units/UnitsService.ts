import { supabase } from '../../config/supabase';
import { CapacityService } from '../bases/CapacityService';
import { getUnitsList, getUnitSpec, type UnitKey } from '@game/shared';
import { TechService } from '../tech/TechService';

function evaluateUnitTechPrereqs(
  techLevels: Record<string, number>,
  prereqs: Array<{ key: string; level: number }>
): { ok: boolean; unmet: Array<{ key: string; requiredLevel: number; currentLevel: number }> } {
  const unmet: Array<{ key: string; requiredLevel: number; currentLevel: number }> = [];
  for (const req of prereqs || []) {
    const current = Math.max(0, techLevels[req.key] ?? 0);
    if (current < req.level) {
      unmet.push({ key: req.key, requiredLevel: req.level, currentLevel: current });
    }
  }
  return { ok: unmet.length === 0, unmet };
}

export class UnitsService {
  static async getShipyardLevels(empireId: string, coord: string): Promise<Record<string, number>> {
    const levels: Record<string, number> = {};
    const { data: shipyards } = await supabase
      .from('buildings')
      .select('level')
      .eq('empire_id', empireId)
      .eq('location_coord', coord)
      .eq('catalog_key', 'shipyards');
    const { data: orbital } = await supabase
      .from('buildings')
      .select('level')
      .eq('empire_id', empireId)
      .eq('location_coord', coord)
      .eq('catalog_key', 'orbital_shipyards');

    const maxShip = (shipyards || []).reduce((m, b: any) => Math.max(m, Number(b.level || 0)), 0);
    const maxOrb = (orbital || []).reduce((m, b: any) => Math.max(m, Number(b.level || 0)), 0);
    levels['shipyards'] = maxShip;
    levels['orbital_shipyards'] = maxOrb;
    return levels;
  }

  static async getStatus(empireId: string, baseCoord?: string) {
const techLevels = await TechService.getTechLevels(empireId);
    const list = getUnitsList();

    let shipyardLevels: Record<string, number> = {};
    if (baseCoord) {
      shipyardLevels = await this.getShipyardLevels(empireId, baseCoord);
    }

    const eligibility: Record<
      UnitKey,
      {
        canStart: boolean;
        reasons: string[];
      }
    > = {} as any;

    for (const spec of list) {
      const techCheck = evaluateUnitTechPrereqs(techLevels, spec.techPrereqs || []);
      const reasons: string[] = [];
      let canStart = true;

      if (!techCheck.ok) {
        canStart = false;
        for (const u of techCheck.unmet) {
          reasons.push(`Requires ${u.key} ${u.requiredLevel} (current ${u.currentLevel}).`);
        }
      }

      if (baseCoord) {
        if (typeof spec.requiredShipyardLevel === 'number' && spec.requiredShipyardLevel > 0) {
          const currentShipyardLevel = shipyardLevels['shipyards'] || 0;
          if (currentShipyardLevel < spec.requiredShipyardLevel) {
            canStart = false;
            reasons.push(`Requires Shipyard level ${spec.requiredShipyardLevel} (current ${currentShipyardLevel}).`);
          }
        }
        if (typeof spec.requiredOrbitalShipyardLevel === 'number' && spec.requiredOrbitalShipyardLevel > 0) {
          const currentOrbitalLevel = shipyardLevels['orbital_shipyards'] || 0;
          if (currentOrbitalLevel < spec.requiredOrbitalShipyardLevel) {
            canStart = false;
            reasons.push(`Requires Orbital Shipyard level ${spec.requiredOrbitalShipyardLevel} (current ${currentOrbitalLevel}).`);
          }
        }
      }

      eligibility[spec.key] = { canStart, reasons };
    }

    // Credits optional in status – client primarily needs eligibility; could include credits later if needed
    return { techLevels, eligibility };
  }

  static async getQueue(empireId: string, baseCoord?: string) {
    let q = supabase
      .from('unit_queue')
      .select('id, unit_key, location_coord, started_at, completes_at, status, created_at')
      .eq('empire_id', empireId)
      .eq('status', 'pending')
      .order('completes_at', { ascending: true });
    if (baseCoord) q = q.eq('location_coord', baseCoord);
    const { data } = await q;
    return data || [];
  }

  static async start(userId: string, empireId: string, baseCoord: string, unitKey: UnitKey) {
    // Ownership check
    const loc = await supabase
      .from('locations')
      .select('owner_id')
      .eq('coord', baseCoord)
      .maybeSingle();
    if (!loc.data) {
      return { success: false as const, code: 'NOT_FOUND', message: 'Location not found' };
    }
    if (String((loc.data as any).owner_id || '') !== String(userId)) {
      return { success: false as const, code: 'NOT_OWNER', message: 'You do not own this location' };
    }

    // Load spec & tech levels
    const spec = getUnitSpec(unitKey);
    if (!spec) {
      return { success: false as const, code: 'INVALID_REQUEST', message: 'Unknown unit key' };
    }
const techLevels = await TechService.getTechLevels(empireId);
    const techCheck = evaluateUnitTechPrereqs(techLevels, spec.techPrereqs || []);
    if (!techCheck.ok) {
      return {
        success: false as const,
        code: 'TECH_REQUIREMENTS',
        message: 'Technology requirements not met',
        details: { unmet: techCheck.unmet },
        reasons: techCheck.unmet.map((u) => `Requires ${u.key} ${u.requiredLevel} (current ${u.currentLevel}).`),
      } as any;
    }

    // Shipyard requirements
    const shipLevels = await this.getShipyardLevels(empireId, baseCoord);
    if (typeof spec.requiredShipyardLevel === 'number' && spec.requiredShipyardLevel > 0) {
      const currentShip = shipLevels['shipyards'] || 0;
      if (currentShip < spec.requiredShipyardLevel) {
        const msg = `Requires Shipyard level ${spec.requiredShipyardLevel} at this base (current ${currentShip}).`;
        return { success: false as const, code: 'TECH_REQUIREMENTS', message: msg, reasons: [msg] } as any;
      }
    }
    if (typeof spec.requiredOrbitalShipyardLevel === 'number' && spec.requiredOrbitalShipyardLevel > 0) {
      const currentOrb = shipLevels['orbital_shipyards'] || 0;
      if (currentOrb < spec.requiredOrbitalShipyardLevel) {
        const msg = `Requires Orbital Shipyard level ${spec.requiredOrbitalShipyardLevel} at this base (current ${currentOrb}).`;
        return { success: false as const, code: 'TECH_REQUIREMENTS', message: msg, reasons: [msg] } as any;
      }
    }

    // Credits & capacity
    const eRes = await supabase.from('empires').select('credits').eq('id', empireId).maybeSingle();
    const credits = Math.max(0, Number((eRes.data as any)?.credits || 0));
    const cost = Math.max(0, Number(spec.creditsCost || 0));
    if (credits < cost) {
      const msg = `Insufficient credits. Requires ${cost}.`;
      return { success: false as const, code: 'INSUFFICIENT_RESOURCES', message: msg, reasons: ['insufficient_credits'] } as any;
    }

const caps = await CapacityService.getBaseCapacities(empireId, baseCoord);
    const perHour = Math.max(0, Number((caps as any)?.production?.value || 0));
    if (!(perHour > 0)) {
      return { success: false as const, code: 'NO_CAPACITY', message: 'Production capacity is zero at this base.' } as any;
    }

    const hours = cost / perHour;
    const etaMinutes = Math.max(1, Math.ceil(hours * 60));
    const nowIso = new Date().toISOString();
    const completesAt = new Date(Date.now() + etaMinutes * 60000).toISOString();

    const identityKey = `${empireId}:${baseCoord}:${unitKey}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Insert pending item; completes_at required (scheduled item).
    const ins = await supabase
      .from('unit_queue')
      .insert({
        empire_id: empireId,
        location_coord: baseCoord,
        unit_key: unitKey,
        identity_key: identityKey,
        started_at: nowIso,
        completes_at: completesAt,
        status: 'pending',
      })
      .select('id')
      .single();

    if (ins.error) {
      // unique violation (23505) -> already in progress idempotency case
      const code = (ins.error as any)?.code;
      if (code === '23505') {
        return {
          success: false as const,
          code: 'ALREADY_IN_PROGRESS',
          message: 'A similar unit is already queued or in progress.',
          details: { identityKey },
        } as any;
      }
      return { success: false as const, code: 'DB_ERROR', message: ins.error.message } as any;
    }

    // Deduct credits after successful enqueue
    await supabase.from('empires').update({ credits: credits - cost }).eq('id', empireId);

    // Log credit transaction (best effort)
    try {
      const { CreditLedgerService: SupabaseCreditLedgerService } = await import('../creditLedgerService');
      await SupabaseCreditLedgerService.logTransaction({
        empireId,
        amount: -cost,
        type: 'unit_production',
        note: `Unit production started: ${spec.name} at ${baseCoord}`,
        meta: { coord: baseCoord, unitKey },
        balanceAfter: credits - cost,
      });
    } catch (logErr) {
      console.warn('[SupabaseUnitsService] Failed to log credit transaction:', logErr);
    }

    return {
      success: true as const,
      data: {
        queueId: (ins.data as any)?.id,
        unitKey,
        completesAt,
        etaMinutes,
        productionCapacityCredPerHour: perHour,
      },
      message: `${spec.name} construction started. ETA ${etaMinutes} minute(s).`,
    } as const;
  }
}
