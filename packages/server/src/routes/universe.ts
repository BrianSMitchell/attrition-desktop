import express from 'express';
import { generateUniverse } from '../scripts/generateUniverse';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isValidCoordinate, parseCoord } from '@game/shared';
import { ERROR_MESSAGES } from '../constants/response-formats';

// Constants imports for eliminating hardcoded values
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';


import { HTTP_STATUS } from '@game/shared';
import { supabase } from '../config/supabase';
const router: express.Router = express.Router();

// Map Overhaul star kinds to display colors (used for galaxy/region coloring)
function colorForStarKind(kind?: string): string {
  switch (kind) {
    case 'YELLOW': return '#FFF4EA';
    case 'ORANGE': return '#FFD2A1';
    case 'WHITE': return '#F8F7FF';
    case 'BLUE': return '#AABFFF';
    case 'RED_GIANT': return '#FF6B6B';
    case 'SUPER_GIANT': return '#FAD860';
    case 'WHITE_DWARF': return '#CAD7FF';
    case 'NEUTRON': return '#9BB0FF';
    default: return '#FFFFFF';
  }
}

/**
 * GET /api/universe/:coord
 * Fetch details for a specific coordinate
 */
router.get('/coord/:coord', authenticate, async (req: AuthRequest, res) => {
  try {
    const { coord } = req.params;

    // Validate coordinate format
    if (!isValidCoordinate(coord)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid coordinate format. Expected format: A00:10:22:10'
      });
    }

    const { data: row } = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select('*')
      .eq('coord', coord)
      .maybeSingle();

    if (!row) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.LOCATION_NOT_FOUND });
    }

    // Optionally load owner username
    let ownerInfo: any = null;
    if ((row as any).owner_id) {
      const u = await supabase
        .from(DB_TABLES.USERS)
        .select('id, username')
        .eq(DB_FIELDS.BUILDINGS.ID, (row as any).owner_id)
        .maybeSingle();
      if (u.data) ownerInfo = { id: u.data.id, username: u.data.username };
    }

    const coordComponents = parseCoord(coord);
    return res.json({
      success: true,
      data: {
        coord: row.coord,
        type: row.type,
        owner: ownerInfo,
        orbitPosition: (row as any).orbit_position ?? null,
        terrain: (row as any).terrain ?? null,
        positionBase: (row as any).position_base ?? null,
        starApplied: (row as any).star_applied ?? null,
        result: (row as any).result ?? null,
        starOverhaul: (row as any).star_overhaul ?? null,
        context: {
          server: coordComponents.server,
          galaxy: coordComponents.galaxy,
          region: coordComponents.region,
          system: coordComponents.system,
          body: coordComponents.body,
        },
        createdAt: (row as any).created_at ?? null,
      },
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
});

/**
 * GET /api/universe/system/:server/:galaxy/:region/:system
 * Fetch all bodies in a star system
 */
router.get('/system/:server/:galaxy/:region/:system', authenticate, async (req: AuthRequest, res) => {
  try {
    const { server, galaxy, region, system } = req.params;

    // Validate parameters
    const galaxyNum = parseInt(galaxy, 10);
    const regionNum = parseInt(region, 10);
    const systemNum = parseInt(system, 10);

    if (
      isNaN(galaxyNum) || galaxyNum < 0 || galaxyNum > 39 ||
      isNaN(regionNum) || regionNum < 0 || regionNum > 99 ||
      isNaN(systemNum) || systemNum < 0 || systemNum > 99
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid system coordinates'
      });
    }

    // Build coordinate pattern for this system
    const prefix = `${server}${galaxy.padStart(2,'0')}:${region.padStart(2,'0')}:${system.padStart(2,'0')}:`;
    const { data: rows } = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select('*')
      .like('coord', `${prefix}%`)
      .order('coord', { ascending: true });

    const response = {
      success: true,
      data: {
        system: { server, galaxy: galaxyNum, region: regionNum, system: systemNum },
        bodies: (rows || []).map((body: any) => ({
          coord: body.coord,
          type: body.type,
          owner: body.owner_id ? { id: body.owner_id, username: null } : null,
          orbitPosition: body.orbit_position ?? null,
          terrain: body.terrain ?? null,
          positionBase: body.position_base ?? null,
          starApplied: body.star_applied ?? null,
          result: body.result ?? null,
          starOverhaul: body.star_overhaul ?? null,
        })),
      },
    };
    res.json(response);

  } catch (error) {
    console.error('Error fetching system:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
});

/**
 * GET /api/universe/user/:userId/locations
 * Fetch all locations owned by a user
 */
