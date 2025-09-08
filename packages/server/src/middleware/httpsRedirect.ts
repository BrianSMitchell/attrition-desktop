import { Request, Response, NextFunction } from 'express';

/**
 * HTTPS Enforcement Middleware
 * 
 * Redirects all HTTP requests to HTTPS in production environments.
 * Ensures secure communication for all desktop app connections.
 * 
 * Features:
 * - Production-only enforcement (allows HTTP in development)
 * - Proper redirect status codes (301 for permanent redirect)
 * - Preserves original request path and query parameters
 * - Handles reverse proxy scenarios (X-Forwarded-Proto header)
 * - Health check exemptions to avoid redirect loops
 */

/**
 * Configuration for HTTPS redirect behavior
 */
interface HttpsRedirectConfig {
  /** Force HTTPS even in development (default: false) */
  forceHttps?: boolean;
  /** Custom HTTPS port (default: 443) */
  httpsPort?: number;
  /** Custom hostname for redirects (default: use request hostname) */
  hostname?: string;
  /** Paths to exempt from HTTPS redirect (for health checks, etc.) */
  exemptPaths?: string[];
  /** Trust proxy headers (X-Forwarded-Proto, X-Forwarded-Host) */
  trustProxy?: boolean;
}

/**
 * Create HTTPS redirect middleware
 * @param config Configuration options
 * @returns Express middleware function
 */
export function createHttpsRedirectMiddleware(config: HttpsRedirectConfig = {}) {
  const {
    forceHttps = false,
    httpsPort = 443,
    hostname,
    exemptPaths = ['/health', '/api/status'],
    trustProxy = true
  } = config;

  return function httpsRedirectMiddleware(req: Request, res: Response, next: NextFunction) {
    // Skip HTTPS enforcement in development unless explicitly forced
    if (process.env.NODE_ENV !== 'production' && !forceHttps) {
      return next();
    }

    // Check if request is already secure
    const isSecure = isRequestSecure(req, trustProxy);
    
    if (isSecure) {
      // Request is already HTTPS, continue
      return next();
    }

    // Check if this path should be exempt from HTTPS redirect
    const isExempt = exemptPaths.some(exemptPath => {
      if (exemptPath.endsWith('*')) {
        return req.path.startsWith(exemptPath.slice(0, -1));
      }
      return req.path === exemptPath;
    });

    if (isExempt && process.env.NODE_ENV !== 'production') {
      // Allow HTTP for exempt paths ONLY in development
      // In production, even exempt paths should use HTTPS
      return next();
    }

    // Enhanced security logging for production
    const clientInfo = {
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      method: req.method,
      originalUrl: req.originalUrl,
      timestamp: new Date().toISOString(),
      forwardedProto: req.get('X-Forwarded-Proto') || 'none',
      host: req.get('Host') || 'unknown'
    };

    try {
      // Build HTTPS redirect URL
      const redirectUrl = buildHttpsUrl(req, { hostname, httpsPort });
      
      // Enhanced logging based on environment
      if (process.env.NODE_ENV === 'production') {
        console.warn(`🔒 PRODUCTION HTTP→HTTPS redirect:`, {
          ...clientInfo,
          redirectTo: redirectUrl,
          severity: 'WARNING',
          message: 'Insecure HTTP request redirected to HTTPS in production'
        });
      } else {
        console.log(`🔒 HTTP → HTTPS redirect: ${req.method} ${req.originalUrl} → ${redirectUrl}`);
      }

      // Enhanced security headers for production redirects
      const redirectHeaders: Record<string, string> = {
        'Location': redirectUrl,
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };

      // Add additional security headers for production
      if (process.env.NODE_ENV === 'production') {
        redirectHeaders['X-Content-Type-Options'] = 'nosniff';
        redirectHeaders['X-Frame-Options'] = 'DENY';
        redirectHeaders['X-XSS-Protection'] = '1; mode=block';
        redirectHeaders['Referrer-Policy'] = 'strict-origin-when-cross-origin';
      }

      // Perform the redirect with enhanced headers
      res.status(301).set(redirectHeaders).end();
      
    } catch (error) {
      // Error handling for redirect failures
      const errorMessage = error instanceof Error ? error.message : 'Unknown redirect error';
      
      console.error(`❌ HTTPS redirect failed:`, {
        ...clientInfo,
        error: errorMessage,
        severity: 'ERROR'
      });
      
      // In production, fail securely - don't allow HTTP fallback
      if (process.env.NODE_ENV === 'production') {
        res.status(426) // Upgrade Required
          .set({
            'Content-Type': 'application/json',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY'
          })
          .json({
            success: false,
            error: 'HTTPS Required',
            message: 'This service requires HTTPS. Please use https:// instead of http://',
            code: 'HTTPS_REQUIRED'
          });
        return;
      }
      
      // In development, log error but continue
      console.warn('⚠️  HTTPS redirect failed in development, continuing with HTTP');
      next();
    }
  };
}

