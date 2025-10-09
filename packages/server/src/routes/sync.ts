import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ResourceService } from '../services/resourceService';
import { EconomyService } from '../services/economyService';
import { getTechnologyList, getBuildingsList, getDefensesList, getUnitsList, getTechSpec } from '@game/shared';

const router: Router = Router();

// All sync routes require authentication
router.use(authenticate);

/**
 * Simple status endpoint for network connectivity testing
 * Returns basic server status information
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      version: '1.0.0',
      startedAt: new Date(process.uptime() * 1000).toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      playersOnline: 0, // TODO: Implement actual player count
      socketsConnected: 0 // TODO: Implement actual socket count
    }
  });
});

/**
 * Bootstrap endpoint for desktop application
 * Returns all catalog data (tech, buildings, defenses, units) and current profile snapshot
 * This endpoint provides all the static data needed for offline caching plus current user state
 */
router.get('/bootstrap', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const userId = user.id; // Supabase uses UUID directly, no ObjectId casting needed

  // Get user's empire using Supabase query
  const { data: empire, error: empireError } = await supabase
    .from('empires')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (empireError || !empire) {
    return res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: 'Empire not found',
      details: { userId }
    });
  }

  // Update empire resources before creating snapshot
  const empireId = empire.id; // Supabase uses UUID directly as string
  const resourceUpdate = await ResourceService.updateEmpireResources(empireId);

  // Compute economy breakdown for profile
  const economyBreakdown = await EconomyService.computeEmpireEconomy(empireId);

  // Compute technology score from researched technologies
  function computeTechnologyScore(empireData: any): number {
    const techLevels = empireData.tech_levels as Record<string, number> | undefined;
    if (!techLevels) return 0;

    let totalScore = 0;
    for (const [techKey, level] of Object.entries(techLevels)) {
      if (level >= 1) {
        try {
          const spec = getTechSpec(techKey as any);
          totalScore += spec.creditsCost;
        } catch (error) {
          // Skip unknown tech keys
          console.warn(`[SyncService.bootstrap] Unknown tech key: ${techKey}`);
        }
      }
    }
    return totalScore;
  }

  const technologyScore = computeTechnologyScore(resourceUpdate.empire);
  const fleetScore = 0; // Placeholder until fleet system is implemented
  const level = Math.pow(economyBreakdown.totalCreditsPerHour * 100 + fleetScore + technologyScore, 0.25);

  // Gather all catalog data
  const catalogs = {
    technologies: getTechnologyList(),
    buildings: getBuildingsList(),
    defenses: getDefensesList(),
    units: getUnitsList()
  };

  // Create profile snapshot
  const profileSnapshot = {
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    },
    empire: resourceUpdate.empire,
    profile: {
      economyPerHour: economyBreakdown.totalCreditsPerHour,
      fleetScore,
      technologyScore,
      level
    },
    lastResourceUpdate: resourceUpdate.resourcesGained,
    creditsPerHour: resourceUpdate.creditsPerHour,
    serverInfo: {
      name: 'Alpha Server',
      version: '1.0.0',
      universeSize: { width: 100, height: 100 }
    }
  };

  // Generate version identifiers for caching validation
  const version = {
    catalogs: Date.now().toString(), // Simple timestamp-based versioning for now
    profile: empire.last_resource_update?.getTime()?.toString() || Date.now().toString(),
    timestamp: new Date().toISOString()
  };

  console.log(`[SyncService.bootstrap] Generated bootstrap data for empire ${empire.id} with ${catalogs.technologies.length} technologies, ${catalogs.buildings.length} buildings, ${catalogs.defenses.length} defenses, ${catalogs.units.length} units`);

  res.json({
    success: true,
    data: {
      version,
      catalogs,
      profileSnapshot
    },
    message: 'Bootstrap data loaded successfully'
  });
}));

export default router;