router.get('/user/:userId/locations', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const { data: rows } = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select('coord, type, created_at')
      .eq(DB_FIELDS.LOCATIONS.OWNER_ID, userId)
      .order('coord');

    res.json({
      success: true,
      data: { userId, locations: (rows || []).map((r: any) => ({ coord: r.coord, type: r.type, createdAt: r.created_at })) },
    });

  } catch (error) {
    console.error('Error fetching user locations:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
});

/**
 * POST /api/universe/generate
 * Admin-only endpoint to generate the universe
 */
router.post('/generate', authenticate, async (req: AuthRequest, res) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Access denied. Admin privileges required.'
      });
    }

    console.log('Universe generation requested by admin:', req.user!.username);

    // Generate universe
    const stats = await generateUniverse();

    const response = {
      success: true,
      message: 'Universe generation completed',
      data: stats
    };

    res.json(response);

  } catch (error: unknown) {
    console.error('Error generating universe:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to generate universe',
      details: errorMessage
    });
  }
});

/**
 * GET /api/universe/stats
 * Get universe statistics
 */
router.get('/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const [all, planets, asteroids, owned, unowned] = await Promise.all([
      supabase.from(DB_TABLES.LOCATIONS).select(DB_FIELDS.BUILDINGS.ID, { count: 'exact', head: true }),
      supabase.from(DB_TABLES.LOCATIONS).select(DB_FIELDS.BUILDINGS.ID, { count: 'exact', head: true }).eq(DB_FIELDS.CREDIT_TRANSACTIONS.TYPE, 'planet'),
      supabase.from(DB_TABLES.LOCATIONS).select(DB_FIELDS.BUILDINGS.ID, { count: 'exact', head: true }).eq(DB_FIELDS.CREDIT_TRANSACTIONS.TYPE, 'asteroid'),
      supabase.from(DB_TABLES.LOCATIONS).select(DB_FIELDS.BUILDINGS.ID, { count: 'exact', head: true }).not(DB_FIELDS.LOCATIONS.OWNER_ID, 'is', null),
      supabase.from(DB_TABLES.LOCATIONS).select(DB_FIELDS.BUILDINGS.ID, { count: 'exact', head: true }).is(DB_FIELDS.LOCATIONS.OWNER_ID, null),
    ]);

    const totalLocations = all.count || 0;
    const totalPlanets = planets.count || 0;
    const totalAsteroids = asteroids.count || 0;
    const ownedLocations = owned.count || 0;
    const unownedLocations = unowned.count || 0;

    res.json({
      success: true,
      data: {
        totalLocations,
        totalPlanets,
        totalAsteroids,
        ownedLocations,
        unownedLocations,
        ownershipPercentage: totalLocations > 0 ? Math.round((ownedLocations / totalLocations) * 100) : 0,
      },
    });

  } catch (error) {
    console.error('Error fetching universe stats:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
});

/**
 * GET /api/universe/region/:server/:galaxy/:region
 * Fetch all real systems (stars at body 0) within a region
 */
router.get('/region/:server/:galaxy/:region', authenticate, async (req: AuthRequest, res) => {
  try {
    const { server, galaxy, region } = req.params;

    // Validate parameters
    const galaxyNum = parseInt(galaxy, 10);
    const regionNum = parseInt(region, 10);

    if (
      typeof server !== 'string' || server.length !== 1 ||
      isNaN(galaxyNum) || galaxyNum < 0 || galaxyNum > 39 ||
      isNaN(regionNum) || regionNum < 0 || regionNum > 99
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid region coordinates'
      });
    }

    const gg = galaxy.padStart(2, '0');
    const rr = region.padStart(2, '0');
    // stars at body 00
    const starLike = `${server}${gg}:${rr}:%:00`;
    const { data: stars } = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select('coord, star_overhaul')
      .eq(DB_FIELDS.CREDIT_TRANSACTIONS.TYPE, 'star')
      .like('coord', starLike)
      .order('coord', { ascending: true });

    // Fetch all owned coords in region once
    const ownedLike = `${server}${gg}:${rr}:%`;
    const { data: ownedRows } = await supabase
      .from(DB_TABLES.LOCATIONS)
      .select('coord')
      .not(DB_FIELDS.LOCATIONS.OWNER_ID, 'is', null)
      .like('coord', ownedLike);

    const ownedBySystem = new Set<string>();
    for (const row of ownedRows || []) {
      try {
        const c = parseCoord((row as any).coord);
        ownedBySystem.add(`${c.system}`.padStart(2, '0'));
      } catch {}
    }

    const systems = (stars || []).map((star: any) => {
      const c = parseCoord(star.coord);
      const sysKey = `${c.system}`.padStart(2, '0');
      const kind = (star as any)?.star_overhaul?.kind as string | undefined;
      return {
        system: c.system,
        coord: star.coord,
        star: kind ? { spectralClass: undefined as any, color: colorForStarKind(kind) } : null,
        hasOwned: ownedBySystem.has(sysKey),
      };
    });

    res.json({
      success: true,
      data: {
        region: { server, galaxy: galaxyNum, region: regionNum },
        systems
      }
    });
  } catch (error) {
    console.error('Error fetching region systems:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
});

