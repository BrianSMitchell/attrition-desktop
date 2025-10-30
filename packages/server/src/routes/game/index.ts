import { Router, Response } from 'express';
import { supabase } from '../../config/supabase';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { ERROR_MESSAGES } from '../../constants/response-formats';
import { ENV_VALUES } from '@game/shared';

// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
import { HTTP_STATUS } from '@game/shared';
import { ENV_VARS } from '@game/shared';
import { 
  BuildingKey,
  DefenseKey,
  TechnologyKey, 
  UnitKey,
  getTechnologyList,
  getBuildingsList,
  getDefensesList,
  getUnitsList,
  getUnitSpec,
  getTechSpec,
  getStructureCreditCostForLevel,
  getBuildingSpec
} from '@game/shared';
import { EmpireResolutionService } from '../../services/empire/EmpireResolutionService';
import dashboardRoutes from './dashboard';
import empireRoutes from './empire';
import baseRoutes from './bases';
import structureRoutes from './structures';
import techRoutes from './tech';
import defensesRoutes from './defenses';
import unitsRoutes from './units';
import fleetRoutes from './fleets';
import territoriesRoutes from './territories';
import testSeedsRoutes from './test-seeds';

const router: Router = Router();

// All game routes require authentication
router.use(authenticate);

// Mount sub-routers
router.use('/dashboard', dashboardRoutes);
router.use('/empire', empireRoutes);
router.use('/bases', baseRoutes);
router.use('/structures', structureRoutes);
router.use('/tech', techRoutes);  // Mount consolidated tech routes
router.use('/defenses', defensesRoutes); // Mount defenses routes
router.use('/units', unitsRoutes); // Mount units routes
router.use('/fleets', fleetRoutes); // Mount fleet routes
router.use('/territories', territoriesRoutes); // Mount territories routes
router.use('/test', testSeedsRoutes); // Mount test seeding routes

// Capacities route - direct capacity lookup by coordinate
router.get('/capacities/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const { coord } = req.params;

  if (!coord) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED
    });
  }

  // Resolve empire using the service
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);

  // Use the existing CapacityService
  const { CapacityService } = await import('../../services/bases/CapacityService');
  const capacities = await CapacityService.getBaseCapacities(empireId, coord);

  return res.json({
    success: true,
    data: capacities
  });
}));

// Buildings by location route
router.get('/buildings/location/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const { coord } = req.params;

  if (!coord) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED
    });
  }

  // Resolve empire using the service
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);

  // Get all buildings at this location for this empire
  const { data: buildings, error } = await supabase
    .from(DB_TABLES.BUILDINGS)
    .select(`
      id,
      catalog_key,
      level,
      is_active,
      pending_upgrade,
      construction_started,
      construction_completed,
      credits_cost
    `)
    .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
    .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, coord)
    .order(DB_FIELDS.BUILDINGS.CATALOG_KEY, { ascending: true });

  if (error) {
    console.error('Error fetching buildings:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to fetch buildings'
    });
  }

  // Format buildings data for client
  const formattedBuildings = (buildings || []).map((building: any) => ({
    id: building.id,
    catalogKey: building.catalog_key,
    level: building.level,
    isActive: building.is_active,
    pendingUpgrade: building.pending_upgrade,
    constructionStarted: building.construction_started ? new Date(building.construction_started) : null,
    constructionCompleted: building.construction_completed ? new Date(building.construction_completed) : null,
    creditsCost: building.credits_cost
  }));

  return res.json({
    success: true,
    data: {
      buildings: formattedBuildings
    }
  });
}));

// Colonization route needs Supabase implementation

/**
 * Test-only seeding endpoint to make Research Start deterministic in E2E.
 * - Ensures the authenticated user's empire has sufficient credits
 * - Ensures the specified (or first) base has at least one active research_lab (level 1)
 * Guarded by NODE_ENV === ENV_VALUES.TEST
 *
 * DTO (success):
 * {
 *   "success": true,
 *   "data": { "baseCoord": "...", DB_FIELDS.EMPIRES.CREDITS: 50000, "baseLabTotal": 1 },
 *   "message": "Seeded test research lab and credits"
 * }
 */
/**
 * Test-only seeding endpoint to make Defenses Start deterministic in E2E.
 * - Tops up credits
 * - Ensures tech prereqs for jump_gate (warp_drive 12, energy 20)
 * - Ensures positive energy projection by adding active solar plants at the base
 * Guarded by NODE_ENV === ENV_VALUES.TEST
 */
/**
 * Test-only seeding endpoint to make Structures Start deterministic in E2E.
 * - Tops up credits
 * - Broadly raises tech levels so most structures are eligible
 * - Ensures positive energy projection and construction capacity (solar + robotics)
 * Guarded by NODE_ENV === ENV_VALUES.TEST
 */
/**
 * Test-only cleanup endpoint to remove queued buildings for idempotency testing.
 * Guarded by NODE_ENV === ENV_VALUES.TEST
 */
// Research Management Routes

