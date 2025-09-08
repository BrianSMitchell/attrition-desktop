import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Empire } from '../models/Empire';
import { Colony } from '../models/Colony';
import { ResearchProject } from '../models/ResearchProject';
import { TechQueue } from '../models/TechQueue';
import { Location } from '../models/Location';
import { Building } from '../models/Building';
import { UnitQueue } from '../models/UnitQueue';
import { Fleet } from '../models/Fleet';
import { User } from '../models/User';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ResourceService } from '../services/resourceService';
import { getOnlineUniqueUsersCount } from '../services/socketService';
import { TechService } from '../services/techService';
import { StructuresService } from '../services/structuresService';
import { DefensesService } from '../services/defensesService';
import { UnitsService } from '../services/unitsService';
import { CapacityService } from '../services/capacityService';
import { BaseStatsService } from '../services/baseStatsService';
import { EconomyService } from '../services/economyService';
import { getTechnologyList, TechnologyKey, getBuildingsList, BuildingKey, getDefensesList, DefenseKey, getUnitsList, UnitKey, getUnitSpec, getTechSpec, getStructureCreditCostForLevel, getBuildingSpec, getTechCreditCostForLevel } from '@game/shared';

const router: Router = Router();

// Helper function to compute technology score from researched technologies
function computeTechnologyScore(empire: any): number {
  const techLevels = empire.techLevels as Map<string, number> | undefined;
  if (!techLevels) return 0;

  let totalScore = 0;
  for (const [techKey, level] of techLevels.entries()) {
    if (level >= 1) {
      try {
        const spec = getTechSpec(techKey as TechnologyKey);
        totalScore += spec.creditsCost;
      } catch (error) {
        // Skip unknown tech keys
        console.warn(`Unknown tech key: ${techKey}`);
      }
    }
  }
  return totalScore;
}

// All game routes require authentication
router.use(authenticate);

// Get game dashboard data
router.get('/dashboard', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  
  // Get user's empire
  let empire = await Empire.findOne({ userId: user._id });
  
  // If no empire exists, this is a new player
  if (!empire) {
    return res.json({
      success: true,
      data: {
        user,
        empire: null,
        isNewPlayer: false,
        serverInfo: {
          name: 'Alpha Server',
          version: '1.0.0',
          playersOnline: getOnlineUniqueUsersCount(),
          universeSize: { width: 100, height: 100 }
        }
      }
    });
  }

  // Update empire resources before returning data
  const resourceUpdate = await ResourceService.updateEmpireResources((empire._id as mongoose.Types.ObjectId).toString());

  // Compute player profile stats
  const economyBreakdown = await EconomyService.computeEmpireEconomy((empire._id as mongoose.Types.ObjectId).toString());
  const technologyScore = computeTechnologyScore(resourceUpdate.empire);
  const fleetScore = 0; // Placeholder until fleet system is implemented
  const level = Math.pow(economyBreakdown.totalCreditsPerHour * 100 + fleetScore + technologyScore, 0.25);

  const profile = {
    economyPerHour: economyBreakdown.totalCreditsPerHour,
    fleetScore,
    technologyScore,
    level
  };

  res.json({
    success: true,
    data: {
      user,
      empire: resourceUpdate.empire,
      resourcesGained: resourceUpdate.resourcesGained,
      creditsPerHour: resourceUpdate.creditsPerHour,
      profile,
      isNewPlayer: false,
      serverInfo: {
        name: 'Alpha Server',
        version: '1.0.0',
        playersOnline: getOnlineUniqueUsersCount(),
        universeSize: { width: 100, height: 100 }
      }
    }
  });
}));

/**
 * Create new empire (deprecated)
 * Empire creation is now automatic during registration.
 */
router.post('/empire', asyncHandler(async (req: AuthRequest, res: Response) => {
  return res.status(410).json({
    success: false,
    error: 'Empire creation is automatic. This endpoint is deprecated.'
  });
}));

// Get empire details
router.get('/empire', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });

  if (!empire) {
    return res.status(404).json({
      success: false,
      error: 'Empire not found'
    });
  }

  // Update resources before returning
  const resourceUpdate = await ResourceService.updateEmpireResources((empire._id as mongoose.Types.ObjectId).toString());

  res.json({
    success: true,
    data: { 
      empire: resourceUpdate.empire,
      creditsPerHour: resourceUpdate.creditsPerHour,
      resourcesGained: resourceUpdate.resourcesGained
    }
  });
}));

// Update empire resources manually
router.post('/empire/update-resources', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });

  if (!empire) {
    return res.status(404).json({
      success: false,
      error: 'Empire not found'
    });
  }

  const resourceUpdate = await ResourceService.updateEmpireResources((empire._id as mongoose.Types.ObjectId).toString());

  res.json({
    success: true,
    data: {
      empire: resourceUpdate.empire,
      resourcesGained: resourceUpdate.resourcesGained,
      creditsPerHour: resourceUpdate.creditsPerHour
    }
  });
}));


// Territory Management Routes

// Get empire territories
router.get('/territories', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({
      success: false,
      error: 'Empire not found'
    });
  }

  // Get location details for all territories
  const territories = await Location.find({
    coord: { $in: empire.territories }
  });

  res.json({
    success: true,
    data: { territories }
  });
}));

// List buildings at a specific owned location
router.get('/buildings/location/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { coord } = req.params;
  if (!coord) {
    return res.status(400).json({ success: false, error: 'Missing coord' });
  }

  const location = await Location.findOne({ coord });
  if (!location) {
    return res.status(404).json({ success: false, error: 'Location not found' });
  }

  if (location.owner?.toString() !== empire.userId.toString()) {
    return res.status(403).json({ success: false, error: 'You do not own this location' });
  }

  const buildings = await Building.find({
    empireId: empire._id,
    locationCoord: coord
  }).sort({ constructionCompleted: 1 });

  return res.json({ success: true, data: { buildings } });
}));

