import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../constants/response-formats';
import { ENV_VARS, ENV_VALUES } from '@game/shared';


/**
 * Comprehensive security headers middleware
 * Implements OWASP recommended security headers for production hardening
 * 
 * Key security features:
 * - HSTS (HTTP Strict Transport Security)
 * - Content Security Policy (CSP)
 * - X-Frame-Options, X-Content-Type-Options
 * - CSRF protection headers
 * - XSS protection and referrer policy
 */

/**
 * Content Security Policy configuration
 * This complements the client-side CSP meta tag with server-side enforcement
 */
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for Vite-generated inline scripts
      "blob:"           // Required for dynamic worker scripts
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'" // Required for Tailwind CSS and Vite-generated styles
    ],
    imgSrc: [
      "'self'",
      "data:",    // For base64 encoded images
      "blob:",    // For dynamically generated images
      "https:"    // For external images
    ],
    connectSrc: [
      "'self'",
      "https:",   // HTTPS API calls
      "http:",    // HTTP API calls (dev mode)
      "ws:",      // WebSocket connections (dev)
      "wss:"      // Secure WebSocket connections (prod)
    ],
    mediaSrc: ["'self'", "blob:"],
    fontSrc: ["'self'", "data:"],
    objectSrc: ["'none'"],           // Disable object/embed elements
    baseUri: ["'self'"],             // Restrict base tag URLs
    formAction: ["'self'"],          // Restrict form submissions
    frameAncestors: ["'none'"],      // Prevent framing (clickjacking protection)
    upgradeInsecureRequests: []      // Upgrade HTTP to HTTPS
  },
  reportOnly: false // Set to true for testing, false for enforcement
};

/**
 * HSTS (HTTP Strict Transport Security) configuration
 * Enforces HTTPS connections and prevents protocol downgrade attacks
 */
const hstsConfig = {
  maxAge: 31536000,        // 1 year (recommended minimum)
  includeSubDomains: true, // Apply to all subdomains
  preload: true           // Eligible for browser preload lists
};

/**
 * Permissions Policy configuration
 * Controls which browser features and APIs can be used
 */
const permissionsPolicyConfig = {
  // Disable potentially dangerous features
  accelerometer: [],
  'ambient-light-sensor': [],
  autoplay: ['self'], // Allow autoplay only from same origin
  camera: [], // Disable camera access
  'encrypted-media': ['self'],
  fullscreen: ['self'],
  geolocation: [], // Disable geolocation
  gyroscope: [],
  magnetometer: [],
  microphone: [], // Disable microphone access
  midi: [],
  payment: [], // Disable payment request API
  'picture-in-picture': [],
  'publickey-credentials-get': [], // Disable WebAuthn for now
  'sync-xhr': [], // Disable synchronous XHR
  'usb': [], // Disable USB API
  'web-share': [],
  'xr-spatial-tracking': [] // Disable WebXR
};

/**
 * Create comprehensive security headers middleware
 * @param isDevelopment - Whether running in development mode
 * @returns Express middleware function
 */
