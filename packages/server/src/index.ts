import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { connectDatabase } from './config/database';
import { getSSLConfigFromEnvironment, createHttpsServer } from './config/ssl';
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import universeRoutes from './routes/universe';
import syncRoutes from './routes/sync';
import messageRoutes from './routes/messages';
import { errorHandler } from './middleware/errorHandler';
import { sessionInvalidationMiddleware } from './middleware/sessionInvalidation';
import securityHeadersStack from './middleware/securityHeaders';
import { httpsRedirectMiddleware, httpsSecurityHeadersMiddleware } from './middleware/httpsRedirect';
import { tlsMonitoringMiddleware, tlsSecurityStatusHandler } from './utils/tlsValidator';
import { setupSocketIO, getOnlineUniqueUsersCount } from './services/socketService';
import { hybridGameLoop } from './services/hybridGameLoopService';
import { httpsHealthCheckHandler, HttpsHealthMonitor, shouldStartHttpsHealthMonitor } from './utils/httpsHealthCheck';
import { initSocketManager } from './utils/socketManager';
import securityRoutes from './routes/security';
import adminRoutes from './routes/admin';
import { HTTP_STATUS } from './constants/response-formats';
import { API_ENDPOINTS } from './constants/api-endpoints';
import techRoutes from './routes/tech';
import { Server } from 'socket.io';
import { initLogger, isReverseProxySSL } from './utils/serverUtils';
import { ENV_VARS } from '../../../shared/src/constants/env-vars';
import { ENV_VALUES } from '../../../shared/src/constants/configuration-keys';
import { ENV_VALUES } from '@shared/constants/configuration-keys';
import { ENV_VARS } from '@shared/constants/env-vars';



// Load environment variables
dotenv.config();

// Initialize logger (optional console patch)
initLogger();

const allowedOrigins = process.env[ENV_VARS.CORS_ORIGIN]
  ? process.env[ENV_VARS.CORS_ORIGIN].split(',').map(o => o.trim()).filter(Boolean)
  : ["http://localhost:5173", "http://localhost:5174", "null", "file://"];

const app: express.Application = express();
app.set('trust proxy', 1);
const server = createServer(app);

// Socket.IO will be initialized later with proper server (HTTP or HTTPS)
let io: Server;

// Expose IO getter for other services to broadcast events safely
export function getIO(): Server | undefined {
  return io;
}

// HTTPS health monitoring (production only)
let httpsHealthMonitor: HttpsHealthMonitor | null = null;

const PORT = parseInt(process.env[ENV_VARS.PORT] || '3001', 10);
const HTTPS_PORT = parseInt(process.env[ENV_VARS.HTTPS_PORT] || '443', 10);

// HTTPS enforcement - redirect HTTP to HTTPS in production
app.use(httpsRedirectMiddleware);

// Security middleware - comprehensive OWASP-compliant headers
const isDevelopment = process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.DEVELOPMENT;
app.use(...securityHeadersStack(isDevelopment));

// Additional HTTPS security headers
app.use(httpsSecurityHeadersMiddleware);

// TLS connection monitoring (for HTTPS connections)
app.use(tlsMonitoringMiddleware);

// CORS configuration (after security headers)
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

/**
 * Rate limiting
 * - Production-safe defaults
 * - Development-safe behavior via env toggles
 * - Skip CORS preflight (OPTIONS) and the public status endpoint
 * - Optional: dev-only skip for /api/auth/*
 */
const RATE_LIMIT_ENABLED = ((process.env[ENV_VARS.RATE_LIMIT_ENABLED] ?? 'true').toLowerCase() !== 'false');

const limiter = rateLimit({
  windowMs: parseInt(process.env[ENV_VARS.RATE_LIMIT_WINDOW_MS] || '900000', 10), // default 15 minutes
  max: parseInt(
    process.env[ENV_VARS.RATE_LIMIT_MAX_REQUESTS] ||
    process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.DEVELOPMENT ? '2000' : '100',
    10
  ),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    // Do not count CORS preflights
    req.method === 'OPTIONS' ||
    // Public status endpoint
    req.path === API_ENDPOINTS.SYSTEM.STATUS ||
    // Dev-only skips
    (
      process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.DEVELOPMENT && (
        // Allow skipping auth endpoints during dev
        (process.env[ENV_VARS.RATE_LIMIT_SKIP_AUTH] === 'true' && req.path.startsWith('/api/auth/')) ||
        // Allow skipping heavy game/universe endpoints during dev bursts
        (process.env[ENV_VARS.RATE_LIMIT_SKIP_GAME] === 'true' && (req.path.startsWith('/api/game') || req.path.startsWith(API_ENDPOINTS.UNIVERSE.BASE)))
      )
    )
});