// Colonize a location
router.post('/territories/colonize', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({
      success: false,
      error: 'Empire not found'
    });
  }

  const { locationCoord, colonyName } = req.body;

  if (!locationCoord || !colonyName) {
    return res.status(400).json({
      success: false,
      error: 'Location coordinate and colony name are required'
    });
  }

  // Check if location exists and is unowned
  const location = await Location.findOne({ coord: locationCoord });
  if (!location) {
    return res.status(404).json({
      success: false,
      error: 'Location not found'
    });
  }

  if (location.owner) {
    return res.status(400).json({
      success: false,
      error: 'Location is already owned'
    });
  }

  // Calculate progressive colonization cost based on base count
  const { getColonizationCost } = await import('@game/shared');
  const colonizationCostCredits = getColonizationCost(empire.baseCount, empire.hasDeletedBase);

  // Check if empire can afford colonization (credits only)
  if (empire.resources.credits < colonizationCostCredits) {
    return res.status(400).json({
      success: false,
      error: `Insufficient credits for colonization. Required: ${colonizationCostCredits}, Available: ${empire.resources.credits}`
    });
  }

  // TODO: Add Outpost Ship requirement validation here
  // For now, we'll skip this requirement in Phase A

  // Deduct credits
  empire.resources.credits -= colonizationCostCredits;

  // Increment base count and reset deletion discount
  empire.baseCount += 1;
  empire.hasDeletedBase = false;

  // Claim location
  location.owner = empire.userId;
  await location.save();

  // Add to empire territories
  empire.territories.push(locationCoord);
  await empire.save();

  // Create colony
  const colony = new Colony({
    empireId: empire._id,
    locationCoord,
    name: colonyName
  });

  await colony.save();

  // Note: Starter structures are now handled by the modern structures system
  // No legacy building creation needed during colonization

  res.status(201).json({
    success: true,
    data: { 
      colony, 
      location, 
      colonizationCost: colonizationCostCredits,
      newBaseCount: empire.baseCount 
    },
    message: 'Location colonized successfully'
  });
}));

/**
 * Test-only seeding endpoint to make Research Start deterministic in E2E.
 * - Ensures the authenticated user's empire has sufficient credits
 * - Ensures the specified (or first) base has at least one active research_lab (level 1)
 * Guarded by NODE_ENV === 'test'
 *
 * DTO (success):
 * {
 *   "success": true,
 *   "data": { "baseCoord": "...", "credits": 50000, "baseLabTotal": 1 },
 *   "message": "Seeded test research lab and credits"
 * }
 */
router.post('/test/seed-research', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(403).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Test-only endpoint disabled (NODE_ENV !== "test")',
      details: { env: process.env.NODE_ENV }
    });
  }

  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, message: 'Empire not found' });
  }

  // Determine target base coordinate: explicit body param or first owned territory
  let baseCoord = '';
  try {
    baseCoord = String((req.body?.baseCoord ?? '')).trim();
  } catch {
    baseCoord = '';
  }
  if (!baseCoord) {
    const territories: string[] = Array.isArray((empire as any).territories) ? (empire as any).territories : [];
    if (territories.length > 0) {
      baseCoord = territories[0];
    }
  }
  if (!baseCoord) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'No base coordinate available to seed (provide baseCoord or colonize first)'
    });
  }

  // Top up credits if needed
  const creditsTargetRaw = (req.body && typeof req.body.credits !== 'undefined') ? Number(req.body.credits) : 50000;
  const creditsTarget = Number.isFinite(creditsTargetRaw) ? creditsTargetRaw : 50000;
  if (Number(empire.resources?.credits || 0) < creditsTarget) {
    empire.resources.credits = creditsTarget;
    await empire.save();
  }

  // Ensure at least one active research_lab at the base
  let lab = await Building.findOne({
    empireId: empire._id,
    locationCoord: baseCoord,
    type: 'research_lab',
    isActive: true
  });

  if (!lab) {
    lab = new Building({
      empireId: empire._id,
      locationCoord: baseCoord,
      type: 'research_lab',
      displayName: 'Research Lab',
      catalogKey: 'research_labs',
      level: 1,
      isActive: true
    });
    await lab.save();
  }

  const baseLabTotal = await TechService.getBaseLabTotal((empire._id as mongoose.Types.ObjectId).toString(), baseCoord);

  return res.json({
    success: true,
    data: {
      baseCoord,
      credits: empire.resources.credits,
      baseLabTotal
    },
    message: 'Seeded test research lab and credits'
  });
}));

/**
 * Test-only seeding endpoint to make Defenses Start deterministic in E2E.
 * - Tops up credits
 * - Ensures tech prereqs for jump_gate (warp_drive 12, energy 20)
 * - Ensures positive energy projection by adding active solar plants at the base
 * Guarded by NODE_ENV === 'test'
 */
