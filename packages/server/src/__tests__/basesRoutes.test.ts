import request from 'supertest';
import express from 'express';
import basesRoutes from '../routes/game/bases';
import { authenticate } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/response-formats';

// Mock dependencies
import { DB_FIELDS } from '../../../constants/database-fields';
jest.mock('../config/supabase');
jest.mock('../services/empire/EmpireResolutionService');
jest.mock('../middleware/auth');
jest.mock('../services/bases/StatsService');
jest.mock('../services/bases/CapacityService');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockEmpireResolutionService = EmpireResolutionService as jest.Mocked<typeof EmpireResolutionService>;
const mockAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;

// Test app setup
const app = express();
app.use(express.json());
app.use('/bases', basesRoutes);

// Mock user for authentication
const mockUser = {
  _id: 'user123',
  id: 'user123',
  username: 'testuser'
};

const mockEmpire = {
  id: 'empire123',
  name: 'Test Empire',
  territories: ['A00:00:01:01', 'A00:00:01:02']
};

describe('Bases Routes - Territory Migration (FR-16, FR-17, FR-18)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware
    mockAuthenticate.mockImplementation((req: any, res: any, next: any) => {
      req.user = mockUser;
      next();
    });

    // Mock empire resolution
    mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);
  });

  describe('GET /bases - Territory Listing (migrated from v1)', () => {
    it('should return territories list from colonies table (FR-16)', async () => {
      // Mock colonies data (preferred source)
      const mockColonies = [
        { location_coord: 'A00:00:01:01', name: 'Alpha Base' },
        { location_coord: 'A00:00:01:02', name: 'Beta Outpost' }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockColonies, error: null })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const response = await request(app)
        .get('/bases')
        .expect(HTTP_STATUS.OK);

      expect(response.body).toEqual({
        success: true,
        data: {
          territories: [
            { coord: 'A00:00:01:01', name: 'Alpha Base' },
            { coord: 'A00:00:01:02', name: 'Beta Outpost' }
          ]
        }
      });

      expect(mockQuery.eq).toHaveBeenCalledWith(DB_FIELDS.BUILDINGS.EMPIRE_ID, 'empire123');
    });

    it('should fallback to empires.territories when no colonies exist (FR-18)', async () => {
      // Mock empty colonies, fallback to empire territories
      const mockEmptyColonies = { data: [], error: null };
      const mockEmpireData = { data: { territories: ['A00:00:01:01', 'A00:00:01:02'] }, error: null };
      const mockLocations = { data: [{ coord: 'A00:00:01:01' }, { coord: 'A00:00:01:02' }], error: null };

      const mockColoniesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(mockEmptyColonies)
      };

      const mockEmpireQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue(mockEmpireData)
      };

      const mockLocationQuery = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue(mockLocations)
      };

      mockSupabase.from
        .mockReturnValueOnce(mockColoniesQuery as any)  // colonies query
        .mockReturnValueOnce(mockEmpireQuery as any)    // empires query  
        .mockReturnValueOnce(mockLocationQuery as any); // locations query

      const response = await request(app)
        .get('/bases')
        .expect(HTTP_STATUS.OK);

      expect(response.body).toEqual({
        success: true,
        data: {
          territories: [
            { coord: 'A00:00:01:01' },
            { coord: 'A00:00:01:02' }
          ]
        }
      });
    });

    it('should return empty array when no territories exist', async () => {
      const mockEmptyColonies = { data: [], error: null };
      const mockEmptyEmpire = { data: { territories: [] }, error: null };

      const mockColoniesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(mockEmptyColonies)
      };

      const mockEmpireQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue(mockEmptyEmpire)
      };

      mockSupabase.from
        .mockReturnValueOnce(mockColoniesQuery as any)
        .mockReturnValueOnce(mockEmpireQuery as any);

      const response = await request(app)
        .get('/bases')
        .expect(HTTP_STATUS.OK);

      expect(response.body).toEqual({
        success: true,
        data: { territories: [] }
      });
    });

    it('should return 404 when empire not found (FR-15)', async () => {
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(null);

      const response = await request(app)
        .get('/bases')
        .expect(HTTP_STATUS.NOT_FOUND);

      expect(response.body).toEqual({
        success: false,
        error: ERROR_MESSAGES.EMPIRE_NOT_FOUND
      });
    });
  });

  describe('GET /bases/:coord/stats - Base Statistics (migrated from v1)', () => {
    it('should return base statistics using StatsService (FR-16)', async () => {
      const mockStats = {
        area: 1000,
        energy: { production: HTTP_STATUS.INTERNAL_SERVER_ERROR, consumption: HTTP_STATUS.OK },
        population: { current: 1000, capacity: 2000 }
      };

      // Mock StatsService
      const mockStatsService = {
        getBaseStats: jest.fn().mockResolvedValue(mockStats)
      };

      // Mock dynamic import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/response-formats';
      jest.doMock('../../../services/bases/StatsService', () => ({
        StatsService: mockStatsService
      }));

      const response = await request(app)
        .get('/bases/A00:00:01:01/stats')
        .expect(HTTP_STATUS.OK);

      expect(response.body).toEqual({
        success: true,
        data: { stats: mockStats }
      });
    });

    it('should return 400 when coordinate is missing (FR-15)', async () => {
      const response = await request(app)
        .get('/bases//stats')
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body).toEqual({
        success: false,
        error: ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED
      });
    });

    it('should return 404 when empire not found (FR-15)', async () => {
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(null);

      const response = await request(app)
        .get('/bases/A00:00:01:01/stats')
        .expect(HTTP_STATUS.NOT_FOUND);

      expect(response.body).toEqual({
        success: false,
        error: ERROR_MESSAGES.EMPIRE_NOT_FOUND
      });
    });
  });

  describe('GET /bases/:coord/capacities - Base Capacities (migrated from v1)', () => {
    it('should return base capacities using CapacityService (FR-16)', async () => {
      const mockCapacities = {
        construction: { value: 100, unit: 'credits/hour' },
        production: { value: 50, unit: 'units/hour' },
        research: { value: 25, unit: 'points/hour' }
      };

      // Mock CapacityService
      const mockCapacityService = {
        getBaseCapacities: jest.fn().mockResolvedValue(mockCapacities)
      };

      // Mock dynamic import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/response-formats';
      jest.doMock('../../../services/bases/CapacityService', () => ({
        CapacityService: mockCapacityService
      }));

      const response = await request(app)
        .get('/bases/A00:00:01:01/capacities')
        .expect(HTTP_STATUS.OK);

      expect(response.body).toEqual({
        success: true,
        data: mockCapacities
      });
    });

    it('should handle coordinate validation (FR-15)', async () => {
      const response = await request(app)
        .get('/bases//capacities')
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body).toEqual({
        success: false,
        error: ERROR_MESSAGES.COORDINATE_PARAMETER_REQUIRED
      });
    });
  });

  describe('GET /bases/:coord/combined-stats - Combined Stats (migrated from v1)', () => {
    it('should return combined stats and capacities (FR-16)', async () => {
      const mockStats = { area: 1000, energy: HTTP_STATUS.INTERNAL_SERVER_ERROR };
      const mockCapacities = { construction: 100, production: 50 };

      // Mock both services
      const mockStatsService = {
        getBaseStats: jest.fn().mockResolvedValue(mockStats)
      };
      const mockCapacityService = {
        getBaseCapacities: jest.fn().mockResolvedValue(mockCapacities)
      };

      jest.doMock('../../../services/bases/StatsService', () => ({
        StatsService: mockStatsService
      }));
      jest.doMock('../../../services/bases/CapacityService', () => ({
        CapacityService: mockCapacityService
      }));

      const response = await request(app)
        .get('/bases/A00:00:01:01/combined-stats')
        .expect(HTTP_STATUS.OK);

      expect(response.body).toEqual({
        success: true,
        data: {
          coord: 'A00:00:01:01',
          stats: mockStats,
          capacities: mockCapacities
        },
        message: 'Base stats loaded'
      });
    });

    it('should make parallel calls to both services for efficiency', async () => {
      const mockStatsService = {
        getBaseStats: jest.fn().mockResolvedValue({})
      };
      const mockCapacityService = {
        getBaseCapacities: jest.fn().mockResolvedValue({})
      };

      jest.doMock('../../../services/bases/StatsService', () => ({
        StatsService: mockStatsService
      }));
      jest.doMock('../../../services/bases/CapacityService', () => ({
        CapacityService: mockCapacityService
      }));

      await request(app)
        .get('/bases/A00:00:01:01/combined-stats')
        .expect(HTTP_STATUS.OK);

      // Both services should be called with correct parameters
      expect(mockStatsService.getBaseStats).toHaveBeenCalledWith('empire123', 'A00:00:01:01');
      expect(mockCapacityService.getBaseCapacities).toHaveBeenCalledWith('empire123', 'A00:00:01:01');
    });
  });

  describe('Response Format Compliance (FR-12)', () => {
    it('should follow established response format for all endpoints', async () => {
      // Mock minimal data
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      } as any);

      // Test all endpoints follow the same format
      const endpoints = [
        '/bases',
        '/bases/A00:00:01:01/stats', 
        '/bases/A00:00:01:01/capacities',
        '/bases/A00:00:01:01/combined-stats'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        
        expect(response.body).toHaveProperty('success');
        expect(typeof response.body.success).toBe('boolean');
        
        if (response.body.success) {
          expect(response.body).toHaveProperty('data');
        } else {
          expect(response.body).toHaveProperty('error');
        }
      }
    });
  });

  describe('Authentication and Empire Resolution (FR-14)', () => {
    it('should use EmpireResolutionService consistently across all endpoints', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      } as any);

      const endpoints = [
        '/bases',
        '/bases/A00:00:01:01/stats',
        '/bases/A00:00:01:01/capacities', 
        '/bases/A00:00:01:01/combined-stats'
      ];

      for (const endpoint of endpoints) {
        jest.clearAllMocks();
        await request(app).get(endpoint);
        
        expect(mockEmpireResolutionService.resolveEmpireByUserObject)
          .toHaveBeenCalledWith(mockUser);
      }
    });
  });
});




