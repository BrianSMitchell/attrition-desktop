/**
 * Advanced Security Monitoring and Session Invalidation System
 * 
 * Provides comprehensive monitoring of authentication events and automatic
 * session invalidation when suspicious patterns are detected.
 */

import { DB_FIELDS, ENV_VARS } from '@game/shared';

import { Request } from 'express';
import { EventEmitter } from 'events';
import { revokeToken } from '../middleware/auth';
import { DeviceFingerprint, generateDeviceFingerprint, compareDeviceFingerprints } from './deviceFingerprint';

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details: any;
  riskScore: number;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_BRUTE_FORCE = 'LOGIN_BRUTE_FORCE',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  DEVICE_CHANGE = 'DEVICE_CHANGE',
  SUSPICIOUS_IP = 'SUSPICIOUS_IP',
  MULTIPLE_CONCURRENT_SESSIONS = 'MULTIPLE_CONCURRENT_SESSIONS',
  UNUSUAL_ACCESS_PATTERN = 'UNUSUAL_ACCESS_PATTERN',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION'
}

export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface UserSessionInfo {
  userId: string;
  sessionId: string;
  deviceFingerprint: DeviceFingerprint;
  ip: string;
  userAgent: string;
  lastActivity: Date;
  loginTime: Date;
  tokenJti?: string;
  isActive: boolean;
}

export interface SuspiciousPattern {
  type: string;
  description: string;
  riskScore: number;
  threatLevel: ThreatLevel;
  autoAction?: 'REVOKE_TOKEN' | 'LOCK_ACCOUNT' | 'ALERT_ONLY';
}

/**
 * Advanced Security Monitor with pattern detection and automated response
 */
export class SecurityMonitor extends EventEmitter {
  private events: SecurityEvent[] = [];
  private userSessions: Map<string, UserSessionInfo[]> = new Map();
  private ipReputationCache: Map<string, { score: number; lastChecked: Date }> = new Map();
  private suspiciousPatterns: Map<string, SuspiciousPattern[]> = new Map();
  
  private readonly config = {
    maxEventsRetention: parseInt(process.env[ENV_VARS.SECURITY_EVENTS_RETENTION] || '10000'),
    maxSessionsPerUser: parseInt(process.env[ENV_VARS.MAX_SESSIONS_PER_USER] || '5'),
    deviceFingerprintThreshold: parseFloat(process.env[ENV_VARS.DEVICE_FINGERPRINT_THRESHOLD] || '0.7'),
    autoRevokeOnSuspicious: process.env[ENV_VARS.AUTO_REVOKE_ON_SUSPICIOUS] === 'true',
    alertThresholds: {
      failedLogins: parseInt(process.env.FAILED_LOGIN_THRESHOLD || '10'),
      deviceChanges: parseInt(process.env.DEVICE_CHANGE_THRESHOLD || '3'),
      ipChanges: parseInt(process.env.IP_CHANGE_THRESHOLD || '5'),
      concurrentSessions: parseInt(process.env.CONCURRENT_SESSION_THRESHOLD || '3')
    }
  };

  constructor() {
    super();
    this.startCleanupTasks();
    this.setupPatternDetection();
  }