// Get empire research projects
router.get('/research', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Resolve empire using the service
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      error: ERROR_MESSAGES.EMPIRE_NOT_FOUND
    });
  }

  const empireId = String(empireRow.id);

  // For now, return empty array as research projects haven't been fully implemented in Supabase yet
  // This maintains API compatibility while the research system is being migrated
  res.json({
    success: true,
    data: { researchProjects: [] }
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
router.post('/tech/start', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const userId = user?._id || user?.id;
  const { locationCoord, techKey } = req.body as { locationCoord?: string; techKey?: TechnologyKey };
  console.log('[tech/start] Request:', { userId, locationCoord, techKey, body: req.body });
  if (!locationCoord || !techKey) {
    console.log('[tech/start] Missing required params');
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

// Structures routes moved to ./structures.ts (mounted at /structures)
// Defenses routes moved to ./defenses.ts (mounted at /defenses)
// Units routes moved to ./units.ts (mounted at /units)






/**
 * Fleets Overview ? public view for a base
 * Returns all stationed fleets at the base (any empire) and any inbound movements to that base.
 * Query: ?base=COORD
 * DTO: { success, data: { fleets: [{ _id, name, ownerName, arrival, sizeCredits }] } }
 */
router.get('/fleets-overview', asyncHandler(async (req: AuthRequest, res: Response) => {
  const baseCoord = String(req.query.base || '').trim();
  if (!baseCoord) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Missing base coordinate (?base=...)' });
  }
    // ========== SUPABASE PATH ==========
    try {
      // 1) Query stationed fleets at this base (all empires)
      const { data: stationedFleets, error: fleetsError } = await supabase
        .from(DB_TABLES.FLEETS)
        .select('id, empire_id, name, size_credits')
        .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, baseCoord);

      if (fleetsError) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          code: 'DB_ERROR',
          error: fleetsError.message
        });
      }

      // Collect empire IDs for name lookup
      const empireIds = new Set<string>();
      for (const f of stationedFleets || []) {
        if (f.empire_id) empireIds.add(String(f.empire_id));
      }

      // 2) Query inbound fleet movements to this base (pending/travelling)
      const { data: incomingMovements, error: movementsError } = await supabase
        .from(DB_TABLES.FLEET_MOVEMENTS)
        .select('id, empire_id, fleet_id, estimated_arrival_time, size_credits')
        .eq('destination_coord', baseCoord)
        .in(DB_FIELDS.TECH_QUEUE.STATUS, ['pending', 'travelling']);

      if (movementsError) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          code: 'DB_ERROR',
          error: movementsError.message
        });
      }

      // Collect empire IDs from movements
      for (const m of incomingMovements || []) {
        if (m.empire_id) empireIds.add(String(m.empire_id));
      }

      // 3) Lookup empire names
      const empireNameById = new Map<string, string>();
      if (empireIds.size > 0) {
        const { data: empireDocs, error: empiresError } = await supabase
          .from(DB_TABLES.EMPIRES)
          .select('id, name')
          .in(DB_FIELDS.BUILDINGS.ID, Array.from(empireIds));

        if (!empiresError && empireDocs) {
          for (const e of empireDocs) {
            empireNameById.set(String(e.id), String(e.name || 'Unknown'));
          }
        }
      }

      // 4) For inbound movements, lookup fleet names
      const inboundFleetIds = Array.from(new Set((incomingMovements || []).map(m => String(m.fleet_id))));
      const inboundFleetById = new Map<string, any>();
      
      if (inboundFleetIds.length > 0) {
        const { data: inboundFleetDocs, error: inboundFleetsError } = await supabase
          .from(DB_TABLES.FLEETS)
          .select('id, name, size_credits')
          .in(DB_FIELDS.BUILDINGS.ID, inboundFleetIds);

        if (!inboundFleetsError && inboundFleetDocs) {
          for (const f of inboundFleetDocs) {
            inboundFleetById.set(String(f.id), f);
          }
        }
      }

      // 5) Build response rows
      const rows: Array<{ _id: string; name: string; ownerName: string; arrival: string | null; sizeCredits: number }> = [];

      // Add stationed fleets
      for (const f of stationedFleets || []) {
        rows.push({
          _id: String(f.id),
          name: String(f.name),
          ownerName: empireNameById.get(String(f.empire_id)) || 'Unknown',
          arrival: null, // stationed at base
          sizeCredits: Number(f.size_credits || 0),
        });
      }

      // Add incoming movements
      for (const m of incomingMovements || []) {
        const fleetDoc = inboundFleetById.get(String(m.fleet_id));
        rows.push({
          _id: String(m.id), // movement id as unique row id
          name: fleetDoc ? String(fleetDoc.name) : 'Inbound Fleet',
          ownerName: empireNameById.get(String(m.empire_id)) || 'Unknown',
          arrival: m.estimated_arrival_time ? new Date(m.estimated_arrival_time).toISOString() : null,
          sizeCredits: Number(m.size_credits || (fleetDoc?.size_credits ?? 0)),
        });
      }

      return res.json({ success: true, data: { fleets: rows } });
    } catch (err) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        code: ERROR_MESSAGES.INTERNAL_ERROR,
        error: 'Failed to load fleet overview',
        details: { base: baseCoord }
      });
    }
}));

/**
 * Fleet Movement Routes
 */

export default router;










