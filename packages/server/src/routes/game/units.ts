import { Router, Response } from 'express';
import { supabase } from '../../config/supabase';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { ERROR_MESSAGES } from '../../constants/response-formats';
import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
import { HTTP_STATUS } from '@game/shared';
import { UnitKey, getUnitsList, getUnitSpec } from '@game/shared';
import { EmpireResolutionService } from '../../services/empire/EmpireResolutionService';

const router = Router();

router.use(authenticate);

/**
 * Get units catalog
 */
router.get('/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const catalog = getUnitsList();
  res.json({ success: true, data: { catalog } });
}));

/**
 * Get units status
 */
router.get('/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Resolve empire using established pattern
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);
  const locationCoord = String(req.query.locationCoord || '').trim() || undefined;

  const { UnitsService } = await import('../../services/units/UnitsService');
  const status = await UnitsService.getStatus(empireId, locationCoord);
  return res.json({ success: true, data: { status } });
}));

/**
 * Start unit production
 */
router.post('/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user._id || user.id;

  // Resolve empire using established pattern
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);
  const { locationCoord, unitKey } = req.body as { locationCoord?: string; unitKey?: UnitKey };
  
  if (!locationCoord || !unitKey) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'locationCoord and unitKey are required' });
  }

  const { UnitsService } = await import('../../services/units/UnitsService');
  const result = await UnitsService.start(userId, empireId, locationCoord, unitKey);
  
  if (!(result as any).success) {
    const errorResponse: any = {
      success: false,
      error: (result as any).error ?? (result as any).message,
      message: (result as any).message ?? (result as any).error,
    };
    if ((result as any).code) errorResponse.code = (result as any).code;
    if ((result as any).details) errorResponse.details = (result as any).details;
    if ((result as any).reasons) errorResponse.reasons = (result as any).reasons;
    const statusCode = (result as any).code === 'ALREADY_IN_PROGRESS' ? 409 : HTTP_STATUS.BAD_REQUEST;
    return res.status(statusCode).json(errorResponse);
  }

  return res.json({ success: true, data: (result as any).data, message: (result as any).message });
}));

/**
 * Get units production queue
 * Lists active unit production (capacity-driven) for the authenticated empire.
 * Optional ?base=A00:10:22:10 to filter by a specific base coord.
 */
router.get('/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Resolve empire using established pattern
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);
  const base = String(req.query.base || '').trim() || undefined;

  const { UnitsService } = await import('../../services/units/UnitsService');
  const queue = await UnitsService.getQueue(empireId, base);

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

  return res.json({ success: true, data: { queue: transformed } });
}));

/**
 * Cancel a pending unit production queue item
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
    .from(DB_TABLES.UNIT_QUEUE)
    .select('id, empire_id, unit_key, status, completes_at')
    .eq(DB_FIELDS.BUILDINGS.ID, id)
    .maybeSingle();

  if (!qItem || String((qItem as any).empire_id) !== empireId) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.QUEUE_ITEM_NOT_FOUND });
  }

  if (String((qItem as any).status || '') !== 'pending') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Only pending items can be cancelled' });
  }

  // Optional refund
  let refundedCredits: number | null = null;
  try {
    const spec = getUnitSpec(String((qItem as any).unit_key) as UnitKey);
    refundedCredits = Math.max(0, Number(spec?.creditsCost || 0));
    
    // Get current credits
    const { data: empireData } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select('credits')
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .single();
    
    const currentCredits = Math.max(0, Number(empireData?.credits || 0));
    await supabase.from(DB_TABLES.EMPIRES).update({ credits: currentCredits + refundedCredits }).eq(DB_FIELDS.BUILDINGS.ID, empireId);
  } catch {}

  await supabase.from(DB_TABLES.UNIT_QUEUE).update({ status: 'cancelled' }).eq(DB_FIELDS.BUILDINGS.ID, id);

  return res.json({ success: true, data: { cancelledId: id, refundedCredits }, message: 'Unit production cancelled' });
}));

export default router;
