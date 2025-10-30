import { AuthRequest } from '../../../middleware/auth';
import { asyncHandler } from '../../../middleware/errorHandler';
import { Router, Response } from 'express';
import { DB_TABLES } from '../../../constants/database-fields';
import { HTTP_STATUS, ERROR_MESSAGES } from '../../../constants/response-formats';

import { DB_FIELDS } from '../../../constants/database-fields';
import { supabase } from '../../../config/supabase';
import { EmpireResolutionService } from '../../../services/empire/EmpireResolutionService';
const router: Router = Router();

/**
 * Get empire territories
 * GET /api/game/territories
 * 
 * Returns the list of territories (bases/colonies) owned by the authenticated user's empire.
 * Prefers colonies table (with names), falls back to empires.territories if no colonies exist.
 */
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
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

  // Prefer colonies (name + coord). If none, fall back to empires.territories and fetch locations.
  const coloniesRes = await supabase
    .from(DB_TABLES.COLONIES)
    .select('location_coord, name')
    .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId);

  let territories: Array<{ coord: string; name?: string }> = [];
  
  if ((coloniesRes.data || []).length > 0) {
    // Use colonies data with names
    territories = (coloniesRes.data as any[]).map((c) => ({ 
      coord: String(c.location_coord), 
      name: c.name || undefined 
    }));
  } else {
    // Fall back to empires.territories
    const emp = await supabase
      .from(DB_TABLES.EMPIRES)
      .select(DB_FIELDS.EMPIRES.TERRITORIES)
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .maybeSingle();
    
    const coords: string[] = Array.isArray(emp.data?.territories) ? emp.data!.territories : [];
    
    if (coords.length > 0) {
      // Verify coordinates exist in locations table
      const locs = await supabase
        .from(DB_TABLES.LOCATIONS)
        .select('coord')
        .in('coord', coords);
      
      territories = (locs.data || []).map((l: any) => ({ 
        coord: String(l.coord) 
      }));
    }
  }

  return res.json({ 
    success: true, 
    data: { territories } 
  });
}));

/**
 * Get detailed territory information
 * GET /api/game/territories/:coord
 * 
 * Returns detailed information about a specific territory including:
 * - Basic location info
 * - Colony name (if named)
 * - Owner verification
 */
router.get('/:coord', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user! as any;
  const { coord } = req.params;

  if (!coord) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      success: false, 
      error: 'Territory coordinate is required' 
    });
  }

  // Resolve empire using the service
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ 
      success: false, 
      error: ERROR_MESSAGES.EMPIRE_NOT_FOUND 
    });
  }

  const empireId = String(empireRow.id);

  // Get location info
  const { data: location } = await supabase
    .from(DB_TABLES.LOCATIONS)
    .select('coord, owner_id, result')
    .eq('coord', coord)
    .maybeSingle();

  if (!location) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ 
      success: false, 
      error: ERROR_MESSAGES.TERRITORY_NOT_FOUND 
    });
  }

  // Verify ownership
  const userId = user.id || user._id;
  if (String(location.owner_id || '') !== String(userId)) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({ 
      success: false, 
      error: 'Access denied - territory not owned by your empire' 
    });
  }

  // Get colony name if it exists
  const { data: colony } = await supabase
    .from(DB_TABLES.COLONIES)
    .select(DB_FIELDS.EMPIRES.NAME)
    .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
    .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, coord)
    .maybeSingle();

  const territoryData = {
    coord: location.coord,
    name: colony?.name || null,
    result: location.result,
    owned: true
  };

  return res.json({ 
    success: true, 
    data: territoryData 
  });
}));

export default router;