/**
 * Determine if a request is secure (HTTPS)
 * @param req Express request object
 * @param trustProxy Whether to trust proxy headers
 * @returns True if the request is secure
 */
function isRequestSecure(req: Request, trustProxy: boolean): boolean {
  // Direct HTTPS connection
  if (req.secure) {
    return true;
  }

  // Check for secure connection via protocol property
  if (req.protocol === 'https') {
    return true;
  }

  if (!trustProxy) {
    return false;
  }

  // Check proxy headers (common in production deployments)
  const forwardedProto = req.get('X-Forwarded-Proto');
  if (forwardedProto === 'https') {
    return true;
  }

  // Check for CloudFlare's custom header
  const cfVisitorHeader = req.get('CF-Visitor');
  if (cfVisitorHeader) {
    try {
      const cfVisitor = JSON.parse(cfVisitorHeader);
      if (cfVisitor.scheme === 'https') {
        return true;
      }
    } catch {
      // Ignore malformed CF-Visitor header
    }
  }

  // Check for Azure Front Door header
  if (req.get('X-Forwarded-Proto') === 'https' || req.get('X-Azure-HTTPS') === 'on') {
    return true;
  }

  return false;
}

/**
 * Build the HTTPS redirect URL
 * @param req Express request object
 * @param options Configuration options
 * @returns Complete HTTPS URL for redirect
 */
function buildHttpsUrl(req: Request, options: { hostname?: string; httpsPort?: number }): string {
  const { hostname, httpsPort = 443 } = options;
  
  // Use custom hostname or extract from request
  const host = hostname || req.get('Host') || req.hostname || 'localhost';
  
  // Remove any existing port from hostname
  const cleanHostname = host.split(':')[0];
  
  // Build the URL
  let httpsUrl = `https://${cleanHostname}`;
  
  // Add port if not default HTTPS port
  if (httpsPort !== 443) {
    httpsUrl += `:${httpsPort}`;
  }
  
  // Add original path and query string
  httpsUrl += req.originalUrl;
  
  return httpsUrl;
}

/**
 * Express middleware to enforce HTTPS in production
 * Simple version with default configuration
 */
export const httpsRedirectMiddleware = createHttpsRedirectMiddleware();

/**
 * Strict HTTPS enforcement middleware that also works in development
 * Use this for testing HTTPS redirect behavior
 */
export const strictHttpsMiddleware = createHttpsRedirectMiddleware({
  forceHttps: true,
  exemptPaths: ['/health', '/api/status', '/test-http']
});

/**
 * Middleware to set secure headers for HTTPS responses
 * Should be used after HTTPS redirect to set additional security headers
 */
export function httpsSecurityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only apply to HTTPS requests
  if (!isRequestSecure(req, true)) {
    return next();
  }

  // Set security headers for HTTPS responses
  res.set({
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Secure': 'true'
  });

  next();
}

export default {
  createHttpsRedirectMiddleware,
  httpsRedirectMiddleware,
  strictHttpsMiddleware,
  httpsSecurityHeadersMiddleware
};
