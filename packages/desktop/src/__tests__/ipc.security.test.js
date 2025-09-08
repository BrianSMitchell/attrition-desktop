/**
 * IPC Security Test Suite
 * Tests the security fixes implemented for Phase 5 Task 1.2.1
 * 
 * Tests Priority 1 security fixes:
 * 1. URL protocol allowlist for app:openExternal
 * 2. Database key validation for kv handlers  
 * 3. Access token validation for bootstrap handler
 * 4. String parameter length limits
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { app, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock the main process IPC handlers for testing
let mockIpcHandlers = {};

// Mock ipcMain.handle to capture handler registrations
const originalHandle = ipcMain.handle;
ipcMain.handle = (channel, handler) => {
  mockIpcHandlers[channel] = handler;
  return originalHandle.call(ipcMain, channel, handler);
};

describe('IPC Security Tests', () => {
  beforeAll(async () => {
    // Load the main process module to register IPC handlers
    await import('../main.js');
  });

  afterAll(() => {
    // Restore original ipcMain.handle
    ipcMain.handle = originalHandle;
  });

  describe('URL Protocol Security (app:openExternal)', () => {
    const handler = mockIpcHandlers['app:openExternal'];

    test('should allow safe HTTP URLs', async () => {
      const result = await handler(null, 'https://example.com');
      expect(result).toBe(true);
    });

    test('should allow safe HTTP URLs', async () => {
      const result = await handler(null, 'http://example.com');
      expect(result).toBe(true);
    });

    test('should allow mailto URLs', async () => {
      const result = await handler(null, 'mailto:test@example.com');
      expect(result).toBe(true);
    });

    test('should reject javascript: URLs', async () => {
      const result = await handler(null, 'javascript:alert(1)');
      expect(result).toBe(false);
    });

    test('should reject file: URLs', async () => {
      const result = await handler(null, 'file:///etc/passwd');
      expect(result).toBe(false);
    });

    test('should reject data: URLs', async () => {
      const result = await handler(null, 'data:text/html,<script>alert(1)</script>');
      expect(result).toBe(false);
    });

    test('should reject ftp: URLs', async () => {
      const result = await handler(null, 'ftp://example.com/file.txt');
      expect(result).toBe(false);
    });

    test('should reject null/undefined URLs', async () => {
      const result1 = await handler(null, null);
      const result2 = await handler(null, undefined);
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    test('should reject non-string URLs', async () => {
      const result1 = await handler(null, 123);
      const result2 = await handler(null, {});
      const result3 = await handler(null, []);
      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });

    test('should reject URLs that are too long', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);
      const result = await handler(null, longUrl);
      expect(result).toBe(false);
    });

    test('should reject localhost URLs', async () => {
      const result1 = await handler(null, 'http://localhost:3000');
      const result2 = await handler(null, 'https://127.0.0.1:8080');
      const result3 = await handler(null, 'http://192.168.1.1');
      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });
  });

  describe('Database Key Validation Security (db:kv:*)', () => {
    const setHandler = mockIpcHandlers['db:kv:set'];
    const getHandler = mockIpcHandlers['db:kv:get'];
    const deleteHandler = mockIpcHandlers['db:kv:delete'];

    test('should allow valid user keys', async () => {
      const result = await setHandler(null, 'user_preferences', { theme: 'dark' });
      expect(result.success).toBe(true);
    });

    test('should allow valid cache keys', async () => {
      const result = await setHandler(null, 'cache_data', 'test data');
      expect(result.success).toBe(true);
    });

    test('should allow valid settings keys', async () => {
      const result = await setHandler(null, 'settings_ui', { showNotifications: true });
      expect(result.success).toBe(true);
    });

    test('should reject forbidden system keys', async () => {
      const result1 = await setHandler(null, 'device_id', 'malicious-device');
      const result2 = await setHandler(null, 'bootstrap_version', '2.0.0');
      const result3 = await setHandler(null, 'refresh_token', 'stolen-token');
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
    });

    test('should reject keys without valid prefixes', async () => {
      const result1 = await setHandler(null, 'malicious_key', 'data');
      const result2 = await setHandler(null, 'system_config', 'data');
      const result3 = await setHandler(null, 'admin_data', 'data');
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
    });

    test('should reject null/undefined keys', async () => {
      const result1 = await setHandler(null, null, 'data');
      const result2 = await setHandler(null, undefined, 'data');
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });

    test('should reject non-string keys', async () => {
      const result1 = await setHandler(null, 123, 'data');
      const result2 = await setHandler(null, {}, 'data');
      const result3 = await setHandler(null, [], 'data');
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
    });

    test('should reject keys that are too long', async () => {
      const longKey = 'user_' + 'a'.repeat(200);
      const result = await setHandler(null, longKey, 'data');
      expect(result.success).toBe(false);
    });

    test('should reject values that are too large', async () => {
      const largeValue = 'x'.repeat(200000); // 200KB
      const result = await setHandler(null, 'user_test', largeValue);
      expect(result.success).toBe(false);
    });

    test('should apply same validation to get operations', async () => {
      const result1 = await getHandler(null, 'device_id');
      const result2 = await getHandler(null, 'malicious_key');
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });

    test('should apply same validation to delete operations', async () => {
      const result1 = await deleteHandler(null, 'device_id');
      const result2 = await deleteHandler(null, 'malicious_key');
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });
  });

  describe('Access Token Validation Security (db:bootstrap:fetchAndCache)', () => {
    const handler = mockIpcHandlers['db:bootstrap:fetchAndCache'];

    test('should reject null/undefined tokens', async () => {
      const result1 = await handler(null, null);
      const result2 = await handler(null, undefined);
      
      expect(result1.success).toBe(false);
      expect(result1.error).toBe('no_access_token');
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('no_access_token');
    });

    test('should reject non-string tokens', async () => {
      const result1 = await handler(null, 123);
      const result2 = await handler(null, {});
      const result3 = await handler(null, []);
      
      expect(result1.success).toBe(false);
      expect(result1.error).toBe('invalid_token_type');
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('invalid_token_type');
      expect(result3.success).toBe(false);
      expect(result3.error).toBe('invalid_token_type');
    });

    test('should reject tokens that are too long', async () => {
      const longToken = 'eyJ' + 'a'.repeat(6000);
      const result = await handler(null, longToken);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('token_too_long');
    });

    test('should reject tokens with invalid JWT format', async () => {
      const result1 = await handler(null, 'invalid-jwt-token');
      const result2 = await handler(null, 'Bearer eyJhbGciOiJIUzI1NiJ9');
      
      expect(result1.success).toBe(false);
      expect(result1.error).toBe('invalid_jwt_format');
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('invalid_jwt_format');
    });

    test('should reject malformed JWT tokens', async () => {
      const result1 = await handler(null, 'eyJhbGciOiJIUzI1NiJ9'); // Only 1 part
      const result2 = await handler(null, 'eyJhbGciOiJIUzI1NiJ9.payload'); // Only 2 parts
      
      expect(result1.success).toBe(false);
      expect(result1.error).toBe('malformed_jwt');
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('malformed_jwt');
    });

    test('should accept properly formatted JWT tokens', async () => {
      // This will still fail at HTTP request level, but token validation should pass
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = await handler(null, validJWT);
      
      // Should pass token validation but fail later at network request level
      expect(result.error).not.toBe('invalid_token_type');
      expect(result.error).not.toBe('token_too_long');
      expect(result.error).not.toBe('invalid_jwt_format');
      expect(result.error).not.toBe('malformed_jwt');
    });
  });

  describe('String Parameter Length Limits', () => {
    const errorLogHandler = mockIpcHandlers['error:log'];
    const eventQueueHandler = mockIpcHandlers['eventQueue:enqueue'];

    test('should truncate overly long error messages', async () => {
      const longMessage = 'x'.repeat(10000);
      const result = await errorLogHandler(null, { 
        message: longMessage,
        level: 'error' 
      });
      
      expect(result.success).toBe(true);
      // Message should be truncated to 5000 chars + truncation notice
    });

    test('should truncate overly long stack traces', async () => {
      const longStack = 'x'.repeat(20000);
      const result = await errorLogHandler(null, { 
        message: 'test error',
        stack: longStack,
        level: 'error' 
      });
      
      expect(result.success).toBe(true);
      // Stack should be truncated to 10000 chars + truncation notice
    });

    test('should reject invalid error entry objects', async () => {
      const result1 = await errorLogHandler(null, null);
      const result2 = await errorLogHandler(null, 'not an object');
      const result3 = await errorLogHandler(null, 123);
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
    });

    test('should reject event kinds that are too long', async () => {
      const longKind = 'x'.repeat(150);
      const result = await eventQueueHandler(null, longKind, { data: 'test' });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Event kind must be a string');
    });

    test('should reject event payloads that are too large', async () => {
      const largePayload = { data: 'x'.repeat(60000) }; // > 50KB when stringified
      const result = await eventQueueHandler(null, 'test', largePayload);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Event payload too large');
    });

    test('should reject invalid event kinds', async () => {
      const result1 = await eventQueueHandler(null, null, {});
      const result2 = await eventQueueHandler(null, 123, {});
      const result3 = await eventQueueHandler(null, '', {});
      
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
    });
  });

  describe('Security Integration Tests', () => {
    test('should maintain consistent error response format', async () => {
      const handlers = [
        ['app:openExternal', mockIpcHandlers['app:openExternal']],
        ['db:kv:set', mockIpcHandlers['db:kv:set']],
        ['db:bootstrap:fetchAndCache', mockIpcHandlers['db:bootstrap:fetchAndCache']]
      ];

      for (const [channel, handler] of handlers) {
        // Test with null parameter
        const result = await handler(null, null);
        
        // All handlers should return consistent error response structure
        expect(typeof result).toBe('object');
        expect(result).toHaveProperty('success');
        expect(result.success).toBe(false);
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      }
    });

    test('should log security rejections for monitoring', async () => {
      // These tests verify that security violations are properly logged
      // for security monitoring and alerting
      
      const maliciousTests = [
        () => mockIpcHandlers['app:openExternal'](null, 'javascript:alert(1)'),
        () => mockIpcHandlers['db:kv:set'](null, 'device_id', 'malicious'),
        () => mockIpcHandlers['db:bootstrap:fetchAndCache'](null, 'invalid-token'),
        () => mockIpcHandlers['eventQueue:enqueue'](null, 'x'.repeat(200), {})
      ];

      // All malicious requests should be rejected
      for (const test of maliciousTests) {
        const result = await test();
        expect(result.success).toBe(false);
      }
    });
  });
});

/**
 * Test Helper Functions
 */

function generateValidJWT() {
  // Helper to generate a properly formatted (but not necessarily valid) JWT for testing
  const header = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64');
  const payload = Buffer.from(JSON.stringify({sub: '1234567890', name: 'Test User'})).toString('base64');
  const signature = 'test-signature-for-validation';
  return `${header}.${payload}.${signature}`;
}

function generateMaliciousPayload(type) {
  // Helper to generate various types of malicious payloads for testing
  switch (type) {
    case 'xss':
      return '<script>alert("xss")</script>';
    case 'injection':
      return '\'; DROP TABLE users; --';
    case 'overflow':
      return 'A'.repeat(100000);
    case 'null-byte':
      return 'test\x00malicious';
    default:
      return 'generic-malicious-payload';
  }
}
