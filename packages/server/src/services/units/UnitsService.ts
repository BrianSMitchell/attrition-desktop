import { supabase } from '../../config/supabase';
import { CapacityService } from '../bases/CapacityService';
import { TechService } from '../tech/TechService';
import { getUnitsList, getUnitSpec, type UnitKey } from '@game/shared';
import { ERROR_MESSAGES } from '../../constants/response-formats';
import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  ConflictError,
  BadRequestError,
} from '../../types/error.types';
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
      .from(DB_TABLES.BUILDINGS)
      .select(DB_FIELDS.BUILDINGS.LEVEL)
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, coord)
      .eq(DB_FIELDS.BUILDINGS.CATALOG_KEY, 'shipyards');
    const { data: orbital } = await supabase
      .from(DB_TABLES.BUILDINGS)
      .select(DB_FIELDS.BUILDINGS.LEVEL)
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, coord)
      .eq(DB_FIELDS.BUILDINGS.CATALOG_KEY, 'orbital_shipyards');

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
      .from(DB_TABLES.UNIT_QUEUE)
      .select('id, unit_key, location_coord, started_at, completes_at, status, created_at')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
      .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending')
      .order(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, { ascending: true });
    if (baseCoord) q = q.eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, baseCoord);
    const { data } = await q;
    return data || [];
  }

  static async start(userId: string, empireId: string, baseCoord: string, unitKey: UnitKey) {
    // Ownership check
    const loc = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select(DB_FIELDS.LOCATIONS.OWNER_ID)
      .eq('coord', baseCoord)
      .maybeSingle();
    if (!loc.data) {
      throw new NotFoundError('Location', baseCoord);
    }
    if (String((loc.data as any).owner_id || '') !== String(userId)) {
      throw new ConflictError('You do not own this location', { locationCoord: baseCoord });
    }

    // Load spec & tech levels
    const spec = getUnitSpec(unitKey);
    if (!spec) {
      throw new ValidationError('Unknown unit key', { unitKey });
    }
const techLevels = await TechService.getTechLevels(empireId);
    const techCheck = evaluateUnitTechPrereqs(techLevels, spec.techPrereqs || []);
    if (!techCheck.ok) {
      throw new ValidationError('Technology requirements not met', { unmet: techCheck.unmet });
    }

    // Shipyard requirements
    const shipLevels = await this.getShipyardLevels(empireId, baseCoord);
    if (typeof spec.requiredShipyardLevel === 'number' && spec.requiredShipyardLevel > 0) {
      const currentShip = shipLevels['shipyards'] || 0;
      if (currentShip < spec.requiredShipyardLevel) {
        throw new ValidationError(`Requires Shipyard level ${spec.requiredShipyardLevel} at this base (current ${currentShip}).`, {
          required: spec.requiredShipyardLevel,
          current: currentShip
        });
      }
    }
    if (typeof spec.requiredOrbitalShipyardLevel === 'number' && spec.requiredOrbitalShipyardLevel > 0) {
      const currentOrb = shipLevels['orbital_shipyards'] || 0;
      if (currentOrb < spec.requiredOrbitalShipyardLevel) {
        throw new ValidationError(`Requires Orbital Shipyard level ${spec.requiredOrbitalShipyardLevel} at this base (current ${currentOrb}).`, {
          required: spec.requiredOrbitalShipyardLevel,
          current: currentOrb
        });
      }
    }

    // Credits & capacity
    const eRes = await supabase.from(DB_TABLES.EMPIRES).select(DB_FIELDS.EMPIRES.CREDITS).eq(DB_FIELDS.BUILDINGS.ID, empireId).maybeSingle();
    const credits = Math.max(0, Number((eRes.data as any)?.credits || 0));
    const cost = Math.max(0, Number(spec.creditsCost || 0));
    if (credits < cost) {
      throw new BadRequestError(`Insufficient credits. Requires ${cost}, you have ${credits}.`, {
        required: cost,
        available: credits
      });
    }

const caps = await CapacityService.getBaseCapacities(empireId, baseCoord);
    const perHour = Math.max(0, Number((caps as any)?.production?.value || 0));
    if (!(perHour > 0)) {
      throw new BadRequestError('Production capacity is zero at this base.');
    }

    const hours = cost / perHour;
    const etaMinutes = Math.max(1, Math.ceil(hours * 60));
    const nowIso = new Date().toISOString();
    const completesAt = new Date(Date.now() + etaMinutes * 60000).toISOString();

    const identityKey = `${empireId}:${baseCoord}:${unitKey}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Insert pending item; completes_at required (scheduled item).
    const ins = await supabase
      .from(DB_TABLES.UNIT_QUEUE)
      .insert({
        empire_id: empireId,
        location_coord: baseCoord,
        unit_key: unitKey,
        identity_key: identityKey,
        started_at: nowIso,
        completes_at: completesAt,
        status: 'pending',
      })
      .select(DB_FIELDS.BUILDINGS.ID)
      .single();

    if (ins.error) {
      // unique violation (23505) -> already in progress idempotency case
      const code = (ins.error as any)?.code;
      if (code === '23505') {
        throw new ConflictError('A similar unit is already queued or in progress.', { unitKey });
      }
      throw new DatabaseError('Failed to create unit queue item', 'INSERT_UNIT_QUEUE', {
        empireId,
        baseCoord,
        unitKey,
        supabaseError: ins.error.message
      });
    }

    // Deduct credits after successful enqueue
    await supabase.from(DB_TABLES.EMPIRES).update({ credits: credits - cost }).eq(DB_FIELDS.BUILDINGS.ID, empireId);

    // Log credit transaction (best effort)
    try {
const { CreditLedgerService } = await import('../../constants/response-formats')
await CreditLedgerService.logTransaction({
        empireId,
        amount: -cost,
        type: 'unit_production',
        note: `Unit production started: ${spec.name} at ${baseCoord}`,
        meta: { coord: baseCoord, unitKey },
        balanceAfter: credits - cost,
      });
    } catch (logErr) {
console.warn('[UnitsService] Failed to log credit transaction:', logErr);
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
