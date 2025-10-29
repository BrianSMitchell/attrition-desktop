import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants/response-formats';
import { ENV_VARS, ENV_VALUES } from '@game/shared';


// Store for tracking failed login attempts per IP
const loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();

// Clean up old entries periodically (every 15 minutes)
setInterval(() => {
  const now = Date.now();
  const CLEANUP_AGE = 15 * 60 * 1000; // 15 minutes
  
  for (const [ip, data] of loginAttempts.entries()) {
    if (now - data.lastAttempt > CLEANUP_AGE && (!data.lockedUntil || now > data.lockedUntil)) {
      loginAttempts.delete(ip);
    }
  }
}, 15 * 60 * 1000);

// General rate limiter for auth endpoints (relaxed for private game)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION ? 100 : HTTP_STATUS.OK, // More lenient for private game - 100 per 15min in production
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login rate limiter (relaxed for private game)
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION ? 30 : 50, // More lenient for private game - 30 per 15min in production
  message: {
    success: false,
    error: 'Too many login attempts from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Account lockout middleware
export const accountLockout = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  // Check if IP is currently locked out
  if (attempt && attempt.lockedUntil && now < attempt.lockedUntil) {
    const remainingTime = Math.ceil((attempt.lockedUntil - now) / 1000 / 60); // minutes
    return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: `Account temporarily locked due to too many failed attempts. Try again in ${remainingTime} minutes.`,
    });
  }

  // Clear lockout if expired
  if (attempt && attempt.lockedUntil && now >= attempt.lockedUntil) {
    loginAttempts.delete(ip);
  }

  next();
};

// Track failed login attempts
export const trackFailedLogin = (req: Request) => {
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };

  attempt.count += 1;
  attempt.lastAttempt = now;

  // Lock account after 5 failed attempts
  if (attempt.count >= 5) {
    attempt.lockedUntil = now + (30 * 60 * 1000); // 30 minutes lockout
    console.warn(`IP ${ip} locked out for 30 minutes after ${attempt.count} failed login attempts`);
  }

  loginAttempts.set(ip, attempt);
};

// Clear failed attempts on successful login
export const clearFailedAttempts = (req: Request) => {
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
  loginAttempts.delete(ip);
};

// Registration rate limiter (relaxed for private game usage)
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION ? 20 : 30, // More lenient for private game - 20 per hour in production
  message: {
    success: false,
    error: 'Too many registration attempts from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Token refresh rate limiter
export const refreshRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION ? 100 : HTTP_STATUS.INTERNAL_SERVER_ERROR, // Allow more frequent refreshes
  message: {
    success: false,
    error: 'Too many token refresh requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});



