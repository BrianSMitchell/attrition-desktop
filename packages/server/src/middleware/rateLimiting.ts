import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

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

// General rate limiter for auth endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 100, // Limit each IP to 20 requests per windowMs in production
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for login attempts
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 20, // Limit each IP to 5 login attempts per 15 minutes in production
  message: {
    success: false,
    error: 'Too many login attempts from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Account lockout middleware
export const accountLockout = (req: Request, res: Response, next: Function) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  // Check if IP is currently locked out
  if (attempt && attempt.lockedUntil && now < attempt.lockedUntil) {
    const remainingTime = Math.ceil((attempt.lockedUntil - now) / 1000 / 60); // minutes
    return res.status(429).json({
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
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
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
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  loginAttempts.delete(ip);
};

// Registration rate limiter (more restrictive)
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 3 : 10, // Limit each IP to 3 registrations per hour in production
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
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // Allow more frequent refreshes
  message: {
    success: false,
    error: 'Too many token refresh requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