export function createSecurityHeadersMiddleware(isDevelopment = false) {
  // In development, we might want less strict CSP for debugging
  const cspDirectives = isDevelopment ? {
    ...cspConfig.directives,
    // In development, we might allow additional sources
    connectSrc: [
      "'self'",
      "https:",
      "http:",
      "ws:",
      "wss:",
      "http://localhost:*", // Allow localhost connections
      "ws://localhost:*",   // Allow localhost WebSockets
      "https://localhost:*" // Allow localhost HTTPS
    ]
  } : cspConfig.directives;

  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: cspDirectives,
      reportOnly: isDevelopment // Only report violations in dev, enforce in prod
    },

    // HTTP Strict Transport Security (always enable for testing)
    hsts: hstsConfig,

    // X-Frame-Options: Prevent clickjacking
    frameguard: {
      action: 'deny' // Completely prevent framing
    },

    // X-Content-Type-Options: Prevent MIME sniffing
    noSniff: true,

    // X-XSS-Protection: Enable XSS filtering (legacy but still useful)
    xssFilter: true,

    // Referrer Policy: Control referrer information
    referrerPolicy: {
      policy: ['strict-origin-when-cross-origin']
    },

    // Permissions Policy: Control browser features and APIs
    // Note: Some versions of helmet might not support this, fallback gracefully
    ...(() => {
      try {
        return {
          permissionsPolicy: {
            features: permissionsPolicyConfig
          }
        };
      } catch {
        // Fallback if permissions policy is not supported
        console.warn('?? Permissions Policy not supported in this Helmet version');
        return {};
      }
    })(),

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // DNS Prefetch Control: Control DNS prefetching
    dnsPrefetchControl: {
      allow: false // Disable DNS prefetching for privacy
    },

    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: {
      policy: 'require-corp' // Require explicit CORP headers
    },

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: {
      policy: 'same-origin' // Prevent cross-origin access to window object
    },

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: {
      policy: 'cross-origin' // Allow cross-origin requests (needed for API)
    },

    // Expect-CT: Certificate Transparency enforcement (commented out - not supported in current Helmet version)
    // expectCt: {
    //   maxAge: 86400, // 24 hours
    //   enforce: process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION,
    //   reportUri: process.env[ENV_VARS.SECURITY_REPORT_URI] || undefined
    // }
  });
}

/**
 * Additional CSRF protection middleware
 * Implements SameSite cookie attributes and validates origins
 */
export function csrfProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Store original cookie function
  const originalCookie = res.cookie.bind(res);
  
  // Override cookie function with secure defaults
  res.cookie = function(name: string, value: any, options: any = {}) {
    // Ensure secure cookie settings in production
    const secureOptions = {
      ...options,
      httpOnly: true,           // Prevent XSS access to cookies
      secure: process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION, // HTTPS only in production
      sameSite: 'strict' as const,  // Strict SameSite policy
      maxAge: options.maxAge || 24 * 60 * 60 * 1000 // 24 hours default
    };
    
    return originalCookie(name, value, secureOptions);
  };

  // Origin validation for state-changing operations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.get('Origin') || req.get('Referer');
    const allowedOrigins = process.env[ENV_VARS.CORS_ORIGIN]
      ? process.env[ENV_VARS.CORS_ORIGIN]!.split(',').map(o => o.trim()).filter(Boolean)
      : ['http://localhost:5173', 'http://localhost:5174'];

    if (origin) {
      const isAllowed = allowedOrigins.some(allowed => {
        // Handle URL objects and string comparisons
        try {
          const originUrl = new URL(origin);
          const allowedUrl = allowed.startsWith('http') ? new URL(allowed) : null;
          
          if (allowedUrl) {
            return originUrl.origin === allowedUrl.origin;
          } else {
            return origin.includes(allowed);
          }
        } catch {
          return origin === allowed;
        }
      });

      if (!isAllowed && process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Forbidden: Invalid origin'
        });
      }
    }
  }

  next();
}

/**
 * Security headers validation middleware
 * Logs security header violations and suspicious activities
 */
export function securityLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Log suspicious patterns
  const suspiciousPatterns = [
    /(<script|javascript:|data:text\/html)/i,  // Script injection attempts
    /(union\s+select|drop\s+table|insert\s+into)/i, // SQL injection patterns
    /(\.\.|\/etc\/|\/proc\/)/i,               // Path traversal attempts
    /(exec|system|cmd|powershell)/i           // Command injection patterns
  ];

  const userAgent = req.get('User-Agent') || '';
  const queryString = JSON.stringify(req.query);
  const bodyString = JSON.stringify(req.body);

  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(userAgent) || 
    pattern.test(queryString) || 
    pattern.test(bodyString)
  );

  if (isSuspicious) {
    console.warn(`?? Suspicious request detected:`, {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: userAgent.substring(0, 200), // Truncate for logging
      timestamp: new Date().toISOString()
    });
  }

  next();
}

/**
 * Export default middleware stack
 */
export default function securityHeadersStack(isDevelopment = false) {
  return [
    createSecurityHeadersMiddleware(isDevelopment),
    csrfProtectionMiddleware,
    securityLoggingMiddleware
  ];
}


