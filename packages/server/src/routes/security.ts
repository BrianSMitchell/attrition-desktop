import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimiting';
import { securityMonitor, SecurityEventType } from '../utils/securityMonitor';
import jwt from 'jsonwebtoken';

const router: Router = Router();

// All security endpoints require authentication and are rate limited
router.use(authenticate);
router.use(authRateLimit);

/**
 * Get security statistics and metrics
 */
router.get('/stats', asyncHandler(async (req: AuthRequest, res: Response) => {
  const timeWindow = parseInt(req.query.hours as string) || 24;
  const timeWindowMs = timeWindow * 60 * 60 * 1000;

  const stats = securityMonitor.getStatistics(timeWindowMs);
  
  res.json({
    success: true,
    data: {
      timeWindow: `${timeWindow} hours`,
      ...stats,
      timestamp: new Date().toISOString()
    }
  });
}));

/**
 * Get active security alerts
 */
router.get('/alerts', asyncHandler(async (req: AuthRequest, res: Response) => {
  const activeAlerts = securityMonitor.getActiveAlerts();
  
  res.json({
    success: true,
    data: {
      alerts: activeAlerts,
      count: activeAlerts.length,
      timestamp: new Date().toISOString()
    }
  });
}));

/**
 * Get security events for the current user
 */
router.get('/events', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = (req.user as any)._id.toString();
  const limit = parseInt(req.query.limit as string) || 50;
  const hours = parseInt(req.query.hours as string) || 24;
  
  // Get recent events for this user
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  const userEvents = (securityMonitor as any).events
    .filter((e: any) => 
      e.userId === userId && 
      e.timestamp.getTime() > cutoff
    )
    .sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);

  res.json({
    success: true,
    data: {
      events: userEvents,
      count: userEvents.length,
      timeWindow: `${hours} hours`,
      userId,
      timestamp: new Date().toISOString()
    }
  });
}));

/**
 * Get current user's active sessions
 */
router.get('/sessions', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = (req.user as any)._id.toString();
  
  // Access private userSessions map
  const userSessions = (securityMonitor as any).userSessions.get(userId) || [];
  const activeSessions = userSessions.filter((s: any) => s.isActive);
  
  // Sanitize session data for response
  const sanitizedSessions = activeSessions.map((session: any) => ({
    sessionId: session.sessionId,
    ip: session.ip,
    userAgent: session.userAgent,
    loginTime: session.loginTime,
    lastActivity: session.lastActivity,
    deviceFingerprint: {
      hash: session.deviceFingerprint.hash.substring(0, 8) + '...',
      userAgent: session.deviceFingerprint.userAgent.substring(0, 50),
      acceptLanguage: session.deviceFingerprint.acceptLanguage,
      ipNetwork: session.deviceFingerprint.ipNetwork
    }
  }));

  res.json({
    success: true,
    data: {
      sessions: sanitizedSessions,
      count: sanitizedSessions.length,
      userId,
      timestamp: new Date().toISOString()
    }
  });
}));

/**
 * Revoke a specific session (security action)
 */
router.delete('/sessions/:sessionId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = (req.user as any)._id.toString();
  const sessionId = req.params.sessionId;
  
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: 'Session ID is required'
    });
  }
  
  // Find and revoke the session
  const userSessions = (securityMonitor as any).userSessions.get(userId) || [];
  const session = userSessions.find((s: any) => s.sessionId === sessionId && s.isActive);
  
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found or already inactive'
    });
  }
  
  // Revoke the session
  securityMonitor.revokeSession(session);
  
  res.json({
    success: true,
    message: 'Session revoked successfully',
    data: {
      sessionId,
      revokedAt: new Date().toISOString()
    }
  });
}));

/**
 * Revoke all sessions except current (logout from all other devices)
 */
router.delete('/sessions', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = (req.user as any)._id.toString();
  const currentToken = req.headers.authorization?.split(' ')[1];
  
  if (!currentToken) {
    return res.status(400).json({
      success: false,
      error: 'Current token not found'
    });
  }
  
  // Get current token JTI to preserve current session
  const currentTokenDecoded = jwt.decode(currentToken) as { jti?: string };
  const currentJti = currentTokenDecoded?.jti;
  
  // Find and revoke all other sessions
  const userSessions = (securityMonitor as any).userSessions.get(userId) || [];
  let revokedCount = 0;
  
  for (const session of userSessions) {
    if (session.isActive && session.tokenJti !== currentJti) {
      securityMonitor.revokeSession(session);
      revokedCount++;
    }
  }
  
  res.json({
    success: true,
    message: `${revokedCount} sessions revoked successfully`,
    data: {
      revokedSessions: revokedCount,
      currentSessionPreserved: !!currentJti,
      revokedAt: new Date().toISOString()
    }
  });
}));

/**
 * Security health check endpoint
 */
router.get('/health', asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = securityMonitor.getStatistics(60 * 60 * 1000); // Last hour
  const activeAlerts = securityMonitor.getActiveAlerts();
  
  const health = {
    status: 'healthy',
    checks: {
      monitoringActive: true,
      alertsCount: activeAlerts.length,
      eventsProcessed: stats.totalEvents,
      highRiskEvents: stats.riskDistribution.critical + stats.riskDistribution.high
    }
  };
  
  // Determine overall health status
  if (activeAlerts.length > 10) {
    health.status = 'warning';
  }
  if (activeAlerts.length > 50 || health.checks.highRiskEvents > 100) {
    health.status = 'critical';
  }
  
  res.json({
    success: true,
    data: health,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Record a manual security event (for testing or manual reporting)
 */
router.post('/events', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type, details } = req.body;
  
  if (!type || !Object.values(SecurityEventType).includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Valid event type is required',
      validTypes: Object.values(SecurityEventType)
    });
  }
  
  const event = securityMonitor.recordEvent({
    type,
    userId: (req.user as any)._id.toString(),
    ip: req.ip || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    details: details || {}
  });
  
  res.json({
    success: true,
    message: 'Security event recorded',
    data: {
      eventId: event.id,
      type: event.type,
      riskScore: event.riskScore,
      timestamp: event.timestamp
    }
  });
}));

export default router;
