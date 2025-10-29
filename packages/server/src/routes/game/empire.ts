import { Router, Response } from 'express';
import { supabase } from '../../config/supabase';
import { ERROR_MESSAGES } from '../../constants/response-formats';

// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
import { HTTP_STATUS } from '@game/shared';
import { asyncHandler } from '../../../middleware/errorHandler';
import { authenticate, AuthRequest } from '../../../middleware/auth';
import { EmpireResolutionService } from '../../services/empire/EmpireResolutionService';

const router = Router();

router.use(authenticate);

/**
 * Get empire details
 */
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Resolve empire using the service
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);

  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  return res.json({
    success: true,
    data: {
      empire: {
        id: empireRow.id,
        name: empireRow.name,
        territories: Array.isArray(empireRow.territories) ? empireRow.territories : [],
        resources: {
          credits: Math.max(0, Number(empireRow.credits || 0)),
          energy: Math.max(0, Number(empireRow.energy || 0)),
        },
      },
      creditsPerHour: 0, // Placeholder - implement production calculation
      resourcesGained: 0, // Placeholder - implement resource gains
    },
  });
}));

/**
 * Credit transaction history for the empire
 * Supports pagination through limit parameter (?limit=50)
 */
router.get('/credits/history', asyncHandler(async (req: AuthRequest, res: Response) => {
  const limitRaw = Number(req.query.limit || 50);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 200) : 50;

  const user = req.user! as any;

  // Resolve empire using the service
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);

  // Fetch credit transactions from Supabase
  const { data: txns, error } = await supabase
    .from(DB_TABLES.CREDIT_TRANSACTIONS)
    .select('id, amount, type, note, balance_after, created_at')
    .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
    .order(DB_FIELDS.BUILDINGS.CREATED_AT, { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching credit history:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Failed to fetch credit history' });
  }

  return res.json({
    success: true,
    data: {
      history: (txns || []).map(t => ({
        _id: t.id,
        amount: t.amount,
        type: t.type,
        note: t.note || null,
        balanceAfter: typeof t.balance_after === 'number' ? t.balance_after : null,
        createdAt: t.created_at,
      }))
    }
  });
}));

/**
 * @deprecated Empire creation is automatic during registration
 */
router.post('/', (_req: AuthRequest, res: Response) => {
  return res.status(HTTP_STATUS.GONE).json({
    success: false,
    error: 'Empire creation is automatic during registration. This endpoint is deprecated.'
  });
});

/**
 * @deprecated Manual resource updates are no longer supported
 */
router.post('/update-resources', (_req: AuthRequest, res: Response) => {
  return res.status(HTTP_STATUS.GONE).json({
    success: false,
    error: 'Manual resource updates are no longer supported. Resources are updated automatically.'
  });
});

export default router;