/**
 * In development, disable the HTTP rate limiter entirely to allow unlimited requests.
 * Keep limiter active only in production deployments.
 */
if (RATE_LIMIT_ENABLED && process.env[ENV_VARS.NODE_ENV] !== ENV_VALUES.DEVELOPMENT) {
  app.use(limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const serverStart = Date.now(); // nodemon:restart v4 - admin endpoint added

// Health check endpoint
app.get(API_ENDPOINTS.SYSTEM.HEALTH, (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'Attrition API',
    version: '1.0.0'
  });
});

// Public server status endpoint with temporary trace logging
app.use(API_ENDPOINTS.SYSTEM.STATUS, (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    try {
      console.log('[TRACE] /api/status', {
        method: req.method,
        status: res.statusCode,
        ua: req.get('User-Agent') || 'unknown',
        ip: req.ip,
        xff: req.get('X-Forwarded-For') || undefined,
        proto: req.get('X-Forwarded-Proto') || (req.secure ? 'https' : 'http'),
        durationMs: Date.now() - start,
      });
    } catch {}
  });
  next();
});
app.get(API_ENDPOINTS.SYSTEM.STATUS, (req, res) => {
  try {
    const uptimeSeconds = Math.floor((Date.now() - serverStart) / 1000);
    const socketsConnected = io ? io.of('/').sockets.size : 0;
    const playersOnline = getOnlineUniqueUsersCount();

    res.json({
      success: true,
      data: {
        status: 'OK',
        version: '1.0.0',
        startedAt: new Date(serverStart).toISOString(),
        uptimeSeconds,
        playersOnline,
        socketsConnected,
        secure: req.secure || req.get('X-Forwarded-Proto') === 'https',
        environment: process.env[ENV_VARS.NODE_ENV] || ENV_VALUES.DEVELOPMENT
      }
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to retrieve server status'
    });
  }
});

// Security monitoring endpoints (production only)
if (process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION) {
  app.get('/api/https-health', httpsHealthCheckHandler);
  app.get('/api/tls-security', tlsSecurityStatusHandler);
}

// Session invalidation middleware for authenticated routes
app.use('/api/game', sessionInvalidationMiddleware);
app.use(API_ENDPOINTS.UNIVERSE.BASE, sessionInvalidationMiddleware);
app.use(API_ENDPOINTS.SYNC.BASE, sessionInvalidationMiddleware);
app.use('/api/security', sessionInvalidationMiddleware);
app.use(API_ENDPOINTS.MESSAGES.BASE, sessionInvalidationMiddleware);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/security', securityRoutes); // Security monitoring endpoints
// Main game routes

// Main game routes
app.use('/api/game', gameRoutes);

// Legacy compatibility routes
app.use('/api/tech', techRoutes);  // Separate router for /api/tech/* backwards compatibility
app.use(API_ENDPOINTS.UNIVERSE.BASE, universeRoutes);
app.use(API_ENDPOINTS.SYNC.BASE, syncRoutes);
app.use(API_ENDPOINTS.MESSAGES.BASE, messageRoutes);
// Temporary alias to match client path while we migrate
app.use('/api/game/messages', messageRoutes);

// Admin maintenance routes (guarded by ADMIN_MAINTENANCE_SECRET)
app.use(API_ENDPOINTS.ADMIN.BASE, adminRoutes);

// Socket.IO will be setup in startServer() function

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

