import { Response, Router } from 'express';
import { supabase } from '../../config/supabase';
import { ERROR_MESSAGES } from '../../constants/response-formats';
import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
import { HTTP_STATUS } from '@game/shared';
import { createBaseRouter, AuthRequest, asyncHandler } from './baseRouter';
import { getUnitsList, UnitKey, getDefensesList, getUnitSpec, DefenseKey } from '@game/shared';
import { createSuccessResponse, createErrorResponse } from '../../utils/responseBuilder';

const router = createBaseRouter();

/**
 * Unit & Defense Catalogs
 */
router.get('/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const catalog = getUnitsList();
  res.json(createSuccessResponse({ catalog }));
}));

router.get('/defenses/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const catalog = getDefensesList();
  res.json(createSuccessResponse({ catalog }));
}));

/**
 * Get defense status
 */
router.get('/defenses/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from(DB_TABLES.USERS).select('id, empire_id').eq(DB_FIELDS.BUILDINGS.ID, userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from(DB_TABLES.EMPIRES).select(DB_FIELDS.BUILDINGS.ID).eq(DB_FIELDS.EMPIRES.USER_ID, userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(HTTP_STATUS.NOT_FOUND).json(createErrorResponse(ERROR_MESSAGES.EMPIRE_NOT_FOUND, 'EMPIRE_NOT_FOUND'));

  const { DefensesService } = await import('../../services/defenses/DefensesService');
  const status = await DefensesService.getStatus(empireId);
  return res.json(createSuccessResponse({ status }));
}));

/**
 * Get defense queue
 */
router.get('/defenses/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from(DB_TABLES.USERS).select('id, empire_id').eq(DB_FIELDS.BUILDINGS.ID, userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from(DB_TABLES.EMPIRES).select(DB_FIELDS.BUILDINGS.ID).eq(DB_FIELDS.EMPIRES.USER_ID, userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(HTTP_STATUS.NOT_FOUND).json(createErrorResponse(ERROR_MESSAGES.EMPIRE_NOT_FOUND, 'EMPIRE_NOT_FOUND'));

  const locationCoord = String(req.query.locationCoord || '').trim() || undefined;

  // Build query for defense queue
  let query = supabase
    .from(DB_TABLES.DEFENSE_QUEUE)
    .select('id, defense_key, started_at, completes_at, location_coord')
    .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
    .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'pending');

  if (locationCoord) {
    query = query.eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord);
  }

  const { data: items } = await query.order(DB_FIELDS.TECH_QUEUE.COMPLETES_AT, { ascending: true, nullsFirst: false });

  const queue = (items || []).map((it: any) => ({
    id: String(it.id || ''),
    defenseKey: String(it.defense_key || ''),
    startedAt: it.started_at || null,
    completesAt: it.completes_at || null,
    baseCoord: String(it.location_coord || '')
  }));

  return res.json(createSuccessResponse({ queue }));
}));

/**
 * Start defense construction
 */
router.post('/defenses/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from(DB_TABLES.USERS).select('id, empire_id').eq(DB_FIELDS.BUILDINGS.ID, userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from(DB_TABLES.EMPIRES).select(DB_FIELDS.BUILDINGS.ID).eq(DB_FIELDS.EMPIRES.USER_ID, userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(HTTP_STATUS.NOT_FOUND).json(createErrorResponse(ERROR_MESSAGES.EMPIRE_NOT_FOUND, 'EMPIRE_NOT_FOUND'));

  const { locationCoord, defenseKey } = req.body as { locationCoord?: string; defenseKey?: DefenseKey };
  if (!locationCoord || !defenseKey) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(createErrorResponse('locationCoord and defenseKey are required', 'MISSING_FIELDS'));
  }

  const { DefensesService } = await import('../../services/defenses/DefensesService');
  const result = await DefensesService.start(empireId, locationCoord, defenseKey);
  if (!result.success) {
    const errorResponse: any = {
      success: false,
      error: (result as any).error ?? (result as any).message,
      message: (result as any).message ?? (result as any).error
    };
    if ((result as any).code) errorResponse.code = (result as any).code;
    if ((result as any).details) errorResponse.details = (result as any).details;
    if ((result as any).reasons) errorResponse.reasons = (result as any).reasons;
    const statusCode = (result as any).code === 'ALREADY_IN_PROGRESS' ? 409 : HTTP_STATUS.BAD_REQUEST;
    return res.status(statusCode).json(errorResponse);
  }

  return res.json(createSuccessResponse(result.data, result.message));
}));

