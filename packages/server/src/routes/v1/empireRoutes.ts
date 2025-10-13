import { Response } from 'express';
import { supabase } from '../../config/supabase';

// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
import { HTTP_STATUS, RESPONSE_FORMAT } from '../../constants/response-formats';

import { supabase } from '../../config/supabase';
import { createBaseRouter, AuthRequest, asyncHandler } from './baseRouter';
import { DashboardService } from '../../services/dashboard/DashboardService';
import { EmpireResolutionService } from '../../services/empire/EmpireResolutionService';

const router = createBaseRouter();

/**
 * Get game dashboard data
 * @deprecated Use /api/game/dashboard instead
 */
router.get('/dashboard', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Set deprecation notice header
  res.setHeader('X-Deprecated-Path', 'Use /api/game/dashboard instead');

  const user = req.user! as any;

  // Get dashboard data using the service
  const dashboardData = await DashboardService.getDashboardData(user);
  return res.json({ success: true, data: dashboardData });
}));

/**
 * Empire creation (deprecated)
 * Empire creation is now automatic during registration.
 */
router.post('/empire', asyncHandler(async (_req: AuthRequest, res: Response) => {
  return res.status(HTTP_STATUS.GONE).json({
    success: false,
    error: 'Empire creation is automatic. This endpoint is deprecated.'
  });
}));

/**
 * Get empire details
 * @deprecated Use /api/game/empire instead
 */
router.get('/empire', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Set deprecation notice header
  res.setHeader('X-Deprecated-Path', 'Use /api/game/empire instead');

  const user = req.user! as any;
  const { DashboardService } = await import('../../services/dashboard/DashboardService');
  const dashboardData = await DashboardService.getDashboardData(user);
  res.json({ success: true, data: dashboardData });
}));

/**
 * Update empire resources manually
 */
router.post('/update-resources', asyncHandler(async (_req: AuthRequest, _res: Response) => {
  // Update empire resources route now uses only Supabase implementation above
}));

/**
 * Credit history for current empire
 * @deprecated Use /api/game/empire/credits/history instead
 */
router.get('/credits/history', asyncHandler(async (req: AuthRequest, res: Response) => {
  // Set deprecation notice header
  res.setHeader('X-Deprecated-Path', 'Use /api/game/empire/credits/history instead');
  
  // Forward query parameters
  const { limit } = req.query;

  // Make internal request to new endpoint via service
  const { EmpireService } = await import('../../services/empire/EmpireService');
  const history = await EmpireService.getCreditHistory(req.user! as any, { limit: Number(limit) });
  
  return res.json({ success: true, data: { history } });
}));


export default router;