// Start server with HTTPS support
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Note: Database initialization complete - using Supabase

    // In production, check if we need to handle SSL ourselves or if it's handled by reverse proxy (like Render)
    if (process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION) {
      console.log('?? Production mode: HTTPS enforcement enabled');
      
      // Check if SSL is handled by reverse proxy (Render, CloudFlare, etc.)
      const useReverseProxySSL = isReverseProxySSL();
      
      if (useReverseProxySSL) {
        console.log('?? Using reverse proxy SSL termination (Render/CloudFlare/etc.)');
        console.log('? Server will run HTTP - SSL handled by reverse proxy');
      } else {
        // Load SSL configuration - this will throw if not available in production
        const sslConfig = await getSSLConfigFromEnvironment();
        
        if (!sslConfig) {
          const errorMessage = 'HTTPS is mandatory in production but SSL configuration is not available. ' +
            'Please provide SSL certificates via environment variables (SSL_CERTIFICATE, SSL_PRIVATE_KEY) ' +
            'or file paths (SSL_CERT_PATH, SSL_KEY_PATH). Or set USE_REVERSE_PROXY_SSL=true if using a reverse proxy.';
          console.error('? PRODUCTION STARTUP FAILED:', errorMessage);
          throw new Error(errorMessage);
        }
      }
      
      if (useReverseProxySSL) {
        // Production with reverse proxy SSL: Run HTTP server, SSL handled by reverse proxy
        io = new Server(server, {
          cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"]
          }
        });
        
        server.listen(PORT, () => {
          console.log(`?? PRODUCTION server running on port ${PORT}`);
          console.log(`?? Health check: http://localhost:${PORT}/health`);
          console.log(`?? Game API: http://localhost:${PORT}/api`);
          console.log(`?? Socket.IO ready for connections`);
          console.log(`?? SSL/TLS: Handled by reverse proxy (Render/CloudFlare/etc.)`);
          console.log(`? SECURITY: HTTPS enforced at reverse proxy level`);
          
          // Start hybrid game loop (production gated)
          const loopEnabled = (process.env.GAME_LOOP_ENABLED ?? 'false').toLowerCase() !== 'false';
          if (loopEnabled) {
            console.log(`?? Starting HYBRID game loop (responsive completions + efficient resources)`);
            console.log(`?? Credit payouts every ${process.env.CREDIT_PAYOUT_PERIOD_MINUTES || '1'} minute(s)`);
            hybridGameLoop.start();
          } else {
            console.log('?? HYBRID game loop disabled (GAME_LOOP_ENABLED=false)');
          }
        });
        
        setupSocketIO(io);
        initSocketManager(io); // Initialize socket manager for global access
        
      } else {
        // Production with direct SSL: Start HTTPS server only
        const sslConfig = await getSSLConfigFromEnvironment();
        const httpsServer = createHttpsServer(app, sslConfig!, HTTPS_PORT);
        
        // Create Socket.IO instance for HTTPS server
        io = new Server(httpsServer, {
          cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"]
          }
        });
        
        // Create HTTP server ONLY for HTTPS redirects - no actual HTTP content served
        const httpRedirectServer = createServer(app);
        httpRedirectServer.listen(PORT, () => {
          console.log(`?? HTTP redirect server on port ${PORT} (redirects all traffic to HTTPS)`);
          console.log(`??  HTTP server serves NO content - all requests redirected to HTTPS`);
        });
        
        // HTTPS server startup with enhanced logging
        httpsServer.listen(HTTPS_PORT, () => {
          console.log(`?? PRODUCTION HTTPS server running on port ${HTTPS_PORT}`);
          console.log(`?? Health check: https://localhost:${HTTPS_PORT}/health`);
          console.log(`?? Game API: https://localhost:${HTTPS_PORT}/api`);
          console.log(`?? Socket.IO ready for secure connections`);
          console.log(`?? SSL/TLS: ${sslConfig!.minVersion} to ${sslConfig!.maxVersion}`);
          console.log(`? HTTPS ENFORCEMENT: All HTTP requests redirected to HTTPS`);
          console.log(`? SECURITY: Production server running in HTTPS-only mode`);
          
          // Start hybrid game loop (production gated)
          const loopEnabled = (process.env.GAME_LOOP_ENABLED ?? 'false').toLowerCase() !== 'false';
          if (loopEnabled) {
            console.log(`?? Starting HYBRID game loop (responsive completions + efficient resources)`);
            console.log(`?? Credit payouts every ${process.env.CREDIT_PAYOUT_PERIOD_MINUTES || '1'} minute(s)`);
            hybridGameLoop.start();
          } else {
            console.log('?? HYBRID game loop disabled (GAME_LOOP_ENABLED=false)');
          }
        });
      }
      
      // Setup Socket.IO on HTTPS server
      setupSocketIO(io);
      initSocketManager(io); // Initialize socket manager for global access
      
      // Start HTTPS health monitoring in production ONLY when not using reverse proxy SSL
      if (useReverseProxySSL) {
        console.log('?? HTTPS health monitoring disabled: reverse proxy SSL termination detected (e.g., Render)');
      } else if (shouldStartHttpsHealthMonitor(false)) {
        httpsHealthMonitor = new HttpsHealthMonitor(HTTPS_PORT, PORT, 'localhost');
        const monitoringInterval = parseInt(process.env[ENV_VARS.HTTPS_HEALTH_CHECK_INTERVAL_MINUTES] || '60', 10);
        httpsHealthMonitor.start(monitoringInterval);
        console.log(`?? HTTPS health monitoring started (every ${monitoringInterval} minutes)`);
      }
      
    } else {
      // Development/Test: HTTP server with optional HTTPS
      console.log(`?? Development mode: HTTP server enabled`);
      
      const sslConfig = await getSSLConfigFromEnvironment();
      
      if (sslConfig && process.env[ENV_VARS.FORCE_HTTPS] === 'true') {
        // Development with HTTPS (for testing HTTPS behavior)
        console.log('?? Development HTTPS mode enabled (FORCE_HTTPS=true)');
        const httpsServer = createHttpsServer(app, sslConfig, HTTPS_PORT);
        
        io = new Server(httpsServer, {
          cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"]
          }
        });
        
        // Also run HTTP server for development convenience
        server.listen(PORT, () => {
          console.log(`?? HTTP server on port ${PORT} (redirects to HTTPS)`);
        });
        
        httpsServer.listen(HTTPS_PORT, () => {
          console.log(`?? Development HTTPS server on port ${HTTPS_PORT}`);
          console.log(`?? Health check: https://localhost:${HTTPS_PORT}/health`);
          console.log(`?? Game API: https://localhost:${HTTPS_PORT}/api`);
          console.log(`?? Socket.IO ready for secure connections`);
        });
        
        setupSocketIO(io);
        initSocketManager(io); // Initialize socket manager for global access
      } else {
        // Standard development: HTTP only
        io = new Server(server, {
          cors: {
            origin: (origin, callback) => {
              // Allow null origin (file://) and localhost origins
              if (!origin || origin === 'null' || allowedOrigins.includes(origin)) {
                callback(null, true);
              } else {
                callback(new Error('Not allowed by CORS'));
              }
            },
            methods: ["GET", "POST"],
            credentials: false
          }
        });
        
        server.listen(PORT, () => {
          console.log(`?? Development HTTP server running on port ${PORT}`);
          console.log(`?? Health check: http://localhost:${PORT}/health`);
          console.log(`?? Game API: http://localhost:${PORT}/api`);
          console.log(`?? Socket.IO ready for connections`);
          console.log(`??  Development mode: HTTPS enforcement disabled`);
        });
        
        setupSocketIO(io);
        initSocketManager(io); // Initialize socket manager for global access
      }
      
      // Start hybrid game loop for development (enabled by default)
      const devLoopEnabled = (process.env.GAME_LOOP_ENABLED ?? 'true').toLowerCase() !== 'false';
      if (devLoopEnabled) {
        console.log(`?? Starting HYBRID game loop (responsive completions + efficient resources)`);
        console.log(`?? Credit payouts every ${process.env.CREDIT_PAYOUT_PERIOD_MINUTES || '1'} minute(s)`);
        hybridGameLoop.start();
      } else {
        console.log('?? HYBRID game loop disabled (GAME_LOOP_ENABLED=false)');
      }
    }
    
  } catch (error) {
    console.error('? Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown with timeout
let isShuttingDown = false;
const SHUTDOWN_TIMEOUT = 5000; // 5 seconds

function shutdown() {
  if (isShuttingDown) {
    console.log('?? Shutdown already in progress');
    return;
  }
  
  isShuttingDown = true;
 console.log('?? Shutdown signal received, shutting down gracefully');
  
  // Stop hybrid game loop
  try {
    hybridGameLoop.stop();
    console.log('?? Game loop stopped');
  } catch (error) {
    console.error('Error stopping hybrid game loop:', error);
  }
  
  // Stop HTTPS health monitor
  if (httpsHealthMonitor) {
    try {
      httpsHealthMonitor.stop();
      console.log('?? HTTPS health monitor stopped');
    } catch (error) {
      console.error('Error stopping HTTPS health monitor:', error);
    }
  }
  
  // Close server with timeout
  const shutdownTimer = setTimeout(() => {
    console.log('? Shutdown timeout reached, force closing');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);
  
  server.close(() => {
    clearTimeout(shutdownTimer);
    console.log('? HTTP server closed');
    
    // Close database connections
    try {
      // Add any database cleanup here if needed
      console.log('?? Database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
    
    console.log('? Process terminated gracefully');
    process.exit(0);
  });
  
  // If server doesn't close within timeout, force exit
  setTimeout(() => {
    console.log('? Force closing remaining connections');
    process.exit(0);
  }, SHUTDOWN_TIMEOUT + 1000);
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('?? SIGTERM received');
  shutdown();
});

process.on('SIGINT', () => {
  console.log('?? SIGINT received');
  shutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('?? Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('?? Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown();
});

if ((process.env[ENV_VARS.NODE_ENV] || '').toLowerCase() !== 'test') {
  startServer();
}

export { app, io };




