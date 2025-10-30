import { ENV_VARS } from '@game/shared';
import { ENV_VALUES } from '@game/shared';

/**
 * TLS Session Management Utilities
 * 
 * Provides advanced TLS session management capabilities including:
 * - Session store management
 * - Session timeout handling
 * - Session security validation
 * - Session resumption controls
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import { HTTP_STATUS } from '../constants/response-formats';

/**
 * TLS session information
 */
export interface TLSSessionInfo {
  id: string;
  created: Date;
  lastAccess: Date;
  accessCount: number;
  clientIP: string;
  userAgent?: string;
  protocol: string;
  cipher: string;
  securityLevel: 'low' | 'medium' | 'high';
  isValid: boolean;
}

/**
 * TLS session store configuration
 */
export interface TLSSessionStoreConfig {
  maxSessions: number;
  sessionTimeout: number; // in seconds
  cleanupInterval: number; // in seconds
  secureOnly: boolean;
  enableMetrics: boolean;
}

/**
 * TLS session validation result
 */
export interface SessionValidationResult {
  isValid: boolean;
  reason?: string;
  securityLevel: 'low' | 'medium' | 'high';
  recommendations?: string[];
}

/**
 * Advanced TLS session manager
 */
export class TLSSessionManager extends EventEmitter {
  private sessions: Map<string, TLSSessionInfo> = new Map();
  private cleanupTimer?: NodeJS.Timeout;
  private metrics = {
    totalSessions: 0,
    activeSessions: 0,
    expiredSessions: 0,
    invalidSessions: 0,
    securityViolations: 0
  };

  constructor(private config: TLSSessionStoreConfig) {
    super();
    this.startCleanupTimer();
  }

  /**
   * Create a new TLS session
   */
  createSession(sessionData: {
    clientIP: string;
    userAgent?: string;
    protocol: string;
    cipher: string;
  }): TLSSessionInfo {
    const sessionId = this.generateSessionId();
    const securityLevel = this.assessSecurityLevel(sessionData.protocol, sessionData.cipher);
    
    const session: TLSSessionInfo = {
      id: sessionId,
      created: new Date(),
      lastAccess: new Date(),
      accessCount: 1,
      clientIP: sessionData.clientIP,
      userAgent: sessionData.userAgent,
      protocol: sessionData.protocol,
      cipher: sessionData.cipher,
      securityLevel,
      isValid: true
    };

    // Check if we've exceeded max sessions
    if (this.sessions.size >= this.config.maxSessions) {
      this.evictOldestSession();
    }

    this.sessions.set(sessionId, session);
    this.metrics.totalSessions++;
    this.metrics.activeSessions++;

    this.emit('sessionCreated', session);

    if (this.config.enableMetrics) {
      console.log(`?? TLS session created: ${sessionId} (${securityLevel} security)`);
    }

    return session;
  }

  /**
   * Validate an existing TLS session
   */
  validateSession(sessionId: string, clientIP: string): SessionValidationResult {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return {
        isValid: false,
        reason: 'Session not found',
        securityLevel: 'low'
      };
    }

    // Check if session has expired
    const now = new Date();
    const sessionAge = (now.getTime() - session.created.getTime()) / 1000;
    if (sessionAge > this.config.sessionTimeout) {
      this.invalidateSession(sessionId, 'Session expired');
      return {
        isValid: false,
        reason: 'Session expired',
        securityLevel: session.securityLevel
      };
    }

    // Check if client IP matches (if enforced)
    if (this.config.secureOnly && session.clientIP !== clientIP) {
      this.invalidateSession(sessionId, 'IP address mismatch');
      this.metrics.securityViolations++;
      this.emit('securityViolation', {
        sessionId,
        type: 'ip_mismatch',
        expected: session.clientIP,
        actual: clientIP
      });
      
      return {
        isValid: false,
        reason: 'Client IP address mismatch',
        securityLevel: 'low',
        recommendations: ['Consider disabling session resumption', 'Implement stricter client validation']
      };
    }

    // Update session access
    session.lastAccess = now;
    session.accessCount++;

    const recommendations: string[] = [];
    if (session.securityLevel === 'low') {
      recommendations.push('Upgrade to stronger cipher suites');
      recommendations.push('Use TLS 1.3 for better security');
    }

