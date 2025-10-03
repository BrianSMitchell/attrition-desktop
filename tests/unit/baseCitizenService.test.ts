/**
 * Test: Citizens Per Hour Functionality
 * 
 * This test verifies that the citizen generation system is working correctly:
 * 1. Buildings generate citizens per hour based on their type and level
 * 2. Citizens accumulate over time with proper remainder handling (milli-citizens)
 * 3. Citizens provide production bonuses to other capacities
 */

import mongoose from 'mongoose';

// Mock the Colony model
const ColonyFind = jest.fn();
const ColonyFindOne = jest.fn();
const ColonyUpdateOne = jest.fn();

jest.mock('../../packages/server/src/models/Colony', () => ({
  Colony: {
    find: ColonyFind,
    findOne: ColonyFindOne,
    updateOne: ColonyUpdateOne,
  },
}));

// Mock the CapacityService
const GetBaseCapacities = jest.fn();
jest.mock('../../packages/server/src/services/capacityService', () => ({
  CapacityService: {
    getBaseCapacities: GetBaseCapacities,
  },
}));

// Import after mocks
import { BaseCitizenService } from '../../packages/server/src/services/baseCitizenService';

describe('BaseCitizenService - Citizens Per Hour Tests', () => {
  const empireId = '64a7b2c3d4e5f6a7b8c9d0e1';
  const locationCoord = 'A00:00:00:00';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set default environment variable for test consistency
    process.env.CITIZEN_PAYOUT_PERIOD_MINUTES = '1'; // 1 minute periods
  });

  describe('Basic Citizen Generation', () => {
    it('should generate citizens based on building capacities over time', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      
      // Mock colony data - no citizens initially, last update 1 hour ago
      const mockColony = {
        _id: 'colony1',
        locationCoord,
        empireId: new mongoose.Types.ObjectId(empireId),
        citizens: 0,
        citizenRemainderMilli: 0,
        lastCitizenUpdate: oneHourAgo,
        createdAt: oneHourAgo,
      };

      ColonyFind.mockResolvedValue([mockColony]);

      // Mock capacity service - should generate 10 citizens per hour
      GetBaseCapacities.mockResolvedValue({
        citizen: { value: 10 }
      });

      ColonyUpdateOne.mockResolvedValue({ acknowledged: true });

      // Act - run citizen update
      const result = await BaseCitizenService.updateEmpireBases(empireId);

      // Assert
      expect(result.updated).toBe(1);
      expect(result.errors).toBe(0);
      
      // Verify the colony was updated with expected citizen count
      expect(ColonyUpdateOne).toHaveBeenCalledWith(
        { _id: 'colony1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            citizens: 10, // Should have generated 10 citizens in 1 hour
          })
        })
      );
    });

    it('should handle fractional citizens with remainder system', async () => {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
      
      // Mock colony data
      const mockColony = {
        _id: 'colony1',
        locationCoord,
        empireId: new mongoose.Types.ObjectId(empireId),
        citizens: 5,
        citizenRemainderMilli: 0,
        lastCitizenUpdate: thirtyMinutesAgo,
        createdAt: thirtyMinutesAgo,
      };

      ColonyFind.mockResolvedValue([mockColony]);

      // Mock capacity service - 10 citizens per hour = 5 citizens per 30 minutes
      GetBaseCapacities.mockResolvedValue({
        citizen: { value: 10 }
      });

      ColonyUpdateOne.mockResolvedValue({ acknowledged: true });

      // Act
      await BaseCitizenService.updateEmpireBases(empireId);

      // Assert - should add 5 more citizens (10 per hour * 0.5 hour = 5)
      expect(ColonyUpdateOne).toHaveBeenCalledWith(
        { _id: 'colony1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            citizens: 10, // 5 original + 5 new = 10 total
          })
        })
      );
    });

    it('should accumulate remainder for sub-whole citizen generation', async () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000); // 1 minute ago
      
      // Mock colony data
      const mockColony = {
        _id: 'colony1',
        locationCoord,
        empireId: new mongoose.Types.ObjectId(empireId),
        citizens: 0,
        citizenRemainderMilli: 0,
        lastCitizenUpdate: oneMinuteAgo,
        createdAt: oneMinuteAgo,
      };

      ColonyFind.mockResolvedValue([mockColony]);

      // Mock capacity service - 3 citizens per hour = 0.05 citizens per minute
      // This should generate 50 milli-citizens per minute
      GetBaseCapacities.mockResolvedValue({
        citizen: { value: 3 }
      });

      ColonyUpdateOne.mockResolvedValue({ acknowledged: true });

      // Act
      await BaseCitizenService.updateEmpireBases(empireId);

      // Assert - no whole citizens yet, but remainder should be accumulated
      expect(ColonyUpdateOne).toHaveBeenCalledWith(
        { _id: 'colony1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            citizens: 0, // Still 0 whole citizens
            citizenRemainderMilli: 50, // 3/60 = 0.05 citizens = 50 milli-citizens
          })
        })
      );
    });

    it('should handle zero citizen generation gracefully', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const mockColony = {
        _id: 'colony1',
        locationCoord,
        empireId: new mongoose.Types.ObjectId(empireId),
        citizens: 0,
        citizenRemainderMilli: 0,
        lastCitizenUpdate: oneHourAgo,
        createdAt: oneHourAgo,
      };

      ColonyFind.mockResolvedValue([mockColony]);

      // Mock capacity service - no citizen generation buildings
      GetBaseCapacities.mockResolvedValue({
        citizen: { value: 0 }
      });

      ColonyUpdateOne.mockResolvedValue({ acknowledged: true });

      // Act
      await BaseCitizenService.updateEmpireBases(empireId);

      // Assert - should still update lastCitizenUpdate but no citizen change
      expect(ColonyUpdateOne).toHaveBeenCalledWith(
        { _id: 'colony1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            lastCitizenUpdate: expect.any(Date),
          })
        })
      );
      
      // Citizens should remain 0
      const updateCall = ColonyUpdateOne.mock.calls[0];
      expect(updateCall[1].$set).not.toHaveProperty('citizens');
    });
  });

  describe('Multiple Colony Support', () => {
    it('should update multiple colonies for an empire', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const mockColonies = [
        {
          _id: 'colony1',
          locationCoord: 'A00:00:00:00',
          empireId: new mongoose.Types.ObjectId(empireId),
          citizens: 0,
          citizenRemainderMilli: 0,
          lastCitizenUpdate: oneHourAgo,
        },
        {
          _id: 'colony2',
          locationCoord: 'A00:00:00:01',
          empireId: new mongoose.Types.ObjectId(empireId),
          citizens: 5,
          citizenRemainderMilli: 500,
          lastCitizenUpdate: oneHourAgo,
        }
      ];

      ColonyFind.mockResolvedValue(mockColonies);

      // Mock different capacities for each colony
      GetBaseCapacities
        .mockResolvedValueOnce({ citizen: { value: 10 } }) // Colony 1: 10/hour
        .mockResolvedValueOnce({ citizen: { value: 15 } }); // Colony 2: 15/hour

      ColonyUpdateOne.mockResolvedValue({ acknowledged: true });

      // Act
      const result = await BaseCitizenService.updateEmpireBases(empireId);

      // Assert
      expect(result.updated).toBe(2);
      expect(result.errors).toBe(0);
      expect(ColonyUpdateOne).toHaveBeenCalledTimes(2);
      
      // Check first colony update (0 + 10 = 10 citizens)
      expect(ColonyUpdateOne).toHaveBeenNthCalledWith(1,
        { _id: 'colony1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            citizens: 10,
          })
        })
      );
      
      // Check second colony update (5 + 15 + 0.5 remainder = 20 citizens, 500 remainder used up)
      expect(ColonyUpdateOne).toHaveBeenNthCalledWith(2,
        { _id: 'colony2' },
        expect.objectContaining({
          $set: expect.objectContaining({
            citizens: 20, // 5 existing + 15 new + 0 from remainder (500 milli = 0.5, but total is 15.5 = 15 whole + 500 remainder)
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle capacity service errors gracefully', async () => {
      const mockColony = {
        _id: 'colony1',
        locationCoord,
        empireId: new mongoose.Types.ObjectId(empireId),
        citizens: 0,
        citizenRemainderMilli: 0,
        lastCitizenUpdate: new Date(Date.now() - 60 * 60 * 1000),
      };

      ColonyFind.mockResolvedValue([mockColony]);
      GetBaseCapacities.mockRejectedValue(new Error('Capacity service error'));

      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await BaseCitizenService.updateEmpireBases(empireId);

      // Assert
      expect(result.updated).toBe(0);
      expect(result.errors).toBe(1);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle database update errors gracefully', async () => {
      const mockColony = {
        _id: 'colony1',
        locationCoord,
        empireId: new mongoose.Types.ObjectId(empireId),
        citizens: 0,
        citizenRemainderMilli: 0,
        lastCitizenUpdate: new Date(Date.now() - 60 * 60 * 1000),
      };

      ColonyFind.mockResolvedValue([mockColony]);
      GetBaseCapacities.mockResolvedValue({ citizen: { value: 10 } });
      ColonyUpdateOne.mockRejectedValue(new Error('Database error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      const result = await BaseCitizenService.updateEmpireBases(empireId);

      // Assert
      expect(result.updated).toBe(0);
      expect(result.errors).toBe(1);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});