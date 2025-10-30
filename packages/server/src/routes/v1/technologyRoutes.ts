import { Response } from 'express';
import { supabase } from '../../config/supabase';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { ERROR_MESSAGES } from '../../constants/response-formats';
import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
import { HTTP_STATUS } from '@game/shared';
import { createBaseRouter, AuthRequest, asyncHandler } from './baseRouter';
import { getTechnologyList, TechnologyKey, getTechSpec, getTechCreditCostForLevel } from '@game/shared';

const router = createBaseRouter();

// Deprecation notice for all legacy tech routes
// This middleware adds proper deprecation headers to all responses
router.use((req, res, next) => {
  const path = req.path;
  const isV1Path = path.startsWith('/tech');
  const isLegacyPath = path.startsWith('/game/tech');
  if (isV1Path || isLegacyPath) {
    const notice = isV1Path
      ? 'This path is deprecated. Use /api/game/tech/* instead.'
      : 'This path is being migrated to a new structure. Updates coming soon.';
    res.setHeader('X-Deprecated-Path', notice);
    res.setHeader('X-New-Path', path.replace('/tech', '/game/tech'));
  }
  next();
});

// Get technology catalog
router.get('/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const catalog = getTechnologyList();
  res.json({
    success: true,
    data: { catalog }
  });
}));

// Get tech status for a specific base (labs, eligibility, credits)
router.get(API_ENDPOINTS.SYSTEM.STATUS, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;
  const baseCoord = String(req.query.base || '').trim();
  if (!baseCoord) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Missing base coordinate (?base=...)' });

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from(DB_TABLES.USERS).select('id, empire_id').eq(DB_FIELDS.BUILDINGS.ID, userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from(DB_TABLES.EMPIRES).select(DB_FIELDS.BUILDINGS.ID).eq(DB_FIELDS.EMPIRES.USER_ID, userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });

  const { TechService } = await import('../../services/tech/TechService');
  const status = await TechService.getStatus(userId, empireId, baseCoord);
  res.json({
    success: true,
    data: { status }
  });
}));

// Start technology research with capacity-driven ETA
router.post('/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;
  const { locationCoord, techKey } = req.body as { locationCoord?: string; techKey?: TechnologyKey };
  if (!locationCoord || !techKey) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'locationCoord and techKey are required' });
  }

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from(DB_TABLES.USERS).select('id, empire_id').eq(DB_FIELDS.BUILDINGS.ID, userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from(DB_TABLES.EMPIRES).select(DB_FIELDS.BUILDINGS.ID).eq(DB_FIELDS.EMPIRES.USER_ID, userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });

  const { TechService } = await import('../../services/tech/TechService');
  const result = await TechService.start(userId, empireId, locationCoord, techKey as any);
  if (!result.success) {
    const statusCode = (result as any).code === 'ALREADY_IN_PROGRESS' ? 409 : HTTP_STATUS.BAD_REQUEST;
    return res.status(statusCode).json(result);
  }
  return res.json({ success: true, data: (result as any).data, message: (result as any).message });
}));

// Get research queue
router.get('/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;
  const base = String(req.query.base || '').trim();

  // Resolve empire id
  let empireId: string | null = null;
  const userRow = await supabase.from(DB_TABLES.USERS).select('id, empire_id').eq(DB_FIELDS.BUILDINGS.ID, userId).maybeSingle();
  if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
  if (!empireId) {
    const e = await supabase.from(DB_TABLES.EMPIRES).select(DB_FIELDS.BUILDINGS.ID).eq(DB_FIELDS.EMPIRES.USER_ID, userId).maybeSingle();
    if (e.data?.id) empireId = String(e.data.id);
  }
  if (!empireId) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });

  const { TechService } = await import('../../services/tech/TechService');
  const queue = await TechService.getQueue(empireId, base || undefined);
  return res.json({ success: true, data: { queue } });
}));

// Cancel a pending technology research queue item
router.delete('/queue/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
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
  if (!empireId) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });

  const id = String(req.params.id || '').trim();
  if (!id) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Invalid queue item id' });

  // Fetch the queue item
  const { data: qItem, error: fetchError } = await supabase
    .from(DB_TABLES.TECH_QUEUE)
    .select('id, empire_id, tech_key, level, status, location_coord')
    .eq(DB_FIELDS.BUILDINGS.ID, id)
    .maybeSingle();

  if (fetchError) {
    console.error('[tech/queue/:id DELETE] Error fetching item:', fetchError);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Error fetching queue item' });
  }

  if (!qItem || String((qItem as any).empire_id) !== empireId) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.QUEUE_ITEM_NOT_FOUND });
  }

  if (String((qItem as any).status || '') !== 'pending') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Only pending items can be cancelled' });
  }

  // Calculate refund
  let refundedCredits: number | null = null;
  try {
    const techKey = String((qItem as any).tech_key || '');
    const level = Math.max(1, Number((qItem as any).level || 1));
    const spec = getTechSpec(techKey as TechnologyKey);
    const credits = getTechCreditCostForLevel(spec, level);
    refundedCredits = credits;

    // Update empire credits
    const { data: empire } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select(DB_FIELDS.EMPIRES.CREDITS)
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .single();

    if (empire) {
      const currentCredits = Number(empire.credits || 0);
      await supabase
        .from(DB_TABLES.EMPIRES)
        .update({ credits: currentCredits + credits })
        .eq(DB_FIELDS.BUILDINGS.ID, empireId);
    }
  } catch {
    // If refund calculation fails, still proceed with cancellation
    console.warn('[tech/queue/:id DELETE] Refund calculation failed');
  }

  // Update status to cancelled
  const { error: updateError } = await supabase
    .from(DB_TABLES.TECH_QUEUE)
    .update({ status: 'cancelled' })
    .eq(DB_FIELDS.BUILDINGS.ID, id);

  if (updateError) {
    console.error('[tech/queue/:id DELETE] Error cancelling item:', updateError);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to cancel queue item' });
  }

  return res.json({
    success: true,
    data: { cancelledId: id, refundedCredits },
    message: 'Research queue item cancelled'
  });
}));

export default router;