router.post('/test/seed-defenses', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(403).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Test-only endpoint disabled (NODE_ENV !== "test")',
      details: { env: process.env.NODE_ENV }
    });
  }

  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, message: 'Empire not found' });
  }

  // Determine target base coordinate
  let baseCoord = '';
  try {
    baseCoord = String((req.body?.baseCoord ?? '')).trim();
  } catch { baseCoord = ''; }
  if (!baseCoord) {
    const territories: string[] = Array.isArray((empire as any).territories) ? (empire as any).territories : [];
    if (territories.length > 0) baseCoord = territories[0];
  }
  if (!baseCoord) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'No base coordinate available to seed (provide baseCoord or colonize first)'
    });
  }

  // Top up credits
  const creditsTargetRaw = (req.body && typeof req.body.credits !== 'undefined') ? Number(req.body.credits) : 100000;
  const creditsTarget = Number.isFinite(creditsTargetRaw) ? creditsTargetRaw : 100000;
  if (Number(empire.resources?.credits || 0) < creditsTarget) {
    empire.resources.credits = creditsTarget;
    await empire.save();
  }

  // Ensure tech prereqs for jump_gate
  const mapVal = (empire as any).techLevels as Map<string, number> | undefined;
  const ensureMap = () => {
    if ((empire as any).techLevels instanceof Map) return (empire as any).techLevels as Map<string, number>;
    (empire as any).techLevels = new Map<string, number>();
    return (empire as any).techLevels as Map<string, number>;
  };
  const tl = ensureMap();
  tl.set('warp_drive', Math.max(12, Number(tl.get('warp_drive') || 0)));
  tl.set('energy', Math.max(20, Number(tl.get('energy') || 0)));
  await empire.save();

  // Ensure enough active solar plants for positive energy projection
  // Create or upgrade an active solar_plants building at this base with sufficient level.
  let solar = await Building.findOne({
    empireId: empire._id,
    locationCoord: baseCoord,
    catalogKey: 'solar_plants',
    isActive: true
  });

  if (!solar) {
    solar = new Building({
      locationCoord: baseCoord,
      empireId: empire._id,
      type: 'energy_plant',
      displayName: 'Solar Plants',
      catalogKey: 'solar_plants',
      level: 50,
      constructionStarted: new Date(),
      isActive: true
    } as any);
    await solar.save();
  } else {
    (solar as any).level = Math.max(50, Number((solar as any).level || 1));
    await solar.save();
  }

  // Ensure construction capacity by adding/upgrading active robotic factories at this base
  let robo = await Building.findOne({
    empireId: empire._id,
    locationCoord: baseCoord,
    catalogKey: 'robotic_factories',
    isActive: true
  });

  if (!robo) {
    robo = new Building({
      locationCoord: baseCoord,
      empireId: empire._id,
      type: 'factory',
      displayName: 'Robotic Factories',
      catalogKey: 'robotic_factories',
      level: 10,
      constructionStarted: new Date(),
      isActive: true
    } as any);
    await robo.save();
  } else {
    (robo as any).level = Math.max(10, Number((robo as any).level || 1));
    await robo.save();
  }

  // Ensure strong positive energy production with active fusion plants
  let fusion = await Building.findOne({
    empireId: empire._id,
    locationCoord: baseCoord,
    catalogKey: 'fusion_plants',
    isActive: true
  });

  if (!fusion) {
    fusion = new Building({
      locationCoord: baseCoord,
      empireId: empire._id,
      type: 'energy_plant',
      displayName: 'Fusion Plants',
      catalogKey: 'fusion_plants',
      level: 20,
      constructionStarted: new Date(),
      isActive: true
    } as any);
    await fusion.save();
  } else {
    (fusion as any).level = Math.max(20, Number((fusion as any).level || 1));
    await fusion.save();
  }

  return res.json({
    success: true,
    data: { baseCoord, credits: empire.resources.credits, warp_drive: tl.get('warp_drive'), energy: tl.get('energy') },
    message: 'Seeded test defenses prerequisites (credits, tech, solar plants, construction capacity)'
  });
}));

/**
 * Test-only seeding endpoint to make Structures Start deterministic in E2E.
 * - Tops up credits
 * - Broadly raises tech levels so most structures are eligible
 * - Ensures positive energy projection and construction capacity (solar + robotics)
 * Guarded by NODE_ENV === 'test'
 */
router.post('/test/seed-structures', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(403).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Test-only endpoint disabled (NODE_ENV !== "test")',
      details: { env: process.env.NODE_ENV }
    });
  }

  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, message: 'Empire not found' });
  }

  // Determine target base coordinate
  let baseCoord = '';
  try {
    baseCoord = String((req.body?.baseCoord ?? '')).trim();
  } catch { baseCoord = ''; }
  if (!baseCoord) {
    const territories: string[] = Array.isArray((empire as any).territories) ? (empire as any).territories : [];
    if (territories.length > 0) baseCoord = territories[0];
  }
  if (!baseCoord) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'No base coordinate available to seed (provide baseCoord or colonize first)'
    });
  }

  // Top up credits
  const creditsTargetRaw = (req.body && typeof req.body.credits !== 'undefined') ? Number(req.body.credits) : 100000;
  const creditsTarget = Number.isFinite(creditsTargetRaw) ? creditsTargetRaw : 100000;
  if (Number(empire.resources?.credits || 0) < creditsTarget) {
    empire.resources.credits = creditsTarget;
    await empire.save();
  }

  // Broadly raise tech levels to make structures eligible
  const levelTargetRaw = (req.body && typeof req.body.level === 'number') ? Number(req.body.level) : 10;
  const levelTarget = Number.isFinite(levelTargetRaw) ? levelTargetRaw : 10;
  const ensureMap = () => {
    if ((empire as any).techLevels instanceof Map) return (empire as any).techLevels as Map<string, number>;
    (empire as any).techLevels = new Map<string, number>();
    return (empire as any).techLevels as Map<string, number>;
  };
  const tl = ensureMap();
  const techCatalog = getTechnologyList();
  for (const t of techCatalog) {
    const key = (t as any).key as string;
    tl.set(key, Math.max(levelTarget, Number(tl.get(key) || 0)));
  }
  await empire.save();

  // Ensure positive energy projection with active solar plants
  let solar = await Building.findOne({
    empireId: empire._id,
    locationCoord: baseCoord,
    catalogKey: 'solar_plants',
    isActive: true
  });
  if (!solar) {
    solar = new Building({
      locationCoord: baseCoord,
      empireId: empire._id,
      type: 'energy_plant',
      displayName: 'Solar Plants',
      catalogKey: 'solar_plants',
      level: 30,
      constructionStarted: new Date(),
      isActive: true
    } as any);
    await solar.save();
  } else {
    (solar as any).level = Math.max(30, Number((solar as any).level || 1));
    await solar.save();
  }

  // Ensure construction capacity with active robotic factories
  let robo = await Building.findOne({
    empireId: empire._id,
    locationCoord: baseCoord,
    catalogKey: 'robotic_factories',
    isActive: true
  });
  if (!robo) {
    robo = new Building({
      locationCoord: baseCoord,
      empireId: empire._id,
      type: 'factory',
      displayName: 'Robotic Factories',
      catalogKey: 'robotic_factories',
      level: 10,
      constructionStarted: new Date(),
      isActive: true
    } as any);
    await robo.save();
  } else {
    (robo as any).level = Math.max(10, Number((robo as any).level || 1));
    await robo.save();
  }

  return res.json({
    success: true,
    data: { baseCoord, credits: empire.resources.credits, levelTarget },
    message: 'Seeded test structures prerequisites (credits, tech, energy, capacity)'
  });
}));