/**
 * Cancel pending defense queue item
 */
router.delete('/defenses/queue/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from(DB_TABLES.USERS).select('id, empire_id').eq(DB_FIELDS.BUILDINGS.ID, userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from(DB_TABLES.EMPIRES).select(DB_FIELDS.BUILDINGS.ID).eq(DB_FIELDS.EMPIRES.USER_ID, userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(HTTP_STATUS.NOT_FOUND).json(createErrorResponse(ERROR_MESSAGES.EMPIRE_NOT_FOUND, 'EMPIRE_NOT_FOUND'));

  const id = String(req.params.id || '').trim();
  if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json(createErrorResponse('Invalid queue item id', 'INVALID_ID'));

  // Fetch the queue item
  const { data: qItem } = await supabase
    .from(DB_TABLES.DEFENSE_QUEUE)
    .select('id, empire_id, defense_key, status, location_coord')
    .eq(DB_FIELDS.BUILDINGS.ID, id)
    .maybeSingle();

  if (!qItem || String((qItem as any).empire_id) !== empireId) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(createErrorResponse(ERROR_MESSAGES.QUEUE_ITEM_NOT_FOUND, 'QUEUE_ITEM_NOT_FOUND'));
  }

  if (String((qItem as any).status || '') !== 'pending') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(createErrorResponse('Only pending items can be cancelled', 'INVALID_STATUS'));
  }

  await supabase.from(DB_TABLES.DEFENSE_QUEUE).update({ status: 'cancelled' }).eq(DB_FIELDS.BUILDINGS.ID, id);

  return res.json(createSuccessResponse({ cancelledId: id }, 'Defense queue item cancelled'));
}));

/**
 * Base Units (MVP)
 * Returns aggregate counts of completed units at a specific base for the authenticated empire.
 * DTO: { success, data: { base, counts: Record<UnitKey, number>, total }, message }
 */
/**
 * Get unit status for a base
 * GET /api/game/units/status?locationCoord=:coord
 * DTO: { success, data: { units: Array<{ unitKey, count }> } }
 */
router.get('/units/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id || req.user!.id;

  const { data: userRow } = await supabase
    .from(DB_TABLES.USERS)
    .select(DB_FIELDS.BUILDINGS.EMPIRE_ID)
    .eq(DB_FIELDS.BUILDINGS.ID, userId)
    .maybeSingle();

  if (!userRow?.empire_id) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(createErrorResponse(ERROR_MESSAGES.EMPIRE_NOT_FOUND, 'EMPIRE_NOT_FOUND'));
  }

  const locationCoord = String(req.query.locationCoord || '').trim();
  if (!locationCoord) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(createErrorResponse('locationCoord parameter is required', 'INVALID_REQUEST'));
  }

  try {
    const { data: units } = await supabase
      .from(DB_TABLES.UNITS)
      .select('unit_key, count')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, userRow.empire_id)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, locationCoord)
      .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'completed');

    const formattedUnits = (units || []).map((u: any) => ({
      unitKey: String(u.unit_key || ''),
      count: Number(u.count || 0)
    }));

    return res.json(createSuccessResponse({ units: formattedUnits }));
  } catch (error) {
    console.error('Error getting unit status:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse('Failed to get unit status', 'INTERNAL_ERROR'));
  }
}));

router.get('/base-units', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id || req.user!.id;
  
  // Get empire for current user
  const { data: userRow } = await supabase
    .from(DB_TABLES.USERS)
    .select(DB_FIELDS.BUILDINGS.EMPIRE_ID)
    .eq(DB_FIELDS.BUILDINGS.ID, userId)
    .maybeSingle();

  if (!userRow?.empire_id) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(createErrorResponse(ERROR_MESSAGES.EMPIRE_NOT_FOUND, 'EMPIRE_NOT_FOUND'));
  }
  
  const baseCoord = String(req.query.base || '').trim();
  if (!baseCoord) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(createErrorResponse('Missing base coordinate (?base=...)', 'INVALID_REQUEST'));
  }

  try {
    // Get completed units at this base for this empire
    const { data: completedUnits } = await supabase
      .from(DB_TABLES.UNITS)
      .select('unit_key, count')
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, userRow.empire_id)
      .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, baseCoord)
      .eq(DB_FIELDS.TECH_QUEUE.STATUS, 'completed');

    const counts: Record<string, number> = {};
    let total = 0;
    
    (completedUnits || []).forEach(unit => {
      const key = String(unit.unit_key || '');
      const count = Math.max(0, Number(unit.count || 0));
      if (key) {
        counts[key] = (counts[key] || 0) + count;
        total += count;
      }
    });

    return res.json(createSuccessResponse({ base: baseCoord, counts, total }, 'Base units loaded'));

  } catch (err) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(createErrorResponse('Failed to load base units', 'INTERNAL_ERROR'));
  }
}));

