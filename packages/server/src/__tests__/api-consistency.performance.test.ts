/**
 * API Consistency Performance and Edge Case Test Suite
 * 
 * Validates that consistency fixes don't negatively impact performance
 * and handles edge cases properly across all game routes.
 */

import request from 'supertest';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/response-formats';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { app } from '../index';

// Mock all dependencies for performance testing
jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      data: { id: 'test-empire-id', name: 'Test Empire' },
      error: null
    }))
  }
}));

jest.mock('../services/empire/EmpireResolutionService', () => ({
  EmpireResolutionService: {
    resolveEmpireByUserObject: jest.fn().mockResolvedValue({
      id: 'test-empire-id',
      name: 'Test Empire',
      credits: 10000,
      energy: 5000,
      territories: ['A00:10:20:30']
    })
  }
}));

jest.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader === 'Bearer performance-test-token') {
      req.user = { id: 'test-user-id', email: 'test@example.com' };
      return next();
    }
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, error: ERROR_MESSAGES.AUTHENTICATION_REQUIRED });
  }
}));

describe('API Consistency Performance and Edge Cases', () => {
  
  const PERFORMANCE_TEST_TOKEN = 'performance-test-token';
  
  // Routes for performance testing
  const PERFORMANCE_TEST_ROUTES = [
    API_ENDPOINTS.GAME.DASHBOARD,
    '/api/game/empire',
    '/api/game/bases',
    '/api/game/structures/catalog',
    '/api/game/tech/catalog',
    API_ENDPOINTS.GAME.FLEETS.BASE,
    '/api/game/research'
  ];

  describe('Response Time Consistency', () => {

    it('should maintain consistent response times across routes', async () => {
      const responseTimes: { route: string; time: number }[] = [];
      
      for (const route of PERFORMANCE_TEST_ROUTES) {
        const startTime = process.hrtime.bigint();
        
        const response = await request(app)
          .get(route)
          .set('Authorization', `Bearer ${PERFORMANCE_TEST_TOKEN}`);
        
        const endTime = process.hrtime.bigint();
        const responseTimeMs = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
        
        responseTimes.push({ route, time: responseTimeMs });
        
        // Should return successful response
        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.success).toBe(true);
      }

      // Calculate statistics
      const times = responseTimes.map(rt => rt.time);
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      console.log('📊 Response Time Statistics:');
      console.log(`   Average: ${avgTime.toFixed(2)}ms`);
      console.log(`   Min: ${minTime.toFixed(2)}ms`);
      console.log(`   Max: ${maxTime.toFixed(2)}ms`);
      console.log(`   Variance: ${(maxTime - minTime).toFixed(2)}ms`);

      // Performance assertions
      expect(avgTime).toBeLessThan(100); // Average response should be under 100ms
      expect(maxTime).toBeLessThan(500); // No single route should take more than 500ms
      expect(maxTime - minTime).toBeLessThan(200); // Variance should be reasonable
      
      // Log individual route performance
      responseTimes.forEach(rt => {
        console.log(`   ${rt.route}: ${rt.time.toFixed(2)}ms`);
      });
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const testRoute = API_ENDPOINTS.GAME.DASHBOARD;
      
      const startTime = process.hrtime.bigint();
      
      const promises = Array(concurrentRequests).fill(0).map(() =>
        request(app)
          .get(testRoute)
          .set('Authorization', `Bearer ${PERFORMANCE_TEST_TOKEN}`)
      );
      
      const responses = await Promise.all(promises);
      
      const endTime = process.hrtime.bigint();
      const totalTime = Number(endTime - startTime) / 1_000_000;
      const avgTimePerRequest = totalTime / concurrentRequests;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.success).toBe(true);
      });
      
      console.log(`📊 Concurrent Request Performance (${concurrentRequests} requests):`);
      console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`   Average per request: ${avgTimePerRequest.toFixed(2)}ms`);
      
      // Concurrent performance should be reasonable
      expect(avgTimePerRequest).toBeLessThan(200); // Should handle concurrency well
    });

  });

  describe('Memory Usage and Resource Management', () => {

    it('should not leak memory during repeated requests', async () => {
      const initialMemory = process.memoryUsage();
      
      // Make many requests to test for memory leaks
      for (let i = 0; i < 50; i++) {
        await request(app)
          .get(API_ENDPOINTS.GAME.DASHBOARD)
          .set('Authorization', `Bearer ${PERFORMANCE_TEST_TOKEN}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapGrowthMB = heapGrowth / (1024 * 1024);
      
      console.log(`📊 Memory Usage:`);
      console.log(`   Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Growth: ${heapGrowthMB.toFixed(2)}MB`);
      
      // Memory growth should be reasonable (less than 10MB for 50 requests)
      expect(heapGrowthMB).toBeLessThan(10);
    });

  });

  describe('Error Handling Edge Cases', () => {

    it('should handle extremely large request bodies gracefully', async () => {
      const largePayload = {
        locationCoord: 'A00:10:20:30',
        catalogKey: 'solar_plants',
        largeData: 'x'.repeat(10000) // 10KB of data
      };

      const response = await request(app)
        .post('/api/game/structures/start')
        .set('Authorization', `Bearer ${PERFORMANCE_TEST_TOKEN}`)
        .send(largePayload);

      // Should handle gracefully (either accept or reject, but not crash)
      expect([HTTP_STATUS.OK, HTTP_STATUS.BAD_REQUEST, 413, HTTP_STATUS.INTERNAL_SERVER_ERROR]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
      
      if (!response.body.success) {
        expect(typeof response.body.error).toBe('string');
      }
    });

    it('should handle malformed JSON payloads consistently', async () => {
      const malformedPayloads = [
        '{"invalid": json}', // Missing quotes
        '{"incomplete": ', // Incomplete JSON
        '{invalid}', // Invalid syntax
        'not-json-at-all',
        '{"nested": {"deeply": {"very": {"much": "deep"}}}}' // Valid but deeply nested
      ];

      for (const payload of malformedPayloads) {
        const response = await request(app)
          .post('/api/game/structures/start')
          .set('Authorization', `Bearer ${PERFORMANCE_TEST_TOKEN}`)
          .set('Content-Type', 'application/json')
          .send(payload);

        // Should return consistent error format for malformed JSON
        expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.INTERNAL_SERVER_ERROR]).toContain(response.status);
        expect(response.body).toHaveProperty('success', false);
        expect(typeof response.body.error).toBe('string');
        
        console.log(`✅ Malformed JSON handled: ${response.status} for "${payload.substring(0, 20)}..."`);
      }
    });

    it('should handle special characters in parameters gracefully', async () => {
      const specialCharacterTests = [
        { param: 'A00:10:20:30<script>', description: 'XSS attempt' },
        { param: "A00'; DROP TABLE locations; --", description: 'SQL injection attempt' },
        { param: 'A00%00%01%02', description: 'Null bytes and control characters' },
        { param: 'A00' + 'a'.repeat(1000), description: 'Extremely long parameter' },
        { param: 'A00\n\r\t', description: 'Newlines and tabs' },
        { param: '../../etc/passwd', description: 'Path traversal attempt' }
      ];

      for (const test of specialCharacterTests) {
        const response = await request(app)
          .get(`/api/game/structures/status/${encodeURIComponent(test.param)}`)
          .set('Authorization', `Bearer ${PERFORMANCE_TEST_TOKEN}`);

        // Should handle gracefully without exposing internal errors
        expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.NOT_FOUND, HTTP_STATUS.INTERNAL_SERVER_ERROR]).toContain(response.status);
        expect(response.body).toHaveProperty('success', false);
        expect(typeof response.body.error).toBe('string');
        
        // Should not expose internal system paths or technical details
        expect(response.body.error).not.toContain('etc/passwd');
        expect(response.body.error).not.toContain('DROP TABLE');
        expect(response.body.error).not.toContain('<script>');
        
        console.log(`✅ ${test.description}: Handled safely`);
      }
    });

    it('should handle HTTP method mismatches consistently', async () => {
      const methodTests = [
        { method: 'POST', path: API_ENDPOINTS.GAME.DASHBOARD, expectedStatus: [HTTP_STATUS.NOT_FOUND, 405] },
        { method: 'PUT', path: '/api/game/empire', expectedStatus: [HTTP_STATUS.NOT_FOUND, 405] },
        { method: 'DELETE', path: '/api/game/bases', expectedStatus: [HTTP_STATUS.NOT_FOUND, 405] },
        { method: 'PATCH', path: API_ENDPOINTS.GAME.FLEETS.BASE, expectedStatus: [HTTP_STATUS.NOT_FOUND, 405] }
      ];

      for (const test of methodTests) {
        const response = await request(app)
          [test.method.toLowerCase() as keyof typeof request.Test.prototype](test.path)
          .set('Authorization', `Bearer ${PERFORMANCE_TEST_TOKEN}`);

        expect(test.expectedStatus).toContain(response.status);
        
        // If it returns an error response, it should be properly formatted
        if (response.body && response.body.success !== undefined) {
          expect(response.body.success).toBe(false);
          expect(typeof response.body.error).toBe('string');
        }
        
        console.log(`✅ ${test.method} ${test.path}: Returns ${response.status}`);
      }
    });

  });

  describe('Stress Testing', () => {

    it('should handle rapid sequential requests without degradation', async () => {
      const requestCount = 20;
      const responseTimes: number[] = [];
      
      for (let i = 0; i < requestCount; i++) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get('/api/game/empire')
          .set('Authorization', `Bearer ${PERFORMANCE_TEST_TOKEN}`);
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        responseTimes.push(responseTime);
        
        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.success).toBe(true);
      }
      
      // Check that performance doesn't degrade over time
      const firstHalf = responseTimes.slice(0, requestCount / 2);
      const secondHalf = responseTimes.slice(requestCount / 2);
      
      const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;
      
      console.log(`📊 Performance Consistency:`);
      console.log(`   First half average: ${firstHalfAvg.toFixed(2)}ms`);
      console.log(`   Second half average: ${secondHalfAvg.toFixed(2)}ms`);
      console.log(`   Degradation: ${((secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100).toFixed(1)}%`);
      
      // Performance should not degrade by more than 50%
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5);
    });

  });

  describe('Response Size and Structure Validation', () => {

    it('should maintain consistent response sizes across similar routes', async () => {
      const catalogRoutes = [
        '/api/game/structures/catalog',
        '/api/game/tech/catalog'
      ];
      
      const responseSizes: { route: string; size: number }[] = [];
      
      for (const route of catalogRoutes) {
        const response = await request(app)
          .get(route)
          .set('Authorization', `Bearer ${PERFORMANCE_TEST_TOKEN}`);
        
        const responseSize = JSON.stringify(response.body).length;
        responseSizes.push({ route, size: responseSize });
        
        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.catalog)).toBe(true);
      }
      
      responseSizes.forEach(rs => {
        console.log(`📊 ${rs.route}: ${rs.size} bytes`);
        
        // Response sizes should be reasonable (not too large)
        expect(rs.size).toBeLessThan(50000); // Less than 50KB
        expect(rs.size).toBeGreaterThan(10); // More than 10 bytes (not empty)
      });
    });

    it('should validate response structure depth and complexity', async () => {
      const response = await request(app)
        .get('/api/game/empire')
        .set('Authorization', `Bearer ${PERFORMANCE_TEST_TOKEN}`);
      
      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.success).toBe(true);
      
      // Validate response structure isn't overly complex
      const responseStr = JSON.stringify(response.body);
      const maxNestingDepth = calculateMaxDepth(response.body);
      
      console.log(`📊 Response Structure Analysis:`);
      console.log(`   Max nesting depth: ${maxNestingDepth}`);
      console.log(`   Response size: ${responseStr.length} characters`);
      
      // Response structure should be reasonable
      expect(maxNestingDepth).toBeLessThan(10); // Not too deeply nested
      expect(responseStr.length).toBeLessThan(10000); // Not too large
    });

  });

});

// Helper function to calculate maximum nesting depth of an object
function calculateMaxDepth(obj: any, currentDepth = 0): number {
  if (typeof obj !== 'object' || obj === null) {
    return currentDepth;
  }
  
  if (Array.isArray(obj)) {
    return Math.max(currentDepth, ...obj.map(item => calculateMaxDepth(item, currentDepth + 1)));
  }
  
  const depths = Object.values(obj).map(value => calculateMaxDepth(value, currentDepth + 1));
  return Math.max(currentDepth, ...depths);
}