/**
 * Test-only cleanup endpoint to remove queued buildings for idempotency testing.
 * Guarded by NODE_ENV === 'test'
 */
router.delete('/test/buildings/queued/:catalogKey', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(403).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Test-only endpoint disabled (NODE_ENV !== "test")',
      details: { env: process.env.NODE_ENV }
    });
  }

  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, message: 'Empire not found' });
  }

  const { catalogKey } = req.params;
  if (!catalogKey) {
    return res.status(400).json({ success: false, message: 'catalogKey required' });
  }

  // Remove any inactive (queued) buildings with this catalogKey for this empire
  const result = await Building.deleteMany({
    empireId: empire._id,
    catalogKey,
    isActive: false
  });

  return res.json({
    success: true,
    data: { deletedCount: result.deletedCount, catalogKey },
    message: `Cleaned up ${result.deletedCount} queued ${catalogKey} buildings`
  });
}));

// Research Management Routes

// Get empire research projects
router.get('/research', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({
      success: false,
      error: 'Empire not found'
    });
  }

  const researchProjects = await ResearchProject.find({
    empireId: empire._id
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: { researchProjects }
  });
}));

/**
 * Phase A Technology Routes
 * - Credits-based level-1 unlocks
 * - Gated by sum of research_lab levels at the selected base
 * - Prerequisites per technology (empire-wide levels)
 */

// Get technology catalog
router.get('/tech/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const catalog = getTechnologyList();
  res.json({
    success: true,
    data: { catalog }
  });
}));

// Get tech status for a specific base (labs, eligibility, credits)
router.get('/tech/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const baseCoord = String(req.query.base || '').trim();
  if (!baseCoord) {
    return res.status(400).json({ success: false, error: 'Missing base coordinate (?base=...)' });
  }

  const status = await TechService.getStatus((empire._id as mongoose.Types.ObjectId).toString(), baseCoord);
  res.json({
    success: true,
    data: { status }
  });
}));

// Start technology research with capacity-driven ETA
router.post('/tech/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { locationCoord, techKey } = req.body as { locationCoord?: string; techKey?: TechnologyKey };
  if (!locationCoord || !techKey) {
    return res.status(400).json({ success: false, error: 'locationCoord and techKey are required' });
  }

  const result = await TechService.start((empire._id as mongoose.Types.ObjectId).toString(), locationCoord, techKey);
  if (!result.success) {
    // Handle both old format (error) and new format (code/message) with safe typing
    const errorResponse: any = {
      success: false,
      error: (result as any).error ?? (result as any).message,
      message: (result as any).message ?? (result as any).error
    };
    if ((result as any).code) errorResponse.code = (result as any).code;
    if ((result as any).details) errorResponse.details = (result as any).details;
    if ((result as any).reasons) errorResponse.reasons = (result as any).reasons;
    
    // Return 409 for idempotency conflicts, 400 for other errors
    const statusCode = (result as any).code === 'ALREADY_IN_PROGRESS' ? 409 : 400;
    return res.status(statusCode).json(errorResponse);
  }

  res.json({
    success: true,
    data: result.data,
    message: result.message
  });
}));

/**
 * Structures (Buildings Phase A) Routes
 * Tech-only gating; maps to existing Building types and cost model.
 */

// Catalog
router.get('/structures/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const catalog = getBuildingsList();
  res.json({
    success: true,
    data: { catalog }
  });
}));

// Status (tech-only eligibility for now)
router.get('/structures/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }
  const status = await StructuresService.getStatus((empire._id as mongoose.Types.ObjectId).toString());
  res.json({
    success: true,
    data: { status }
  });
}));

// Start construction via catalog key
router.post('/structures/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { locationCoord, buildingKey } = req.body as { locationCoord?: string; buildingKey?: BuildingKey };

  if (!locationCoord || !buildingKey) {
    return res.status(400).json({ success: false, error: 'locationCoord and buildingKey are required' });
  }

  const result = await StructuresService.start((empire._id as mongoose.Types.ObjectId).toString(), locationCoord, buildingKey);
  if (!result.success) {
    // Handle both old format (error) and new format (code/message) with safe typing
    const errorResponse: any = {
      success: false,
      error: (result as any).error ?? (result as any).message,
      message: (result as any).message ?? (result as any).error
    };
    if ((result as any).code) errorResponse.code = (result as any).code;
    if ((result as any).details) errorResponse.details = (result as any).details;
    if ((result as any).reasons) errorResponse.reasons = (result as any).reasons;
    
    // Return 409 for idempotency conflicts, 400 for other errors
    const statusCode = (result as any).code === 'ALREADY_IN_PROGRESS' ? 409 : 400;
    return res.status(statusCode).json(errorResponse);
  }

  res.json({
    success: true,
    data: result.data,
    message: result.message
  });
}));

/**
 * Defenses Routes (Phase A)
 * Tech-only gating; maps to 'defense_station'.
 */
router.get('/defenses/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const catalog = getDefensesList();
  res.json({ success: true, data: { catalog } });
}));

router.get('/defenses/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }
  const status = await DefensesService.getStatus((empire._id as mongoose.Types.ObjectId).toString());
  res.json({ success: true, data: { status } });
}));

