/**
 * IPC Security Service - Input Validation, Rate Limiting, and Audit Logging
 * 
 * This service provides comprehensive security measures for all IPC handlers:
 * - Input validation with schema checking
 * - Rate limiting per handler and globally
 * - Audit logging for security events
 * - Parameter sanitization
 * - Resource quotas enforcement
 */

import { BrowserWindow } from 'electron';

// Rate limiting storage
interface RateLimit {
  count: number;
  resetTime: number;
  firstRequest: number;
}

interface SecurityConfig {
  enabled: boolean;
  rateLimiting: {
    enabled: boolean;
    globalLimit: number; // requests per minute globally
    perHandlerLimits: Record<string, number>; // requests per minute per handler
    windowMs: number; // time window in milliseconds
  };
  auditLogging: {
    enabled: boolean;
    logLevel: 'info' | 'warn' | 'error';
    includeParameters: boolean;
    maxParameterLength: number;
  };
  validation: {
    enabled: boolean;
    maxStringLength: number;
    maxObjectSize: number; // in bytes
    maxArrayLength: number;
  };
}

class IPCSecurityService {
  private rateLimitStore = new Map<string, RateLimit>();
  private globalRateLimit: RateLimit | null = null;
  private config: SecurityConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      rateLimiting: {
        enabled: true,
        globalLimit: 1000, // 1000 requests per minute globally
        perHandlerLimits: {
          // High-frequency handlers
          'error:log': 100, // 100 errors per minute max
          'perf:getMetrics': 60, // 1 per second max
          'eventQueue:enqueue': 50, // 50 events per minute max
          'db:events:enqueue': 50,
          'db:kv:set': 200, // 200 KV operations per minute
          'db:kv:get': 300,
          'db:kv:delete': 100,
          
          // Medium-frequency handlers
          'db:catalogs:set': 30,
          'db:profile:set': 30,
          'db:bootstrap:fetchAndCache': 10,
          
          // Low-frequency handlers
          'app:openExternal': 5, // Very restrictive for security
          'tokens:saveRefresh': 10,
          'auth:refresh': 20,
          'auth:login': 10,
          'auth:register': 5,
          
          // Monitoring handlers
          'perf:setThresholds': 5,
          'perf:export': 3,
          'error:export': 3,
        },
        windowMs: 60000, // 1 minute windows
      },
      auditLogging: {
        enabled: true,
        logLevel: 'info',
        includeParameters: false, // Don't log parameters by default (privacy)
        maxParameterLength: 200,
      },
      validation: {
        enabled: true,
        maxStringLength: 10000,
        maxObjectSize: 1024 * 1024, // 1MB max object size
        maxArrayLength: 1000,
      }
    };

    // Cleanup expired rate limit entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRateLimits();
    }, 5 * 60 * 1000);
  }

  /**
   * Main security wrapper for IPC handlers
   * Validates input, checks rate limits, and logs audit events
   */
  async secureHandler<T extends any[], R>(
    handlerName: string,
    handler: (...args: T) => Promise<R> | R,
    options: {
      validation?: (args: T) => string | null; // Return error message or null if valid
      requireAuth?: boolean;
      rateLimit?: number; // Override default rate limit
      auditLog?: boolean;
      sensitiveOperation?: boolean;
    } = {}
  ): Promise<(...args: T) => Promise<R | { success: false; error: string }>> {
    
    return async (...args: T): Promise<R | { success: false; error: string }> => {
      try {
        // Step 1: Basic input validation
        if (this.config.validation.enabled) {
          const validationError = this.validateInputs(args);
          if (validationError) {
            this.logSecurityEvent('input_validation_failed', {
              handler: handlerName,
              error: validationError,
              args: this.sanitizeForLogging(args)
            });
            return { success: false, error: validationError };
          }
        }

        // Step 2: Custom validation if provided
        if (options.validation) {
          const customValidationError = options.validation(args);
          if (customValidationError) {
            this.logSecurityEvent('custom_validation_failed', {
              handler: handlerName,
              error: customValidationError
            });
            return { success: false, error: customValidationError };
          }
        }

        // Step 3: Rate limiting check
        if (this.config.rateLimiting.enabled) {
          const rateLimitResult = this.checkRateLimit(handlerName, options.rateLimit);
          if (!rateLimitResult.allowed) {
            this.logSecurityEvent('rate_limit_exceeded', {
              handler: handlerName,
              limit: rateLimitResult.limit,
              count: rateLimitResult.count,
              resetTime: rateLimitResult.resetTime
            });
            return { success: false, error: 'Rate limit exceeded. Please try again later.' };
          }
        }

        // Step 4: Audit logging (before execution)
        if (options.auditLog && this.config.auditLogging.enabled) {
          this.logSecurityEvent('handler_invoked', {
            handler: handlerName,
            sensitive: options.sensitiveOperation,
            args: options.sensitiveOperation ? '[REDACTED]' : this.sanitizeForLogging(args)
          });
        }

        // Step 5: Execute the handler
        const startTime = Date.now();
        const result = await handler(...args);
        const executionTime = Date.now() - startTime;

        // Step 6: Post-execution audit logging
        if (options.auditLog && this.config.auditLogging.enabled) {
          this.logSecurityEvent('handler_completed', {
            handler: handlerName,
            executionTime,
            success: true
          });
        }

        return result;

      } catch (error) {
        // Error handling and logging
        this.logSecurityEvent('handler_error', {
          handler: handlerName,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack?.substring(0, 1000) : undefined
        });

        return { 
          success: false, 
          error: 'Internal error occurred'
        };
      }
    };
  }

  /**
   * Validate input arguments for security
   */
  private validateInputs(args: any[]): string | null {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const error = this.validateValue(arg, `arg${i}`);
      if (error) return error;
    }
    return null;
  }

  /**
   * Recursively validate a value
   */
  private validateValue(value: any, path: string): string | null {
    if (value === null || value === undefined) {
      return null; // Allow null/undefined
    }

    // String validation
    if (typeof value === 'string') {
      if (value.length > this.config.validation.maxStringLength) {
        return `String too long at ${path}: ${value.length} > ${this.config.validation.maxStringLength}`;
      }
      return null;
    }

    // Number validation
    if (typeof value === 'number') {
      if (!isFinite(value)) {
        return `Invalid number at ${path}: ${value}`;
      }
      return null;
    }

    // Boolean validation
    if (typeof value === 'boolean') {
      return null; // Booleans are always valid
    }

    // Array validation
    if (Array.isArray(value)) {
      if (value.length > this.config.validation.maxArrayLength) {
        return `Array too long at ${path}: ${value.length} > ${this.config.validation.maxArrayLength}`;
      }
      
      for (let i = 0; i < value.length; i++) {
        const error = this.validateValue(value[i], `${path}[${i}]`);
        if (error) return error;
      }
      return null;
    }

    // Object validation
    if (typeof value === 'object') {
      // Check object size
      const objectSize = this.getObjectSize(value);
      if (objectSize > this.config.validation.maxObjectSize) {
        return `Object too large at ${path}: ${objectSize} > ${this.config.validation.maxObjectSize}`;
      }

      // Recursively validate object properties
      for (const [key, val] of Object.entries(value)) {
        // Validate key
        if (typeof key === 'string' && key.length > 200) {
          return `Object key too long at ${path}.${key}`;
        }
        
        // Validate value
        const error = this.validateValue(val, `${path}.${key}`);
        if (error) return error;
      }
      return null;
    }

    // Function validation (not allowed)
    if (typeof value === 'function') {
      return `Functions not allowed at ${path}`;
    }

    return null;
  }

  /**
   * Get approximate size of an object in bytes
   */
  private getObjectSize(obj: any): number {
    try {
      return JSON.stringify(obj).length * 2; // Rough estimate (UTF-16)
    } catch {
      return this.config.validation.maxObjectSize + 1; // Force rejection if can't serialize
    }
  }

  /**
   * Check if request is within rate limits
   */
  private checkRateLimit(handlerName: string, customLimit?: number): {
    allowed: boolean;
    limit: number;
    count: number;
    resetTime: number;
  } {
    const now = Date.now();
    
    // Check global rate limit first
    if (!this.checkGlobalRateLimit(now)) {
      return {
        allowed: false,
        limit: this.config.rateLimiting.globalLimit,
        count: this.globalRateLimit?.count || 0,
        resetTime: this.globalRateLimit?.resetTime || now
      };
    }

    // Check per-handler rate limit
    const limit = customLimit || 
                  this.config.rateLimiting.perHandlerLimits[handlerName] || 
                  100; // Default limit

    const key = handlerName;
    const current = this.rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
      // Create new rate limit window
      const newRateLimit: RateLimit = {
        count: 1,
        resetTime: now + this.config.rateLimiting.windowMs,
        firstRequest: now
      };
      this.rateLimitStore.set(key, newRateLimit);
      return {
        allowed: true,
        limit,
        count: 1,
        resetTime: newRateLimit.resetTime
      };
    }

    if (current.count >= limit) {
      return {
        allowed: false,
        limit,
        count: current.count,
        resetTime: current.resetTime
      };
    }

    current.count++;
    return {
      allowed: true,
      limit,
      count: current.count,
      resetTime: current.resetTime
    };
  }

  /**
   * Check global rate limit
   */
  private checkGlobalRateLimit(now: number): boolean {
    if (!this.globalRateLimit || now > this.globalRateLimit.resetTime) {
      this.globalRateLimit = {
        count: 1,
        resetTime: now + this.config.rateLimiting.windowMs,
        firstRequest: now
      };
      return true;
    }

    if (this.globalRateLimit.count >= this.config.rateLimiting.globalLimit) {
      return false;
    }

    this.globalRateLimit.count++;
    return true;
  }

  /**
   * Log security-related events
   */
  private logSecurityEvent(event: string, details: Record<string, any>): void {
    if (!this.config.auditLogging.enabled) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      pid: process.pid,
      ...details
    };

    // Use appropriate log level
    switch (this.config.auditLogging.logLevel) {
      case 'error':
        console.error('[IPC-SECURITY]', logEntry);
        break;
      case 'warn':
        console.warn('[IPC-SECURITY]', logEntry);
        break;
      default:
        console.log('[IPC-SECURITY]', logEntry);
        break;
    }
  }

  /**
   * Sanitize parameters for logging
   */
  private sanitizeForLogging(args: any[]): any[] {
    if (!this.config.auditLogging.includeParameters) {
      return ['[REDACTED]'];
    }

    return args.map(arg => {
      if (typeof arg === 'string') {
        if (arg.length > this.config.auditLogging.maxParameterLength) {
          return arg.substring(0, this.config.auditLogging.maxParameterLength) + '...';
        }
        // Redact sensitive patterns
        return arg
          .replace(/password|secret|key|token/gi, '[REDACTED]')
          .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');
      }
      
      if (typeof arg === 'object' && arg !== null) {
        // Don't log large objects
        const str = JSON.stringify(arg).substring(0, this.config.auditLogging.maxParameterLength);
        return str.length < JSON.stringify(arg).length ? str + '...' : JSON.parse(str);
      }
      
      return arg;
    });
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupExpiredRateLimits(): void {
    const now = Date.now();
    
    for (const [key, rateLimit] of this.rateLimitStore.entries()) {
      if (now > rateLimit.resetTime + (5 * 60 * 1000)) { // 5 minutes after expiry
        this.rateLimitStore.delete(key);
      }
    }

    // Clean global rate limit
    if (this.globalRateLimit && now > this.globalRateLimit.resetTime + (5 * 60 * 1000)) {
      this.globalRateLimit = null;
    }
  }

  /**
   * Get current rate limit statistics
   */
  public getRateLimitStats(): Record<string, any> {
    const stats = {
      globalRateLimit: this.globalRateLimit,
      perHandlerLimits: Object.fromEntries(this.rateLimitStore.entries()),
      config: this.config.rateLimiting
    };
    return stats;
  }

  /**
   * Update security configuration
   */
  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Destroy service and cleanup resources
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.rateLimitStore.clear();
    this.globalRateLimit = null;
  }
}

