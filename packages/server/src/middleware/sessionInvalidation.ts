import { Request, Response, NextFunction } from 'express';
// import { AuthenticatedRequest } from '../types/auth';
// import { tokenRevocationService } from '../services/tokenRevocation';
// import { securityMonitoring } from '../services/securityMonitoring';

// Temporary type definition until the auth types file is created
import { TIMEOUTS } from '@game/shared';
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tokenId: string;
    [key: string]: any;
  };
}

interface SuspiciousActivity {
  userId: string;
  type: 'multiple_login_attempts' | 'unusual_ip_change' | 'concurrent_sessions' | 'device_mismatch';
  severity: 'low' | 'medium' | 'high';
  details: any;
  timestamp: Date;
}

interface UserSessionTracker {
  userId: string;
  loginAttempts: { timestamp: Date; ip: string; success: boolean }[];
  activeSessions: { tokenId: string; ip: string; deviceFingerprint?: string; lastActivity: Date }[];
  knownIPs: Set<string>;
  knownDevices: Set<string>;
}

class SessionInvalidationService {
  private userSessions = new Map<string, UserSessionTracker>();
  private suspiciousActivityThresholds = {
    maxLoginAttemptsPerHour: 5,
    maxFailedAttemptsPerHour: 3,
    maxConcurrentSessions: 3,
    ipChangeWindow: 300000, // 5 minutes
    deviceMismatchTolerance: 0 // No tolerance for device mismatches
  };