router.post('/defenses/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { locationCoord, defenseKey } = req.body as { locationCoord?: string; defenseKey?: DefenseKey };

  if (!locationCoord || !defenseKey) {
    return res.status(400).json({ success: false, error: 'locationCoord and defenseKey are required' });
  }

  const result = await DefensesService.start((empire._id as mongoose.Types.ObjectId).toString(), locationCoord, defenseKey);
  if (!result.success) {
    // Handle both old format (error) and new format (code/message) with safe typing
    const errorResponse: any = {
      success: false,
      error: (result as any).error ?? (result as any).message,
      message: (result as any).message ?? (result as any).error
    };
    if ((result as any).code) errorResponse.code = (result as any).code;
    if ((result as any).details) errorResponse.details = (result as any).details;
    if ((result as any).reasons) errorResponse.reasons = (result as any).reasons;
    
    // Return 409 for idempotency conflicts, 400 for other errors
    const statusCode = (result as any).code === 'ALREADY_IN_PROGRESS' ? 409 : 400;
    return res.status(statusCode).json(errorResponse);
  }

  res.json({
    success: true,
    data: result.data,
    message: result.message
  });
}));

/**
 * Units Routes (Phase A)
 * Tech-only gating; start is not implemented yet (friendly error after validation).
 */
router.get('/units/catalog', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const catalog = getUnitsList();
  res.json({ success: true, data: { catalog } });
}));

router.get('/units/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }
  const status = await UnitsService.getStatus((empire._id as mongoose.Types.ObjectId).toString());
  res.json({ success: true, data: { status } });
}));

router.post('/units/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { locationCoord, unitKey } = req.body as { locationCoord?: string; unitKey?: UnitKey };

  if (!locationCoord || !unitKey) {
    return res.status(400).json({ success: false, error: 'locationCoord and unitKey are required' });
  }

  const result = await UnitsService.start((empire._id as mongoose.Types.ObjectId).toString(), locationCoord, unitKey);
  if (!result.success) {
    // Handle both old format (error) and new format (code/message) with safe typing
    const errorResponse: any = {
      success: false,
      error: (result as any).error ?? (result as any).message,
      message: (result as any).message ?? (result as any).error
    };
    if ((result as any).code) errorResponse.code = (result as any).code;
    if ((result as any).details) errorResponse.details = (result as any).details;
    if ((result as any).reasons) errorResponse.reasons = (result as any).reasons;
    
    // Return 409 for idempotency conflicts, 400 for other errors
    const statusCode = (result as any).code === 'ALREADY_IN_PROGRESS' ? 409 : 400;
    return res.status(statusCode).json(errorResponse);
  }

  // Currently unreachable in Phase A (start returns success: false), but keep for future
  res.json({
    success: true,
    data: (result as any).data,
    message: (result as any).message || 'Unit construction started'
  });
}));

/**
 * Bases summary for Empire page
 * Returns compact info per base: name, location, economy, occupier, construction, production, research
 */
