import { Router, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, AuthRequest } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/game/dashboard
 * Returns dashboard data for the authenticated empire
 */
router.use(authenticate);

router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Get dashboard data using the service
  const { DashboardService } = await import('../../services/dashboard/DashboardService');
  const dashboardData = await DashboardService.getDashboardData(user);
  res.json({ success: true, data: dashboardData });
}));

export default router;
