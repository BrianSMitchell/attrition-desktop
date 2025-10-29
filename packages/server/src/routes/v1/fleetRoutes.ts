import { AuthRequest } from '../../../middleware/auth';
import { Response, Router } from 'express';
import { supabase } from '../../config/supabase';
import { ERROR_MESSAGES } from '../../../constants/response-formats';


// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../../../constants/database-fields';
import { HTTP_STATUS } from '@game/shared';
import { createBaseRouter, AuthRequest, asyncHandler } from './baseRouter';
import { FleetMovementService } from '../../services/fleets/FleetMovementService';
import { getUnitSpec } from '@game/shared';

const router = createBaseRouter();

/**
 * Get fleets overview for a base
 * GET /api/game/fleets-overview?base=:coord
 * DTO: { success, data: { fleets: Array<{ _id, name, units: Array<{type, count}> }> } }
 */
router.get('/fleets-overview', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id || req.user!.id;

  // Get empire for current user
  const { data: userRow } = await supabase
    .from(DB_TABLES.USERS)
    .select(DB_FIELDS.BUILDINGS.EMPIRE_ID)
    .eq(DB_FIELDS.BUILDINGS.ID, userId)
    .maybeSingle();

  if (!userRow?.empire_id) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  // Build query for fleets at this base
  const baseCoord = String(req.query.base || '').trim();
  if (!baseCoord) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'base parameter is required',
      details: { field: 'base' }
    });
  }

  const { data: fleets, error } = await supabase
    .from(DB_TABLES.FLEETS)
    .select('id, name, units')
    .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, userRow.empire_id)
    .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, baseCoord);

  if (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: 'DB_ERROR',
      error: error.message
    });
  }

  // Format fleet units for overview
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
 * List fleets for current empire (optional ?base=coord)
 * DTO: { success, data: { fleets: [{ _id, name, ownerName, arrival, sizeCredits }] } }
 */
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id || req.user!.id;

  // Get empire for current user
  const { data: userRow } = await supabase
    .from(DB_TABLES.USERS)
    .select(DB_FIELDS.BUILDINGS.EMPIRE_ID)
    .eq(DB_FIELDS.BUILDINGS.ID, userId)
    .maybeSingle();

  if (!userRow?.empire_id) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  // Get empire details for owner name
  const { data: empireRow } = await supabase
    .from(DB_TABLES.EMPIRES)
    .select('id, name')
    .eq(DB_FIELDS.BUILDINGS.ID, userRow.empire_id)
    .maybeSingle();

  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  // Build query for fleets
  const baseCoord = String(req.query.base || '').trim();
  let query = supabase
    .from(DB_TABLES.FLEETS)
    .select('id, name, size_credits, created_at')
    .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireRow.id)
    .order(DB_FIELDS.BUILDINGS.CREATED_AT, { ascending: true });

  // Add location filter if base coordinate provided
  if (baseCoord) {
    query = query.eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, baseCoord);
  }

  const { data: fleets, error } = await query;

  if (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: 'DB_ERROR',
      error: error.message
    });
  }

  // Format response data
  const rows = (fleets || []).map((f: any) => ({
    _id: String(f.id),
    name: String(f.name),
    ownerName: empireRow.name,
    arrival: null as null, // stationed at base
    sizeCredits: Number(f.size_credits || 0),
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
router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id || '').trim();
  if (!id) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Invalid fleet id',
      details: { field: DB_FIELDS.BUILDINGS.ID }
    });
  }

  const userId = req.user!._id || req.user!.id;

  // Get empire for current user
  const { data: userRow } = await supabase
    .from(DB_TABLES.USERS)
    .select(DB_FIELDS.BUILDINGS.EMPIRE_ID)
    .eq(DB_FIELDS.BUILDINGS.ID, userId)
    .maybeSingle();

  if (!userRow?.empire_id) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  // Get empire details
  const { data: empireRow } = await supabase
    .from(DB_TABLES.EMPIRES)
    .select('id, name')
    .eq(DB_FIELDS.BUILDINGS.ID, userRow.empire_id)
    .maybeSingle();

  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  // Query fleet by ID with empire ownership check
  const { data: fleet, error } = await supabase
    .from(DB_TABLES.FLEETS)
    .select('id, name, location_coord, units, size_credits')
    .eq(DB_FIELDS.BUILDINGS.ID, id)
    .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireRow.id)
    .maybeSingle();

  if (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: 'DB_ERROR',
      error: error.message
    });
  }

  if (!fleet) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.FLEET_NOT_FOUND });
  }

  // Parse and format fleet composition
  const units = Array.isArray(fleet.units) ? fleet.units : [];
  const composition = units.map((u: any) => {
    const key = String(u?.unitKey || u?.unit_key || '');
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
        _id: String(fleet.id),
        name: String(fleet.name),
        locationCoord: String(fleet.location_coord),
        ownerName: empireRow.name,
        units: composition,
        sizeCredits: Number(fleet.size_credits || 0),
      }
    }
  });
}));