/**
 * Unit Production Queue
 * Lists active unit production (capacity-driven) for the authenticated empire.
 * Optional ?base=A00:10:22:10 to filter by a specific base coord.
 */
router.get('/units/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  // Get empire for current user
  const { data: userRow } = await supabase
    .from(DB_TABLES.USERS)
    .select(DB_FIELDS.BUILDINGS.EMPIRE_ID)
    .eq(DB_FIELDS.BUILDINGS.ID, userId)
    .maybeSingle();

  if (!userRow?.empire_id) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(createErrorResponse(ERROR_MESSAGES.EMPIRE_NOT_FOUND, 'EMPIRE_NOT_FOUND'));
  }

  const base = String(req.query.base || '').trim();
  const { UnitsService } = await import('../../services/units/UnitsService');
  const queue = await UnitsService.getQueue(userRow.empire_id, base || undefined);

  const transformed = (queue || []).map((item: any) => {
    const key = String(item.unit_key || '');
    let unitName = key;
    let creditsCost = 0;
    try {
      const spec = getUnitSpec(key as UnitKey);
      unitName = spec?.name || key;
      creditsCost = Math.max(0, Number(spec?.creditsCost || 0));
    } catch {}
    return {
      id: String(item.id || ''),
      unitKey: key,
      unitName,
      quantity: 1,
      totalQuantity: 1,
      startedAt: String(item.started_at || new Date().toISOString()),
      completesAt: String(item.completes_at || new Date().toISOString()),
      creditsCost,
      baseCoord: String(item.location_coord || ''),
    };
  });

  return res.json(createSuccessResponse({ queue: transformed }));
}));

/**
 * Cancel a pending unit production queue item
 */
router.delete('/units/queue/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;

  const { data: userRow } = await supabase
    .from(DB_TABLES.USERS)
    .select('id, empire_id')
    .eq(DB_FIELDS.BUILDINGS.ID, userId)
    .maybeSingle();

  let { data: empireRow } = await supabase
    .from(DB_TABLES.EMPIRES)
    .select('id, credits')
    .eq(DB_FIELDS.EMPIRES.USER_ID, userId)
    .maybeSingle();

  if (!empireRow && userRow?.empire_id) {
    const byId = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('id, credits')
      .eq(DB_FIELDS.BUILDINGS.ID, userRow.empire_id)
      .maybeSingle();
    empireRow = byId.data as any;
  }

  if (!empireRow) return res.status(HTTP_STATUS.NOT_FOUND).json(createErrorResponse(ERROR_MESSAGES.EMPIRE_NOT_FOUND, 'EMPIRE_NOT_FOUND'));

  const id = String(req.params.id || '').trim();
  if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json(createErrorResponse('Invalid queue item id', 'INVALID_ID'));

  const { data: qItem } = await supabase
    .from(DB_TABLES.UNIT_QUEUE)
    .select('id, empire_id, unit_key, status, completes_at')
    .eq(DB_FIELDS.BUILDINGS.ID, id)
    .maybeSingle();

  if (!qItem || String((qItem as any).empire_id) !== String((empireRow as any).id)) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(createErrorResponse(ERROR_MESSAGES.QUEUE_ITEM_NOT_FOUND, 'QUEUE_ITEM_NOT_FOUND'));
  }

  if (String((qItem as any).status || '') !== 'pending') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(createErrorResponse('Only pending items can be cancelled', 'INVALID_STATUS'));
  }

  // Optional refund
  let refundedCredits: number | null = null;
  try {
    const spec = getUnitSpec(String((qItem as any).unit_key) as UnitKey);
    refundedCredits = Math.max(0, Number(spec?.creditsCost || 0));
    const currentCredits = Math.max(0, Number((empireRow as any).credits || 0));
    await supabase.from(DB_TABLES.EMPIRES).update({ credits: currentCredits + refundedCredits }).eq(DB_FIELDS.BUILDINGS.ID, (empireRow as any).id);
  } catch {}

  await supabase.from(DB_TABLES.UNIT_QUEUE).update({ status: 'cancelled' }).eq(DB_FIELDS.BUILDINGS.ID, id);

  return res.json(createSuccessResponse({ cancelledId: id, refundedCredits }, 'Unit production cancelled'));
}));

export default router;