/**
 * GET /api/universe/galaxy/:server/:galaxy/regions
 * Batch endpoint: returns systemsWithStars grouped by region for an entire galaxy.
 * This lets the client render all region stars immediately with a single request.
 */
router.get('/galaxy/:server/:galaxy/regions', authenticate, async (req: AuthRequest, res) => {
  try {
    const { server, galaxy } = req.params;

    // Validate parameters
    const galaxyNum = parseInt(galaxy, 10);
    if (
      typeof server !== 'string' || server.length !== 1 ||
      isNaN(galaxyNum) || galaxyNum < 0 || galaxyNum > 39
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid galaxy coordinates'
      });
    }

    const galaxyStr = galaxy.padStart(2, '0');
    const like = `${server}${galaxyStr}:%:%:00`;
    
    // Fetch ALL stars using pagination (Supabase default limit is 1000)
    let allStars: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data: stars, error } = await supabase
        .from(DB_TABLES.LOCATIONS)
        .select('coord')
        .eq(DB_FIELDS.CREDIT_TRANSACTIONS.TYPE, 'star')
        .like('coord', like)
        .range(from, from + pageSize - 1);
      
      if (error) {
        throw error;
      }
      
      if (stars && stars.length > 0) {
        allStars = allStars.concat(stars);
        from += pageSize;
        hasMore = stars.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    // Initialize all 100 regions (0-99) - even empty ones should be displayed
    const buckets: Record<number, number[]> = {};
    for (let i = 0; i < 100; i++) {
      buckets[i] = [];
    }
    
    // Fill in the stars for regions that have them
    for (const s of allStars || []) {
      try {
        const c = parseCoord((s as any).coord);
        if (c.region >= 0 && c.region < 100) {
          buckets[c.region].push(c.system);
        }
      } catch {}
    }

    // Return all 100 regions, sorted by region number
    const regions = Array.from({ length: 100 }, (_, i) => ({
      region: i,
      systemsWithStars: buckets[i]
    }));

    res.json({ success: true, data: { server, galaxy: galaxyNum, regions } });
  } catch (error) {
    console.error('Error fetching galaxy region summaries:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
});

/**
 * GET /api/universe/galaxy/:server/:galaxy/region-stars
 * Returns per-region array of { system, color } for all star systems in a galaxy
 */
router.get('/galaxy/:server/:galaxy/region-stars', authenticate, async (req: AuthRequest, res) => {
  try {
    const { server, galaxy } = req.params;
    const galaxyNum = parseInt(galaxy, 10);

    if (
      typeof server !== 'string' || server.length !== 1 ||
      isNaN(galaxyNum) || galaxyNum < 0 || galaxyNum > 39
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Invalid galaxy coordinates'
      });
    }

    const galaxyStr = galaxy.padStart(2, '0');
    const like = `${server}${galaxyStr}:%:%:00`;
    
    // Fetch ALL stars using pagination (Supabase default limit is 1000)
    let allStars: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data: stars, error } = await supabase
        .from(DB_TABLES.LOCATIONS)
        .select('coord, star_overhaul')
        .eq(DB_FIELDS.CREDIT_TRANSACTIONS.TYPE, 'star')
        .like('coord', like)
        .range(from, from + pageSize - 1);
      
      if (error) {
        throw error;
      }
      
      if (stars && stars.length > 0) {
        allStars = allStars.concat(stars);
        from += pageSize;
        hasMore = stars.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    // Initialize all 100 regions (0-99)
    const buckets = new Map<number, Array<{ system: number; color: string }>>();
    for (let i = 0; i < 100; i++) {
      buckets.set(i, []);
    }
    
    // Fill in star data for regions that have stars
    for (const s of allStars || []) {
      try {
        const c = parseCoord((s as any).coord);
        const kind = (s as any)?.star_overhaul?.kind as string | undefined;
        const color = colorForStarKind(kind);
        if (c.region >= 0 && c.region < 100) {
          buckets.get(c.region)!.push({ system: c.system, color });
        }
      } catch {}
    }

    // Return all 100 regions with their stars (empty arrays for regions with no stars)
    const regions = Array.from({ length: 100 }, (_, i) => ({
      region: i,
      systems: buckets.get(i)!.sort((a, b) => a.system - b.system)
    }));

    res.json({ success: true, data: { server, galaxy: galaxyNum, regions } });
  } catch (error) {
    console.error('Error fetching galaxy region star colors:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
});

export default router;


