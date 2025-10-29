import { Router, Response } from 'express';
import { supabase } from '../../config/supabase';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { ERROR_MESSAGES } from '../../constants/response-formats';
import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
import { HTTP_STATUS } from '@game/shared';
import { DefenseKey, getDefensesList } from '@game/shared';
import { EmpireResolutionService } from '../../services/empire/EmpireResolutionService';
import { getDefensesList } from '@game/shared';

const router = Router();

router.use(authenticate);

/**
 * Get defenses catalog
 */
router.get('/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const catalog = getDefensesList();
  res.json({ success: true, data: { catalog } });
}));

/**
 * Get defenses status
 */
router.get('/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Resolve empire using established pattern
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);

  const { DefensesService } = await import('../../services/defenses/DefensesService');
  const status = await DefensesService.getStatus(empireId);
  return res.json({ success: true, data: { status } });
}));

/**
 * Get defenses queue
 */
router.get('/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Resolve empire using established pattern
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);
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

  return res.json({ success: true, data: { queue } });
}));

/**
 * Start defense construction
 */
router.post('/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Resolve empire using established pattern
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);
  const { locationCoord, defenseKey } = req.body as { locationCoord?: string; defenseKey?: DefenseKey };
  
  if (!locationCoord || !defenseKey) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'locationCoord and defenseKey are required' });
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

  return res.json({ success: true, data: result.data, message: result.message });
}));

/**
 * Cancel a pending defense item
 */
router.delete('/queue/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Resolve empire using established pattern
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);
  const id = String(req.params.id || '').trim();
  
  if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Invalid queue item id' });

  const { data: qItem } = await supabase
    .from(DB_TABLES.DEFENSE_QUEUE)
    .select('id, empire_id, defense_key, status, started_at, completes_at')
    .eq(DB_FIELDS.BUILDINGS.ID, id)
    .maybeSingle();

  if (!qItem || String((qItem as any).empire_id) !== empireId) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.QUEUE_ITEM_NOT_FOUND });
  }

  if (String((qItem as any).status || '') !== 'pending') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Only pending items can be cancelled' });
  }

  // Check if in progress (has started and not yet completed)
  if ((qItem as any).started_at && (qItem as any).completes_at) {
    const completesAt = new Date((qItem as any).completes_at).getTime();
    if (completesAt > Date.now()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Cannot cancel an in-progress defense yet' });
    }
  }

  await supabase.from(DB_TABLES.DEFENSE_QUEUE).update({ status: 'cancelled' }).eq(DB_FIELDS.BUILDINGS.ID, id);
  return res.json({ success: true, data: { cancelledId: id }, message: 'Defense construction cancelled' });
}));

export default router;
