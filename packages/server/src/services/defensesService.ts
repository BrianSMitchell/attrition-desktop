import mongoose from 'mongoose';
import { Empire, EmpireDocument } from '../models/Empire';
import { StructuresService } from './structuresService';
import {
  getDefensesList,
  DefenseKey,
  TechnologyKey,
} from '@game/shared';

/**
 * DTO formatters for canonical response schema per .clinerules/dto-error-schema-and-logging.md
 */
function formatSuccess(data: any, message: string) {
  return {
    success: true as const,
    data,
    message
  };
}

function formatError(code: string, message: string, details?: any) {
  return {
    success: false as const,
    code,
    message,
    details,
    error: message
  };
}

function mapFromEmpireTechLevels(empire: EmpireDocument): Partial<Record<string, number>> {
  const raw = (empire as any).techLevels as any;
  const out: Record<string, number> = {};

  // Support Mongoose Map-like (has forEach), native Map, and plain objects
  if (raw && typeof raw.forEach === 'function') {
    raw.forEach((v: any, k: string) => {
      out[k] = typeof v === 'number' ? v : Number(v || 0);
    });
    return out;
  }

  if (raw instanceof Map) {
    for (const [k, v] of raw.entries()) {
      out[k] = typeof v === 'number' ? v : Number(v || 0);
    }
    return out;
  }

  if (raw && typeof raw === 'object') {
    for (const k of Object.keys(raw)) {
      const v = (raw as any)[k];
      out[k] = typeof v === 'number' ? v : Number(v || 0);
    }
    return out;
  }

  return {};
}

function evaluateDefenseTechPrereqs(
  techLevels: Partial<Record<string, number>>,
  prereqs: Array<{ key: TechnologyKey; level: number }>
): { ok: boolean; unmet: Array<{ key: TechnologyKey; requiredLevel: number; currentLevel: number }> } {
  const unmet: Array<{ key: TechnologyKey; requiredLevel: number; currentLevel: number }> = [];
  for (const req of prereqs) {
    const current = Math.max(0, (techLevels as any)[req.key] ?? 0);
    if (current < req.level) {
      unmet.push({ key: req.key, requiredLevel: req.level, currentLevel: current });
    }
  }
  return { ok: unmet.length === 0, unmet };
}

export interface DefensesStatusDTO {
  techLevels: Partial<Record<string, number>>;
  eligibility: Record<
    DefenseKey,
    {
      canStart: boolean;
      reasons: string[];
    }
  >;
}

/**
 * Phase A "Defenses" service.
 * - Tech-only gating (credits/energy not enforced yet).
 * - Start action maps every defense to existing BuildingService type 'defense_station'.
 */
export class DefensesService {
  static async getStatus(empireId: string): Promise<DefensesStatusDTO> {
    const empire = await Empire.findById(empireId);
    if (!empire) {
      throw new Error('Empire not found');
    }

    const techLevels = mapFromEmpireTechLevels(empire);
    const list = getDefensesList();

    const eligibility: DefensesStatusDTO['eligibility'] = {} as any;

    for (const spec of list) {
      const techCheck = evaluateDefenseTechPrereqs(techLevels, spec.techPrereqs);
      const reasons: string[] = [];

      if (!techCheck.ok) {
        for (const u of techCheck.unmet) {
          reasons.push(`Requires ${u.key} ${u.requiredLevel} (current ${u.currentLevel}).`);
        }
      }

      eligibility[spec.key] = {
        canStart: techCheck.ok,
        reasons,
      };
    }

    return { techLevels, eligibility };
  }

  static async start(empireId: string, locationCoord: string, defenseKey: DefenseKey) {
    const empire = await Empire.findById(empireId);
    if (!empire) {
      return formatError('NOT_FOUND', 'Empire not found');
    }

    // Validate against catalog + tech prereqs
    const spec = getDefensesList().find(d => d.key === defenseKey);
    if (!spec) {
      return formatError('INVALID_REQUEST', 'Unknown defense key', { field: 'defenseKey', value: defenseKey });
    }

    const techLevels = mapFromEmpireTechLevels(empire);
    const techCheck = evaluateDefenseTechPrereqs(techLevels, spec.techPrereqs);
    if (!techCheck.ok) {
      const reasons = techCheck.unmet.map(
        (u) => `Requires ${u.key} ${u.requiredLevel} (current ${u.currentLevel}).`,
      );
      return formatError('TECH_REQUIREMENTS', 'Technology requirements not met', { unmet: techCheck.unmet });
    }

    // Map all defenses to existing 'jump_gate' building key for Phase A (maps to defense_station type)
    const result = await StructuresService.start(empireId, locationCoord, 'jump_gate');

    if (!result.success) {
      // Debug log to diagnose 400 failures during E2E
      console.warn('[DefensesService.start] mapped start failed', {
        code: (result as any).code,
        message: (result as any).message || (result as any).error,
        details: (result as any).details,
        reasons: (result as any).reasons,
      });
      const details = (result as any).details;
      const reasons = (result as any).reasons;
      const code = (result as any).code || 'SERVER_ERROR';
      const message = ('message' in (result as any) ? (result as any).message : (result as any).error || 'Failed to start defense');
      const base = formatError(code, message, details);
      return reasons ? { ...base, reasons } : base;
    }

    return formatSuccess(
      {
        building: result.data?.building,
        defenseKey,
        etaMinutes: (result as any).data?.etaMinutes,
        constructionCapacityCredPerHour: (result as any).data?.constructionCapacityCredPerHour
      },
      `${spec.name} construction started.`
    );
  }
}