  /**
   * Record a security event and analyze for suspicious patterns
   */
  recordEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'riskScore'>): SecurityEvent {
    const fullEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
      riskScore: this.calculateRiskScore(event)
    };

    this.events.push(fullEvent);
    this.trimEvents();

    // Analyze patterns and take action if needed
    this.analyzePatterns(fullEvent);

    // Emit event for external listeners
    this.emit('securityEvent', fullEvent);

    return fullEvent;
  }

  /**
   * Create or update user session information
   */
  createSession(userId: string, req: Request, tokenJti?: string): UserSessionInfo {
    const deviceFingerprint = generateDeviceFingerprint(req);
    const sessionId = this.generateSessionId();
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    const session: UserSessionInfo = {
      userId,
      sessionId,
      deviceFingerprint,
      ip,
      userAgent,
      lastActivity: new Date(),
      loginTime: new Date(),
      tokenJti,
      isActive: true
    };

    // Add to user sessions
    const userSessions = this.userSessions.get(userId) || [];
    userSessions.push(session);

    // Check for concurrent session limits
    if (userSessions.length > this.config.maxSessionsPerUser) {
      this.recordEvent({
        type: SecurityEventType.MULTIPLE_CONCURRENT_SESSIONS,
        userId,
        ip,
        userAgent,
        details: { 
          sessionCount: userSessions.length,
          maxAllowed: this.config.maxSessionsPerUser
        }
      });

      // Revoke oldest sessions
      const sessionsToRevoke = userSessions
        .sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime())
        .slice(0, userSessions.length - this.config.maxSessionsPerUser);

      for (const sessionToRevoke of sessionsToRevoke) {
        this.revokeSession(sessionToRevoke);
      }
    }

    this.userSessions.set(userId, userSessions);

    // Check for device fingerprint changes
    this.checkDeviceChanges(userId, deviceFingerprint, ip, userAgent);

    return session;
  }

  /**
   * Update session activity
   */
  updateSessionActivity(userId: string, sessionId: string): void {
    const sessions = this.userSessions.get(userId);
    if (sessions) {
      const session = sessions.find(s => s.sessionId === sessionId);
      if (session) {
        session.lastActivity = new Date();
      }
    }
  }

  /**
   * Revoke a user session
   */
  revokeSession(session: UserSessionInfo): void {
    session.isActive = false;
    
    if (session.tokenJti) {
      revokeToken(session.tokenJti);
    }

    this.recordEvent({
      type: SecurityEventType.TOKEN_REVOKED,
      userId: session.userId,
      ip: session.ip,
      userAgent: session.userAgent,
      details: {
        reason: 'Suspicious activity detected',
        sessionId: session.sessionId
      }
    });
  }

  /**
   * Check for suspicious device fingerprint changes
   */
  private checkDeviceChanges(userId: string, currentFingerprint: DeviceFingerprint, ip: string, userAgent: string): void {
    const existingSessions = this.userSessions.get(userId) || [];
    const recentSessions = existingSessions.filter(s => 
      s.isActive && (Date.now() - s.lastActivity.getTime()) < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    for (const session of recentSessions) {
      const similarity = compareDeviceFingerprints(currentFingerprint, session.deviceFingerprint);
      
      if (similarity < this.config.deviceFingerprintThreshold) {
        const riskScore = this.calculateDeviceChangeRisk(similarity, session, currentFingerprint);
        
        this.recordEvent({
          type: SecurityEventType.DEVICE_CHANGE,
          userId,
          ip,
          userAgent,
          details: {
            similarity,
            previousDevice: session.deviceFingerprint,
            currentDevice: currentFingerprint,
            sessionId: session.sessionId
          }
        });

        // Auto-revoke if risk is too high
        if (riskScore > 0.8 && this.config.autoRevokeOnSuspicious) {
          this.revokeSession(session);
        }
      }
    }
  }

  /**
   * Analyze patterns in security events
   */
  private analyzePatterns(event: SecurityEvent): void {
    const patterns = this.detectPatterns(event);
    
    for (const pattern of patterns) {
      console.warn(`[SECURITY] Suspicious pattern detected: ${pattern.type}`, {
        description: pattern.description,
        riskScore: pattern.riskScore,
        threatLevel: pattern.threatLevel,
        event: {
          type: event.type,
          userId: event.userId,
          ip: event.ip
        }
      });

      // Take automated action based on pattern
      if (pattern.autoAction && event.userId) {
        this.executeAutomatedAction(pattern.autoAction, event.userId, event, pattern);
      }

      // Emit high-risk patterns for real-time alerting
      if (pattern.threatLevel === ThreatLevel.HIGH || pattern.threatLevel === ThreatLevel.CRITICAL) {
        this.emit('highRiskPattern', { pattern, event });
      }
    }
  }

  /**
   * Detect suspicious patterns in events
   */
  private detectPatterns(event: SecurityEvent): SuspiciousPattern[] {
    const patterns: SuspiciousPattern[] = [];

    // Pattern 1: Rapid failed logins
    if (event.type === SecurityEventType.LOGIN_FAILED) {
      const recentFailures = this.getRecentEventsByType(SecurityEventType.LOGIN_FAILED, 15 * 60 * 1000) // 15 minutes
        .filter(e => e.ip === event.ip);
      
      if (recentFailures.length >= this.config.alertThresholds.failedLogins) {
        patterns.push({
          type: 'RAPID_FAILED_LOGINS',
          description: `${recentFailures.length} failed login attempts from IP ${event.ip}`,
          riskScore: 0.9,
          threatLevel: ThreatLevel.HIGH,
          autoAction: 'ALERT_ONLY'
        });
      }
    }

    // Pattern 2: Multiple device changes
    if (event.type === SecurityEventType.DEVICE_CHANGE && event.userId) {
      const recentDeviceChanges = this.getRecentEventsByUserAndType(event.userId, SecurityEventType.DEVICE_CHANGE, 60 * 60 * 1000); // 1 hour
      
      if (recentDeviceChanges.length >= this.config.alertThresholds.deviceChanges) {
        patterns.push({
          type: 'MULTIPLE_DEVICE_CHANGES',
          description: `${recentDeviceChanges.length} device changes for user ${event.userId}`,
          riskScore: 0.8,
          threatLevel: ThreatLevel.HIGH,
          autoAction: 'REVOKE_TOKEN'
        });
      }
    }

    // Pattern 3: Suspicious IP patterns
    if (event.ip && this.isSuspiciousIP(event.ip)) {
      patterns.push({
        type: 'SUSPICIOUS_IP',
        description: `Activity from suspicious IP ${event.ip}`,
        riskScore: 0.7,
        threatLevel: ThreatLevel.MEDIUM,
        autoAction: 'ALERT_ONLY'
      });
    }

    // Pattern 4: Unusual access patterns (e.g., off-hours access)
    if (this.isUnusualAccessTime(event.timestamp) && event.userId) {
      const userHistory = this.getUserLoginHistory(event.userId);
      if (userHistory.length > 10 && !this.isNormalTimeForUser(event.userId, event.timestamp)) {
        patterns.push({
          type: 'UNUSUAL_ACCESS_TIME',
          description: `Access at unusual time for user ${event.userId}`,
          riskScore: 0.6,
          threatLevel: ThreatLevel.MEDIUM,
          autoAction: 'ALERT_ONLY'
        });
      }
    }

    return patterns;
  }

  /**
   * Execute automated security actions
   */
  private executeAutomatedAction(action: string, userId: string, event: SecurityEvent, pattern: SuspiciousPattern): void {
    switch (action) {
      case 'REVOKE_TOKEN':
        const sessions = this.userSessions.get(userId) || [];
        sessions.forEach(session => {
          if (session.isActive) {
            this.revokeSession(session);
          }
        });
        break;

      case 'LOCK_ACCOUNT':
        // Implementation would depend on user model having a locked field
        console.warn(`[SECURITY] Account lock triggered for user ${userId}`, { pattern, event });
        break;

      case 'ALERT_ONLY':
        // Already logged, emit alert event
        this.emit('securityAlert', { action, userId, event, pattern });
        break;
    }
  }

  /**
   * Get recent events by type
   */
  private getRecentEventsByType(type: SecurityEventType, timeWindowMs: number): SecurityEvent[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.events.filter(e => e.type === type && e.timestamp.getTime() > cutoff);
  }

  /**
   * Get recent events by user and type
   */
  private getRecentEventsByUserAndType(userId: string, type: SecurityEventType, timeWindowMs: number): SecurityEvent[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.events.filter(e => 
      e.userId === userId && 
      e.type === type && 
      e.timestamp.getTime() > cutoff
    );
  }

  /**
   * Calculate risk score for an event
   */
  private calculateRiskScore(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'riskScore'>): number {
    let score = 0;

    // Base scores by event type
    switch (event.type) {
      case SecurityEventType.LOGIN_FAILED:
        score += 0.3;
        break;
      case SecurityEventType.DEVICE_CHANGE:
        score += 0.6;
        break;
      case SecurityEventType.SUSPICIOUS_IP:
        score += 0.7;
        break;
      case SecurityEventType.MULTIPLE_CONCURRENT_SESSIONS:
        score += 0.5;
        break;
      default:
        score += 0.1;
    }

    // Increase score based on details
    if (event.details) {
      if (event.details.similarity && event.details.similarity < 0.3) {
        score += 0.4; // Very different device fingerprint
      }
      if (event.details.sessionCount > this.config.maxSessionsPerUser) {
        score += 0.3;
      }
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Calculate device change risk
   */
  private calculateDeviceChangeRisk(similarity: number, session: UserSessionInfo, currentFingerprint: DeviceFingerprint): number {
    let risk = 1.0 - similarity; // Lower similarity = higher risk

    // Increase risk if IP changed dramatically
    if (session.ip !== currentFingerprint.ipNetwork) {
      risk += 0.3;
    }

    // Increase risk if user agent changed completely
    if (!session.userAgent.includes(currentFingerprint.userAgent.split(' ')[0])) {
      risk += 0.2;
    }

    return Math.min(risk, 1.0);
  }

  /**
   * Check if IP is suspicious (simple heuristics)
   */
  private isSuspiciousIP(ip: string): boolean {
    // Check against known suspicious patterns
    const suspiciousPatterns = [
      /^10\./, // Private IPs might be suspicious depending on context
      /^192\.168\./, // Private IPs
      /^127\./, // Localhost
      /^0\.0\.0\.0$/ // Invalid IP
    ];

    // In a real implementation, you'd check against threat intelligence feeds
    return suspiciousPatterns.some(pattern => pattern.test(ip));
  }

  /**
   * Check if access time is unusual
   */
  private isUnusualAccessTime(timestamp: Date): boolean {
    const hour = timestamp.getHours();
    // Consider 2 AM to 6 AM as unusual hours
    return hour >= 2 && hour < 6;
  }

  /**
   * Get user login history
   */
  private getUserLoginHistory(userId: string): SecurityEvent[] {
    return this.events.filter(e => 
      e.userId === userId && 
      e.type === SecurityEventType.LOGIN_SUCCESS
    ).slice(-50); // Last 50 logins
  }

  /**
   * Check if timestamp is normal for user
   */
  private isNormalTimeForUser(userId: string, timestamp: Date): boolean {
    const history = this.getUserLoginHistory(userId);
    const hour = timestamp.getHours();
    
    // Calculate user's typical login hours
    const loginHours = history.map(e => e.timestamp.getHours());
    const averageHour = loginHours.reduce((a, b) => a + b, 0) / loginHours.length;
    
    // Allow ±3 hours from average
    return Math.abs(hour - averageHour) <= 3;
  }

  /**
   * Get security statistics
   */
  getStatistics(timeWindowMs: number = 24 * 60 * 60 * 1000): {
    totalEvents: number;
    eventsByType: { [key: string]: number };
    riskDistribution: { [key: string]: number };
    activeAlerts: number;
  } {
    const cutoff = Date.now() - timeWindowMs;
    const recentEvents = this.events.filter(e => e.timestamp.getTime() > cutoff);

    const eventsByType: { [key: string]: number } = {};
    const riskDistribution = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const event of recentEvents) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      
      if (event.riskScore < 0.3) riskDistribution.low++;
      else if (event.riskScore < 0.6) riskDistribution.medium++;
      else if (event.riskScore < 0.8) riskDistribution.high++;
      else riskDistribution.critical++;
    }

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      riskDistribution,
      activeAlerts: this.getActiveAlerts().length
    };
  }

  /**
   * Get active security alerts
   */
  getActiveAlerts(): SecurityEvent[] {
    const cutoff = Date.now() - (60 * 60 * 1000); // Last hour
    return this.events.filter(e => 
      e.riskScore > 0.7 && 
      e.timestamp.getTime() > cutoff
    );
  }

  /**
   * Setup pattern detection rules
   */
  private setupPatternDetection(): void {
    // Initialize pattern detection rules
    console.log('[SECURITY] Security monitor initialized with pattern detection');
  }

  /**
   * Start cleanup tasks
   */
  private startCleanupTasks(): void {
    // Clean up old events every hour
    setInterval(() => {
      this.trimEvents();
      this.cleanupInactiveSessions();
    }, 60 * 60 * 1000);
  }

  /**
   * Trim events to maximum retention
   */
  private trimEvents(): void {
    if (this.events.length > this.config.maxEventsRetention) {
      this.events = this.events.slice(-this.config.maxEventsRetention);
    }
  }

  /**
   * Clean up inactive sessions
   */
  private cleanupInactiveSessions(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    for (const [userId, sessions] of this.userSessions.entries()) {
      const activeSessions = sessions.filter(s => 
        s.isActive && s.lastActivity.getTime() > cutoff
      );
      
      if (activeSessions.length !== sessions.length) {
        this.userSessions.set(userId, activeSessions);
      }
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

// Global security monitor instance
export const securityMonitor = new SecurityMonitor();

/**
 * Middleware to track authentication events
 */
export const trackSecurityEvent = (eventType: SecurityEventType, details?: any) => {
  return (req: any, res: any, next: any) => {
    const event = {
      type: eventType,
      userId: req.user?._id?.toString(),
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      details: details || {}
    };

    securityMonitor.recordEvent(event);
    next();
  };
};

export default securityMonitor;