router.get('/bases/summary', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const coords: string[] = Array.isArray((empire as any).territories) ? (empire as any).territories : [];

  // Load locations and colonies for naming
  const [locations, colonies] = await Promise.all([
    Location.find({ coord: { $in: coords } }).lean(),
    Colony.find({ empireId: empire._id, locationCoord: { $in: coords } }).lean()
  ]);

  // Prefer scheduled research (has completesAt) by soonest completion; otherwise earliest unscheduled pending (waiting)
  let researchPending = await TechQueue.findOne({ empireId: empire._id, status: 'pending', completesAt: { $ne: null } }).sort({ completesAt: 1 }).lean();
  if (!researchPending) {
    researchPending = await TechQueue.findOne({
      empireId: empire._id,
      status: 'pending',
      $or: [{ completesAt: { $exists: false } }, { completesAt: null }]
    })
      .sort({ createdAt: 1 })
      .lean();
  }

  const colonyByCoord = new Map<string, any>((colonies || []).map((c: any) => [c.locationCoord, c]));
  const researchSummary = researchPending
    ? (() => {
        const name = (() => {
          try {
            return getTechSpec((researchPending as any).techKey as any).name;
          } catch {
            return String((researchPending as any).techKey || '');
          }
        })();

        const completesVal = (researchPending as any).completesAt;
        const startedVal = (researchPending as any).startedAt;

        if (completesVal && startedVal) {
          const started = new Date(startedVal as any).getTime();
          const completes = new Date(completesVal as any).getTime();
          const now = Date.now();
          const total = Math.max(0, completes - started);
          const elapsed = Math.max(0, now - started);
          const percent = total > 0 ? Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100))) : 0;
          return { name, remaining: Math.max(0, completes - now), percent };
        }

        // Not yet scheduled/charged: waiting for credits/capacity
        return { name, remaining: 0, percent: 0 };
      })()
    : null;

  // Aggregate queued construction per base (inactive buildings)
  // Also compute the earliest pending item's name and remaining time
  const queuedBuildings = await Building.find({
    empireId: empire._id,
    locationCoord: { $in: coords },
    isActive: false
  })
    .select('locationCoord catalogKey displayName constructionStarted constructionCompleted')
    .lean();

  const queuedByCoord = new Map<string, number>();
  const earliestTsByCoord = new Map<string, number>();
  const nextByCoord = new Map<string, { name: string; remaining: number; percent?: number }>();

  for (const b of queuedBuildings || []) {
    const lc = (b as any).locationCoord as string | undefined;
    if (!lc) continue;

    // Count inactive (queued)
    queuedByCoord.set(lc, (queuedByCoord.get(lc) || 0) + 1);

    // Track earliest pending item per coord
    const ts = (b as any).constructionCompleted ? new Date((b as any).constructionCompleted as any).getTime() : Number.POSITIVE_INFINITY;
    const prevTs = earliestTsByCoord.get(lc);
    if (prevTs === undefined || ts < prevTs) {
      let name = '';
      const key = (b as any).catalogKey as string | undefined;
      if (key) {
        try {
          name = getBuildingSpec(key as any).name;
        } catch {
          // fallback below
        }
      }
      if (!name) {
        name = (b as any).displayName || String(key || '');
      }
      const now = Date.now();
      const startTs = (b as any).constructionStarted ? new Date((b as any).constructionStarted as any).getTime() : NaN;
      const remaining = Number.isFinite(ts) ? Math.max(0, ts - now) : 0;
      let percent = 0;
      if (Number.isFinite(startTs) && Number.isFinite(ts) && ts > startTs) {
        const total = ts - startTs;
        const elapsed = Math.max(0, now - startTs);
        percent = Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)));
      }
      earliestTsByCoord.set(lc, ts);
      nextByCoord.set(lc, { name, remaining, percent });
    }
  }

  // Helper to compute production from buildings (mirror of client logic)
  const computeProductionRates = (buildings: any[]) => {
    return (buildings || []).reduce(
      (rates, building) => {
        if (!building.isActive) return rates;
        switch (building.type) {
          case 'metal_mine':
            rates.metalPerHour += 10 * building.level;
            break;
          case 'energy_plant':
            rates.energyPerHour += 8 * building.level;
            break;
          case 'research_lab':
            rates.researchPerHour += 5 * building.level;
            break;
          case 'factory':
            rates.metalPerHour += 5 * building.level;
            rates.energyPerHour += 3 * building.level;
            break;
          default:
            break;
        }
        return rates;
      },
      { metalPerHour: 0, energyPerHour: 0, researchPerHour: 0 }
    );
  };

  // Aggregate unit production (UnitQueue) per base: queued count and earliest pending item as "next"
  const unitQueue = await UnitQueue.find({
    empireId: empire._id,
    status: 'pending',
    locationCoord: { $in: coords }
  })
    .select('locationCoord unitKey startedAt completesAt createdAt')
    .lean();

  const prodQueuedByCoord = new Map<string, number>();
  const prodEarliestTsByCoord = new Map<string, number>();
  const prodNextByCoord = new Map<string, { name: string; remaining: number; percent?: number }>();

  for (const u of unitQueue || []) {
    const lc = (u as any).locationCoord as string | undefined;
    if (!lc) continue;

    // Count pending unit productions
    prodQueuedByCoord.set(lc, (prodQueuedByCoord.get(lc) || 0) + 1);

    // Determine ordering timestamp: prefer completesAt when present, otherwise createdAt (waiting)
    const completesVal = (u as any).completesAt;
    const startedVal = (u as any).startedAt;
    const createdVal = (u as any).createdAt;
    const orderTs = completesVal
      ? new Date(completesVal as any).getTime()
      : (createdVal ? new Date(createdVal as any).getTime() : Number.POSITIVE_INFINITY);

    const prevTs = prodEarliestTsByCoord.get(lc);
    if (prevTs === undefined || orderTs < prevTs) {
      // Resolve unit display name
      let name = '';
      const key = (u as any).unitKey as string | undefined;
      if (key) {
        try {
          const spec = getUnitSpec(key as any);
          name = spec?.name || key;
        } catch {
          name = key || '';
        }
      }

      // Compute remaining and percent (if scheduled)
      const now = Date.now();
      let remaining = 0;
      let percent = 0;

      if (completesVal && startedVal) {
        const started = new Date(startedVal as any).getTime();
        const completes = new Date(completesVal as any).getTime();
        remaining = Math.max(0, completes - now);
        if (Number.isFinite(started) && Number.isFinite(completes) && completes > started) {
          const total = completes - started;
          const elapsed = Math.max(0, now - started);
          percent = Math.min(100, Math.max(0, Math.floor((elapsed / total) * 100)));
        }
      }
      prodEarliestTsByCoord.set(lc, orderTs);
      prodNextByCoord.set(lc, { name, remaining, percent });
    }
  }

  const bases = (locations || []).map((loc: any) => {
    const colony = colonyByCoord.get(loc.coord);

    return {
      baseId: (loc._id)?.toString(),
      name: colony?.name || `Base ${loc.coord}`,
      location: loc.coord,
      economy: { metalPerHour: 0, energyPerHour: 0, researchPerHour: 0 }, // Legacy system removed
      // Occupier concept not yet modeled; placeholder null. In future, populate when hostile occupation exists.
      occupier: null as null | { empireId: string; name: string },
      construction: {
        queued: queuedByCoord.get(loc.coord) || 0,
        next: nextByCoord.get(loc.coord) || undefined
      },
      production: {
        queued: prodQueuedByCoord.get(loc.coord) || 0,
        next: prodNextByCoord.get(loc.coord) || undefined
      },
      research: researchSummary
    };
  });

  res.json({
    success: true,
    data: { bases }
  });
}));

/**
 * Base Stats (Phase A visibility)
 * Returns area, energy, population budgets and owner income for a base.
 */
router.get('/base-stats/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { coord } = req.params;
  if (!coord) {
    return res.status(400).json({ success: false, error: 'Missing coord' });
  }

  const stats = await BaseStatsService.getBaseStats(
    (empire._id as mongoose.Types.ObjectId).toString(),
    coord
  );

  return res.json({
    success: true,
    data: { stats }
  });
}));

/**
 * Capacities Routes (Phase 1)
 * Computes Construction/Production/Research capacities for a base.
 */
router.get('/capacities/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { coord } = req.params;
  if (!coord) {
    return res.status(400).json({ success: false, error: 'Missing coord' });
  }

  const caps = await CapacityService.getBaseCapacities(
    (empire._id as mongoose.Types.ObjectId).toString(),
    coord
  );

  return res.json({
    success: true,
    data: caps
  });
}));

/**
 * Base composite stats for a specific base (aggregates base-stats + capacities)
 * DTO: { success, data: { coord, stats, capacities }, message }
 */
