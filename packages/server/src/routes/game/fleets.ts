import { Router, Response } from 'express';
import { supabase } from '../../config/supabase';
import { ERROR_MESSAGES } from '../../constants/response-formats';

// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
import { HTTP_STATUS } from '@game/shared';
import { STATUS_CODES } from '@game/shared';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getUnitSpec } from '@game/shared';
import { EmpireResolutionService } from '../../services/empire/EmpireResolutionService';
import { FleetMovementService } from '../../services/fleets/FleetMovementService';

const router: Router = Router();

router.use(authenticate);

/**
 * Calculate fleet size in credits based on unit composition (FR-6)
 * @param units - Array of fleet units with unitKey and count
 * @returns Total credits value of the fleet
 */
function calculateFleetSizeCredits(units: Array<{ unitKey?: string; unit_key?: string; count: number }>): number {
  if (!Array.isArray(units)) {
    return 0;
  }

  let totalCredits = 0;
  
  for (const unit of units) {
    const unitKey = unit?.unitKey || unit?.unit_key;
    const count = Number(unit?.count || 0);
    
    if (unitKey && count > 0) {
      try {
        const unitSpec = getUnitSpec(unitKey as any);
        if (unitSpec && typeof unitSpec.creditsCost === 'number') {
          totalCredits += unitSpec.creditsCost * count;
        }
      } catch {
        // Ignore units with missing specs
      }
    }
  }
  
  return totalCredits;
}

/**
 * List fleets for current empire
 * GET /api/game/fleets
 * GET /api/game/fleets?base=:coord (filtered by base coordinate)
 * 
 * Implements FR-1: List all fleets for authenticated empire
 * Implements FR-2: Filter fleets by base coordinate
 * 
 * Response Format (FR-12): { success: boolean, data: any, error?: string }
 * DTO: { success, data: { fleets: [{ _id, name, ownerName, arrival, sizeCredits }] } }
 */
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  
  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      error: ERROR_MESSAGES.EMPIRE_NOT_FOUND
    });
  }

  const empireId = String(empireRow.id);
  const empireName = String((empireRow as any).name || 'Unknown');

  // Build query for fleets including units for size calculation (FR-6)
  const baseCoord = String(req.query.base || '').trim();
  let query = supabase
    .from(DB_TABLES.FLEETS)
    .select('id, name, size_credits, created_at, location_coord, units')
    .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId);

  // Add location filter if base coordinate provided (FR-2)
  if (baseCoord) {
    query = query.eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, baseCoord);
  }
  
  // Apply ordering and execute query
  const { data: fleets, error } = await query.order(DB_FIELDS.BUILDINGS.CREATED_AT, { ascending: true });

  if (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to fetch fleets'
    });
  }

  // Format response to match established DTO structure (FR-12)
  const rows = (fleets || []).map((f: any) => {
    // Calculate fleet size dynamically from units (FR-6)
    const calculatedSize = calculateFleetSizeCredits(f.units || []);
    // Use calculated size if available, fallback to stored value
    const sizeCredits = calculatedSize > 0 ? calculatedSize : Number(f.size_credits || 0);
    
    return {
      _id: String(f.id),
      name: String(f.name),
      ownerName: empireName,
      arrival: null as null, // stationed at base
      sizeCredits,
      locationCoord: String(f.location_coord || '')
    };
  });

  return res.json({
    success: true,
    data: { fleets: rows }
  });
}));

/**
 * Get fleet overview for a base (frontend compatibility)
 * GET /api/game/fleets/overview?base=:coord
 * 
 * Implements FR-5: Fleet overview endpoint compatible with existing frontend expectations
 * Implements FR-7: Handle fleet unit composition (type and count arrays)
 * 
 * DTO: { success, data: { fleets: Array<{ _id, name, units: Array<{type, count}> }> } }
 */
router.get('/overview', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;

  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      error: ERROR_MESSAGES.EMPIRE_NOT_FOUND
    });
  }

  const empireId = String(empireRow.id);

  // Validate base coordinate parameter
  const baseCoord = String(req.query.base || '').trim();
  if (!baseCoord) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'base parameter is required'
    });
  }

  // Query fleets at this base with unit composition
  const { data: fleets, error } = await supabase
    .from(DB_TABLES.FLEETS)
    .select('id, name, units')
    .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
    .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, baseCoord);

  if (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to fetch fleet overview'
    });
  }

  // Format fleet units for overview (FR-7)
  const overview = (fleets || []).map((f: any) => {
    const units = Array.isArray(f.units) ? f.units : [];
    const formattedUnits = units.map((u: any) => ({
      type: String(u?.unitKey || u?.unit_key || ''),
      count: Number(u?.count || 0)
    }));

    return {
      _id: String(f.id),
      name: String(f.name),
      units: formattedUnits
    };
  });

  return res.json({
    success: true,
    data: { fleets: overview }
  });
}));

