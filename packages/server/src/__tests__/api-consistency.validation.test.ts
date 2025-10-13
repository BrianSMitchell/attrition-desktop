/**
 * API Consistency Validation Test Suite
 * 
 * Validates that all /api/game/* routes follow consistent patterns for:
 * - Response format structure
 * - HTTP status codes for similar scenarios
 * - Authentication behavior
 * - Empire resolution consistency
 * - Error message standards
 * 
 * This test suite ensures the fixes implemented in Task 4.5 are working correctly
 * and maintains consistency across all game routes.
 */

import request from 'supertest';
import { app } from '../index';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/response-formats';
import { API_ENDPOINTS } from '../constants/api-endpoints';


// Mock the Supabase client for consistent testing
jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn()
    },
    from: jest.fn().mockImplementation((table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      // Default mock data based on table
      data: getMockData(table),
      error: null
    }))
  }
}));

// Mock authentication middleware to control auth behavior in tests
jest.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    // Check for valid test token
    const authHeader = req.headers.authorization;
    if (authHeader === 'Bearer test-valid-token') {
      req.user = { 
        id: 'test-user-id',
        _id: 'test-user-id', // Support both formats
        email: 'test@example.com'
      };
      return next();
    }
    // No token or invalid token
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
      success: false, 
      error: ERROR_MESSAGES.AUTHENTICATION_REQUIRED 
    });
  }
}));

// Mock EmpireResolutionService
jest.mock('../services/empire/EmpireResolutionService', () => ({
  EmpireResolutionService: {
    resolveEmpireByUserObject: jest.fn().mockImplementation((user: any) => {
      if (user && (user.id === 'test-user-id' || user._id === 'test-user-id')) {
        return Promise.resolve({
          id: 'test-empire-id',
          name: 'Test Empire',
          credits: 10000,
          energy: 5000,
          territories: ['A00:10:20:30']
        });
      }
      return Promise.resolve(null); // Empire not found
    })
  }
}));

// Helper function to provide mock data based on table
function getMockData(table: string): any {
  const mockData: Record<string, any> = {
    'empires': {
      id: 'test-empire-id',
      name: 'Test Empire',
      credits: 10000,
      energy: 5000,
      territories: ['A00:10:20:30']
    },
    'colonies': [],
    'locations': [{ coord: 'A00:10:20:30' }],
    'buildings': [],
    'fleets': [],
    'tech_queue': [],
    'unit_queue': [],
    'defense_queue': [],
    'credit_transactions': []
  };
  
  return mockData[table] || {};
}

