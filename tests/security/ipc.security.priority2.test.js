/**
 * IPC Security Priority 2 Test Suite
 * Tests the Priority 2 security enhancements implemented for Phase 5 Task 1.2.2
 * 
 * Tests Priority 2 security features:
 * 1. Rate limiting framework
 * 2. Audit logging for sensitive operations
 * 3. Input sanitization and parameter validation
 * 4. Security monitoring and alerting
 * 5. Circuit breaker pattern for external requests
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { app, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock the main process IPC handlers and security service
let mockIpcHandlers = {};
let ipcSecurityService;

// Mock ipcMain.handle to capture handler registrations
const originalHandle = ipcMain.handle;
ipcMain.handle = (channel, handler) => {
  mockIpcHandlers[channel] = handler;
  return originalHandle.call(ipcMain, channel, handler);
};

describe('IPC Security Priority 2 Tests', () => {
  beforeAll(async () => {
    // Load the security service
    const securityModule = await import('../services/ipcSecurityService.js');
    ipcSecurityService = securityModule.default;
    
    // Load the main process module to register IPC handlers
    await import('../main.js');
  });

  afterAll(() => {
    // Restore original ipcMain.handle
    ipcMain.handle = originalHandle;
    
    // Cleanup security service
    if (ipcSecurityService) {
      ipcSecurityService.destroy();
    }
  });

  beforeEach(() => {
    // Reset security service state for each test
    if (ipcSecurityService) {
      ipcSecurityService.rateLimitData.clear();
      ipcSecurityService.circuitBreakers.clear();
      ipcSecurityService.securityViolations.clear();
      ipcSecurityService.auditLog.length = 0;
    }
  });

  describe('Rate Limiting Framework', () => {
    test('should enforce rate limits on authentication handlers', async () => {
      const handler = mockIpcHandlers['auth:login'];
      const mockEvent = { processId: 'test-process-1' };
      
      // First 5 requests should succeed (within limit)
      for (let i = 0; i < 5; i++) {
        const result = await handler(mockEvent, 'test@example.com', 'password');
        // Even if auth fails, rate limiting should allow the request
        expect(result).toBeDefined();
      }
      
      // 6th request should be rate limited
      const rateLimitedResult = await handler(mockEvent, 'test@example.com', 'password');
      expect(rateLimitedResult.success).toBe(false);
      expect(rateLimitedResult.error).toBe('rate_limit_exceeded');
      expect(rateLimitedResult.message).toContain('Too many requests');
    });

    test('should have different rate limits for different operations', async () => {
      const authHandler = mockIpcHandlers['auth:login'];
      const extHandler = mockIpcHandlers['app:openExternal'];
      const mockEvent = { processId: 'test-process-2' };
      
      // Auth login: 5 per 5 minutes
      for (let i = 0; i < 5; i++) {
        await authHandler(mockEvent, 'test@example.com', 'password');
      }
      let result = await authHandler(mockEvent, 'test@example.com', 'password');
      expect(result.error).toBe('rate_limit_exceeded');
      
      // External URLs: 5 per minute (should still work since it's different handler)
      result = await extHandler(mockEvent, 'https://example.com');
      expect(result).toBeDefined();
      expect(result.error).not.toBe('rate_limit_exceeded');
    });

    test('should reset rate limits after window expires', async () => {
      // Mock Date.now to control time
      const originalNow = Date.now;
      let mockTime = originalNow();
      Date.now = jest.fn(() => mockTime);
      
      const handler = mockIpcHandlers['app:openExternal'];
      const mockEvent = { processId: 'test-process-3' };
      
      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        await handler(mockEvent, 'https://example.com');
      }
      
      // Should be rate limited
      let result = await handler(mockEvent, 'https://example.com');
      expect(result.error).toBe('rate_limit_exceeded');
      
      // Advance time past rate limit window (60 seconds)
      mockTime += 70000;
      
      // Should work again
      result = await handler(mockEvent, 'https://example.com');
      expect(result).toBeDefined();
      expect(result.error).not.toBe('rate_limit_exceeded');
      
      // Restore Date.now
      Date.now = originalNow;
    });

    test('should track rate limit violations for monitoring', async () => {
      const handler = mockIpcHandlers['auth:login'];
      const mockEvent = { processId: 'test-process-4' };
      
      // Exhaust rate limit
      for (let i = 0; i < 6; i++) {
        await handler(mockEvent, 'test@example.com', 'password');
      }
      
      // Check that violation was logged
      const stats = ipcSecurityService.getSecurityStats();
      expect(stats.rateLimitViolations).toBeGreaterThan(0);
      expect(stats.violationTypes['rate_limit_exceeded']).toBeDefined();
    });
  });

  describe('Circuit Breaker Pattern', () => {
    test('should open circuit breaker after failures', async () => {
      // Mock the httpRequest to always fail
      const originalHttpRequest = global.httpRequest;
      global.httpRequest = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const handler = mockIpcHandlers['auth:refresh'];
      const mockEvent = { processId: 'test-process-5' };
      
      // Trigger failures to open circuit breaker (threshold is 5)
      for (let i = 0; i < 5; i++) {
        await handler(mockEvent);
      }
      
      // Next request should be blocked by circuit breaker
      const result = await handler(mockEvent);
      expect(result.success).toBe(false);
      expect(result.error).toBe('circuit_breaker_open');
      
      // Restore original httpRequest
      global.httpRequest = originalHttpRequest;
    });

    test('should transition to half-open after timeout', async () => {
      const originalNow = Date.now;
      let mockTime = originalNow();
      Date.now = jest.fn(() => mockTime);
      
      // Force circuit breaker to open state
      ipcSecurityService.circuitBreakers.set('auth:refresh', {
        failures: 5,
        lastFailure: mockTime,
        state: 'open'
      });
      
      const handler = mockIpcHandlers['auth:refresh'];
      const mockEvent = { processId: 'test-process-6' };
      
      // Should be blocked initially
      let result = await handler(mockEvent);
      expect(result.error).toBe('circuit_breaker_open');
      
      // Advance time past circuit breaker timeout (30 seconds)
      mockTime += 35000;
      
      // Should be allowed in half-open state
      result = await handler(mockEvent);
      expect(result).toBeDefined();
      expect(result.error).not.toBe('circuit_breaker_open');
      
      Date.now = originalNow;
    });
  });

  describe('Audit Logging', () => {
    test('should log sensitive operations with correlation IDs', async () => {
      const handler = mockIpcHandlers['auth:login'];
      const mockEvent = { processId: 'test-process-7' };
      
      await handler(mockEvent, 'test@example.com', 'password');
      
      const auditLog = ipcSecurityService.getAuditLog(1);
      const loginEvents = auditLog.filter(entry => 
        entry.type === 'ipc_handler_invocation' && 
        entry.details.channel === 'auth:login'
      );
      
      expect(loginEvents.length).toBeGreaterThan(0);
      expect(loginEvents[0]).toHaveProperty('id');
      expect(loginEvents[0].id).toMatch(/^ipc_\d+_[a-z0-9]+$/);
      expect(loginEvents[0]).toHaveProperty('timestamp');
      expect(loginEvents[0].details).toHaveProperty('correlationId');
    });

    test('should sanitize sensitive parameters in audit logs', async () => {
      const handler = mockIpcHandlers['auth:login'];
      const mockEvent = { processId: 'test-process-8' };
      
      await handler(mockEvent, 'test@example.com', 'secretpassword123');
      
      const auditLog = ipcSecurityService.getAuditLog(1);
      const loginEvents = auditLog.filter(entry => 
        entry.type === 'ipc_handler_invocation' && 
        entry.details.channel === 'auth:login'
      );
      
      expect(loginEvents.length).toBeGreaterThan(0);
      const sanitizedParams = loginEvents[0].details.sanitizedParams;
      
      // Password should be redacted but email should be visible
      expect(sanitizedParams).toBeDefined();
      expect(JSON.stringify(sanitizedParams)).toContain('test@example.com');
      expect(JSON.stringify(sanitizedParams)).not.toContain('secretpassword123');
    });

    test('should track completion events with timing', async () => {
      const handler = mockIpcHandlers['tokens:saveRefresh'];
      const mockEvent = { processId: 'test-process-9' };
      
      await handler(mockEvent, 'fake-refresh-token');
      
      const auditLog = ipcSecurityService.getAuditLog(1);
      const completionEvents = auditLog.filter(entry => 
        entry.type === 'ipc_handler_completion'
      );
      
      expect(completionEvents.length).toBeGreaterThan(0);
      expect(completionEvents[0].details).toHaveProperty('duration');
      expect(completionEvents[0].details.duration).toBeGreaterThan(0);
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize JWT tokens in logs', () => {
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const sanitized = ipcSecurityService.sanitizeInput(testToken);
      expect(sanitized).toBe('[REDACTED]');
    });

    test('should sanitize sensitive object properties', () => {
      const testObject = {
        username: 'testuser',
        password: 'secretpass',
        token: 'abc123xyz',
        data: 'normal data'
      };
      
      const sanitized = ipcSecurityService.sanitizeInput(testObject);
      expect(sanitized.username).toBe('testuser');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.data).toBe('normal data');
    });

    test('should truncate overly long strings', () => {
      const longString = 'x'.repeat(2000);
      
      const sanitized = ipcSecurityService.sanitizeInput(longString);
      expect(sanitized.length).toBeLessThan(longString.length);
      expect(sanitized).toContain('...[truncated]');
    });
  });

  describe('Security Monitoring', () => {
    test('should track security violations by source', async () => {
      const handler = mockIpcHandlers['auth:login'];
      const mockEvent = { processId: 'malicious-process' };
      
      // Generate multiple violations
      for (let i = 0; i < 6; i++) {
        await handler(mockEvent, 'test@example.com', 'password');
      }
      
      const stats = ipcSecurityService.getSecurityStats();
      expect(stats.topViolators.length).toBeGreaterThan(0);
      expect(stats.topViolators[0].identifier).toContain('malicious-process');
    });

    test('should detect potential attack patterns', async () => {
      const authHandler = mockIpcHandlers['auth:login'];
      const extHandler = mockIpcHandlers['app:openExternal'];
      const mockEvent = { processId: 'attacker-process' };
      
      // Generate multiple types of violations from same source
      // Rate limit auth
      for (let i = 0; i < 6; i++) {
        await authHandler(mockEvent, 'test@example.com', 'password');
      }
      
      // Rate limit external URLs
      for (let i = 0; i < 6; i++) {
        await extHandler(mockEvent, 'javascript:alert(1)');
      }
      
      // Should trigger attack detection
      const auditLog = ipcSecurityService.getAuditLog(1);
      const attackEvents = auditLog.filter(entry => 
        entry.type === 'potential_attack_detected'
      );
      
      expect(attackEvents.length).toBeGreaterThan(0);
      expect(attackEvents[0].severity).toBe('critical');
    });

    test('should provide security statistics', () => {
      // Generate some activity first
      ipcSecurityService.logSecurityEvent('test_event', { test: true });
      
      const stats = ipcSecurityService.getSecurityStats();
      expect(stats).toHaveProperty('totalAuditEvents');
      expect(stats).toHaveProperty('rateLimitViolations');
      expect(stats).toHaveProperty('circuitBreakersOpen');
      expect(stats).toHaveProperty('securityViolationsTracked');
      expect(stats).toHaveProperty('violationTypes');
      expect(stats).toHaveProperty('topViolators');
      
      expect(stats.violationTypes['test_event']).toBe(1);
    });
  });

  describe('Security Monitoring IPC Handlers', () => {
    test('should expose security statistics via IPC', async () => {
      const handler = mockIpcHandlers['security:getStats'];
      const mockEvent = { processId: 'admin-process' };
      
      const result = await handler(mockEvent);
      expect(result.success).toBe(true);
      expect(result.stats).toHaveProperty('totalAuditEvents');
    });

    test('should expose audit log via IPC', async () => {
      // Generate some audit events first
      ipcSecurityService.logSecurityEvent('test_audit_event', { test: true });
      
      const handler = mockIpcHandlers['security:getAuditLog'];
      const mockEvent = { processId: 'admin-process' };
      
      const result = await handler(mockEvent, 1); // Last 1 hour
      expect(result.success).toBe(true);
      expect(Array.isArray(result.auditLog)).toBe(true);
      expect(result.auditLog.length).toBeGreaterThan(0);
    });

    test('should apply rate limiting to security monitoring endpoints', async () => {
      const handler = mockIpcHandlers['security:getStats'];
      const mockEvent = { processId: 'admin-process' };
      
      // Make requests up to the default limit (100)
      for (let i = 0; i < 100; i++) {
        await handler(mockEvent);
      }
      
      // 101st request should be rate limited
      const result = await handler(mockEvent);
      expect(result.success).toBe(false);
      expect(result.error).toBe('rate_limit_exceeded');
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle security service errors gracefully', async () => {
      // Mock security service to throw error
      const originalCheckRateLimit = ipcSecurityService.checkRateLimit;
      ipcSecurityService.checkRateLimit = jest.fn().mockImplementation(() => {
        throw new Error('Security service error');
      });
      
      const handler = mockIpcHandlers['app:getVersion'];
      const mockEvent = { processId: 'test-process' };
      
      const result = await handler(mockEvent);
      expect(result).toHaveProperty('correlationId');
      expect(result.success).toBe(false);
      expect(result.error).toBe('internal_error');
      
      // Restore original function
      ipcSecurityService.checkRateLimit = originalCheckRateLimit;
    });

    test('should clean up old data periodically', () => {
      // Add some old rate limit data
      const oldTime = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      ipcSecurityService.rateLimitData.set('old:test', {
        count: 5,
        resetTime: oldTime,
        violations: 1
      });
      
      // Add some current data
      ipcSecurityService.rateLimitData.set('current:test', {
        count: 2,
        resetTime: Date.now() + (60 * 1000),
        violations: 0
      });
      
      // Run cleanup
      ipcSecurityService.cleanup();
      
      // Old data should be cleaned up, current data should remain
      expect(ipcSecurityService.rateLimitData.has('old:test')).toBe(false);
      expect(ipcSecurityService.rateLimitData.has('current:test')).toBe(true);
    });
  });

  describe('Performance Impact', () => {
    test('should not significantly impact handler performance', async () => {
      const handler = mockIpcHandlers['app:getVersion'];
      const mockEvent = { processId: 'perf-test' };
      
      // Time without security wrapper (baseline)
      const baseHandler = () => app.getVersion();
      const baselineStart = Date.now();
      baseHandler();
      const baselineTime = Date.now() - baselineStart;
      
      // Time with security wrapper
      const secureStart = Date.now();
      await handler(mockEvent);
      const secureTime = Date.now() - secureStart;
      
      // Security overhead should be minimal (less than 10x baseline)
      expect(secureTime).toBeLessThan(baselineTime * 10 + 50); // Allow 50ms overhead
    });

    test('should handle high request volumes', async () => {
      const handler = mockIpcHandlers['network:getStatus'];
      const mockEvent = { processId: 'volume-test' };
      
      const start = Date.now();
      
      // Make many concurrent requests (within rate limit)
      const promises = Array(50).fill().map(() => handler(mockEvent));
      const results = await Promise.all(promises);
      
      const duration = Date.now() - start;
      
      // Should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);
      
      // All requests should succeed (within rate limit)
      const successCount = results.filter(r => r !== undefined).length;
      expect(successCount).toBeGreaterThan(40); // Some might be rate limited
    });
  });
});

/**
 * Test Helper Functions
 */

function createMockEvent(processId = 'test-process') {
  return {
    processId,
    senderFrame: { url: 'file://test' },
    reply: jest.fn()
  };
}

function generateSecurityViolations(count, identifier = 'test') {
  const violations = [];
  for (let i = 0; i < count; i++) {
    violations.push({
      type: `violation_type_${i % 3}`,
      identifier,
      timestamp: Date.now() - (i * 1000)
    });
  }
  return violations;
}
