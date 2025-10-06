import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, UserDocument } from '../models/User';
import { asyncHandler } from './errorHandler';
import crypto from 'crypto';
import { generateDeviceFingerprint, DeviceFingerprint, compareDeviceFingerprints, isSuspiciousFingerprint, sanitizeFingerprint } from '../utils/deviceFingerprint';
import { getDatabaseType } from '../config/database';
import { supabase } from '../config/supabase';

export interface AuthRequest extends Request {
  user?: UserDocument;
  deviceFingerprint?: DeviceFingerprint;
}

// Token revocation store (in-memory for now, should be Redis in production)
const revokedTokens = new Set<string>();

// JWT secret management
const getJWTSecrets = (): string[] => {
  const current = process.env.JWT_SECRET;
  const previous = process.env.JWT_SECRET_PREVIOUS; // For rotation support
  
  if (!current) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  // Validate secret strength
  if (current.length < 32) {
    console.warn('JWT_SECRET should be at least 32 characters for security');
  }
  
  return [current, previous].filter(Boolean) as string[];
};

// Enhanced JWT verification with multiple secrets support
export const verifyTokenWithSecrets = (token: string): any => {
  const secrets = getJWTSecrets();
  
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      // Try next secret
      continue;
    }
  }
  
  throw new Error('Token verification failed with all secrets');
};

export const revokeToken = (jti: string): void => {
  revokedTokens.add(jti);
};

export const isTokenRevoked = (jti: string): boolean => {
  return revokedTokens.has(jti);
};

export const authenticate = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.'
    });
  }

  try {
    // Verify token with multiple secrets support
    const decoded = verifyTokenWithSecrets(token) as { 
      userId: string; 
      type: string; 
      jti?: string; 
      iat?: number;
      deviceFingerprint?: DeviceFingerprint;
    };
    
    // Check if token is revoked (if jti is present)
    if (decoded.jti && isTokenRevoked(decoded.jti)) {
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked'
      });
    }
    
    // Verify token type
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type'
      });
    }
    
    // Generate current device fingerprint
    const currentFingerprint = generateDeviceFingerprint(req);
    
    // Check device fingerprint binding (if present in token)
    if (decoded.deviceFingerprint) {
      const similarity = compareDeviceFingerprints(currentFingerprint, decoded.deviceFingerprint);

      // Configurable threshold (defaults to 0.3 to tolerate IP-network shifts behind CDNs/proxies)
      const threshold = (() => {
        const raw = process.env.DEVICE_BINDING_THRESHOLD;
        const n = raw ? Number(raw) : NaN;
        return Number.isFinite(n) ? n : 0.3;
      })();
      
      // Allow some flexibility but detect major changes
      if (similarity < threshold) {
        console.warn(`[SECURITY] Suspicious device fingerprint mismatch for user ${decoded.userId}:`, {
          similarity,
          threshold,
          current: sanitizeFingerprint(currentFingerprint),
          token: sanitizeFingerprint(decoded.deviceFingerprint)
        });
        
        // In strict mode, reject the token
        if (process.env.DEVICE_BINDING_STRICT === 'true') {
          return res.status(401).json({
            success: false,
            error: 'Token device binding verification failed'
          });
        }
      }
    }
    
    // Check for suspicious fingerprint patterns
    if (decoded.deviceFingerprint && isSuspiciousFingerprint(currentFingerprint, decoded.deviceFingerprint)) {
      console.warn(`[SECURITY] Suspicious fingerprint detected for user ${decoded.userId}:`, {
        current: sanitizeFingerprint(currentFingerprint),
        token: sanitizeFingerprint(decoded.deviceFingerprint)
      });
    }
    
    // Get user from configured database
    let user: any = null;
    if (getDatabaseType() === 'supabase') {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, empire_id, starting_coordinate')
        .eq('id', decoded.userId)
        .single();

      if (error || !data) {
        return res.status(401).json({ success: false, error: 'Token is not valid' });
      }

      // Map Supabase row to legacy user shape expected downstream
      user = {
        _id: data.id,
        id: data.id,
        email: data.email,
        username: data.username,
        gameProfile: {
          startingCoordinate: data.starting_coordinate || null,
          empireId: data.empire_id || null,
        },
      };
    } else {
      user = await User.findById(decoded.userId).select('-passwordHash');
      if (!user) {
        return res.status(401).json({ success: false, error: 'Token is not valid' });
      }
    }

    req.user = user as any;
    req.deviceFingerprint = currentFingerprint;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token is not valid'
    });
  }
});

export const generateAccessToken = (userId: string, req?: Request): string => {
  // Use shorter TTL for production, longer for development
  const expiresIn = process.env.NODE_ENV === 'production' ? '15m' : '1h';
  
  // Generate device fingerprint if request is provided
  let deviceFingerprint: DeviceFingerprint | undefined;
  if (req && process.env.ENABLE_DEVICE_BINDING !== 'false') {
    deviceFingerprint = generateDeviceFingerprint(req);
  }
  
  const payload: any = {
    userId, 
    type: 'access',
    jti: crypto.randomUUID(), // Add JWT ID for revocation tracking
    iat: Math.floor(Date.now() / 1000) // Add issued at time
  };
  
  // Add device fingerprint if available
  if (deviceFingerprint) {
    payload.deviceFingerprint = deviceFingerprint;
  }
  
  return jwt.sign(
    payload,
    getJWTSecrets()[0], // Use current secret for signing
    {
      expiresIn,
      algorithm: 'HS256'
    }
  );
};

export const generateRefreshToken = (userId: string): string => {
  // Refresh tokens get shorter TTL too
  const expiresIn = process.env.NODE_ENV === 'production' ? '7d' : '30d';
  
  return jwt.sign(
    { 
      userId, 
      type: 'refresh',
      jti: crypto.randomUUID(), // Add JWT ID for revocation tracking
      iat: Math.floor(Date.now() / 1000)
    },
    getJWTSecrets()[0], // Use current secret for signing
    {
      expiresIn,
      algorithm: 'HS256'
    }
  );
};

/** Backward compatibility for existing call sites */
export const generateToken = generateAccessToken;