router.get('/bases/:coord/stats', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { coord } = req.params;
  if (!coord) {
    return res.status(400).json({ success: false, error: 'Missing coord' });
  }

  const empireId = (empire._id as mongoose.Types.ObjectId).toString();

  const [stats, capacities] = await Promise.all([
    BaseStatsService.getBaseStats(empireId, coord),
    CapacityService.getBaseCapacities(empireId, coord),
  ]);

  return res.json({
    success: true,
    data: { coord, stats, capacities },
    message: 'Base stats loaded'
  });
}));

/**
 * Structures list for a specific base (catalogKey-first with ETA)
 * DTO: { success, data: { coord, constructionPerHour, items: [...] }, message }
 */
router.get('/bases/:coord/structures', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const { coord } = req.params;
  if (!coord) {
    return res.status(400).json({ success: false, error: 'Missing coord' });
  }

  const empireId = (empire._id as mongoose.Types.ObjectId).toString();

  // Load capacities, status, and current buildings at base
  const [caps, status, buildings] = await Promise.all([
    CapacityService.getBaseCapacities(empireId, coord),
    StructuresService.getStatus(empireId),
    Building.find({ empireId: empire._id, locationCoord: coord })
      .select('catalogKey level isActive pendingUpgrade constructionStarted constructionCompleted')
      .lean(),
  ]);

  const constructionPerHour = Math.max(0, Number((caps as any)?.construction?.value || 0));

  // Compute current levels by catalogKey (active + pendingUpgrade treated as current)
  const levelByKey = new Map<string, number>();
  for (const b of (buildings || [])) {
    const key = (b as any).catalogKey as string | undefined;
    if (!key) continue;
    const level = Math.max(0, Number((b as any).level || 0));
    if ((b as any).isActive === true || (b as any).pendingUpgrade === true) {
      levelByKey.set(key, Math.max(levelByKey.get(key) || 0, level));
    }
  }

  // Determine currently active construction at this base (earliest future completion among inactive docs)
  let activeConstruction: { key: BuildingKey; completionAt: string } | null = null;
  try {
    const nowTs = Date.now();
    let earliest = Number.POSITIVE_INFINITY;
    for (const b of (buildings || [])) {
      if ((b as any)?.isActive === false && (b as any)?.constructionCompleted) {
        const ts = new Date((b as any).constructionCompleted as any).getTime();
        if (Number.isFinite(ts) && ts > nowTs && ts < earliest) {
          earliest = ts;
          const key = String((b as any).catalogKey || "");
          if (key) {
            activeConstruction = { key: key as BuildingKey, completionAt: new Date(ts).toISOString() };
          }
        }
      }
    }
  } catch {
    // non-fatal: leave activeConstruction null on error
  }

  const catalog = getBuildingsList();

  const items = catalog.map((spec) => {
    const key = spec.key as BuildingKey;
    const currentLevel = levelByKey.get(key) ?? 0;
    const nextLevel = currentLevel + 1;

    let creditsCostNext: number | null = null;
    try {
      creditsCostNext = getStructureCreditCostForLevel(key, nextLevel);
    } catch {
      // Fallback for initial L1 when no per-level table exists; upgrades remain null
      creditsCostNext = currentLevel === 0 ? spec.creditsCost : null;
    }

    const canStart = !!status?.eligibility?.[key]?.canStart;
    const reasons = status?.eligibility?.[key]?.reasons || [];

    let etaMinutes: number | null = null;
    if (typeof creditsCostNext === 'number' && constructionPerHour > 0) {
      const hours = creditsCostNext / constructionPerHour;
      etaMinutes = Math.max(1, Math.ceil(hours * 60));
    }

    return {
      key,
      name: spec.name,
      currentLevel,
      nextLevel,
      creditsCostNext,
      energyDelta: Number(spec.energyDelta || 0),
      requires: spec.techPrereqs?.map((p) => ({ key: p.key, level: p.level })) || [],
      canStart,
      reasons,
      etaMinutes,
    };
  });

  return res.json({
    success: true,
    data: { coord, constructionPerHour, items, activeConstruction },
    message: 'Base structures loaded',
  });
}));

/**
 * Structures Construction Queue
 * Lists queued building constructions (inactive Building docs) for the authenticated empire.
 * Optional ?base=A00:10:22:10 to filter by a specific base coord.
 */
router.get('/structures/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const base = String(req.query.base || '').trim();
  const filter: any = { empireId: empire._id, isActive: false };
  if (base) filter.locationCoord = base;

  const queue = await Building.find(filter)
    .select('locationCoord catalogKey displayName constructionStarted constructionCompleted pendingUpgrade isActive')
    .sort({ constructionCompleted: 1, createdAt: 1 })
    .lean();

  return res.json({ success: true, data: { queue } });
}));

/**
 * Cancel a queued structure (construction or upgrade)
 * - If the queued item is a first-time construction (separate inactive doc), delete it.
 * - If the queued item is an upgrade scheduled on an existing building doc (pendingUpgrade=true),
 *   revert it back to active and clear scheduling fields.
 */
router.delete('/structures/queue/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const id = String(req.params.id || '').trim();
  if (!id || !mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'Invalid queue item id', error: 'Invalid queue item id' });
  }

  const b = await Building.findById(id);
  if (!b || b.empireId.toString() !== (empire._id as mongoose.Types.ObjectId).toString()) {
    return res.status(404).json({ success: false, error: 'Queue item not found' });
  }

  if (b.isActive === true) {
    return res.status(400).json({ success: false, code: 'INVALID_REQUEST', message: 'Only queued items can be cancelled', error: 'Only queued items can be cancelled' });
  }

  // Refund previously charged credits, if any (credits are only charged at schedule-time)
  let refundedCredits = 0;
  try {
    const wasCharged = Boolean((b as any).constructionStarted);
    const refundable = wasCharged ? Math.max(0, Number((b as any).creditsCost || 0)) : 0;
    if (refundable > 0) {
      (empire as any).resources.credits = Number((empire as any).resources.credits || 0) + refundable;
      await empire.save();
      refundedCredits = refundable;
    }
  } catch {
    // Non-fatal: skip refund on error to avoid blocking cancellation
  }

  let revertedUpgrade = false;
  let deleted = false;

  if ((b as any).pendingUpgrade === true) {
    // Revert upgrade on the existing building document
    (b as any).pendingUpgrade = false;
    b.isActive = true;
    (b as any).constructionStarted = new Date(); // not required, but keep sane defaults
    (b as any).constructionCompleted = undefined as any;
    (b as any).creditsCost = 0; // reset to prevent double-refund semantics if re-queued later
    await b.save();
    revertedUpgrade = true;
  } else {
    // First-time construction: delete the queued inactive document
    await b.deleteOne();
    deleted = true;
  }

  return res.json({
    success: true,
    data: { cancelledId: id, revertedUpgrade, deleted, refundedCredits },
    message: refundedCredits > 0
      ? 'Construction queue item cancelled and credits refunded'
      : 'Construction queue item cancelled'
  });
}));

