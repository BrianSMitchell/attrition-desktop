import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validateLogin, validateRegister } from '@game/shared';
import { supabase } from '../config/supabase';
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
import { getDatabaseType } from '../config/database';

const router: Router = Router();
import { registerSupabase, loginSupabase } from '../services/authSupabase';

// Security event logging
const logSecurityEvent = (event: string, details: any) => {
  console.log(`[SECURITY] ${event}:`, details);
};

// Register new user
router.post('/register', registerRateLimit, asyncHandler(async (req: Request, res: Response) => {
  return registerSupabase(req, res);
}));

// Login user
router.post('/login', loginRateLimit, accountLockout, asyncHandler(async (req: Request, res: Response) => {
  return loginSupabase(req, res);
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

    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
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

    // Get user's empire if exists
    const { data: empire } = await supabase
      .from('empires')
      .select('*')
      .eq('user_id', user.id)
      .single();

    res.json({
      success: true,
      data: {
        token,
        refreshToken: newRefreshToken,
        user,
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

// Temporary trace logging for /auth/me
router.use('/me', (req: Request, res: Response, next) => {
  const start = Date.now();
  res.on('finish', () => {
    try {
      console.log('[TRACE] /api/auth/me', {
        method: req.method,
        status: res.statusCode,
        ua: req.get('User-Agent') || 'unknown',
        ip: req.ip,
        xff: req.get('X-Forwarded-For') || undefined,
        proto: req.get('X-Forwarded-Proto') || (req.secure ? 'https' : 'http'),
        hasAuthHeader: !!req.headers.authorization,
        durationMs: Date.now() - start,
      });
    } catch {}
  });
  next();
});

// Get current user profile
router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  let empire: any = null;

  const userId = (req.user as any)?._id || (req.user as any)?.id;
  if (userId) {
    const { data, error } = await supabase
      .from('empires')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (!error && data) {
      empire = data;
    }
  }

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
    userId: req.user ? (req.user as any).id || 'unknown' : 'unknown',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// TEMPORARY: Admin setup endpoint to create admin user on server
router.post('/setup-admin', asyncHandler(async (req: Request, res: Response) => {
  const { setupKey } = req.body;

  // Simple setup key to prevent unauthorized admin creation
  if (setupKey !== 'setup-admin-2025') {
    return res.status(401).json({ success: false, error: 'Invalid setup key' });
  }

  try {
    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@attrition.com')
      .single();

    if (existingAdmin) {
      return res.json({ success: true, message: 'Admin user already exists', existing: true });
    }

    // Create admin user
    const { data: adminUser, error } = await supabase
      .from('users')
      .insert({
        email: 'admin@attrition.com',
        username: 'AdminCommander',
        password_hash: 'AdminPassword123!', // Note: In production, this should be properly hashed
        role: 'admin',
        game_profile: {
          credits: 100,
          experience: 0
        }
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Admin user created successfully on server',
      admin: {
        email: adminUser.email,
        username: adminUser.username,
        role: adminUser.role,
        id: adminUser.id
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to create admin user', details: error.message });
  }
}));

// TEMPORARY: Simple admin login bypass for universe generation
router.post('/admin-login', asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body;

  // Simple password check for admin account
  if (password !== 'AdminPassword123!') {
    return res.status(401).json({ success: false, error: 'Invalid admin password' });
  }

  // Find admin user
  const { data: adminUser, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'admin@attrition.com')
    .single();

  if (error || !adminUser || adminUser.role !== 'admin') {
    return res.status(404).json({ success: false, error: 'Admin user not found' });
  }

  // Generate tokens for admin
  const accessToken = generateAccessToken(adminUser.id, req);
  const refreshToken = generateRefreshToken(adminUser.id);

  res.json({
    success: true,
    data: {
      user: adminUser,
      token: accessToken,
      refreshToken,
      empire: null // Admin has no empire
    },
    message: 'Admin login successful'
  });
}));

export default router;