/**
 * Dispatch fleet to new location
 * POST /fleets/:id/dispatch
 * Body: { destinationCoord: string }
 * DTO: { success, data: { movement }, message }
 */
router.post('/:id/dispatch', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id || req.user!.id;

  const fleetId = String(req.params.id || '').trim();
  if (!fleetId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Invalid fleet id',
      details: { field: DB_FIELDS.BUILDINGS.ID }
    });
  }

  const { destinationCoord } = req.body as { destinationCoord?: string };
  if (!destinationCoord || typeof destinationCoord !== 'string') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'destinationCoord is required',
      details: { field: 'destinationCoord' }
    });
  }

  // Get empire for current user
  const { data: userRow } = await supabase
    .from(DB_TABLES.USERS)
    .select(DB_FIELDS.BUILDINGS.EMPIRE_ID)
    .eq(DB_FIELDS.BUILDINGS.ID, userId)
    .maybeSingle();

  if (!userRow?.empire_id) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  try {
    const result = await FleetMovementService.dispatchFleet(
      fleetId,
      userRow.empire_id,
      { destinationCoord }
    );

    if (!result.success) {
      const statusCode = result.code === 'FLEET_NOT_FOUND' ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
      return res.status(statusCode).json({
        success: false,
        code: result.code,
        message: result.error || 'Failed to dispatch fleet'
      });
    }

    return res.json({
      success: true,
      data: { movement: result.movement },
      message: 'Fleet dispatched successfully'
    });
  } catch (error) {
    console.error('Error dispatching fleet:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: ERROR_MESSAGES.INTERNAL_ERROR,
      message: 'Failed to dispatch fleet'
    });
  }
}));

/**
 * Get fleet status including movement information
 * GET /fleets/:id/status
 * DTO: { success, data: { fleet, movement } }
 */
router.get('/:id/status', asyncHandler(async (req: AuthRequest, res: Response) => {
  const fleetId = String(req.params.id || '').trim();
  if (!fleetId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Invalid fleet id',
      details: { field: DB_FIELDS.BUILDINGS.ID }
    });
  }

  const userId = req.user!._id || req.user!.id;

  // Get empire for current user
  const { data: userRow } = await supabase
    .from(DB_TABLES.USERS)
    .select(DB_FIELDS.BUILDINGS.EMPIRE_ID)
    .eq(DB_FIELDS.BUILDINGS.ID, userId)
    .maybeSingle();

  if (!userRow?.empire_id) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  try {
    // Get fleet
    const { data: fleet, error: fleetError } = await supabase
      .from(DB_TABLES.FLEETS)
      .select('id, name, location_coord, units, size_credits')
      .eq(DB_FIELDS.BUILDINGS.ID, fleetId)
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, userRow.empire_id)
      .maybeSingle();

    if (fleetError || !fleet) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        code: 'FLEET_NOT_FOUND',
        message: ERROR_MESSAGES.FLEET_NOT_FOUND
      });
    }

    // Get active movement
    const { data: movement } = await supabase
      .from(DB_TABLES.FLEET_MOVEMENTS)
      .select('*')
      .eq(DB_FIELDS.FLEET_MOVEMENTS.FLEET_ID, fleetId)
      .in(DB_FIELDS.TECH_QUEUE.STATUS, ['pending', 'travelling'])
      .maybeSingle();

    // Format fleet composition
    const units = Array.isArray(fleet.units) ? fleet.units : [];
    const composition = units.map((u: any) => {
      const key = String(u?.unitKey || u?.unit_key || '');
      let name = key;
      try {
        name = getUnitSpec(key as any)?.name || key;
      } catch {}
      return { unitKey: key, name, count: Number(u?.count || 0) };
    });

    return res.json({
      success: true,
      data: {
        fleet: {
          _id: String(fleet.id),
          name: String(fleet.name),
          locationCoord: String(fleet.location_coord),
          units: composition,
          sizeCredits: Number(fleet.size_credits || 0),
          isMoving: !!movement
        },
        movement: movement ? {
          _id: String(movement.id),
          status: movement.status,
          originCoord: movement.origin_coord,
          destinationCoord: movement.destination_coord,
          departureTime: movement.departure_time,
          estimatedArrivalTime: movement.estimated_arrival_time,
          actualArrivalTime: movement.actual_arrival_time,
          travelTimeHours: movement.travel_time_hours,
          distance: movement.distance,
          fleetSpeed: movement.fleet_speed
        } : null
      }
    });
  } catch (error) {
    console.error('Error getting fleet status:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: ERROR_MESSAGES.INTERNAL_ERROR,
      message: 'Failed to get fleet status'
    });
  }
}));

