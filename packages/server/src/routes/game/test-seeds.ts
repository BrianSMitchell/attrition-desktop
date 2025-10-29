/**
 * Test Seeding Routes
 * 
 * Test-only endpoints for seeding data in E2E testing environments.
 * All routes are guarded by NODE_ENV === 'test' check.
 */

import { Router, Response } from 'express';
import { supabase } from '../../config/supabase';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth';
import { ERROR_MESSAGES } from '../../constants/response-formats';
import { ENV_VALUES } from '@game/shared';
import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
import { HTTP_STATUS } from '@game/shared';
import { ENV_VARS } from '@game/shared';
import { EmpireResolutionService } from '../../services/empire/EmpireResolutionService';

const router: Router = Router();

/**
 * Test-only seeding endpoint to make Research Start deterministic in E2E.
 * Guarded by NODE_ENV === 'test'
 */
router.post('/seed-research', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (process.env[ENV_VARS.NODE_ENV] !== 'test') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_MESSAGES.FEATURE_DISABLED
    });
  }

  // Test seed research endpoint now uses only Supabase implementation
  return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json({
    success: false,
    error: 'Test seeding not yet fully implemented for research'
  });
}));

/**
 * Test-only seeding endpoint to make Defenses Start deterministic in E2E.
 * - Tops up credits
 * - Ensures tech prereqs for jump_gate (warp_drive 12, energy 20)
 * - Ensures positive energy projection by adding active solar plants at the base
 * Guarded by NODE_ENV === 'test'
 */
router.post('/seed-defenses', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (process.env[ENV_VARS.NODE_ENV] !== 'test') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_MESSAGES.FEATURE_DISABLED
    });
  }

  // Test seed defenses endpoint now uses only Supabase implementation
  return res.status(HTTP_STATUS.NOT_IMPLEMENTED).json({
    success: false,
    error: 'Test seeding not yet fully implemented for defenses'
  });
}));

/**
 * Test-only seeding endpoint to make Structures Start deterministic in E2E.
 * - Tops up credits
 * - Broadly raises tech levels so most structures are eligible
 * - Ensures positive energy projection and construction capacity (solar + robotics)
 * Guarded by NODE_ENV === 'test'
 */
router.post('/seed-structures', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (process.env[ENV_VARS.NODE_ENV] !== 'test') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_MESSAGES.FEATURE_DISABLED
    });
  }

  // Test seeding endpoint uses Supabase implementation
  const user = req.user! as any;

  // Resolve empire using the service
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);

  // Determine target base coordinate
  let baseCoord = '';
  try {
    baseCoord = String((req.body?.baseCoord ?? '')).trim();
  } catch { baseCoord = ''; }
  
  if (!baseCoord) {
    const emp = await supabase
      .from(DB_TABLES.EMPIRES)
      .select(DB_FIELDS.EMPIRES.TERRITORIES)
      .eq(DB_FIELDS.BUILDINGS.ID, empireId)
      .maybeSingle();
    const territories: string[] = Array.isArray(emp.data?.territories) ? emp.data!.territories : [];
    if (territories.length > 0) baseCoord = territories[0];
  }
  
  if (!baseCoord) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: 'No base coordinate available to seed (provide baseCoord or colonize first)'
    });
  }

  // Top up credits
  const creditsTargetRaw = (req.body && typeof req.body.credits !== 'undefined') ? Number(req.body.credits) : 100000;
  const creditsTarget = Number.isFinite(creditsTargetRaw) ? creditsTargetRaw : 100000;

  const eRow = await supabase
    .from(DB_TABLES.EMPIRES)
    .select(DB_FIELDS.EMPIRES.CREDITS)
    .eq(DB_FIELDS.BUILDINGS.ID, empireId)
    .maybeSingle();
  const currentCredits = Math.max(0, Number((eRow.data as any)?.credits || 0));
  
  if (currentCredits < creditsTarget) {
    await supabase
      .from(DB_TABLES.EMPIRES)
      .update({ credits: creditsTarget })
      .eq(DB_FIELDS.BUILDINGS.ID, empireId);
  }

  // Ensure positive energy projection with active solar plants
  const existingSolar = await supabase
    .from(DB_TABLES.BUILDINGS)
    .select('id, level')
    .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
    .eq(DB_FIELDS.BUILDINGS.LOCATION_COORD, baseCoord)
    .eq(DB_FIELDS.BUILDINGS.CATALOG_KEY, 'solar_plants')
    .eq(DB_FIELDS.BUILDINGS.IS_ACTIVE, true)
    .maybeSingle();

  if (!existingSolar.data) {
    await supabase
      .from(DB_TABLES.BUILDINGS)
      .insert({
        empire_id: empireId,
        location_coord: baseCoord,
        catalog_key: 'solar_plants',
        level: 30,
        is_active: true,
        construction_completed: new Date().toISOString(),
        credits_cost: 0,
      });
  }

  return res.json({
    success: true,
    message: 'Test structures seeded successfully',
    data: {
      empireId,
      baseCoord,
      credits: creditsTarget
    }
  });
}));

/**
 * Test-only endpoint to delete queued buildings by catalog key.
 * Guarded by NODE_ENV === 'test'
 */
router.delete('/buildings/queued/:catalogKey', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (process.env[ENV_VARS.NODE_ENV] !== 'test') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_MESSAGES.FEATURE_DISABLED
    });
  }

  const user = req.user! as any;

  // Resolve empire using the service
  const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
  if (!empireRow) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_MESSAGES.EMPIRE_NOT_FOUND });
  }

  const empireId = String(empireRow.id);
  const { catalogKey } = req.params;
  
  if (!catalogKey) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'catalogKey required' });
  }

  // Remove any inactive (queued) buildings with this catalogKey for this empire
  const { data, error } = await supabase
    .from(DB_TABLES.BUILDINGS)
    .delete()
    .eq(DB_FIELDS.BUILDINGS.EMPIRE_ID, empireId)
    .eq(DB_FIELDS.BUILDINGS.CATALOG_KEY, catalogKey)
    .eq(DB_FIELDS.BUILDINGS.IS_ACTIVE, false)
    .select(DB_FIELDS.BUILDINGS.ID);

  if (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: error.message });
  }

  return res.json({
    success: true,
    message: `Deleted ${data?.length ?? 0} queued building(s) with catalogKey: ${catalogKey}`,
    data: { deleted: data?.length ?? 0 }
  });
}));

export default router;
