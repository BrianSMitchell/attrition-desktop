/**
 * IPC Security Service
 * Provides rate limiting, audit logging, and security monitoring for IPC handlers
 * 
 * Features:
 * - Global rate limiting framework
 * - Audit logging for sensitive operations
 * - Security event monitoring
 * - Input sanitization utilities
 * - Circuit breaker pattern for external requests
 */

import errorLogger from './errorLoggingService.js';
import { IpcValidationSchemas } from '../validation/ipcValidationSchema.js';

class IPCSecurityService {
  constructor() {
    // Rate limiting storage: Map<string, { count: number, resetTime: number, violations: number }>
    this.rateLimitData = new Map();
    
    // Audit log storage for security events
    this.auditLog = [];
    this.maxAuditLogSize = 10000; // Keep last 10k audit entries
    
    // Circuit breaker storage: Map<string, { failures: number, lastFailure: number, state: 'closed'|'open'|'half-open' }>
    this.circuitBreakers = new Map();
    
    // Security violation tracking
    this.securityViolations = new Map();
    
    // Rate limit configurations per handler type
    this.rateLimitConfig = {
      // Authentication & sensitive operations - very strict
      'auth:login': { limit: 5, window: 300000 }, // 5 attempts per 5 minutes
      'auth:register': { limit: 3, window: 600000 }, // 3 attempts per 10 minutes
      'auth:refresh': { limit: 10, window: 60000 }, // 10 per minute
      'tokens:saveRefresh': { limit: 10, window: 60000 },
      'tokens:deleteRefresh': { limit: 10, window: 60000 },
      
      // External operations - strict
      'app:openExternal': { limit: 5, window: 60000 }, // 5 per minute
      'db:bootstrap:fetchAndCache': { limit: 3, window: 300000 }, // 3 per 5 minutes
      
      // Event queue - moderate (high frequency but controlled)
      'eventQueue:enqueue': { limit: 50, window: 60000 }, // 50 per minute
      'db:events:enqueue': { limit: 100, window: 60000 }, // 100 per minute
      
      // Database operations - moderate
      'db:kv:set': { limit: 200, window: 60000 }, // 200 per minute
      'db:kv:get': { limit: 500, window: 60000 }, // 500 per minute
      'db:kv:delete': { limit: 100, window: 60000 }, // 100 per minute
      'db:catalogs:set': { limit: 50, window: 60000 },
      'db:catalogs:get': { limit: 100, window: 60000 },
      'db:profile:set': { limit: 20, window: 60000 },
      'db:profile:get': { limit: 50, window: 60000 },
      
      // Error logging - high (but with burst protection)
      'error:log': { limit: 100, window: 60000 }, // 100 per minute
      'error:getRecent': { limit: 20, window: 60000 },
      'error:export': { limit: 5, window: 300000 }, // 5 per 5 minutes
      
      // Performance monitoring - moderate
      'perf:getMetrics': { limit: 60, window: 60000 }, // 60 per minute
      'perf:getStats': { limit: 60, window: 60000 },
      'perf:export': { limit: 5, window: 300000 },
      'perf:setThresholds': { limit: 10, window: 300000 }, // 10 per 5 minutes
      
      // Low-frequency operations
      'app:getVersion': { limit: 100, window: 60000 },
      'network:getStatus': { limit: 120, window: 60000 }, // 2 per second
      'network:isFullyConnected': { limit: 120, window: 60000 },
      'db:health': { limit: 30, window: 60000 },
      
      // Default rate limit for unspecified handlers
      'default': { limit: 100, window: 60000 } // 100 per minute
    };
    
    // Circuit breaker configurations
    this.circuitBreakerConfig = {
      // External API calls
      'auth:refresh': { threshold: 5, timeout: 30000 }, // 5 failures, 30s timeout
      'auth:login': { threshold: 5, timeout: 60000 }, // 5 failures, 1min timeout
      'auth:register': { threshold: 5, timeout: 60000 },
      'db:bootstrap:fetchAndCache': { threshold: 3, timeout: 120000 }, // 3 failures, 2min timeout
      
      // Default circuit breaker
      'default': { threshold: 10, timeout: 60000 }
    };
    
    // Cleanup interval for old data
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000); // 5 minutes
  }

  /**
   * Check rate limit for a specific channel
   * @param {string} channel - IPC channel name
   * @param {string} identifier - Unique identifier (usually renderer process ID)
   * @returns {{ allowed: boolean, remaining: number, resetTime: number, violation?: boolean }}
   */
  checkRateLimit(channel, identifier = 'default') {
    const now = Date.now();
    const key = `${channel}:${identifier}`;
    const config = this.rateLimitConfig[channel] || this.rateLimitConfig.default;
    
    let data = this.rateLimitData.get(key);
    
    // Initialize or reset if window expired
    if (!data || now > data.resetTime) {
      data = {
        count: 0,
        resetTime: now + config.window,
        violations: data?.violations || 0
      };
      this.rateLimitData.set(key, data);
    }
    
    // Check if limit exceeded
    if (data.count >= config.limit) {
      data.violations++;
      
      // Log security violation for monitoring
      this.logSecurityEvent('rate_limit_exceeded', {
        channel,
        identifier,
        currentCount: data.count,
        limit: config.limit,
        violations: data.violations,
        timestamp: now
      });
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: data.resetTime,
        violation: true
      };
    }
    
    // Allow request and increment counter
    data.count++;
    
    return {
      allowed: true,
      remaining: config.limit - data.count,
      resetTime: data.resetTime,
      violation: false
    };
  }

  /**
   * Check circuit breaker state for external operations
   * @param {string} operation - Operation name
   * @returns {{ allowed: boolean, state: string }}
   */
  checkCircuitBreaker(operation) {
    const config = this.circuitBreakerConfig[operation] || this.circuitBreakerConfig.default;
    const breaker = this.circuitBreakers.get(operation) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed'
    };
    
    const now = Date.now();
    
    switch (breaker.state) {
      case 'closed':
        return { allowed: true, state: 'closed' };
        
      case 'open':
        // Check if timeout period has passed
        if (now - breaker.lastFailure > config.timeout) {
          breaker.state = 'half-open';
          breaker.failures = 0; // Reset failure count for half-open test
          this.circuitBreakers.set(operation, breaker);
          return { allowed: true, state: 'half-open' };
        }
        return { allowed: false, state: 'open' };
        
      case 'half-open':
        return { allowed: true, state: 'half-open' };
        
      default:
        return { allowed: true, state: 'closed' };
    }
  }

  /**
   * Record a success for circuit breaker
   * @param {string} operation - Operation name
   */
  recordSuccess(operation) {
    const breaker = this.circuitBreakers.get(operation);
    if (breaker && breaker.state === 'half-open') {
      breaker.state = 'closed';
      breaker.failures = 0;
      this.circuitBreakers.set(operation, breaker);
      
      this.logSecurityEvent('circuit_breaker_closed', {
        operation,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Record a failure for circuit breaker
   * @param {string} operation - Operation name
   * @param {Error} error - Error that occurred
   */
  recordFailure(operation, error) {
    const config = this.circuitBreakerConfig[operation] || this.circuitBreakerConfig.default;
    const breaker = this.circuitBreakers.get(operation) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed'
    };
    
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    if (breaker.failures >= config.threshold) {
      breaker.state = 'open';
      
      this.logSecurityEvent('circuit_breaker_opened', {
        operation,
        failures: breaker.failures,
        threshold: config.threshold,
        error: error?.message,
        timestamp: breaker.lastFailure
      });
    }
    
    this.circuitBreakers.set(operation, breaker);
  }

  /**
   * Log security event for audit and monitoring
   * @param {string} eventType - Type of security event
   * @param {object} details - Event details
   * @param {string} severity - Event severity (low, medium, high, critical)
   */
  logSecurityEvent(eventType, details, severity = 'medium') {
    const auditEntry = {
      id: this.generateCorrelationId(),
      timestamp: Date.now(),
      type: eventType,
      severity,
      details,
      source: 'ipc_security_service'
    };
    
    // Add to audit log
    this.auditLog.push(auditEntry);
    
    // Trim audit log if it gets too large
    if (this.auditLog.length > this.maxAuditLogSize) {
      this.auditLog = this.auditLog.slice(-this.maxAuditLogSize);
    }
    
    // Log to error logger based on severity
    switch (severity) {
      case 'critical':
        errorLogger.error(`[IPC Security] ${eventType}`, auditEntry);
        break;
      case 'high':
        errorLogger.warn(`[IPC Security] ${eventType}`, auditEntry);
        break;
      case 'medium':
        errorLogger.info(`[IPC Security] ${eventType}`, auditEntry);
        break;
      case 'low':
        errorLogger.debug(`[IPC Security] ${eventType}`, auditEntry);
        break;
    }
    
    // Track violation patterns
    this.trackSecurityViolation(eventType, details);
  }

  /**
   * Track security violation patterns for threat detection
   * @param {string} eventType - Type of violation
   * @param {object} details - Violation details
   */
  trackSecurityViolation(eventType, details) {
    const key = details.identifier || details.channel || 'unknown';
    const violations = this.securityViolations.get(key) || {
      count: 0,
      types: new Set(),
      firstSeen: Date.now(),
      lastSeen: Date.now()
    };
    
    violations.count++;
    violations.types.add(eventType);
    violations.lastSeen = Date.now();
    
    this.securityViolations.set(key, violations);
    
    // Alert on patterns that indicate potential attack
    if (violations.count > 10 && violations.types.size > 2) {
      this.logSecurityEvent('potential_attack_detected', {
        identifier: key,
        violationCount: violations.count,
        violationTypes: Array.from(violations.types),
        timespan: violations.lastSeen - violations.firstSeen
      }, 'critical');
    }
  }

  /**
   * Validate IPC input according to schema
   * @param {string} channel - IPC channel name
   * @param {any} input - Input to validate
   * @returns {{ valid: boolean, data?: any, error?: string, suspicious?: boolean }}
   */
  validateInput(channel, input) {
    const correlationId = this.generateCorrelationId();
    
    try {
      // Get validation schema for channel
      const schema = IpcValidationSchemas[channel];
      
      if (!schema) {
        // No schema defined - log as suspicious for manual review
        this.logSecurityEvent('no_validation_schema', {
          channel,
          correlationId,
          inputType: typeof input
        }, 'medium');
        
        return {
          valid: true, // Allow for now, but flag
          data: input,
          suspicious: true
        };
      }
      
      // Perform validation
      const validatedData = schema.parse(input);
      
      return {
        valid: true,
        data: validatedData,
        suspicious: false
      };
      
    } catch (error) {
      // Log validation failure
      this.logSecurityEvent('input_validation_failed', {
        channel,
        correlationId,
        error: error.message,
        inputSample: this.sanitizeInput(input, { maxLength: 200 })
      }, 'high');
      
      // Check if this looks like an injection attempt
      const suspicious = this.detectSuspiciousInput(input, error);
      
      return {
        valid: false,
        error: `Invalid input for ${channel}: ${error.message}`,
        suspicious
      };
    }
  }
  
  /**
   * Detect suspicious input patterns that might indicate attacks
   * @param {any} input - Input to analyze
   * @param {Error} validationError - Validation error that occurred
   * @returns {boolean} Whether input appears suspicious
   */
  detectSuspiciousInput(input, validationError) {
    if (typeof input === 'string') {
      const suspiciousPatterns = [
        // SQL injection patterns
        /('|(\-\-)|;|(\||\|)|(\*|\*))|(\s*(union|select|insert|delete|update|drop|create|alter)\s+)/i,
        // XSS patterns
        /<script[^>]*>.*?<\/script>/i,
        /<iframe[^>]*>/i,
        /javascript:/i,
        /on\w+\s*=/i,
        // Path traversal
        /\.\.\/|\.\.\\/,
        // Command injection
        /[;&|`$(){}\[\]]/,
        // Prototype pollution
        /__proto__|constructor\.prototype/
      ];
      
      return suspiciousPatterns.some(pattern => pattern.test(input));
    }
    
    if (typeof input === 'object' && input !== null) {
      // Check for prototype pollution attempts
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
      return this.hasDeepProperty(input, dangerousKeys);
    }
    
    // Check for unusual data types or structures
    if (input === null || input === undefined) {
      return false; // These are usually fine
    }
    
    // Very large inputs might be DoS attempts
    const inputSize = this.getInputSize(input);
    if (inputSize > 100000) { // 100KB limit
      this.logSecurityEvent('oversized_input_detected', {
        inputSize,
        inputType: typeof input
      }, 'high');
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if object has any of the dangerous properties (recursively)
   * @param {object} obj - Object to check
   * @param {string[]} dangerousKeys - Keys to look for
   * @returns {boolean} Whether dangerous keys are present
   */
  hasDeepProperty(obj, dangerousKeys) {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }
    
    for (const key of Object.keys(obj)) {
      if (dangerousKeys.includes(key)) {
        return true;
      }
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (this.hasDeepProperty(obj[key], dangerousKeys)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Calculate approximate size of input data
   * @param {any} input - Input to measure
   * @returns {number} Approximate size in bytes
   */
  getInputSize(input) {
    try {
      return JSON.stringify(input).length;
    } catch {
      return String(input).length;
    }
  }
  
  /**
   * Sanitize input parameters for logging and processing
   * @param {any} input - Input to sanitize
   * @param {object} options - Sanitization options
   * @returns {any} Sanitized input
   */
  sanitizeInput(input, options = {}) {
    const { maxLength = 1000, redactPatterns = [] } = options;
    
    if (typeof input === 'string') {
      let sanitized = input;
      
      // Truncate if too long
      if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength) + '...[truncated]';
      }
      
      // Redact sensitive patterns
      const defaultPatterns = [
        /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*/g, // JWT tokens
        /(?:password|secret|key|token)\s*[:=]\s*["']?[^"'\s]+/gi, // Key-value patterns
        /[A-Za-z0-9+/]{20,}={0,2}/g // Base64 patterns (potential tokens)
      ];
      
      [...defaultPatterns, ...redactPatterns].forEach(pattern => {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
      });
      
      return sanitized;
    } else if (typeof input === 'object' && input !== null) {
      const sanitized = Array.isArray(input) ? [] : {};
      
      for (const [key, value] of Object.entries(input)) {
        // Redact sensitive keys
        if (/^(password|secret|token|key|auth|credential)/i.test(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeInput(value, options);
        }
      }
      
      return sanitized;
    }
    
    return input;
  }

  /**
   * Generate correlation ID for audit trail
   * @returns {string} Correlation ID
   */
  generateCorrelationId() {
    return `ipc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Get security statistics
   * @returns {object} Security statistics
   */
  getSecurityStats() {
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);
    
    const recentAuditEvents = this.auditLog.filter(event => event.timestamp > last24Hours);
    const rateLimitViolations = recentAuditEvents.filter(event => event.type === 'rate_limit_exceeded');
    
    const stats = {
      totalAuditEvents: recentAuditEvents.length,
      rateLimitViolations: rateLimitViolations.length,
      circuitBreakersOpen: Array.from(this.circuitBreakers.values())
        .filter(breaker => breaker.state === 'open').length,
      securityViolationsTracked: this.securityViolations.size,
      
      // Top violation types
      violationTypes: {},
      
      // Most active violators
      topViolators: Array.from(this.securityViolations.entries())
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 5)
        .map(([key, data]) => ({ identifier: key, violations: data.count }))
    };
    
    // Count violation types
    recentAuditEvents.forEach(event => {
      stats.violationTypes[event.type] = (stats.violationTypes[event.type] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * Get audit log entries
   * @param {number} hours - Hours to look back (default 24)
   * @returns {Array} Audit log entries
   */
  getAuditLog(hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.auditLog.filter(entry => entry.timestamp > cutoff);
  }

  /**
   * Cleanup old rate limit and audit data
   */
  cleanup() {
    const now = Date.now();
    
    // Clean up expired rate limit data
    for (const [key, data] of this.rateLimitData.entries()) {
      if (now > data.resetTime + 300000) { // 5 minutes after expiry
        this.rateLimitData.delete(key);
      }
    }
    
    // Clean up old security violations (keep 7 days)
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    for (const [key, data] of this.securityViolations.entries()) {
      if (data.lastSeen < weekAgo) {
        this.securityViolations.delete(key);
      }
    }
    
    // Trim audit log
    if (this.auditLog.length > this.maxAuditLogSize) {
      this.auditLog = this.auditLog.slice(-this.maxAuditLogSize);
    }
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.rateLimitData.clear();
    this.circuitBreakers.clear();
    this.securityViolations.clear();
    this.auditLog.length = 0;
  }
}

// Create singleton instance
const ipcSecurityService = new IPCSecurityService();

export default ipcSecurityService;