/**
 * Recall fleet (cancel movement)
 * PUT /fleets/:id/recall
 * Body: { reason?: string }
 * DTO: { success, data: { movement }, message }
 */
router.put('/:id/recall', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id || req.user!.id;
  const fleetId = String(req.params.id || '').trim();
  if (!fleetId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Invalid fleet id',
      details: { field: DB_FIELDS.BUILDINGS.ID }
    });
  }
  
  // Get empire for current user
  const { data: userRow } = await supabase
    .from(DB_TABLES.USERS)
    .select(DB_FIELDS.BUILDINGS.EMPIRE_ID)
    .eq(DB_FIELDS.BUILDINGS.ID, userId)
    .maybeSingle();

  if (!userRow?.empire_id) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const { reason } = req.body as { reason?: string };

  try {
    const result = await FleetMovementService.recallFleet(
      fleetId,
      userRow.empire_id,
      reason
    );

    if (!result.success) {
      const statusCode = result.code === 'NO_ACTIVE_MOVEMENT' ? HTTP_STATUS.BAD_REQUEST : 409;
      return res.status(statusCode).json({
        success: false,
        code: result.code,
        message: result.error || 'Failed to recall fleet'
      });
    }

    return res.json({
      success: true,
      data: { movement: result.movement },
      message: 'Fleet recalled successfully'
    });
  } catch (error) {
    console.error('Error recalling fleet:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: ERROR_MESSAGES.INTERNAL_ERROR,
      message: 'Failed to recall fleet'
    });
  }
}));

/**
 * Estimate travel time for fleet dispatch
 * POST /fleets/:id/estimate-travel
 * Body: { destinationCoord: string }
 * DTO: { success, data: { travelTimeHours, distance, fleetSpeed } }
 */
router.post('/:id/estimate-travel', asyncHandler(async (req: AuthRequest, res: Response) => {
  const fleetId = String(req.params.id || '').trim();
  if (!fleetId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Invalid fleet id',
      details: { field: DB_FIELDS.BUILDINGS.ID }
    });
  }

  const { destinationCoord } = req.body as { destinationCoord?: string };
  if (!destinationCoord || typeof destinationCoord !== 'string') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'destinationCoord is required',
      details: { field: 'destinationCoord' }
    });
  }

  const userId = req.user!._id || req.user!.id;

  // Get empire for current user
  const { data: userRow } = await supabase
    .from(DB_TABLES.USERS)
    .select(DB_FIELDS.BUILDINGS.EMPIRE_ID)
    .eq(DB_FIELDS.BUILDINGS.ID, userId)
    .maybeSingle();

  if (!userRow?.empire_id) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  try {
    // Get fleet
    const { data: fleet, error: fleetError } = await supabase
      .from(DB_TABLES.FLEETS)
      .select('id, location_coord, units')
      .eq(DB_FIELDS.BUILDINGS.ID, fleetId)
      .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, userRow.empire_id)
      .maybeSingle();

    if (fleetError || !fleet) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        code: 'FLEET_NOT_FOUND',
        message: ERROR_MESSAGES.FLEET_NOT_FOUND
      });
    }

    // Calculate travel time using FleetMovementService methods
    const units = Array.isArray(fleet.units) ? fleet.units : [];
    const distance = FleetMovementService.calculateDistance(fleet.location_coord, destinationCoord);
    const fleetSpeed = FleetMovementService.calculateFleetSpeed(units);
    const travelTimeHours = FleetMovementService.calculateTravelTime(distance, fleetSpeed);

    return res.json({
      success: true,
      data: { travelTimeHours, distance, fleetSpeed }
    });
  } catch (error) {
    console.error('Error estimating travel time:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      code: ERROR_MESSAGES.INTERNAL_ERROR,
      message: 'Failed to estimate travel time'
    });
  }
}));

export default router;






