import { Router, Response } from 'express';
import { ERROR_MESSAGES } from '../constants/response-formats';
import { API_ENDPOINTS } from '../constants/api-endpoints';


// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';

import { supabase } from '../config/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ResourceService } from '../services/resources/ResourceService';
import { EconomyService } from '../services/economy/EconomyService';

import { HTTP_STATUS } from '@game/shared';
import { STATUS_CODES } from '@game/shared';
import { getTechSpec, getTechnologyList } from '@game/shared';
import { getBuildingsList, getDefensesList, getUnitsList } from '@game/shared';
const router: Router = Router();

// All sync routes require authentication
router.use(authenticate);

/**
 * Simple status endpoint for network connectivity testing
 * Returns basic server status information
 */
router.get(API_ENDPOINTS.SYSTEM.STATUS, (req, res) => {
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
    .from(DB_TABLES.EMPIRES)
    .select('*')
    .eq(DB_FIELDS.EMPIRES.USER_ID, userId)
    .maybeSingle();

  if (empireError || !empire) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      code: ERROR_MESSAGES.NOT_FOUND,
      message: ERROR_MESSAGES.EMPIRE_NOT_FOUND,
      details: { userId }
    });
  }

  // Update empire resources before creating snapshot
  const empireId = empire.id; // Supabase uses UUID directly as string
  const resourceUpdate = await ResourceService.updateEmpireResources(empireId);

// Compute economy breakdown for profile (using Supabase-based EconomyService)
const totalCreditsPerHour = await EconomyService.sumCreditsPerHourForEmpire(empireId);
const economyBreakdown = { totalCreditsPerHour } as { totalCreditsPerHour: number };

  // Compute technology score from researched technologies
  function computeTechnologyScore(empireData: any): number {
    const techLevels = empireData.tech_levels as Record<string, number> | undefined;
    if (!techLevels) return STATUS_CODES.SUCCESS;

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

const technologyScore = computeTechnologyScore(empire);
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
empire,
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





