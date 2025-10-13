import { HTTP_STATUS, ERROR_MESSAGES } from '../../../constants/response-formats';
import { API_ENDPOINTS } from '../constants/api-endpoints';


// Placeholder types to prevent compilation errors
import { DB_FIELDS } from '../../../constants/database-fields';
interface AuthRequest extends Request {
  user?: any;
}

type TechnologyKey = string;

// Placeholder functions to prevent compilation errors
const authenticate = (req: any, res: any, next: any) => next();
const asyncHandler = (fn: any) => fn;
const getTechnologyList = () => [];
const getTechSpec = (key: string) => ({ cost: 100 });

// Placeholder services
const EmpireResolutionService = {
  resolveEmpireByUserObject: async (user: any) => ({ id: 'mock-empire-id' })
};

const TechService = {
  getStatus: async (userId: string, empireId: string, baseCoord: string) => ({ status: 'mock' }),
  start: async (userId: string, empireId: string, locationCoord: string, techKey: string) => 
    ({ success: true, data: {}, message: 'Mock response' }),
  getQueue: async (empireId: string, base?: string) => ([]),
  getRefundCredits: async (spec: any, level: number) => 50
};

// Mock supabase
const supabase = {
  from: (table: string) => ({
    select: () => ({ eq: () => ({ maybeSingle: () => ({ data: null, error: null }) }) }),
    update: () => ({ eq: () => ({ error: null }) })
  })
};

// Mock DB_TABLES
const DB_TABLES = {
  TECH_QUEUE: 'tech_queue',
  EMPIRES: 'empires'
};

const router: Router = Router();

// All game routes require authentication
router.use(authenticate);

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
  const baseCoord = String(req.query.base || '').trim();
  if (!baseCoord) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Missing base coordinate (?base=...)' });

  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);
  const userId = user._id || user.id; // Still needed for TechService

  const status = await TechService.getStatus(userId, empireId, baseCoord);
  res.json({
    success: true,
    data: { status }
  });
}));

// Start technology research with capacity-driven ETA
router.post('/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const { locationCoord, techKey } = req.body as { locationCoord?: string; techKey?: TechnologyKey };
  if (!locationCoord || !techKey) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'locationCoord and techKey are required' });
  }

  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);
  const userId = user._id || user.id; // Still needed for TechService

  const result = await TechService.start(userId, empireId, locationCoord, techKey as any);
  if (!result.success) {
    const statusCode = (result as any).code === 'ALREADY_IN_PROGRESS' ? 409 : HTTP_STATUS.BAD_REQUEST;
    return res.status(statusCode).json({
      success: false,
      error: (result as any).error || 'Failed to start research'
    });
  }
  return res.json({ success: true, data: (result as any).data, message: (result as any).message });
}));

// Get research queue
router.get('/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const base = String(req.query.base || '').trim();

  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);

  const queue = await TechService.getQueue(empireId, base || undefined);
  return res.json({ success: true, data: { queue } });
}));

// Cancel a pending technology research queue item
router.delete('/queue/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);

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
    // Cost function for tech handled by service
    refundedCredits = await TechService.getRefundCredits(spec, level);

    // Update empire credits
    const { data: empire } = await supabase
      .from(DB_TABLES.EMPIRES)
      .select(DB_FIELDS.EMPIRES.CREDITS)
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .single();

    if (empire && refundedCredits) {
      const currentCredits = Number(empire.credits || 0);
      await supabase
        .from(DB_TABLES.EMPIRES)
        .update({ credits: currentCredits + refundedCredits })
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








