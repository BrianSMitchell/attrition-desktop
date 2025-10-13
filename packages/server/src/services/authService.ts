import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';

// Constants imports for eliminating hardcoded values
import { HTTP_STATUS, RESPONSE_FORMAT } from '../constants/response-formats';

// Helpers re-used from existing middleware
import { generateAccessToken, generateRefreshToken } from '../middleware/auth';

// Service imports for extracted functionality
import { UserManagementService } from './UserManagementService';
import { PlanetClaimingService } from './PlanetClaimingService';
import { EmpireResolutionService } from './EmpireResolutionService';

// Utility: unwrap Supabase results or throw
import { ERROR_MESSAGES } from '../constants/response-formats';

function assertNoError<T>(res: { data: T | null; error: any }): T {
  if (res.error) {
    throw res.error;
  }
  return res.data as T;
}

/**
 * AuthenticationService - Handles authentication concerns only
 * Delegates user management, empire creation, and planet claiming to specialized services
 */

/**
 * Register a new user with complete onboarding flow
 * Now delegates to specialized services to eliminate feature envy
 */
export async function register(req: Request, res: Response) {
  const { email, username, password } = req.body as { email: string; username: string; password: string };

  try {
    // Validate user input using UserManagementService
    const validation = UserManagementService.validateUserInput(email, username, password);
    if (!validation.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: validation.error });
    }

    const { normEmail, normUsername } = validation.data!;

    // Check if user already exists using UserManagementService
    const userExists = await UserManagementService.checkUserExists(normEmail, normUsername);
    if (userExists) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'User with this email or username already exists' });
    }

    // Create user using UserManagementService
    const userRow = await UserManagementService.createUser(normEmail, normUsername, password);
    const userId: string = userRow.id;

    // Find and claim starter planet using PlanetClaimingService
    const starterPlanet = await PlanetClaimingService.findAvailableStarterPlanet();
    if (!starterPlanet) {
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ success: false, error: 'No starter planets available' });
    }

    const claimSuccess = await PlanetClaimingService.claimPlanet(starterPlanet, userId);
    if (!claimSuccess) {
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ success: false, error: 'Failed to claim starter planet, please retry' });
    }

    // Create empire using EmpireResolutionService (reusing existing auto-bootstrap logic)
    const empireRow = await EmpireResolutionService.autoBootstrapEmpire(userId);

    // Generate authentication tokens
    const accessToken = generateAccessToken(userId, req);
    const refreshToken = generateRefreshToken(userId);

    // Return registration response
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: {
        user: {
          id: userId,
          email: normEmail,
          username: normUsername,
          gameProfile: {
            startingCoordinate: starterPlanet,
            empireId: empireRow.id
          }
        },
        token: accessToken,
        refreshToken,
        empire: {
          id: empireRow.id,
          name: empireRow.name,
          homeSystem: empireRow.home_system
        },
      },
      message: 'User registered successfully',
    });
  } catch (err: any) {
    console.error('[authService.register] failed:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Registration failed' });
  }
}

/**
 * Login user with password verification
 * Uses UserManagementService for user operations and EmpireResolutionService for empire lookup
 */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  const lookupEmail = String(email || '').trim().toLowerCase();

  if (!lookupEmail || !password) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'Invalid login' });
  }

  try {
    // Get user using UserManagementService
    const userRow = await UserManagementService.getUserByEmail(lookupEmail);
    if (!userRow) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'Invalid email or password' });
    }

    // Verify password using UserManagementService
    const passwordValid = await UserManagementService.verifyPassword(password, userRow.password_hash);
    if (!passwordValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: 'Invalid email or password' });
    }

    // Update last login using UserManagementService
    await UserManagementService.updateLastLogin(userRow.id);

    // Generate authentication tokens
    const token = generateAccessToken(userRow.id, req);
    const refreshToken = generateRefreshToken(userRow.id);

    // Load empire using EmpireResolutionService (reusing existing logic)
    const empireRow = await EmpireResolutionService.resolveEmpireByUserId(userRow.id);

    res.json({
      success: true,
      data: {
        user: {
          id: userRow.id,
          email: userRow.email,
          username: userRow.username,
          gameProfile: {
            startingCoordinate: userRow.starting_coordinate || null,
            empireId: userRow.empire_id || (empireRow?.id ?? null),
          },
        },
        token,
        refreshToken,
        empire: empireRow
          ? {
              id: empireRow.id,
              name: empireRow.name,
              homeSystem: empireRow.home_system,
              territories: empireRow.territories,
              resources: {
                credits: Math.max(0, Number(empireRow.credits || 0)),
                energy: Math.max(0, Number(empireRow.energy || 0)),
              },
            }
          : null,
      },
    });
  } catch (err: any) {
    console.error('[authService.login] failed:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_MESSAGES.LOGIN_FAILED });
  }
}

