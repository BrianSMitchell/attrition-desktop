import { Router } from 'express';

// Import all route modules
import empireRoutes from './empireRoutes';
import technologyRoutes from './technologyRoutes';
import buildingRoutes from './buildingRoutes';
import fleetRoutes from './fleetRoutes';
import territoryRoutes from './territoryRoutes';
import unitRoutes from './unitRoutes';

// Create the main router
const router: Router = Router();

// Mount all route modules with their respective prefixes
// Mount all route modules under their base paths
router.use('/dashboard', empireRoutes);            // Empire dashboard & economy (for /api/game/dashboard)
router.use('/empire', empireRoutes);               // Also mount under /empire for new structure
// Mount tech routes under legacy paths for backward compatibility
router.use('/game/tech', technologyRoutes);     // Legacy /api/game/tech path
router.use('/buildings', buildingRoutes);          // Building & structure management
router.use('/defenses', buildingRoutes);           // Defense structures catalog
router.use('/structures', buildingRoutes);         // Structures catalog
router.use('/fleets', fleetRoutes);                // Fleet management & movement
router.use('/fleet', fleetRoutes);                 // Also mount under /fleet for consistency
router.use('/territories', territoryRoutes);       // Territory & base management (old)
router.use('/territory', territoryRoutes);         // Territory & base management (new)
router.use('/bases', territoryRoutes);             // Alias for territory management
router.use('/', territoryRoutes);                  // Root-mount for legacy paths like /bases/summary
router.use('/units', unitRoutes);                  // Unit & defense management
router.use('/game/units', unitRoutes);             // Unit status, queue, etc.

export default router;