    return {
      isValid: true,
      securityLevel: session.securityLevel,
      recommendations: recommendations.length > 0 ? recommendations : undefined
    };
  }

  /**
   * Invalidate a TLS session
   */
  invalidateSession(sessionId: string, reason?: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.isValid = false;
    this.sessions.delete(sessionId);
    this.metrics.activeSessions--;
    this.metrics.invalidSessions++;

    this.emit('sessionInvalidated', { sessionId, reason, session });

    if (this.config.enableMetrics) {
      console.log(`?? TLS session invalidated: ${sessionId} (${reason || 'No reason provided'})`);
    }

    return true;
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): TLSSessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get session metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeSessions: this.sessions.size,
      sessionStoreSize: this.sessions.size,
      maxSessions: this.config.maxSessions,
      sessionTimeout: this.config.sessionTimeout
    };
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionAge = (now.getTime() - session.created.getTime()) / 1000;
      
      if (sessionAge > this.config.sessionTimeout) {
        this.sessions.delete(sessionId);
        cleanedCount++;
        this.metrics.expiredSessions++;
        this.emit('sessionExpired', { sessionId, session });
      }
    }

    this.metrics.activeSessions = this.sessions.size;

    if (cleanedCount > 0 && this.config.enableMetrics) {
      console.log(`?? Cleaned up ${cleanedCount} expired TLS sessions`);
    }

    return cleanedCount;
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    const sessionCount = this.sessions.size;
    this.sessions.clear();
    this.metrics.activeSessions = 0;
    this.emit('allSessionsCleared', { sessionCount });

    if (this.config.enableMetrics) {
      console.log(`???  Cleared all ${sessionCount} TLS sessions`);
    }
  }

  /**
   * Shutdown the session manager
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.clearAllSessions();
    this.removeAllListeners();

    console.log('?? TLS session manager shutdown complete');
  }

  /**
   * Generate a cryptographically secure session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Assess the security level of a TLS session
   */
  private assessSecurityLevel(protocol: string, cipher: string): 'low' | 'medium' | 'high' {
    // TLS 1.3 with AEAD ciphers = high security
    if (protocol === 'TLSv1.3' && cipher.includes('AEAD')) {
      return 'high';
    }

    // TLS 1.2 with strong ciphers = medium security
    if (protocol === 'TLSv1.2' && (cipher.includes('ECDHE') || cipher.includes('DHE'))) {
      return 'medium';
    }

    // Everything else = low security
    return 'low';
  }

  /**
   * Evict the oldest session to make room for new ones
   */
  private evictOldestSession(): void {
    let oldestSessionId: string | undefined;
    let oldestTime = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.created.getTime() < oldestTime) {
        oldestTime = session.created.getTime();
        oldestSessionId = sessionId;
      }
    }

    if (oldestSessionId) {
      this.invalidateSession(oldestSessionId, 'Session evicted (max sessions reached)');
    }
  }

  /**
   * Start the periodic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.cleanupInterval * 1000);
  }
}

/**
 * Default TLS session manager configuration
 */
export const defaultTLSSessionConfig: TLSSessionStoreConfig = {
  maxSessions: 1000,
  sessionTimeout: 300, // 5 minutes
  cleanupInterval: 60, // 1 minute
  secureOnly: process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.PRODUCTION,
  enableMetrics: process.env.TLS_SESSION_METRICS === 'true'
};

/**
 * Global TLS session manager instance
 */
let globalSessionManager: TLSSessionManager | undefined;

/**
 * Get or create the global TLS session manager
 */
export function getTLSSessionManager(config?: Partial<TLSSessionStoreConfig>): TLSSessionManager {
  if (!globalSessionManager) {
    const finalConfig = { ...defaultTLSSessionConfig, ...config };
    globalSessionManager = new TLSSessionManager(finalConfig);
  }
  return globalSessionManager;
}

/**
 * Create TLS session management middleware for Express
 */
export function createTLSSessionMiddleware(sessionManager: TLSSessionManager) {
  return (req: any, res: any, next: any) => {
    // Only process HTTPS requests
    if (!req.secure) {
      return next();
    }

    const tlsSocket = req.connection;
    if (!tlsSocket || !tlsSocket.encrypted) {
      return next();
    }

    // Extract TLS session information
    const sessionId = tlsSocket.getSession()?.toString('hex');
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const protocol = tlsSocket.getProtocol();
    const cipher = tlsSocket.getCipher();

    if (sessionId) {
      // Validate existing session
      const validation = sessionManager.validateSession(sessionId, clientIP);
      if (!validation.isValid) {
        console.warn(`??  Invalid TLS session rejected: ${validation.reason}`);
        return res.status(HTTP_STATUS.FORBIDDEN).json({ 
          error: 'Invalid TLS session',
          reason: validation.reason 
        });
      }

      // Add session info to request
      req.tlsSession = sessionManager.getSession(sessionId);
    } else if (protocol && cipher) {
      // Create new session
      const session = sessionManager.createSession({
        clientIP,
        userAgent,
        protocol,
        cipher: cipher.name || cipher
      });

      req.tlsSession = session;
    }

    next();
  };
}

export default {
  TLSSessionManager,
  getTLSSessionManager,
  createTLSSessionMiddleware,
  defaultTLSSessionConfig
};


