import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { TechQueue } from './models/TechQueue';
import { UnitQueue } from './models/UnitQueue';
import { Building } from './models/Building';

import { connectDatabase } from './config/database';
import { getSSLConfigFromEnvironment, createHttpsServer } from './config/ssl';
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import universeRoutes from './routes/universe';
import syncRoutes from './routes/sync';
import { errorHandler } from './middleware/errorHandler';
import { sessionInvalidationMiddleware } from './middleware/sessionInvalidation';
import securityHeadersStack from './middleware/securityHeaders';
import { httpsRedirectMiddleware, httpsSecurityHeadersMiddleware } from './middleware/httpsRedirect';
import { tlsMonitoringMiddleware, tlsSecurityStatusHandler } from './utils/tlsValidator';
import { setupSocketIO, getOnlineUniqueUsersCount } from './services/socketService';
import { gameLoop } from './services/gameLoopService';
import { httpsHealthCheckHandler, HttpsHealthMonitor } from './utils/httpsHealthCheck';

// Load environment variables
dotenv.config();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
  : ["http://localhost:5173", "http://localhost:5174"];

const app: express.Application = express();
app.set('trust proxy', 1);
const server = createServer(app);

// Socket.IO will be initialized later with proper server (HTTP or HTTPS)
let io: Server;

// HTTPS health monitoring (production only)
let httpsHealthMonitor: HttpsHealthMonitor | null = null;

const PORT = parseInt(process.env.PORT || '3001', 10);
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '443', 10);

// HTTPS enforcement - redirect HTTP to HTTPS in production
app.use(httpsRedirectMiddleware);

// Security middleware - comprehensive OWASP-compliant headers
const isDevelopment = process.env.NODE_ENV === 'development';
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
const RATE_LIMIT_ENABLED = ((process.env.RATE_LIMIT_ENABLED ?? 'true').toLowerCase() !== 'false');

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // default 15 minutes
  max: parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS ||
    (process.env.NODE_ENV === 'development' ? '2000' : '100'),
    10
  ),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    // Do not count CORS preflights
    req.method === 'OPTIONS' ||
    // Public status endpoint
    req.path === '/api/status' ||
    // Dev-only skips
    (
      process.env.NODE_ENV === 'development' && (
        // Allow skipping auth endpoints during dev
        (process.env.RATE_LIMIT_SKIP_AUTH === 'true' && req.path.startsWith('/api/auth/')) ||
        // Allow skipping heavy game/universe endpoints during dev bursts
        (process.env.RATE_LIMIT_SKIP_GAME === 'true' && (req.path.startsWith('/api/game') || req.path.startsWith('/api/universe')))
      )
    )
});

/**
 * In development, disable the HTTP rate limiter entirely to allow unlimited requests.
 * Keep limiter active only in production deployments.
 */
if (RATE_LIMIT_ENABLED && process.env.NODE_ENV !== 'development') {
  app.use(limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const serverStart = Date.now(); // nodemon:restart v2

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'Attrition API',
    version: '1.0.0'
  });
});

// Public server status endpoint
app.get('/api/status', (req, res) => {
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
        environment: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve server status'
    });
  }
});

// Security monitoring endpoints (production only)
if (process.env.NODE_ENV === 'production') {
  app.get('/api/https-health', httpsHealthCheckHandler);
  app.get('/api/tls-security', tlsSecurityStatusHandler);
}

// Session invalidation middleware for authenticated routes
app.use('/api/game', sessionInvalidationMiddleware);
app.use('/api/universe', sessionInvalidationMiddleware);
app.use('/api/sync', sessionInvalidationMiddleware);
app.use('/api/security', sessionInvalidationMiddleware);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/security', require('./routes/security').default); // Security monitoring endpoints
app.use('/api/game', gameRoutes);
app.use('/api/universe', universeRoutes);
app.use('/api/sync', syncRoutes);

// Socket.IO will be setup in startServer() function

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