/**
 * Technology Research Queue
 * Lists active tech research (capacity-driven) for the authenticated empire.
 * Optional ?base=A00:10:22:10 to filter by a specific base coord.
 */
router.get('/tech/queue', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const base = String(req.query.base || '').trim();
  const filter: any = { empireId: empire._id, status: 'pending' };
  if (base) filter.locationCoord = base;

  const queue = await TechQueue.find(filter).sort({ completesAt: 1, createdAt: 1 }).lean();

  res.json({ success: true, data: { queue } });
}));

// Cancel a pending technology research queue item
router.delete('/tech/queue/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const id = String(req.params.id || '').trim();
  if (!id || !mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: 'Invalid queue item id' });
  }

  const item = await TechQueue.findById(id);
  if (!item || item.empireId.toString() !== (empire._id as mongoose.Types.ObjectId).toString()) {
    return res.status(404).json({ success: false, error: 'Queue item not found' });
  }

  if (item.status !== 'pending') {
    return res.status(400).json({ success: false, error: 'Only pending items can be cancelled' });
  }

  let refundedCredits: number | null = null;
  try {
    if (item.charged === true) {
      const spec = getTechSpec(item.techKey as TechnologyKey);
      const credits = getTechCreditCostForLevel(spec, Math.max(1, Number(item.level || 1)));
      refundedCredits = credits;
      (empire as any).resources.credits = Number((empire as any).resources.credits || 0) + credits;
      await empire.save();
    }
  } catch {
    // If spec lookup fails, skip refund silently to avoid throwing; status still changes
  }

  item.status = 'cancelled';
  await item.save();

  return res.json({
    success: true,
    data: { cancelledId: item._id?.toString(), refundedCredits },
    message: 'Research queue item cancelled'
  });
}));

/**
 * Base Units (MVP)
 * Returns aggregate counts of completed units at a specific base for the authenticated empire.
 * DTO: { success, data: { base, counts: Record<UnitKey, number>, total }, message }
 */
router.get('/base-units', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const baseCoord = String(req.query.base || '').trim();
  if (!baseCoord) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Missing base coordinate (?base=...)',
      details: { field: 'base' }
    });
  }

  try {
    // Aggregate completed unit productions at this base for this empire
    const agg = await UnitQueue.aggregate([
      { $match: { empireId: empire._id, locationCoord: baseCoord, status: 'completed' } as any },
      { $group: { _id: '$unitKey', count: { $sum: 1 } } }
    ]);

    const counts: Record<string, number> = {};
    let total = 0;
    for (const g of agg || []) {
      const key = String(g?._id || '');
      const n = Math.max(0, Number(g?.count || 0));
      if (key) counts[key] = n;
      total += n;
    }

    return res.json({
      success: true,
      data: { base: baseCoord, counts, total },
      message: 'Base units loaded'
    });
  } catch (err) {
    // Fallback error shape per DTO/Error schema guidance
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Failed to load base units',
      details: { base: baseCoord }
    });
  }
}));

/**
 * Fleets — list fleets for current empire (optional ?base=coord)
 * DTO: { success, data: { fleets: [{ _id, name, ownerName, arrival, sizeCredits }] } }
 */
router.get('/fleets', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const baseCoord = String(req.query.base || '').trim();
  const filter: any = { empireId: empire._id };
  if (baseCoord) filter.locationCoord = baseCoord;

  const fleets = await Fleet.find(filter).sort({ createdAt: 1 }).lean();

  const rows = (fleets || []).map((f: any) => ({
    _id: f._id?.toString(),
    name: f.name,
    ownerName: empire.name,
    arrival: null as null, // stationed at base
    sizeCredits: Number(f.sizeCredits || 0),
  }));

  return res.json({
    success: true,
    data: { fleets: rows }
  });
}));

/**
 * Fleet detail — composition and metadata
 * DTO: { success, data: { fleet: { _id, name, locationCoord, ownerName, units: [{ unitKey, name, count }], sizeCredits } } }
 */
router.get('/fleets/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }

  const id = String(req.params.id || '').trim();
  if (!id || !mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Invalid fleet id',
      details: { field: 'id' }
    });
  }

  const fleet = await Fleet.findOne({ _id: id, empireId: empire._id }).lean();
  if (!fleet) {
    return res.status(404).json({ success: false, error: 'Fleet not found' });
  }

  const units = Array.isArray((fleet as any).units) ? (fleet as any).units : [];
  const composition = units.map((u: any) => {
    const key = String(u?.unitKey || '');
    let name = key;
    try {
      name = getUnitSpec(key as any)?.name || key;
    } catch {
      // fallback to key
    }
    return { unitKey: key, name, count: Number(u?.count || 0) };
  });

  return res.json({
    success: true,
    data: {
      fleet: {
        _id: (fleet as any)._id?.toString?.(),
        name: (fleet as any).name,
        locationCoord: (fleet as any).locationCoord,
        ownerName: empire.name,
        units: composition,
        sizeCredits: Number((fleet as any).sizeCredits || 0),
      }
    }
  });
}));

export default router;