/**
 * Get detailed information about a specific fleet
 * GET /api/game/fleets/:id
 * 
 * Implements FR-3: Fleet detail endpoint with composition and metadata
 * 
 * Response DTO: { 
 *   success: boolean, 
 *   data: { 
 *     fleet: { 
 *       _id: string, 
 *       name: string, 
 *       locationCoord: string, 
 *       ownerName: string, 
 *       units: Array<{unitKey: string, name: string, count: number}>, 
 *       sizeCredits: number 
 *     } 
 *   } 
 * }
 */
router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const fleetId = String(req.params.id || '').trim();
  if (!fleetId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'Invalid fleet id'
    });
  }

  const user = req.user! as any;
  
  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      error: ERROR_MESSAGES.EMPIRE_NOT_FOUND
    });
  }

  const empireId = String(empireRow.id);
  const empireName = String((empireRow as any).name || 'Unknown');

  // Query fleet by ID with empire ownership check
  const { data: fleet, error } = await supabase
    .from(DB_TABLES.FLEETS)
    .select('id, name, location_coord, units, size_credits')
    .eq(DB_FIELDS.BUILDINGS.ID, fleetId)
    .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_MESSAGES.FLEET_NOT_FOUND
      });
    }
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to fetch fleet details'
    });
  }

  // Parse and format fleet composition (FR-7)
  const units = Array.isArray(fleet.units) ? fleet.units : [];
  const composition = units.map((u: any) => {
    const unitKey = String(u?.unitKey || u?.unit_key || '');
    let unitName = unitKey;
    try {
      const spec = getUnitSpec(unitKey as any);
      unitName = spec?.name || unitKey;
    } catch {
      // Fallback to key if spec not found
    }
    return { 
      unitKey, 
      name: unitName, 
      count: Number(u?.count || 0) 
    };
  });

  return res.json({
    success: true,
    data: {
      fleet: {
        _id: String(fleet.id),
        name: String(fleet.name),
        locationCoord: String(fleet.location_coord || ''),
        ownerName: empireName,
        units: composition,
        sizeCredits: Number(fleet.size_credits || 0),
      }
    }
  });
}));

/**
 * Initiate fleet movement to a destination
 * POST /api/game/fleets/:id/move
 * Body: { destinationCoord: string }
 * 
 * Implements FR-4: Fleet movement endpoint to initiate fleet movement
 * 
 * Request Body: { destinationCoord: string }
 * Response DTO: { 
 *   success: boolean, 
 *   data: { movement: any }, 
 *   message?: string,
 *   error?: string,
 *   code?: string
 * }
 */
router.post('/:id/move', asyncHandler(async (req: AuthRequest, res: Response) => {
  const fleetId = String(req.params.id || '').trim();
  if (!fleetId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'Invalid fleet id'
    });
  }

  // Validate request body
  const { destinationCoord } = req.body as { destinationCoord?: string };
  if (!destinationCoord || typeof destinationCoord !== 'string') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'destinationCoord is required'
    });
  }

  const user = req.user! as any;
  
  // Resolve empire using established pattern (FR-14)
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      error: ERROR_MESSAGES.EMPIRE_NOT_FOUND
    });
  }

  const empireId = String(empireRow.id);

  try {
    // Use existing FleetMovementService to handle the fleet dispatch
    const result = await FleetMovementService.dispatchFleet(
      fleetId,
      empireId,
      { destinationCoord }
    );

    if (!result.success) {
      // Map service error codes to appropriate HTTP status codes (FR-15)
      let statusCode: number = HTTP_STATUS.BAD_REQUEST; // Default to bad request
      switch (result.code) {
        case 'FLEET_NOT_FOUND':
          statusCode = HTTP_STATUS.NOT_FOUND;
          break;
        case 'EMPTY_FLEET':
        case 'FLEET_ALREADY_MOVING':
        case 'ALREADY_AT_DESTINATION':
        case 'INVALID_DESTINATION':
          statusCode = HTTP_STATUS.BAD_REQUEST;
          break;
        case 'DISPATCH_ERROR':
          statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
          break;
        default:
          statusCode = HTTP_STATUS.BAD_REQUEST;
      }

      return res.status(statusCode).json({
        success: false,
        error: result.error || 'Failed to move fleet'
      });
    }

    // Success response (FR-12)
    return res.json({
      success: true,
      data: { movement: result.movement },
      message: 'Fleet movement initiated successfully'
    });
  } catch (error) {
    console.error('Error initiating fleet movement:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to initiate fleet movement'
    });
  }
}));

export default router;




