import request from 'supertest';
import express from 'express';
import fleetRoutes from '../routes/game/fleets';
import { authenticate } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { EmpireResolutionService } from '../services/empire/EmpireResolutionService';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/response-formats';

// Mock dependencies
import { DB_FIELDS } from '../../../constants/database-fields';
import { GAME_CONSTANTS } from '@game/shared';
jest.mock('../config/supabase');
jest.mock('../services/empire/EmpireResolutionService');
jest.mock('../services/fleets/FleetMovementService');
jest.mock('../middleware/auth');
jest.mock('@game/shared', () => ({
  getUnitSpec: jest.fn(() => ({ name: 'Mock Unit', credits: GAME_CONSTANTS.STARTING_CREDITS }))
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockEmpireResolutionService = EmpireResolutionService as jest.Mocked<typeof EmpireResolutionService>;
const mockFleetMovementService = FleetMovementService as jest.Mocked<typeof FleetMovementService>;
const mockAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;

// Test app setup
const app = express();
app.use(express.json());
app.use('/fleets', fleetRoutes);

// Add basic error handling for debugging
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Test error:', error.message);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: error.message });
});

// Mock user for authentication
const mockUser = {
  _id: 'user123',
  id: 'user123',
  username: 'testuser'
};

const mockEmpire = {
  id: 'empire123',
  name: 'Test Empire',
  user_id: 'user123'
};

describe('Fleet Routes', () => {
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

  describe('GET /fleets', () => {
    it('should list all fleets for authenticated empire (FR-1)', async () => {
      // Mock fleet data
      const mockFleets = [
        {
          id: 'fleet1',
          name: 'Alpha Fleet',
          size_credits: 1000,
          created_at: '2023-01-01T00:00:00Z',
          location_coord: 'A00:00:01:01'
        },
        {
          id: 'fleet2', 
          name: 'Beta Fleet',
          size_credits: 1500,
          created_at: '2023-01-02T00:00:00Z',
          location_coord: 'A00:00:01:02'
        }
      ];

      // Mock Supabase query
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockFleets, error: null })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const response = await request(app)
        .get('/fleets')
        .expect(HTTP_STATUS.OK);

      expect(response.body).toEqual({
        success: true,
        data: {
          fleets: [
            {
              _id: 'fleet1',
              name: 'Alpha Fleet',
              ownerName: 'Test Empire',
              arrival: null,
              sizeCredits: 1000,
              locationCoord: 'A00:00:01:01'
            },
            {
              _id: 'fleet2',
              name: 'Beta Fleet',
              ownerName: 'Test Empire',
              arrival: null,
              sizeCredits: 1500,
              locationCoord: 'A00:00:01:02'
            }
          ]
        }
      });

      expect(mockQuery.eq).toHaveBeenCalledWith(DB_FIELDS.BUILDINGS.EMPIRE_ID, 'empire123');
    });

    it('should filter fleets by base coordinate when provided (FR-2)', async () => {
      const mockFleets = [
        {
          id: 'fleet1',
          name: 'Alpha Fleet',
          size_credits: 1000,
          created_at: '2023-01-01T00:00:00Z',
          location_coord: 'A00:00:01:01'
        }
      ];

      // Create a proper mock query chain that handles multiple eq calls
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockFleets, error: null })
      };
      // Ensure eq method returns the mock query object consistently
      mockQuery.eq.mockReturnValue(mockQuery);
      
      mockSupabase.from.mockReturnValue(mockQuery as any);
      // Reset empire resolution mock for this test
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);

      const response = await request(app)
        .get('/fleets?base=A00:00:01:01');
      
      expect(response.status).toBe(HTTP_STATUS.OK);

      // Verify filter was applied
      expect(mockQuery.eq).toHaveBeenCalledWith(DB_FIELDS.BUILDINGS.EMPIRE_ID, 'empire123');
      expect(mockQuery.eq).toHaveBeenCalledWith(DB_FIELDS.BUILDINGS.LOCATION_COORD, 'A00:00:01:01');
    });

    it('should return 404 when empire not found (FR-15)', async () => {
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(null);

      const response = await request(app)
        .get('/fleets')
        .expect(HTTP_STATUS.NOT_FOUND);

      expect(response.body).toEqual({
        success: false,
        error: ERROR_MESSAGES.EMPIRE_NOT_FOUND
      });
    });

    it('should handle database errors (FR-15)', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database connection failed' }
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const response = await request(app)
        .get('/fleets')
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        success: false,
        code: 'DB_ERROR',
        error: 'Database connection failed'
      });
    });

    it('should follow established response format (FR-12)', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      const response = await request(app)
        .get('/fleets')
        .expect(HTTP_STATUS.OK);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('fleets');
      expect(Array.isArray(response.body.data.fleets)).toBe(true);
    });
  });

  describe('GET /fleets/overview', () => {
    it('should return fleet overview for a specific base (FR-5, FR-7)', async () => {
      const mockFleets = [
        {
          id: 'fleet1',
          name: 'Alpha Fleet',
          units: [
            { unitKey: 'fighter', count: 10 },
            { unitKey: 'bomber', count: 5 }
          ]
        }
      ];

      // Create a mock that properly tracks all eq calls in the chain
      const mockEq = jest.fn();
      const secondQuery = { eq: jest.fn().mockResolvedValue({ data: mockFleets, error: null }) };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: mockEq
      };
      
      // Set up the chaining: first eq returns an object with eq, second eq resolves
      mockEq.mockReturnValue(secondQuery);
      
      mockSupabase.from.mockReturnValue(mockQuery as any);
      // Reset empire resolution mock for this test
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);

      const response = await request(app)
        .get('/fleets/overview?base=A00:00:01:01')
        .expect(HTTP_STATUS.OK);

      expect(response.body).toEqual({
        success: true,
        data: {
          fleets: [
            {
              _id: 'fleet1',
              name: 'Alpha Fleet',
              units: [
                { type: 'fighter', count: 10 },
                { type: 'bomber', count: 5 }
              ]
            }
          ]
        }
      });

      expect(mockEq).toHaveBeenCalledWith(DB_FIELDS.BUILDINGS.EMPIRE_ID, 'empire123');
      expect(secondQuery.eq).toHaveBeenCalledWith(DB_FIELDS.BUILDINGS.LOCATION_COORD, 'A00:00:01:01');
    });

    it('should require base parameter (FR-15)', async () => {
      const response = await request(app)
        .get('/fleets/overview')
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body).toEqual({
        success: false,
        code: 'INVALID_REQUEST',
        message: 'base parameter is required',
        details: { field: 'base' }
      });
    });

    it('should handle empty units array gracefully (FR-7)', async () => {
      const mockFleets = [
        {
          id: 'fleet1',
          name: 'Empty Fleet',
          units: []
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      // Set up proper chaining for two eq calls  
      mockQuery.eq.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: mockFleets, error: null })
      });
      mockSupabase.from.mockReturnValue(mockQuery as any);
      // Reset empire resolution mock for this test
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);

      const response = await request(app)
        .get('/fleets/overview?base=A00:00:01:01')
        .expect(HTTP_STATUS.OK);

      expect(response.body.data.fleets[0].units).toEqual([]);
    });

    it('should handle malformed units data (FR-7)', async () => {
      const mockFleets = [
        {
          id: 'fleet1',
          name: 'Fleet with Bad Data',
          units: null // Malformed units data
        }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      // Set up proper chaining for two eq calls
      mockQuery.eq.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: mockFleets, error: null })
      });
      mockSupabase.from.mockReturnValue(mockQuery as any);
      // Reset empire resolution mock for this test
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);

      const response = await request(app)
        .get('/fleets/overview?base=A00:00:01:01')
        .expect(HTTP_STATUS.OK);

      expect(response.body.data.fleets[0].units).toEqual([]);
    });
  });

  describe('GET /fleets/:id', () => {
    it('should return detailed fleet information for valid fleet ID (FR-3)', async () => {
      const mockFleet = {
        id: 'fleet123',
        name: 'Alpha Strike Force',
        location_coord: 'A00:00:01:01',
        units: [
          { unitKey: 'fighter', count: 25 },
          { unitKey: 'bomber', count: 10 }
        ],
        size_credits: 15000
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      // Chain two eq calls and resolve with mock fleet
      mockQuery.eq.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockFleet, error: null })
        })
      });
      
      mockSupabase.from.mockReturnValue(mockQuery as any);
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);

      const response = await request(app)
        .get('/fleets/fleet123')
        .expect(HTTP_STATUS.OK);

      expect(response.body).toEqual({
        success: true,
        data: {
          fleet: {
            _id: 'fleet123',
            name: 'Alpha Strike Force',
            locationCoord: 'A00:00:01:01',
            ownerName: 'Test Empire',
            units: [
              { unitKey: 'fighter', name: 'Mock Unit', count: 25 },
              { unitKey: 'bomber', name: 'Mock Unit', count: 10 }
            ],
            sizeCredits: 15000
          }
        }
      });
    });

    it('should return 400 for empty fleet ID parameter', async () => {
      // Test with an encoded empty string as fleet ID (more realistic scenario)
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);
      
      const response = await request(app)
        .get('/fleets/%20') // URL-encoded space that will be trimmed to empty string
        
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.body).toEqual({
        success: false,
        code: 'INVALID_REQUEST',
        message: 'Invalid fleet id',
        details: { field: DB_FIELDS.BUILDINGS.ID }
      });
    });

    it('should handle routes without fleet ID parameter correctly', async () => {
      // When accessing /fleets/ without ID, it should match the list route, not the detail route
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);
      
      const response = await request(app)
        .get('/fleets')
        .expect(HTTP_STATUS.OK);
        
      // Should return list format, not detail format
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('fleets');
      expect(Array.isArray(response.body.data.fleets)).toBe(true);
    });

    it('should return 404 when fleet not found or not owned by user', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      // Mock Postgres error code for no rows returned
      mockQuery.eq.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { code: 'PGRST116', message: 'No rows returned' }
          })
        })
      });
      
      mockSupabase.from.mockReturnValue(mockQuery as any);
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);

      const response = await request(app)
        .get('/fleets/nonexistent')
        .expect(HTTP_STATUS.NOT_FOUND);

      expect(response.body).toEqual({
        success: false,
        code: 'FLEET_NOT_FOUND',
        error: ERROR_MESSAGES.FLEET_NOT_FOUND
      });
    });

    it('should return 404 when empire not found', async () => {
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(null);

      const response = await request(app)
        .get('/fleets/fleet123')
        .expect(HTTP_STATUS.NOT_FOUND);

      expect(response.body).toEqual({
        success: false,
        error: ERROR_MESSAGES.EMPIRE_NOT_FOUND
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      mockQuery.eq.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { code: 'OTHER_ERROR', message: 'Database connection failed' }
          })
        })
      });
      
      mockSupabase.from.mockReturnValue(mockQuery as any);
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);

      const response = await request(app)
        .get('/fleets/fleet123')
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        success: false,
        code: 'DB_ERROR',
        error: 'Database connection failed'
      });
    });

    it('should handle empty units array gracefully', async () => {
      const mockFleet = {
        id: 'fleet123',
        name: 'Empty Fleet',
        location_coord: 'A00:00:01:01',
        units: [], // Empty units
        size_credits: 0
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      mockQuery.eq.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockFleet, error: null })
        })
      });
      
      mockSupabase.from.mockReturnValue(mockQuery as any);
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);

      const response = await request(app)
        .get('/fleets/fleet123')
        .expect(HTTP_STATUS.OK);

      expect(response.body.data.fleet.units).toEqual([]);
    });

    it('should handle malformed units data gracefully', async () => {
      const mockFleet = {
        id: 'fleet123',
        name: 'Fleet with Bad Data',
        location_coord: 'A00:00:01:01',
        units: null, // Malformed units
        size_credits: 5000
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      mockQuery.eq.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockFleet, error: null })
        })
      });
      
      mockSupabase.from.mockReturnValue(mockQuery as any);
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);

      const response = await request(app)
        .get('/fleets/fleet123')
        .expect(HTTP_STATUS.OK);

      expect(response.body.data.fleet.units).toEqual([]);
    });

    it('should use getUnitSpec for unit names and handle spec errors', async () => {
      const mockFleet = {
        id: 'fleet123',
        name: 'Mixed Fleet',
        location_coord: 'A00:00:01:01',
        units: [
          { unitKey: 'valid_unit', count: 5 },
          { unitKey: 'invalid_unit', count: 3 }
        ],
        size_credits: 8000
      };

      // Mock getUnitSpec to throw for invalid_unit
      const mockGetUnitSpec = require('@game/shared').getUnitSpec;
      mockGetUnitSpec.mockImplementation((key: string) => {
        if (key === 'valid_unit') return { name: 'Valid Unit Name' };
        throw new Error('Unit not found');
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      mockQuery.eq.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: mockFleet, error: null })
        })
      });
      
      mockSupabase.from.mockReturnValue(mockQuery as any);
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);

      const response = await request(app)
        .get('/fleets/fleet123')
        .expect(HTTP_STATUS.OK);

      expect(response.body.data.fleet.units).toEqual([
        { unitKey: 'valid_unit', name: 'Valid Unit Name', count: 5 },
        { unitKey: 'invalid_unit', name: 'invalid_unit', count: 3 } // Fallback to key
      ]);
    });
  });

  describe('POST /fleets/:id/move', () => {
    it('should successfully initiate fleet movement (FR-4)', async () => {
      const mockMovement = {
        id: 'movement123',
        fleet_id: 'fleet123',
        empire_id: 'empire123',
        origin_coord: 'A00:00:01:01',
        destination_coord: 'A00:00:02:02',
        departure_time: '2023-01-01T00:00:00Z',
        estimated_arrival_time: '2023-01-01T02:00:00Z',
        status: 'travelling',
        travel_time_hours: 2,
        fleet_speed: 10,
        distance: 100
      };

      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);
      mockFleetMovementService.dispatchFleet.mockResolvedValue({
        success: true,
        movement: mockMovement
      });

      const response = await request(app)
        .post('/fleets/fleet123/move')
        .send({ destinationCoord: 'A00:00:02:02' })
        .expect(HTTP_STATUS.OK);

      expect(response.body).toEqual({
        success: true,
        data: { movement: mockMovement },
        message: 'Fleet movement initiated successfully'
      });

      expect(mockFleetMovementService.dispatchFleet).toHaveBeenCalledWith(
        'fleet123',
        'empire123',
        { destinationCoord: 'A00:00:02:02' }
      );
    });

    it('should return 400 for invalid fleet ID', async () => {
      const response = await request(app)
        .post('/fleets/%20/move') // URL-encoded space
        .send({ destinationCoord: 'A00:00:02:02' })
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body).toEqual({
        success: false,
        code: 'INVALID_REQUEST',
        message: 'Invalid fleet id',
        details: { field: DB_FIELDS.BUILDINGS.ID }
      });
    });

    it('should return 400 when destinationCoord is missing', async () => {
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);

      const response = await request(app)
        .post('/fleets/fleet123/move')
        .send({}) // No destinationCoord
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body).toEqual({
        success: false,
        code: 'INVALID_REQUEST',
        message: 'destinationCoord is required',
        details: { field: 'destinationCoord' }
      });
    });

    it('should return 400 when destinationCoord is not a string', async () => {
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);

      const response = await request(app)
        .post('/fleets/fleet123/move')
        .send({ destinationCoord: 123 }) // Not a string
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body).toEqual({
        success: false,
        code: 'INVALID_REQUEST',
        message: 'destinationCoord is required',
        details: { field: 'destinationCoord' }
      });
    });

    it('should return 404 when empire not found', async () => {
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(null);

      const response = await request(app)
        .post('/fleets/fleet123/move')
        .send({ destinationCoord: 'A00:00:02:02' })
        .expect(HTTP_STATUS.NOT_FOUND);

      expect(response.body).toEqual({
        success: false,
        error: ERROR_MESSAGES.EMPIRE_NOT_FOUND
      });
    });

    it('should return 404 when fleet not found', async () => {
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);
      mockFleetMovementService.dispatchFleet.mockResolvedValue({
        success: false,
        code: 'FLEET_NOT_FOUND',
        error: ERROR_MESSAGES.FLEET_NOT_FOUND
      });

      const response = await request(app)
        .post('/fleets/nonexistent/move')
        .send({ destinationCoord: 'A00:00:02:02' })
        .expect(HTTP_STATUS.NOT_FOUND);

      expect(response.body).toEqual({
        success: false,
        code: 'FLEET_NOT_FOUND',
        error: ERROR_MESSAGES.FLEET_NOT_FOUND
      });
    });

    it('should return 400 for empty fleet', async () => {
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);
      mockFleetMovementService.dispatchFleet.mockResolvedValue({
        success: false,
        code: 'EMPTY_FLEET',
        error: 'Fleet has no units to dispatch'
      });

      const response = await request(app)
        .post('/fleets/fleet123/move')
        .send({ destinationCoord: 'A00:00:02:02' })
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body).toEqual({
        success: false,
        code: 'EMPTY_FLEET',
        error: 'Fleet has no units to dispatch'
      });
    });

    it('should return 400 when fleet is already moving', async () => {
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);
      mockFleetMovementService.dispatchFleet.mockResolvedValue({
        success: false,
        code: 'FLEET_ALREADY_MOVING',
        error: 'Fleet is already moving'
      });

      const response = await request(app)
        .post('/fleets/fleet123/move')
        .send({ destinationCoord: 'A00:00:02:02' })
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body).toEqual({
        success: false,
        code: 'FLEET_ALREADY_MOVING',
        error: 'Fleet is already moving'
      });
    });

    it('should return 400 when destination is invalid', async () => {
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);
      mockFleetMovementService.dispatchFleet.mockResolvedValue({
        success: false,
        code: 'INVALID_DESTINATION',
        error: 'Invalid coordinate format'
      });

      const response = await request(app)
        .post('/fleets/fleet123/move')
        .send({ destinationCoord: 'invalid-coord' })
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body).toEqual({
        success: false,
        code: 'INVALID_DESTINATION',
        error: 'Invalid coordinate format'
      });
    });

    it('should return 400 when fleet is already at destination', async () => {
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);
      mockFleetMovementService.dispatchFleet.mockResolvedValue({
        success: false,
        code: 'ALREADY_AT_DESTINATION',
        error: 'Fleet is already at the destination'
      });

      const response = await request(app)
        .post('/fleets/fleet123/move')
        .send({ destinationCoord: 'A00:00:01:01' }) // Same as current location
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body).toEqual({
        success: false,
        code: 'ALREADY_AT_DESTINATION',
        error: 'Fleet is already at the destination'
      });
    });

    it('should return 500 for dispatch errors', async () => {
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);
      mockFleetMovementService.dispatchFleet.mockResolvedValue({
        success: false,
        code: 'DISPATCH_ERROR',
        error: 'Failed to dispatch fleet'
      });

      const response = await request(app)
        .post('/fleets/fleet123/move')
        .send({ destinationCoord: 'A00:00:02:02' })
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        success: false,
        code: 'DISPATCH_ERROR',
        error: 'Failed to dispatch fleet'
      });
    });

    it('should handle service exceptions gracefully', async () => {
      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);
      mockFleetMovementService.dispatchFleet.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/fleets/fleet123/move')
        .send({ destinationCoord: 'A00:00:02:02' })
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        success: false,
        code: ERROR_MESSAGES.INTERNAL_ERROR,
        error: 'Failed to initiate fleet movement'
      });
    });

    it('should follow established response format (FR-12)', async () => {
      const mockMovement = {
        id: 'movement123',
        status: 'travelling'
      };

      mockEmpireResolutionService.resolveEmpireByUserObject.mockResolvedValue(mockEmpire as any);
      mockFleetMovementService.dispatchFleet.mockResolvedValue({
        success: true,
        movement: mockMovement
      });

      const response = await request(app)
        .post('/fleets/fleet123/move')
        .send({ destinationCoord: 'A00:00:02:02' })
        .expect(HTTP_STATUS.OK);

      // Verify response format
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('movement');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Authentication and Empire Resolution', () => {
    it('should use EmpireResolutionService for consistent empire handling (FR-14)', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      await request(app)
        .get('/fleets')
        .expect(HTTP_STATUS.OK);

      expect(mockEmpireResolutionService.resolveEmpireByUserObject)
        .toHaveBeenCalledWith(mockUser);
    });
  });
});






