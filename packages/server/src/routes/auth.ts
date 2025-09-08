import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { validateLogin, validateRegister } from '@game/shared';
import { User } from '../models/User';
import { Empire } from '../models/Empire';
import { Location } from '../models/Location';
import { Colony } from '../models/Colony';
import { Building } from '../models/Building';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, generateAccessToken, generateRefreshToken, AuthRequest, revokeToken, verifyTokenWithSecrets } from '../middleware/auth';
import { 
  authRateLimit, 
  loginRateLimit, 
  registerRateLimit, 
  refreshRateLimit,
  accountLockout,
  trackFailedLogin,
  clearFailedAttempts
} from '../middleware/rateLimiting';
import { securityMonitor, SecurityEventType } from '../utils/securityMonitor';
import { sessionInvalidationService } from '../middleware/sessionInvalidation';

const router: Router = Router();

// Security event logging
const logSecurityEvent = (event: string, details: any) => {
  console.log(`[SECURITY] ${event}:`, details);
};

// Register new user
router.post('/register', registerRateLimit, asyncHandler(async (req: Request, res: Response) => {
  // Validate input
  const validation = validateRegister(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: validation.error.errors
    });
  }

  const { email, username, password } = validation.data;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'User with this email or username already exists'
    });
  }

  // We will assign startingCoordinate during an atomic transaction after user is created
  let startingCoordinate: string | undefined;

  // Create user
  const user = new User({
    email,
    username,
    passwordHash: password, // Will be hashed by pre-save middleware
    gameProfile: {
      credits: 100,
      experience: 0,
      startingCoordinate
    }
  });


  // Atomically assign a random unowned planet and create Empire + Colony
  let createdEmpire: any = null;
  try {
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      // Persist user inside the transaction so a failure rolls back everything
      await user.save({ session });
      // Pick an unowned planet (simple deterministic selection for reliability)
      const candidate = await Location.findOne({ owner: null, type: 'planet' })
        .session(session)
        .select('coord');

      if (!candidate) {
        throw new Error('No unowned starter planets available');
      }

      const coord = candidate.coord;

      // Claim the planet (guard against race conditions)
      const claimed = await Location.findOneAndUpdate(
        { coord, owner: null },
        { owner: user._id },
        { new: true, session }
      );

      if (!claimed) {
        throw new Error('Failed to claim starter planet');
      }

      startingCoordinate = coord;

      // Create player state (Empire) without asking for a name
      const empire = new Empire({
        userId: user._id,
        name: user.username, // Temporary: use username; UI will not prompt for name
        homeSystem: startingCoordinate,
        territories: [startingCoordinate],
        resources: { credits: 100, energy: 0 }
      });

      await empire.save({ session });

      // Create the starter colony
      const colony = new Colony({
        empireId: empire._id,
        locationCoord: startingCoordinate,
        name: 'Home Base'
      });

  await colony.save({ session });

  // Seed starter structure: Level 1 Urban Structures (active immediately)
  const starterBuilding = new Building({
    locationCoord: startingCoordinate,
    empireId: empire._id,
    type: 'habitat',               // maps to 'urban_structures'
    displayName: 'Urban Structures',
    catalogKey: 'urban_structures',
    level: 1,
    constructionStarted: new Date(),
    constructionCompleted: new Date(), // count towards economy immediately
    isActive: true,
    creditsCost: 0                 // free starter structure
  });
  await starterBuilding.save({ session });

  // Update user's profile with assigned coordinate and empireId
  user.gameProfile.startingCoordinate = startingCoordinate;
  user.gameProfile.empireId = (empire._id as mongoose.Types.ObjectId).toString();
  await user.save({ session });

  createdEmpire = empire;
    });
    await session.endSession();
  } catch (error) {
    console.error('Registration setup failed:', error);
    return res.status(503).json({
      success: false,
      error: 'No starter planets available or failed to initialize player. Please try again later.'
    });
  }

  // Generate tokens (with device fingerprinting)
  const accessToken = generateAccessToken((user._id as mongoose.Types.ObjectId).toString(), req);
  const refreshToken = generateRefreshToken((user._id as mongoose.Types.ObjectId).toString());

  // Track successful registration and create session
  const userId = (user._id as mongoose.Types.ObjectId).toString();
  const accessTokenDecoded = jwt.decode(accessToken) as { jti?: string };
  const clientIP = req.ip || 'unknown';
  
  // Track successful registration in session invalidation service
  await sessionInvalidationService.trackLoginAttempt(userId, clientIP, true);
  
  securityMonitor.recordEvent({
    type: SecurityEventType.LOGIN_SUCCESS,
    userId,
    ip: clientIP,
    userAgent: req.get('User-Agent') || 'unknown',
    details: {
      action: 'registration',
      email: user.email,
      username: user.username
    }
  });
  
  // Create security session
  securityMonitor.createSession(userId, req, accessTokenDecoded?.jti);

  // Return user data (password excluded by toJSON method)
  res.status(201).json({
    success: true,
    data: {
      user,
      token: accessToken,
      refreshToken,
      empire: createdEmpire
    },
    message: 'User registered successfully'
  });
}));

