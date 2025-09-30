/**
 * Integration tests for energy validation in StructuresService
 * Verifies that energy gating works correctly and blocks negative projections
 */

import { StructuresService, ServiceResult } from '../services/structuresService';
import { BaseStatsService } from '../services/baseStatsService';
import { Empire } from '../models/Empire';
import { Location } from '../models/Location';
import { Building } from '../models/Building';
import mongoose from 'mongoose';

// Mock the external dependencies
jest.mock('../models/Empire');
jest.mock('../models/Location');
jest.mock('../models/Building');
jest.mock('../services/baseStatsService');
jest.mock('../services/capacityService');

describe('Energy Validation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock mongoose ObjectId creation
    (mongoose.Types.ObjectId as jest.Mock) = jest.fn().mockImplementation((id?: any) => {
      return { toString: () => String(id || 'mock-id') } as any;
    });
  });

  const setupBaseMocks = (empireId: string, locationCoord: string) => {
    // Mock empire
    (Empire.findById as jest.Mock) = jest.fn().mockResolvedValue({
      _id: empireId,
      userId: 'user-123',
      resources: { credits: 1000 },
      techLevels: new Map(),
    } as any);

    // Mock location with owner and planet context
    (Location.findOne as jest.Mock) = jest.fn().mockResolvedValue({
      coord: locationCoord,
      owner: 'user-123',
      result: {
        area: 100,
        fertility: 3,
        solarEnergy: 5,
        yields: { gas: 4 }
      }
    } as any);

    // Mock capacity service
    const { CapacityService } = require('../services/capacityService');
    CapacityService.getBaseCapacities = jest.fn().mockResolvedValue({
      construction: { value: 10 } // 10 credits/hour construction capacity
    });
  };

  test('should allow structure when energy projection is positive', async () => {
    const empireId = 'empire-123';
    const locationCoord = 'A00:00:12:02';
    
    setupBaseMocks(empireId, locationCoord);

    // Mock existing buildings: 2 solar plants (level 2 each) = +20 energy (2*2*5)
    (Building.find as jest.Mock) = jest.fn().mockResolvedValue([
      {
        catalogKey: 'solar_plants',
        level: 2,
        isActive: true,
        pendingUpgrade: false
      }
    ]);

    // Mock base stats showing positive energy balance
    (BaseStatsService.getBaseStats as jest.Mock) = jest.fn().mockResolvedValue({
      area: { total: 100, used: 10, free: 90 },
      energy: { produced: 22, consumed: 0, balance: 22 }, // baseline +2 + solar +20
      population: { used: 0, capacity: 10, free: 10 },
      ownerIncomeCredPerHour: 100
    } as any);

    // Mock no existing building of this type, then return created building
    const mockFindOne = jest.fn()
      .mockResolvedValueOnce(null) // First call - no existing building
      .mockResolvedValueOnce({ // Second call - return created building
        catalogKey: 'research_labs',
        level: 1,
        isActive: false,
        creditsCost: 35
      });
    (Building.findOne as jest.Mock) = mockFindOne;

    // Mock building count for queue sequence
    (Building.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(0);

    // Mock updateOne for building creation
    (Building.updateOne as jest.Mock) = jest.fn().mockResolvedValue({
      upsertedCount: 1,
      upsertedId: 'new-building-id'
    });

    // Try to start a research lab (consumes -1 energy)
    // Projection: 22 + 0 + (-1) = 21 >= 0, should succeed
    const result = await StructuresService.start(empireId, locationCoord, 'research_labs');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message).toContain('Research Labs construction started');
    }
  });

  test('should block structure when energy projection is negative', async () => {
    const empireId = 'empire-456';
    const locationCoord = 'A00:00:12:03';
    
    setupBaseMocks(empireId, locationCoord);

    // Mock existing buildings: no energy producers, only baseline +2
    (Building.find as jest.Mock) = jest.fn().mockResolvedValue([]);

    // Mock base stats showing minimal energy balance
    (BaseStatsService.getBaseStats as jest.Mock) = jest.fn().mockResolvedValue({
      area: { total: 100, used: 0, free: 100 },
      energy: { produced: 2, consumed: 0, balance: 2 }, // only baseline +2
      population: { used: 0, capacity: 10, free: 10 },
      ownerIncomeCredPerHour: 100
    } as any);

    // Now add multiple queued consumers to push projection negative
    (Building.find as jest.Mock) = jest.fn().mockResolvedValue([
      {
        catalogKey: 'metal_refineries',
        level: 1,
        isActive: false,
        pendingUpgrade: false,
        constructionCompleted: new Date()
      },
      {
        catalogKey: 'research_labs',
        level: 1,
        isActive: false,
        pendingUpgrade: false,
        constructionCompleted: new Date()
      }
    ]);

    // Mock no existing building of this type
    (Building.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);

    // Try to start shipyards (consumes -4 energy)
    // Projection: 2 + (-1) + (-1) + (-4) = -4 < 0, should fail
    const result = await StructuresService.start(empireId, locationCoord, 'shipyards');
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INSUFFICIENT_ENERGY');
      expect(result.message).toContain('Insufficient energy capacity');
      expect(result.details?.projectedEnergy).toBeLessThan(0);
    }
  });

  test('should allow producers regardless of energy balance', async () => {
    const empireId = 'empire-789';
    const locationCoord = 'A00:00:12:04';
    
    setupBaseMocks(empireId, locationCoord);

    // Mock existing buildings that create negative energy balance
    (Building.find as jest.Mock) = jest.fn().mockResolvedValue([
      {
        catalogKey: 'research_labs',
        level: 5,
        isActive: true,
        pendingUpgrade: false
      }
    ]);

    // Mock base stats showing negative energy balance
    (BaseStatsService.getBaseStats as jest.Mock) = jest.fn().mockResolvedValue({
      area: { total: 100, used: 50, free: 50 },
      energy: { produced: 2, consumed: 5, balance: -3 }, // negative balance
      population: { used: 5, capacity: 10, free: 5 },
      ownerIncomeCredPerHour: 500
    } as any);

    // Mock no existing solar plants, then return created building
    const mockFindOne = jest.fn()
      .mockResolvedValueOnce(null) // First call - no existing building
      .mockResolvedValueOnce({ // Second call - return created building
        catalogKey: 'solar_plants',
        level: 1,
        isActive: false,
        creditsCost: 8
      });
    (Building.findOne as jest.Mock) = mockFindOne;

    (Building.countDocuments as jest.Mock) = jest.fn().mockResolvedValue(0);
    (Building.updateOne as jest.Mock) = jest.fn().mockResolvedValue({
      upsertedCount: 1,
      upsertedId: 'new-solar-plant'
    });

    // Try to start solar plants (produces +5 energy with planet solarEnergy=5)
    // Projection: -3 + 0 + 5 = 2 >= 0, and producers are always allowed anyway
    const result = await StructuresService.start(empireId, locationCoord, 'solar_plants');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message).toContain('Solar Plants construction started');
    }
  });
});