  /**
   * Track user activity and detect suspicious patterns
   */
  async trackActivity(req: AuthenticatedRequest): Promise<void> {
    if (!req.user?.id) return;

    const userId = req.user.id;
    const clientIP = this.getClientIP(req);
    const deviceFingerprint = req.headers['x-device-fingerprint'] as string;
    const tokenId = req.user.tokenId;

    // Initialize or get user session tracker
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        userId,
        loginAttempts: [],
        activeSessions: [],
        knownIPs: new Set(),
        knownDevices: new Set()
      });
    }

    const userTracker = this.userSessions.get(userId)!;

    // Update active session
    const sessionIndex = userTracker.activeSessions.findIndex(s => s.tokenId === tokenId);
    if (sessionIndex >= 0) {
      userTracker.activeSessions[sessionIndex].lastActivity = new Date();
      userTracker.activeSessions[sessionIndex].ip = clientIP;
    } else {
      userTracker.activeSessions.push({
        tokenId,
        ip: clientIP,
        deviceFingerprint,
        lastActivity: new Date()
      });
    }

    // Check for suspicious activity
    await this.checkSuspiciousActivity(userTracker, clientIP, deviceFingerprint, tokenId);
  }

  /**
   * Track login attempts (call this from auth endpoints)
   */
  async trackLoginAttempt(userId: string, ip: string, success: boolean): Promise<void> {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        userId,
        loginAttempts: [],
        activeSessions: [],
        knownIPs: new Set(),
        knownDevices: new Set()
      });
    }

    const userTracker = this.userSessions.get(userId)!;
    userTracker.loginAttempts.push({ timestamp: new Date(), ip, success });

    // Clean old login attempts (keep only last hour)
    const oneHourAgo = new Date(Date.now() - 3600000);
    userTracker.loginAttempts = userTracker.loginAttempts.filter(
      attempt => attempt.timestamp > oneHourAgo
    );

    // Check for brute force attempts
    await this.checkBruteForceActivity(userTracker);
  }

  private async checkSuspiciousActivity(
    userTracker: UserSessionTracker,
    clientIP: string,
    deviceFingerprint: string | undefined,
    tokenId: string
  ): Promise<void> {
    const suspiciousActivities: SuspiciousActivity[] = [];

    // Check for unusual IP changes
    if (userTracker.knownIPs.size > 0 && !userTracker.knownIPs.has(clientIP)) {
      const recentSession = userTracker.activeSessions.find(s => 
        s.tokenId === tokenId && 
        Date.now() - s.lastActivity.getTime() < this.suspiciousActivityThresholds.ipChangeWindow
      );
      
      if (recentSession && recentSession.ip !== clientIP) {
        suspiciousActivities.push({
          userId: userTracker.userId,
          type: 'unusual_ip_change',
          severity: 'high',
          details: { previousIP: recentSession.ip, newIP: clientIP, timeWindow: this.suspiciousActivityThresholds.ipChangeWindow },
          timestamp: new Date()
        });
      }
    }

    // Check for device fingerprint mismatches
    if (deviceFingerprint && userTracker.knownDevices.size > 0 && !userTracker.knownDevices.has(deviceFingerprint)) {
      suspiciousActivities.push({
        userId: userTracker.userId,
        type: 'device_mismatch',
        severity: 'high',
        details: { newDeviceFingerprint: deviceFingerprint, knownDevices: Array.from(userTracker.knownDevices) },
        timestamp: new Date()
      });
    }

    // Check for too many concurrent sessions
    const activeSessions = userTracker.activeSessions.filter(
      s => Date.now() - s.lastActivity.getTime() < 1800000 // 30 minutes
    );

    if (activeSessions.length > this.suspiciousActivityThresholds.maxConcurrentSessions) {
      suspiciousActivities.push({
        userId: userTracker.userId,
        type: 'concurrent_sessions',
        severity: 'medium',
        details: { sessionCount: activeSessions.length, maxAllowed: this.suspiciousActivityThresholds.maxConcurrentSessions },
        timestamp: new Date()
      });
    }

    // Update known IPs and devices
    userTracker.knownIPs.add(clientIP);
    if (deviceFingerprint) {
      userTracker.knownDevices.add(deviceFingerprint);
    }

    // Process suspicious activities
    for (const activity of suspiciousActivities) {
      await this.handleSuspiciousActivity(activity, tokenId);
    }
  }

  private async checkBruteForceActivity(userTracker: UserSessionTracker): Promise<void> {
    const recentAttempts = userTracker.loginAttempts.filter(
      attempt => Date.now() - attempt.timestamp.getTime() < 3600000 // Last hour
    );

    const failedAttempts = recentAttempts.filter(attempt => !attempt.success);
    const totalAttempts = recentAttempts.length;

    if (failedAttempts.length >= this.suspiciousActivityThresholds.maxFailedAttemptsPerHour ||
        totalAttempts >= this.suspiciousActivityThresholds.maxLoginAttemptsPerHour) {
      
      const activity: SuspiciousActivity = {
        userId: userTracker.userId,
        type: 'multiple_login_attempts',
        severity: 'high',
        details: { 
          failedAttempts: failedAttempts.length, 
          totalAttempts,
          timeWindow: '1 hour',
          ips: [...new Set(recentAttempts.map(a => a.ip))]
        },
        timestamp: new Date()
      };

      // Invalidate all sessions for this user due to brute force
      for (const session of userTracker.activeSessions) {
        await this.handleSuspiciousActivity(activity, session.tokenId);
      }
    }
  }

  private async handleSuspiciousActivity(activity: SuspiciousActivity, tokenId: string): Promise<void> {
    try {
      // Log the suspicious activity
      console.warn(`Suspicious activity detected:`, {
        userId: activity.userId,
        type: activity.type,
        severity: activity.severity,
        details: activity.details,
        tokenId
      });

      // Report to security monitoring
      // TODO: Re-enable when securityMonitoring service is available
      // await securityMonitoring.reportIncident({
      //   type: 'suspicious_activity',
      //   severity: activity.severity,
      //   description: `Detected ${activity.type} for user ${activity.userId}`,
      //   userId: activity.userId,
      //   metadata: {
      //     activityType: activity.type,
      //     tokenId,
      //     ...activity.details
      //   }
      // });

      // Decide whether to invalidate session based on severity
      if (activity.severity === 'high' || 
          (activity.severity === 'medium' && activity.type === 'concurrent_sessions')) {
        
        // Invalidate the token
        // TODO: Re-enable when tokenRevocationService is available
        // await tokenRevocationService.revokeToken(tokenId);
        
        // Remove from active sessions
        const userTracker = this.userSessions.get(activity.userId);
        if (userTracker) {
          userTracker.activeSessions = userTracker.activeSessions.filter(
            s => s.tokenId !== tokenId
          );
        }

        console.warn(`Session invalidated due to suspicious activity:`, {
          userId: activity.userId,
          tokenId,
          activityType: activity.type,
          severity: activity.severity
        });

        // Send security alert
        // TODO: Re-enable when securityMonitoring service is available
        // await securityMonitoring.sendAlert({
        //   type: 'session_invalidated',
        //   severity: activity.severity,
        //   message: `Session automatically invalidated for user ${activity.userId} due to ${activity.type}`,
        //   userId: activity.userId,
        //   metadata: {
        //     tokenId,
        //     activityType: activity.type,
        //     autoInvalidated: true
        //   }
        // });
      }
    } catch (error) {
      console.error('Error handling suspicious activity:', error);
    }
  }

  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           '0.0.0.0';
  }

  /**
   * Clean up old session data
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const cleanupThreshold = 24 * 60 * 60 * 1000; // 24 hours

    for (const [userId, tracker] of this.userSessions.entries()) {
      // Clean old login attempts
      tracker.loginAttempts = tracker.loginAttempts.filter(
        attempt => now - attempt.timestamp.getTime() < cleanupThreshold
      );

      // Clean old sessions
      tracker.activeSessions = tracker.activeSessions.filter(
        session => now - session.lastActivity.getTime() < cleanupThreshold
      );

      // Remove user tracker if no recent activity
      if (tracker.loginAttempts.length === 0 && tracker.activeSessions.length === 0) {
        this.userSessions.delete(userId);
      }
    }
  }
}

export const sessionInvalidationService = new SessionInvalidationService();

/**
 * Middleware to track user activity and detect suspicious patterns
 */
export const sessionInvalidationMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user?.id) {
      await sessionInvalidationService.trackActivity(req);
    }
    next();
  } catch (error) {
    console.error('Session invalidation middleware error:', error);
    next(); // Don't block the request on tracking errors
  }
};

// Clean up old data every hour
setInterval(() => {
  sessionInvalidationService.cleanup();
}, TIMEOUTS.ONE_HOUR);

export { sessionInvalidationService as default };
