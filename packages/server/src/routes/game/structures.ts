import { Router, Response } from 'express';
import { supabase } from '../../config/supabase';
import { ERROR_MESSAGES } from '../../constants/response-formats';


// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
import { HTTP_STATUS } from '@game/shared';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { BuildingKey } from '@game/shared';
import { StructureService } from '../../services/structures/StructureService';
import { EmpireResolutionService } from '../../services/empire/EmpireResolutionService';

const router = Router();

router.use(authenticate);

/**
 * Get structures catalog
 */
router.get('/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const { getStructuresCatalog } = await import('../../services/structures/structures.data');
  const catalog = getStructuresCatalog();
  res.json({ success: true, data: { catalog } });
}));

/**
 * Get details for base including structure capacities and levels
 */
router.get('/status/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);

  const { coord } = req.params;
  if (!coord) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED });

  const details = await StructureService.getStructureDetails(empireId, coord);
  return res.json({ success: true, data: details });
}));

/**
 * Get structures queue
 */
router.get('/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);

  const locationCoord = String(req.query.base || '').trim() || undefined;
  
  try {
    const queue = await StructureService.getQueue(empireId, locationCoord);
    return res.json({ success: true, data: { queue } });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to fetch queue' });
  }
}));

/**
 * Start construction of a structure
 */
router.post('/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const { locationCoord, catalogKey } = req.body as { locationCoord?: string; catalogKey?: BuildingKey };

  if (!locationCoord || !catalogKey) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: 'locationCoord and catalogKey are required' 
    });
  }

  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);
  const userId = user._id || user.id; // Still needed for StructureService

  const result = await StructureService.startConstruction(userId, empireId, locationCoord, catalogKey);

  // Handle status codes based on error type
  if (!result.success) {
    const statusCode = result.code === 'ALREADY_IN_PROGRESS' ? 409 : HTTP_STATUS.BAD_REQUEST;
    return res.status(statusCode).json(result);
  }

  return res.json(result);
}));

/**
 * Cancel structure construction
 */
router.delete('/cancel/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);
  const userId = user._id || user.id; // Still needed for location ownership check

  const { coord } = req.params;
  if (!coord) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED });

  // Validate location ownership
  const { data: location } = await supabase
    .from(DB_TABLES.LOCATIONS)
    .select('coord, owner_id')
    .eq('coord', coord)
    .maybeSingle();

  if (!location) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.LOCATION_NOT_FOUND });
  if (location.owner_id !== userId) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, error: 'You do not own this location' });
  }

  const result = await StructureService.cancel(empireId, coord);

  if (!result.success) {
    const statusCode = result.code === 'NO_ACTIVE_CONSTRUCTION' ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
    return res.status(statusCode).json(result);
  }

  return res.json(result);
}));

export default router;