describe('API Consistency Validation Suite', () => {
  const VALID_TOKEN = 'test-valid-token';
  const INVALID_TOKEN = 'invalid-token';
  
  // All game route endpoints to test
  const GAME_ROUTES = [
    { method: 'GET', path: API_ENDPOINTS.GAME.DASHBOARD },
    { method: 'GET', path: '/api/game/empire' },
    { method: 'GET', path: '/api/game/empire/credits/history' },
    { method: 'GET', path: '/api/game/bases' },
    { method: 'GET', path: '/api/game/bases/A00:10:20:30/stats' },
    { method: 'GET', path: '/api/game/bases/A00:10:20:30/capacities' },
    { method: 'GET', path: '/api/game/bases/A00:10:20:30/combined-stats' },
    { method: 'GET', path: '/api/game/structures/catalog' },
    { method: 'GET', path: '/api/game/structures/queue' },
    { method: 'GET', path: '/api/game/structures/status/A00:10:20:30' },
    { method: 'GET', path: '/api/game/tech/catalog' },
    { method: 'GET', path: '/api/game/tech/status?base=A00:10:20:30' },
    { method: 'GET', path: '/api/game/tech/queue' },
    { method: 'GET', path: API_ENDPOINTS.GAME.FLEETS.BASE },
    { method: 'GET', path: '/api/game/fleets/overview?base=A00:10:20:30' },
    { method: 'GET', path: '/api/game/research' }
  ];

  describe('Task 4.6.1: Response Format Consistency Tests', () => {
    
    it('should return consistent success response format across all routes', async () => {
      for (const route of GAME_ROUTES) {
        const response = await request(app)
          [route.method.toLowerCase() as 'get'](route.path)
          .set('Authorization', `Bearer ${VALID_TOKEN}`);

        // Should return 200 for successful requests
        expect(response.status).toBe(HTTP_STATUS.OK);
        
        // Should have consistent success response structure
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(typeof response.body.success).toBe('boolean');
        expect(typeof response.body.data).toBe('object');
        
        // Should not have error field in success responses
        expect(response.body).not.toHaveProperty('error');
        
        console.log(`✅ ${route.method} ${route.path}: Success format consistent`);
      }
    });

    it('should return consistent error response format for authentication failures', async () => {
      const testRoutes = GAME_ROUTES.slice(0, 5); // Test subset for performance
      
      for (const route of testRoutes) {
        const response = await request(app)
          [route.method.toLowerCase() as 'get'](route.path);

        // Should return 401 for unauthenticated requests
        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        
        // Should have consistent error response structure
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(typeof response.body.success).toBe('boolean');
        expect(typeof response.body.error).toBe('string');
        
        // Should not have data field in error responses
        expect(response.body).not.toHaveProperty('data');
        
        // Should not have inconsistent fields
        expect(response.body).not.toHaveProperty('code');
        expect(response.body).not.toHaveProperty('message');
        expect(response.body).not.toHaveProperty('details');
        
        console.log(`✅ ${route.method} ${route.path}: Error format consistent`);
      }
    });

    it('should use basic error response pattern (no enhanced fields)', async () => {
      // Test a route that should return validation error
      const response = await request(app)
        .get('/api/game/tech/status') // Missing required 'base' parameter
        .set('Authorization', `Bearer ${VALID_TOKEN}`);

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body).toEqual({
        success: false,
        error: expect.any(String)
      });
      
      // Ensure no enhanced error fields are present
      expect(response.body).not.toHaveProperty('code');
      expect(response.body).not.toHaveProperty('message');
      expect(response.body).not.toHaveProperty('details');
    });

  });

  describe('Task 4.6.2: HTTP Status Code Consistency Tests', () => {

    it('should return 401 for all unauthenticated requests', async () => {
      const testRoutes = [
        API_ENDPOINTS.GAME.DASHBOARD,
        '/api/game/empire',
        '/api/game/bases',
        API_ENDPOINTS.GAME.FLEETS.BASE,
        '/api/game/structures/catalog'
      ];

      for (const path of testRoutes) {
        const response = await request(app).get(path);
        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe(ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
      }
    });

    it('should return 400 for validation errors consistently', async () => {
      const validationTestCases = [
        { 
          path: '/api/game/tech/status', 
          description: 'missing base parameter' 
        },
        { 
          path: '/api/game/bases//stats', 
          description: 'empty coordinate parameter',
          expectedStatus: HTTP_STATUS.NOT_FOUND // This will actually be 404 due to routing
        },
        {
          path: '/api/game/fleets/overview',
          description: 'missing base parameter for fleet overview'
        }
      ];

      for (const testCase of validationTestCases) {
        const response = await request(app)
          .get(testCase.path)
          .set('Authorization', `Bearer ${VALID_TOKEN}`);

        const expectedStatus = testCase.expectedStatus || 400;
        expect(response.status).toBe(expectedStatus);
        expect(response.body.success).toBe(false);
        expect(typeof response.body.error).toBe('string');
        
        console.log(`✅ ${testCase.path}: ${testCase.description} returns ${expectedStatus}`);
      }
    });

    it('should return consistent status codes for POST endpoints', async () => {
      // Test POST endpoints with invalid data
      const postTestCases = [
        {
          path: '/api/game/structures/start',
          body: {}, // Missing required fields
          expectedStatus: HTTP_STATUS.BAD_REQUEST
        },
        {
          path: '/api/game/tech/start',
          body: {}, // Missing required fields  
          expectedStatus: HTTP_STATUS.BAD_REQUEST
        }
      ];

      for (const testCase of postTestCases) {
        const response = await request(app)
          .post(testCase.path)
          .set('Authorization', `Bearer ${VALID_TOKEN}`)
          .send(testCase.body);

        expect(response.status).toBe(testCase.expectedStatus);
        expect(response.body.success).toBe(false);
        expect(typeof response.body.error).toBe('string');
      }
    });

  });

  describe('Task 4.6.3: Empire Resolution Consistency Tests', () => {

    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    it('should return 404 with consistent format when empire not found', async () => {
      // Mock EmpireResolutionService to return null (empire not found)
      const { EmpireResolutionService } = require('../services/empire/EmpireResolutionService');
      EmpireResolutionService.resolveEmpireByUserObject.mockResolvedValueOnce(null);

      const testRoutes = [
        '/api/game/empire',
        '/api/game/bases',
        '/api/game/structures/queue',
        API_ENDPOINTS.GAME.FLEETS.BASE
      ];

      for (const path of testRoutes) {
        const response = await request(app)
          .get(path)
          .set('Authorization', `Bearer ${VALID_TOKEN}`);

        // Should return 404 for empire not found
        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        
        // Should have consistent error response structure
        expect(response.body).toEqual({
          success: false,
          error: ERROR_MESSAGES.EMPIRE_NOT_FOUND
        });

        console.log(`✅ ${path}: Empire not found returns consistent 404`);
        
        // Reset mock for next iteration
        EmpireResolutionService.resolveEmpireByUserObject.mockImplementation((user: any) => {
          if (user && (user.id === 'test-user-id' || user._id === 'test-user-id')) {
            return Promise.resolve({
              id: 'test-empire-id',
              name: 'Test Empire',
              credits: 10000,
              energy: 5000,
              territories: ['A00:10:20:30']
            });
          }
          return Promise.resolve(null);
        });
      }
    });

    it('should use EmpireResolutionService consistently across all routes', async () => {
      const { EmpireResolutionService } = require('../services/empire/EmpireResolutionService');
      
      // Make successful requests to routes that should use empire resolution
      const empireDependentRoutes = [
        '/api/game/empire',
        '/api/game/bases',
        '/api/game/structures/queue',
        '/api/game/tech/queue',
        API_ENDPOINTS.GAME.FLEETS.BASE
      ];

      for (const path of empireDependentRoutes) {
        await request(app)
          .get(path)
          .set('Authorization', `Bearer ${VALID_TOKEN}`);

        // Verify EmpireResolutionService was called
        expect(EmpireResolutionService.resolveEmpireByUserObject).toHaveBeenCalled();
      }

      // Should have been called once per route
      expect(EmpireResolutionService.resolveEmpireByUserObject).toHaveBeenCalledTimes(
        empireDependentRoutes.length
      );
    });

  });

  describe('Task 4.6.4: Error Response Pattern Tests', () => {

    it('should never expose database error details', async () => {
      // Mock database error
      const mockSupabase = require('../config/supabase').supabase;
      mockSupabase.from.mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: null,
        error: { message: 'Internal database connection failed', code: 'ECONNREFUSED' }
      }));

      const response = await request(app)
        .get(API_ENDPOINTS.GAME.FLEETS.BASE)
        .set('Authorization', `Bearer ${VALID_TOKEN}`);

      // Should return 500 for server errors
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      
      // Should have generic error message, not database details
      expect(response.body).toEqual({
        success: false,
        error: expect.stringMatching(/^Failed to fetch/)
      });
      
      // Should not expose internal database error details
      expect(response.body.error).not.toContain('ECONNREFUSED');
      expect(response.body.error).not.toContain('Internal database');
      expect(response.body).not.toHaveProperty('code');
    });

    it('should provide user-friendly error messages', async () => {
      const testCases = [
        {
          path: '/api/game/tech/status',
          expectedError: /base coordinate/i
        },
        {
          path: '/api/game/fleets/overview',
          expectedError: /base parameter/i
        }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .get(testCase.path)
          .set('Authorization', `Bearer ${VALID_TOKEN}`);

        expect(response.body.error).toMatch(testCase.expectedError);
        
        // Error should be descriptive but not technical
        expect(response.body.error.length).toBeGreaterThan(10);
        expect(response.body.error).not.toContain('undefined');
        expect(response.body.error).not.toContain('null');
      }
    });

    it('should handle service errors consistently', async () => {
      // Mock a service that returns an error
      jest.doMock('../services/structures/StructureService', () => ({
        StructureService: {
          startConstruction: jest.fn().mockResolvedValue({
            success: false,
            code: 'ALREADY_IN_PROGRESS',
            error: ERROR_MESSAGES.CONSTRUCTION_IN_PROGRESS
          })
        }
      }));

      const response = await request(app)
        .post('/api/game/structures/start')
        .set('Authorization', `Bearer ${VALID_TOKEN}`)
        .send({
          locationCoord: 'A00:10:20:30',
          catalogKey: 'solar_plants'
        });

      // Should map service error codes to appropriate HTTP status
      expect(response.status).toBe(HTTP_STATUS.CONFLICT); // Conflict for ALREADY_IN_PROGRESS
      
      // Should normalize service error to basic pattern
      expect(response.body).toEqual({
        success: false,
        error: ERROR_MESSAGES.CONSTRUCTION_IN_PROGRESS
      });
      
      // Should not expose service-specific code
      expect(response.body).not.toHaveProperty('code');
    });

  });

  describe('Integration: Full API Consistency Validation', () => {

    it('should maintain consistent patterns across all routes', async () => {
      const results = {
        successResponses: 0,
        errorResponses: 0,
        statusCodeConsistency: true,
        responseFormatConsistency: true
      };

      // Test a subset of routes for comprehensive validation
      const testRoutes = GAME_ROUTES.slice(0, 8);

      for (const route of testRoutes) {
        // Test successful request
        const successResponse = await request(app)
          [route.method.toLowerCase() as 'get'](route.path)
          .set('Authorization', `Bearer ${VALID_TOKEN}`);

        if (successResponse.status === HTTP_STATUS.OK) {
          results.successResponses++;
          
          // Validate success response format
          if (!successResponse.body.hasOwnProperty('success') || 
              !successResponse.body.hasOwnProperty('data') ||
              successResponse.body.hasOwnProperty('error')) {
            results.responseFormatConsistency = false;
          }
        }

        // Test authentication error
        const errorResponse = await request(app)
          [route.method.toLowerCase() as 'get'](route.path);

        if (errorResponse.status === HTTP_STATUS.UNAUTHORIZED) {
          results.errorResponses++;
          
          // Validate error response format
          if (!errorResponse.body.hasOwnProperty('success') ||
              !errorResponse.body.hasOwnProperty('error') ||
              errorResponse.body.hasOwnProperty('data') ||
              errorResponse.body.hasOwnProperty('code') ||
              errorResponse.body.hasOwnProperty('message')) {
            results.responseFormatConsistency = false;
          }
        } else {
          results.statusCodeConsistency = false;
        }
      }

      // Validate overall consistency
      expect(results.responseFormatConsistency).toBe(true);
      expect(results.statusCodeConsistency).toBe(true);
      expect(results.successResponses).toBeGreaterThan(0);
      expect(results.errorResponses).toBeGreaterThan(0);

      console.log('📊 API Consistency Results:', results);
    });

  });

});








