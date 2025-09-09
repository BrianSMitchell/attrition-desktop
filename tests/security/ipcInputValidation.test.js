/**
 * IPC Input Validation Tests
 * Tests for IPC input validation, sanitization, and security measures
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { IpcValidationSchemas } from '../validation/ipcValidationSchema.js';
import ipcSecurityService from '../../packages/desktop/src/services/ipcSecurityService.js';

describe('IPC Input Validation', () => {
  let securityService;
  
  beforeEach(() => {
    // Create fresh instance for each test
    securityService = new (ipcSecurityService.constructor)();
  });

  describe('Authentication Input Validation', () => {
    test('should validate correct login input', () => {
      const input = { email: 'test@example.com', password: 'validpass123' };
      const result = securityService.validateInput('auth:login', input);
      
      expect(result.valid).toBe(true);
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.password).toBe('validpass123');
      expect(result.suspicious).toBe(false);
    });

    test('should reject login with invalid email', () => {
      const input = { email: 'not-an-email', password: 'validpass123' };
      const result = securityService.validateInput('auth:login', input);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid input for auth:login');
      expect(result.suspicious).toBe(false);
    });

    test('should reject login with short password', () => {
      const input = { email: 'test@example.com', password: '123' };
      const result = securityService.validateInput('auth:login', input);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid input for auth:login');
    });

    test('should validate correct register input', () => {
      const input = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'validpass123'
      };
      const result = securityService.validateInput('auth:register', input);
      
      expect(result.valid).toBe(true);
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.username).toBe('testuser');
      expect(result.suspicious).toBe(false);
    });

    test('should reject register with short username', () => {
      const input = {
        email: 'test@example.com',
        username: 'ab',
        password: 'validpass123'
      };
      const result = securityService.validateInput('auth:register', input);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid input for auth:register');
    });

    test('should validate JWT token format', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const input = { refreshToken: validToken };
      const result = securityService.validateInput('tokens:saveRefresh', input);
      
      expect(result.valid).toBe(true);
      expect(result.data.refreshToken).toBe(validToken);
    });

    test('should reject invalid JWT token', () => {
      const input = { refreshToken: 'not.a.valid.jwt' };
      const result = securityService.validateInput('tokens:saveRefresh', input);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid input for tokens:saveRefresh');
    });
  });

  describe('Database Input Validation', () => {
    test('should validate key-value set operation', () => {
      const input = {
        key: 'test-key',
        value: { some: 'data' },
        options: { ttl: 3600 }
      };
      const result = securityService.validateInput('db:kv:set', input);
      
      expect(result.valid).toBe(true);
      expect(result.data.key).toBe('test-key');
      expect(result.data.value).toEqual({ some: 'data' });
      expect(result.data.options.ttl).toBe(3600);
    });

    test('should reject empty key', () => {
      const input = {
        key: '',
        value: { some: 'data' }
      };
      const result = securityService.validateInput('db:kv:set', input);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid input for db:kv:set');
    });

    test('should validate bootstrap with access token', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const input = { accessToken: validToken };
      const result = securityService.validateInput('db:bootstrap:fetchAndCache', input);
      
      expect(result.valid).toBe(true);
      expect(result.data.accessToken).toBe(validToken);
    });
  });

  describe('Event Queue Input Validation', () => {
    test('should validate event queue enqueue', () => {
      const input = {
        kind: 'structures',
        payload: { buildingType: 'factory', location: 'A01:02:03:04' },
        options: { identityKey: 'unique-build-id-123' }
      };
      const result = securityService.validateInput('eventQueue:enqueue', input);
      
      expect(result.valid).toBe(true);
      expect(result.data.kind).toBe('structures');
      expect(result.data.payload).toEqual(input.payload);
      expect(result.data.options.identityKey).toBe('unique-build-id-123');
    });

    test('should reject invalid event kind', () => {
      const input = {
        kind: 'invalid-kind',
        payload: {},
        options: { identityKey: 'test' }
      };
      const result = securityService.validateInput('eventQueue:enqueue', input);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid input for eventQueue:enqueue');
    });
  });

  describe('Suspicious Input Detection', () => {
    test('should detect SQL injection attempts', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const suspicious = securityService.detectSuspiciousInput(maliciousInput);
      
      expect(suspicious).toBe(true);
    });

    test('should detect XSS attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const suspicious = securityService.detectSuspiciousInput(maliciousInput);
      
      expect(suspicious).toBe(true);
    });

    test('should detect path traversal attempts', () => {
      const maliciousInput = '../../../etc/passwd';
      const suspicious = securityService.detectSuspiciousInput(maliciousInput);
      
      expect(suspicious).toBe(true);
    });

    test('should detect prototype pollution attempts', () => {
      const maliciousInput = { '__proto__': { isAdmin: true } };
      const suspicious = securityService.detectSuspiciousInput(maliciousInput);
      
      expect(suspicious).toBe(true);
    });

    test('should detect command injection patterns', () => {
      const maliciousInput = 'test && rm -rf /';
      const suspicious = securityService.detectSuspiciousInput(maliciousInput);
      
      expect(suspicious).toBe(true);
    });

    test('should detect oversized inputs', () => {
      const hugeInput = 'x'.repeat(200000); // 200KB
      const suspicious = securityService.detectSuspiciousInput(hugeInput);
      
      expect(suspicious).toBe(true);
    });

    test('should not flag normal inputs as suspicious', () => {
      const normalInputs = [
        'normal string',
        { key: 'value', number: 123 },
        ['array', 'of', 'values'],
        123,
        true,
        null,
        undefined
      ];
      
      normalInputs.forEach(input => {
        const suspicious = securityService.detectSuspiciousInput(input);
        expect(suspicious).toBe(false);
      });
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize JWT tokens in strings', () => {
      const input = 'Token: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const sanitized = securityService.sanitizeInput(input);
      
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    });

    test('should sanitize password fields in objects', () => {
      const input = {
        username: 'testuser',
        password: 'secretpass123',
        email: 'test@example.com'
      };
      const sanitized = securityService.sanitizeInput(input);
      
      expect(sanitized.username).toBe('testuser');
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.password).toBe('[REDACTED]');
    });

    test('should truncate very long strings', () => {
      const longInput = 'x'.repeat(2000);
      const sanitized = securityService.sanitizeInput(longInput, { maxLength: 100 });
      
      expect(sanitized).toHaveLength(117); // 100 + '...[truncated]'.length
      expect(sanitized).toEndWith('...[truncated]');
    });

    test('should handle nested objects', () => {
      const input = {
        user: {
          name: 'test',
          secret: 'hidden-value'
        },
        data: [
          { password: 'secret123' },
          { public: 'visible' }
        ]
      };
      const sanitized = securityService.sanitizeInput(input);
      
      expect(sanitized.user.name).toBe('test');
      expect(sanitized.user.secret).toBe('[REDACTED]');
      expect(sanitized.data[0].password).toBe('[REDACTED]');
      expect(sanitized.data[1].public).toBe('visible');
    });
  });

  describe('Validation Schema Coverage', () => {
    test('should have validation schemas for all critical channels', () => {
      const criticalChannels = [
        'auth:login',
        'auth:register',
        'auth:refresh',
        'tokens:saveRefresh',
        'tokens:deleteRefresh',
        'db:bootstrap:fetchAndCache',
        'db:kv:set',
        'db:kv:get',
        'eventQueue:enqueue',
        'app:openExternal'
      ];
      
      criticalChannels.forEach(channel => {
        expect(IpcValidationSchemas[channel]).toBeDefined();
      });
    });

    test('should handle channels without schemas gracefully', () => {
      const result = securityService.validateInput('unknown:channel', { test: 'data' });
      
      expect(result.valid).toBe(true); // Allows but flags as suspicious
      expect(result.suspicious).toBe(true);
      expect(result.data).toEqual({ test: 'data' });
    });
  });

  describe('Security Event Logging', () => {
    test('should log validation failures', () => {
      const logSpy = jest.spyOn(securityService, 'logSecurityEvent');
      
      securityService.validateInput('auth:login', { invalid: 'data' });
      
      expect(logSpy).toHaveBeenCalledWith(
        'input_validation_failed',
        expect.objectContaining({
          channel: 'auth:login',
          error: expect.any(String)
        }),
        'high'
      );
    });

    test('should log suspicious inputs with high severity', () => {
      const logSpy = jest.spyOn(securityService, 'logSecurityEvent');
      
      securityService.validateInput('db:kv:set', {
        key: '<script>alert("xss")</script>',
        value: 'test'
      });
      
      expect(logSpy).toHaveBeenCalledWith(
        'input_validation_failed',
        expect.objectContaining({
          channel: 'db:kv:set'
        }),
        'high'
      );
    });

    test('should track multiple violations from same source', () => {
      // Simulate multiple violations
      for (let i = 0; i < 15; i++) {
        securityService.validateInput('auth:login', { malicious: `attempt${i}` });
      }
      
      const stats = securityService.getSecurityStats();
      expect(stats.totalAuditEvents).toBeGreaterThan(10);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null/undefined inputs', () => {
      const nullResult = securityService.validateInput('auth:login', null);
      const undefinedResult = securityService.validateInput('auth:login', undefined);
      
      expect(nullResult.valid).toBe(false);
      expect(undefinedResult.valid).toBe(false);
    });

    test('should handle circular references in objects', () => {
      const circular = { name: 'test' };
      circular.self = circular;
      
      // Should not crash
      expect(() => {
        securityService.detectSuspiciousInput(circular);
      }).not.toThrow();
    });

    test('should handle very deep nested objects', () => {
      let deep = {};
      let current = deep;
      for (let i = 0; i < 100; i++) {
        current.next = {};
        current = current.next;
      }
      current.value = 'deep';
      
      // Should not crash or timeout
      expect(() => {
        const result = securityService.validateInput('db:kv:set', {
          key: 'test',
          value: deep
        });
      }).not.toThrow();
    });

    test('should handle special characters in strings', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~';
      const input = { key: 'test', value: specialChars };
      
      expect(() => {
        securityService.validateInput('db:kv:set', input);
      }).not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    test('should validate inputs efficiently', () => {
      const input = {
        key: 'performance-test',
        value: { data: 'test'.repeat(100) }
      };
      
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        securityService.validateInput('db:kv:set', input);
      }
      const end = Date.now();
      
      // Should complete 1000 validations in under 1 second
      expect(end - start).toBeLessThan(1000);
    });

    test('should detect suspicious patterns efficiently', () => {
      const testInputs = [
        'normal string',
        '<script>alert(1)</script>',
        "'; DROP TABLE users; --",
        '../../../etc/passwd',
        'test && rm -rf /'
      ];
      
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        testInputs.forEach(input => {
          securityService.detectSuspiciousInput(input);
        });
      }
      const end = Date.now();
      
      // Should complete 5000 detections in under 500ms
      expect(end - start).toBeLessThan(500);
    });
  });
});