// Login user
router.post('/login', loginRateLimit, accountLockout, asyncHandler(async (req: Request, res: Response) => {
  // Validate input
  const validation = validateLogin(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: validation.error.errors
    });
  }

  const { email, password } = validation.data;

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+passwordHash');
  
  const clientIP = req.ip || 'unknown';
  
  if (!user || !(await user.comparePassword(password))) {
    // Track failed login attempt
    trackFailedLogin(req);
    
    // Track failed login attempt with session invalidation service
    if (user) {
      const userId = (user._id as mongoose.Types.ObjectId).toString();
      await sessionInvalidationService.trackLoginAttempt(userId, clientIP, false);
    }
    
    // Track failed login attempt with security monitor
    securityMonitor.recordEvent({
      type: SecurityEventType.LOGIN_FAILED,
      ip: clientIP,
      userAgent: req.get('User-Agent') || 'unknown',
      details: {
        email,
        timestamp: new Date().toISOString()
      }
    });
    
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password'
    });
  }

  // Clear any failed login attempts for this IP
  clearFailedAttempts(req);
  
  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens (with device fingerprinting)
  const accessToken = generateAccessToken((user._id as mongoose.Types.ObjectId).toString(), req);
  const refreshToken = generateRefreshToken((user._id as mongoose.Types.ObjectId).toString());

  // Track successful login and create session
  const userId = (user._id as mongoose.Types.ObjectId).toString();
  const accessTokenDecoded = jwt.decode(accessToken) as { jti?: string };
  
  // Track successful login in session invalidation service
  await sessionInvalidationService.trackLoginAttempt(userId, clientIP, true);
  
  securityMonitor.recordEvent({
    type: SecurityEventType.LOGIN_SUCCESS,
    userId,
    ip: clientIP,
    userAgent: req.get('User-Agent') || 'unknown',
    details: {
      email: user.email,
      timestamp: new Date().toISOString()
    }
  });
  
  // Create security session
  securityMonitor.createSession(userId, req, accessTokenDecoded?.jti);

  // Get user's empire if exists
  const empire = await Empire.findOne({ userId: user._id });

  // Return user data (password excluded by toJSON method)
  res.json({
    success: true,
    data: {
      user: user.toJSON(),
      token: accessToken,
      refreshToken,
      empire
    },
    message: 'Login successful'
  });
}));

// Refresh tokens
router.post('/refresh', refreshRateLimit, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'refreshToken is required'
      });
    }

    // Verify refresh token and extract userId using enhanced verification
    const decoded = (await (async () => {
      try {
        return verifyTokenWithSecrets(refreshToken) as { userId: string; type?: string; jti?: string };
      } catch {
        return null;
      }
    })());

    if (!decoded || decoded.type !== 'refresh' || !decoded.userId) {
      securityMonitor.recordEvent({
        type: SecurityEventType.LOGIN_FAILED,
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        details: {
          error: 'Invalid refresh token',
          action: 'token_refresh'
        }
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Revoke old refresh token if it has jti
    if (decoded.jti) {
      revokeToken(decoded.jti);
    }
    
    // Issue new tokens (with device fingerprinting)
    const token = generateAccessToken(decoded.userId, req);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    // Track successful token refresh
    const newAccessTokenDecoded = jwt.decode(token) as { jti?: string };
    
    securityMonitor.recordEvent({
      type: SecurityEventType.TOKEN_REFRESH,
      userId: decoded.userId,
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      details: {
        oldTokenJti: decoded.jti,
        newTokenJti: newAccessTokenDecoded?.jti
      }
    });
    
    // Update security session if exists
    if (newAccessTokenDecoded?.jti) {
      securityMonitor.createSession(decoded.userId, req, newAccessTokenDecoded.jti);
    }

    const empire = await Empire.findOne({ userId: user._id });

    res.json({
      success: true,
      data: {
        token,
        refreshToken: newRefreshToken,
        user: user.toJSON(),
        empire
      },
      message: 'Token refreshed'
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
}));

// Get current user profile
router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const empire = await Empire.findOne({ userId: req.user!._id });
  
  res.json({
    success: true,
    data: {
      user: req.user,
      empire
    }
  });
}));

// Token revocation endpoint
router.post('/revoke', authRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Token is required'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { jti?: string; userId?: string };
    
    if (decoded.jti) {
      revokeToken(decoded.jti);
      
      logSecurityEvent('TOKEN_REVOKED', {
        jti: decoded.jti,
        userId: decoded.userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({
        success: true,
        message: 'Token revoked successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Token does not support revocation'
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid token'
    });
  }
}));

// Logout (client-side token removal, but we can track it)
router.post('/logout', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  // Extract token from Authorization header to revoke it
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { jti?: string };
      if (decoded.jti) {
        revokeToken(decoded.jti);
      }
    } catch (error) {
      // Token might already be invalid, ignore
    }
  }
  
  logSecurityEvent('USER_LOGOUT', {
    userId: req.user ? (req.user._id as mongoose.Types.ObjectId).toString() : 'unknown',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

export default router;
