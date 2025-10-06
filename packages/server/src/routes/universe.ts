import express from 'express';
import mongoose from 'mongoose';
import { Location } from '../models/Location';
import { generateUniverse } from '../scripts/generateUniverse';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isValidCoordinate, parseCoord } from '@game/shared';
import { getDatabaseType } from '../config/database';
import { supabase } from '../config/supabase';

// Interface for populated location documents
interface PopulatedLocation {
  _id: mongoose.Types.ObjectId;
  coord: string;
  type: string;
  owner: {
    _id: mongoose.Types.ObjectId;
    username: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

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
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinate format. Expected format: A00:10:22:10'
      });
    }
    
    if (getDatabaseType() === 'supabase') {
      const { data: row } = await supabase
        .from('locations')
        .select('*')
        .eq('coord', coord)
        .maybeSingle();

      if (!row) {
        return res.status(404).json({ success: false, error: 'Location not found' });
      }

      // Optionally load owner username
      let ownerInfo: any = null;
      if ((row as any).owner_id) {
        const u = await supabase
          .from('users')
          .select('id, username')
          .eq('id', (row as any).owner_id)
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
    }

    // Find location in database
    const location = await Location.findOne({ coord }).populate('owner', 'username') as PopulatedLocation | null;
    
    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }
    
    // Parse coordinate for additional context
    const coordComponents = parseCoord(coord);
    
    // Format response (now includes overhaul fields non-breakingly)
    const response = {
      success: true,
      data: {
        coord: location.coord,
        type: location.type,
        owner: location.owner ? {
          id: location.owner._id,
          username: location.owner.username
        } : null,
        // Overhaul fields (optional)
        orbitPosition: (location as any).orbitPosition ?? null,
        terrain: (location as any).terrain ?? null,
        positionBase: (location as any).positionBase ?? null,
        starApplied: (location as any).starApplied ?? null,
        result: (location as any).result ?? null,
        starOverhaul: (location as any).starOverhaul ?? null,
        context: {
          server: coordComponents.server,
          galaxy: coordComponents.galaxy,
          region: coordComponents.region,
          system: coordComponents.system,
          body: coordComponents.body
        },
        createdAt: location.createdAt
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
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
      return res.status(400).json({
        success: false,
        error: 'Invalid system coordinates'
      });
    }
    
    // Build coordinate pattern for this system
    const coordPattern = `^${server}${galaxy.padStart(2, '0')}:${region.padStart(2, '0')}:${system.padStart(2, '0')}:`;
    
    if (getDatabaseType() === 'supabase') {
      const prefix = `${server}${galaxy.padStart(2,'0')}:${region.padStart(2,'0')}:${system.padStart(2,'0')}:`;
      const { data: rows } = await supabase
        .from('locations')
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
      return res.json(response);
    }

    // Find all bodies in this system
    const bodies = await Location.find({
      coord: { $regex: coordPattern }
    }).populate('owner', 'username').sort({ coord: 1 }) as PopulatedLocation[];
    
    const response = {
      success: true,
      data: {
        system: {
          server,
          galaxy: galaxyNum,
          region: regionNum,
          system: systemNum
        },
        bodies: bodies.map(body => ({
          coord: body.coord,
          type: body.type,
          owner: body.owner ? {
            id: body.owner._id,
            username: body.owner.username
          } : null,
          // Overhaul fields (optional)
          orbitPosition: (body as any).orbitPosition ?? null,
          terrain: (body as any).terrain ?? null,
          positionBase: (body as any).positionBase ?? null,
          starApplied: (body as any).starApplied ?? null,
          result: (body as any).result ?? null,
          starOverhaul: (body as any).starOverhaul ?? null
        }))
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching system:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
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
    
    if (getDatabaseType() === 'supabase') {
      const { data: rows } = await supabase
        .from('locations')
        .select('coord, type, created_at')
        .eq('owner_id', userId)
        .order('coord');
      return res.json({
        success: true,
        data: { userId, locations: (rows || []).map((r: any) => ({ coord: r.coord, type: r.type, createdAt: r.created_at })) },
      });
    }

    // Find all locations owned by this user
    const locations = await Location.find({ owner: userId }).sort({ coord: 1 });
    
    const response = {
      success: true,
      data: {
        userId,
        locations: locations.map(location => ({
          coord: location.coord,
          type: location.type,
          createdAt: location.createdAt
        }))
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching user locations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
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
      return res.status(403).json({
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
    res.status(500).json({
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
    const [
      totalLocations,
      totalPlanets,
      totalAsteroids,
      ownedLocations,
      unownedLocations
    ] = await Promise.all([
      Location.countDocuments(),
      Location.countDocuments({ type: 'planet' }),
      Location.countDocuments({ type: 'asteroid' }),
      Location.countDocuments({ owner: { $ne: null } }),
      Location.countDocuments({ owner: null })
    ]);
    
    const response = {
      success: true,
      data: {
        totalLocations,
        totalPlanets,
        totalAsteroids,
        ownedLocations,
        unownedLocations,
        ownershipPercentage: totalLocations > 0 ? Math.round((ownedLocations / totalLocations) * 100) : 0
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching universe stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
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
      return res.status(400).json({
        success: false,
        error: 'Invalid region coordinates'
      });
    }

    // Stars define the existence of a system: body 0 for each system
    const starPattern = `^${server}${galaxy.padStart(2, '0')}:${region.padStart(2, '0')}:\\d{2}:00$`;

    const stars = await Location.find({
      type: 'star',
      coord: { $regex: starPattern }
    })
      .sort({ coord: 1 })
      .lean();

    // Prepare response items
    const systems = await Promise.all(
      stars.map(async (star) => {
        const c = parseCoord(star.coord);
        // Check if any body in this system is owned
        const systemPrefix = `^${c.server}${c.galaxy.toString().padStart(2, '0')}:${c.region
          .toString()
          .padStart(2, '0')}:${c.system.toString().padStart(2, '0')}:`;
        const ownedCount = await Location.countDocuments({
          coord: { $regex: systemPrefix },
          owner: { $ne: null }
        });

        const kind = (star as any)?.starOverhaul?.kind as string | undefined;
        return {
          system: c.system,
          coord: star.coord,
          star: kind
            ? {
                // Keep response shape compatible (spectralClass optional),
                spectralClass: undefined as any,
                color: colorForStarKind(kind),
              }
            : null,
          hasOwned: ownedCount > 0
        };
      })
    );

    res.json({
      success: true,
      data: {
        region: { server, galaxy: galaxyNum, region: regionNum },
        systems
      }
    });
  } catch (error) {
    console.error('Error fetching region systems:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
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
      return res.status(400).json({
        success: false,
        error: 'Invalid galaxy coordinates'
      });
    }

    // Find all stars (body 0) in this galaxy across all regions/systems
    const galaxyStr = galaxy.padStart(2, '0');
    const starPattern = new RegExp(`^${server}${galaxyStr}:\\d{2}:\\d{2}:00$`);

    const stars = await Location.find({
      type: 'star',
      coord: { $regex: starPattern }
    })
      .select('coord')
      .lean();

    // Group systems by region
    const buckets: Record<number, number[]> = {};
    for (const star of stars) {
      try {
        const c = parseCoord(star.coord);
        if (!buckets[c.region]) buckets[c.region] = [];
        buckets[c.region].push(c.system);
      } catch {
        // ignore malformed coords defensively
      }
    }

    const regions = Object.keys(buckets)
      .map((r) => ({
        region: parseInt(r, 10),
        systemsWithStars: buckets[parseInt(r, 10)]
      }))
      .sort((a, b) => a.region - b.region);

    return res.json({
      success: true,
      data: {
        server,
        galaxy: galaxyNum,
        regions
      }
    });
  } catch (error) {
    console.error('Error fetching galaxy region summaries:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
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
      return res.status(400).json({
        success: false,
        error: 'Invalid galaxy coordinates'
      });
    }

    const galaxyStr = galaxy.padStart(2, '0');
    const starPattern = new RegExp(`^${server}${galaxyStr}:\\d{2}:\\d{2}:00$`);

    // Find all stars (body 0) in this galaxy and project coord + color only
    const stars = await Location.find({
      type: 'star',
      coord: { $regex: starPattern }
    })
      .select('coord starOverhaul.kind')
      .lean();

    // Group by region → [{ system, color }]
    const buckets = new Map<number, Array<{ system: number; color: string }>>();

    for (const s of stars) {
      try {
        const c = parseCoord(s.coord);
        const kind = (s as any)?.starOverhaul?.kind as string | undefined;
        const color = colorForStarKind(kind);
        if (!buckets.has(c.region)) buckets.set(c.region, []);
        buckets.get(c.region)!.push({ system: c.system, color });
      } catch {
        // ignore malformed coords defensively
      }
    }

    const regions = Array.from(buckets.entries())
      .map(([region, systems]) => ({
        region,
        systems: systems.sort((a, b) => a.system - b.system)
      }))
      .sort((a, b) => a.region - b.region);

    return res.json({
      success: true,
      data: {
        server,
        galaxy: galaxyNum,
        regions
      }
    });
  } catch (error) {
    console.error('Error fetching galaxy region star colors:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