// Start server with HTTPS support
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Eager index sync to enforce idempotency before first writes (important for E2E concurrency)
    try {
      await Promise.allSettled([
        TechQueue.syncIndexes(),
        UnitQueue.syncIndexes(),
        Building.syncIndexes(),
      ]);
    } catch {
      // ignore sync errors in dev/test
    }

    // In production, HTTPS is mandatory - fail fast if SSL config is not available
    if (process.env.NODE_ENV === 'production') {
      console.log('🔐 Production mode: HTTPS enforcement enabled');
      
      // Load SSL configuration - this will throw if not available in production
      const sslConfig = await getSSLConfigFromEnvironment();
      
      if (!sslConfig) {
        const errorMessage = 'HTTPS is mandatory in production but SSL configuration is not available. ' +
          'Please provide SSL certificates via environment variables (SSL_CERTIFICATE, SSL_PRIVATE_KEY) ' +
          'or file paths (SSL_CERT_PATH, SSL_KEY_PATH).';
        console.error('❌ PRODUCTION STARTUP FAILED:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Production: Start HTTPS server only
      const httpsServer = createHttpsServer(app, sslConfig, HTTPS_PORT);
      
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
        console.log(`🔒 HTTP redirect server on port ${PORT} (redirects all traffic to HTTPS)`);
        console.log(`⚠️  HTTP server serves NO content - all requests redirected to HTTPS`);
      });
      
      // HTTPS server startup with enhanced logging
      httpsServer.listen(HTTPS_PORT, () => {
        console.log(`🚀 PRODUCTION HTTPS server running on port ${HTTPS_PORT}`);
        console.log(`📊 Health check: https://localhost:${HTTPS_PORT}/health`);
        console.log(`🎮 Game API: https://localhost:${HTTPS_PORT}/api`);
        console.log(`🔔 Socket.IO ready for secure connections`);
        console.log(`🔐 SSL/TLS: ${sslConfig.minVersion} to ${sslConfig.maxVersion}`);
        console.log(`✅ HTTPS ENFORCEMENT: All HTTP requests redirected to HTTPS`);
        console.log(`✅ SECURITY: Production server running in HTTPS-only mode`);
        
        // Start game loop with configurable interval
        const gameLoopInterval = parseInt(process.env.GAME_LOOP_INTERVAL_MS || '60000', 10);
        console.log(`🎮 Starting game loop with ${gameLoopInterval}ms interval`);
        console.log(`💰 Credit payouts every ${process.env.CREDIT_PAYOUT_PERIOD_MINUTES || '1'} minute(s)`);
        gameLoop.start(gameLoopInterval);
      });
      
      // Setup Socket.IO on HTTPS server
      setupSocketIO(io);
      
      // Start HTTPS health monitoring in production
      httpsHealthMonitor = new HttpsHealthMonitor(HTTPS_PORT, PORT, 'localhost');
      const monitoringInterval = parseInt(process.env.HTTPS_HEALTH_CHECK_INTERVAL_MINUTES || '60', 10);
      httpsHealthMonitor.start(monitoringInterval);
      console.log(`🔍 HTTPS health monitoring started (every ${monitoringInterval} minutes)`);
      
    } else {
      // Development/Test: HTTP server with optional HTTPS
      console.log(`🚀 Development mode: HTTP server enabled`);
      
      const sslConfig = await getSSLConfigFromEnvironment();
      
      if (sslConfig && process.env.FORCE_HTTPS === 'true') {
        // Development with HTTPS (for testing HTTPS behavior)
        console.log('🔐 Development HTTPS mode enabled (FORCE_HTTPS=true)');
        const httpsServer = createHttpsServer(app, sslConfig, HTTPS_PORT);
        
        io = new Server(httpsServer, {
          cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"]
          }
        });
        
        // Also run HTTP server for development convenience
        server.listen(PORT, () => {
          console.log(`🔒 HTTP server on port ${PORT} (redirects to HTTPS)`);
        });
        
        httpsServer.listen(HTTPS_PORT, () => {
          console.log(`🚀 Development HTTPS server on port ${HTTPS_PORT}`);
          console.log(`📊 Health check: https://localhost:${HTTPS_PORT}/health`);
          console.log(`🎮 Game API: https://localhost:${HTTPS_PORT}/api`);
          console.log(`🔔 Socket.IO ready for secure connections`);
        });
        
        setupSocketIO(io);
      } else {
        // Standard development: HTTP only
        io = new Server(server, {
          cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"]
          }
        });
        
        server.listen(PORT, () => {
          console.log(`🚀 Development HTTP server running on port ${PORT}`);
          console.log(`📊 Health check: http://localhost:${PORT}/health`);
          console.log(`🎮 Game API: http://localhost:${PORT}/api`);
          console.log(`🔔 Socket.IO ready for connections`);
          console.log(`⚠️  Development mode: HTTPS enforcement disabled`);
        });
        
        setupSocketIO(io);
      }
      
      // Start game loop for development
      const gameLoopInterval = parseInt(process.env.GAME_LOOP_INTERVAL_MS || '60000', 10);
      console.log(`🎮 Starting game loop with ${gameLoopInterval}ms interval`);
      console.log(`💰 Credit payouts every ${process.env.CREDIT_PAYOUT_PERIOD_MINUTES || '1'} minute(s)`);
      gameLoop.start(gameLoopInterval);
    }
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  gameLoop.stop();
  if (httpsHealthMonitor) {
    httpsHealthMonitor.stop();
  }
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  gameLoop.stop();
  if (httpsHealthMonitor) {
    httpsHealthMonitor.stop();
  }
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

startServer();

export { app, io };