// Create singleton instance
export const ipcSecurityService = new IPCSecurityService();

// Export types for use in handlers
export type { SecurityConfig };

/**
 * Convenience function to create a secured IPC handler
 */
export function createSecureHandler<T extends any[], R>(
  handlerName: string,
  handler: (...args: T) => Promise<R> | R,
  options?: {
    validation?: (args: T) => string | null;
    requireAuth?: boolean;
    rateLimit?: number;
    auditLog?: boolean;
    sensitiveOperation?: boolean;
  }
) {
  return ipcSecurityService.secureHandler(handlerName, handler, options);
}

/**
 * Common validation functions for IPC handlers
 */
export const validators = {
  /**
   * Validate string parameter
   */
  string: (value: any, name: string, maxLength: number = 1000): string | null => {
    if (typeof value !== 'string') {
      return `${name} must be a string`;
    }
    if (value.length > maxLength) {
      return `${name} too long: ${value.length} > ${maxLength}`;
    }
    return null;
  },

  /**
   * Validate number parameter
   */
  number: (value: any, name: string, min?: number, max?: number): string | null => {
    if (typeof value !== 'number' || !isFinite(value)) {
      return `${name} must be a valid number`;
    }
    if (min !== undefined && value < min) {
      return `${name} must be >= ${min}`;
    }
    if (max !== undefined && value > max) {
      return `${name} must be <= ${max}`;
    }
    return null;
  },

  /**
   * Validate object parameter
   */
  object: (value: any, name: string): string | null => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return `${name} must be an object`;
    }
    return null;
  },

  /**
   * Validate array parameter
   */
  array: (value: any, name: string, maxLength?: number): string | null => {
    if (!Array.isArray(value)) {
      return `${name} must be an array`;
    }
    if (maxLength !== undefined && value.length > maxLength) {
      return `${name} array too long: ${value.length} > ${maxLength}`;
    }
    return null;
  },

  /**
   * Validate email format
   */
  email: (value: any, name: string = 'email'): string | null => {
    const stringError = validators.string(value, name, 254);
    if (stringError) return stringError;
    
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
    if (!emailRegex.test(value)) {
      return `${name} must be a valid email address`;
    }
    return null;
  },

  /**
   * Validate JWT token format
   */
  jwt: (value: any, name: string = 'token'): string | null => {
    const stringError = validators.string(value, name, 5000);
    if (stringError) return stringError;
    
    if (!value.startsWith('eyJ')) {
      return `${name} must be a valid JWT (should start with 'eyJ')`;
    }
    
    const parts = value.split('.');
    if (parts.length !== 3) {
      return `${name} must have 3 parts separated by dots`;
    }
    
    return null;
  }
};
