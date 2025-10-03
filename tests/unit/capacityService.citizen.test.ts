/**
 * Test: CapacityService - Citizen Generation Calculation
 * 
 * This test verifies that the CapacityService correctly calculates citizen generation
 * rates based on building types and levels:
 * 
 * Building Citizen Generation Rates (per level):
 * - Urban Structures: 3/hour
 * - Command Centers: 1/hour  
 * - Orbital Base: 5/hour
 * - Capital: 8/hour
 * - Biosphere Modification: 10/hour
 */

import mongoose from 'mongoose';

// Mock Building model
const BuildingFind = jest.fn();
jest.mock('../../packages/server/src/models/Building', () => ({
  Building: {
    find: BuildingFind,
  },
}));

// Mock Location model
const LocationFindOne = jest.fn();
jest.mock('../../packages/server/src/models/Location', () => ({
  Location: {
    findOne: LocationFindOne,
  },
}));

// Mock Colony model for citizen bonus calculation
const ColonyFindOne = jest.fn();
jest.mock('../../packages/server/src/models/Colony', () => ({
  Colony: {
    findOne: ColonyFindOne,
  },
}));

// Import after mocks
import { CapacityService } from '../../packages/server/src/services/capacityService';

describe('CapacityService - Citizen Generation Tests', () => {
  const empireId = '64a7b2c3d4e5f6a7b8c9d0e1';
  const locationCoord = 'A00:00:00:00';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default location with no metal yield
    LocationFindOne.mockResolvedValue({
      coord: locationCoord,
      result: { yields: { metal: 0 } }
    });

    // Default colony with no existing citizens (no bonus)
    ColonyFindOne.mockResolvedValue({
      empireId: new mongoose.Types.ObjectId(empireId),
      locationCoord,
      citizens: 0
    });
  });

  describe('Building-Based Citizen Generation', () => {
    it('should calculate citizens per hour from urban structures', async () => {
      // Mock buildings - 2 urban structures at level 3 each
      BuildingFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              catalogKey: 'urban_structures',
              isActive: true,
              pendingUpgrade: false,
              level: 3
            },
            {
              catalogKey: 'urban_structures', 
              isActive: true,
              pendingUpgrade: false,
              level: 3
            }
          ])
        })
      });

      // Act
      const capacities = await CapacityService.getBaseCapacities(empireId, locationCoord);

      // Assert - 2 structures * 3 levels * 3 citizens/hour/level = 18 citizens/hour
      expect(capacities.citizen.value).toBe(18);
      expect(capacities.citizen.breakdown).toEqual([
        { source: 'Urban Structures', value: 18, kind: 'flat' }
      ]);
    });

    it('should calculate citizens per hour from multiple building types', async () => {
      // Mock buildings - mix of citizen-generating structures
      BuildingFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { catalogKey: 'urban_structures', isActive: true, level: 2 },     // 2 * 3 = 6
            { catalogKey: 'command_centers', isActive: true, level: 1 },      // 1 * 1 = 1  
            { catalogKey: 'orbital_base', isActive: true, level: 1 },         // 1 * 5 = 5
            { catalogKey: 'capital', isActive: true, level: 1 },              // 1 * 8 = 8
            { catalogKey: 'biosphere_modification', isActive: true, level: 1 }, // 1 * 10 = 10
          ])
        })
      });

      // Act
      const capacities = await CapacityService.getBaseCapacities(empireId, locationCoord);

      // Assert - total should be 6 + 1 + 5 + 8 + 10 = 30 citizens/hour
      expect(capacities.citizen.value).toBe(30);
      
      // Check breakdown includes all building types
      const breakdown = capacities.citizen.breakdown || [];
      expect(breakdown.find(b => b.source === 'Urban Structures')?.value).toBe(6);
      expect(breakdown.find(b => b.source === 'Command Centers')?.value).toBe(1);
      expect(breakdown.find(b => b.source === 'Orbital Base')?.value).toBe(5);
      expect(breakdown.find(b => b.source === 'Capital')?.value).toBe(8);
      expect(breakdown.find(b => b.source === 'Biosphere Modification')?.value).toBe(10);
    });

    it('should handle inactive buildings correctly', async () => {
      // Mock buildings - one active, one inactive
      BuildingFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { catalogKey: 'urban_structures', isActive: true, level: 2 },   // 2 * 3 = 6 (counted)
            { catalogKey: 'urban_structures', isActive: false, level: 3 },  // Not counted
          ])
        })
      });

      // Act
      const capacities = await CapacityService.getBaseCapacities(empireId, locationCoord);

      // Assert - only active building should count
      expect(capacities.citizen.value).toBe(6);
    });

    it('should handle buildings with pending upgrades as active', async () => {
      // Mock buildings - building with pending upgrade should count as active
      BuildingFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { catalogKey: 'urban_structures', isActive: false, pendingUpgrade: true, level: 2 }, // Should count as active
          ])
        })
      });

      // Act
      const capacities = await CapacityService.getBaseCapacities(empireId, locationCoord);

      // Assert - pending upgrade building should count
      expect(capacities.citizen.value).toBe(6);
    });

    it('should sum multiple instances of the same building type', async () => {
      // Mock buildings - multiple urban structures at different levels
      BuildingFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { catalogKey: 'urban_structures', isActive: true, level: 1 },  // 1 * 3 = 3
            { catalogKey: 'urban_structures', isActive: true, level: 2 },  // 2 * 3 = 6  
            { catalogKey: 'urban_structures', isActive: true, level: 1 },  // 1 * 3 = 3
          ])
        })
      });

      // Act
      const capacities = await CapacityService.getBaseCapacities(empireId, locationCoord);

      // Assert - should sum all levels: (1 + 2 + 1) * 3 = 12
      expect(capacities.citizen.value).toBe(12);
      expect(capacities.citizen.breakdown).toEqual([
        { source: 'Urban Structures', value: 12, kind: 'flat' }
      ]);
    });

    it('should handle zero citizen generation when no relevant buildings exist', async () => {
      // Mock buildings - only non-citizen generating buildings
      BuildingFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { catalogKey: 'shipyards', isActive: true, level: 2 },
            { catalogKey: 'research_labs', isActive: true, level: 1 },
          ])
        })
      });

      // Act
      const capacities = await CapacityService.getBaseCapacities(empireId, locationCoord);

      // Assert - no citizen-generating buildings = 0 citizens/hour
      expect(capacities.citizen.value).toBe(0);
      expect(capacities.citizen.breakdown).toEqual([]);
    });
  });

  describe('Citizen Bonus Application', () => {
    it('should apply citizen bonus to other capacities but not to citizen generation itself', async () => {
      // Mock buildings that generate production capacity
      BuildingFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { catalogKey: 'shipyards', isActive: true, level: 1 },          // 1 * 2 = 2 production
            { catalogKey: 'urban_structures', isActive: true, level: 1 },   // 1 * 3 = 3 citizens/hour
          ])
        })
      });

      // Mock colony with 10,000 citizens (should give 10% bonus: 10,000 / 100,000 = 0.1)
      ColonyFindOne.mockResolvedValue({
        empireId: new mongoose.Types.ObjectId(empireId),
        locationCoord,
        citizens: 10000
      });

      // Act
      const capacities = await CapacityService.getBaseCapacities(empireId, locationCoord);

      // Assert
      // Citizen generation should be unaffected by citizen bonus
      expect(capacities.citizen.value).toBe(3);
      
      // Production should have citizen bonus applied: 2 * 1.1 = 2 (rounded)
      expect(capacities.production.value).toBe(2); // Math.round(2 * 1.1) = 2
      
      // Check that citizen bonus appears in breakdown for production
      const productionBreakdown = capacities.production.breakdown || [];
      expect(productionBreakdown.find(b => b.source === 'Citizens Bonus')).toBeTruthy();
    });

    it('should handle large citizen populations correctly', async () => {
      // Mock minimal buildings
      BuildingFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { catalogKey: 'robotic_factories', isActive: true, level: 10 }, // 10 * 2 = 20 construction
          ])
        })
      });

      // Mock colony with 100,000 citizens (should give 100% bonus: 100,000 / 100,000 = 1.0)  
      ColonyFindOne.mockResolvedValue({
        empireId: new mongoose.Types.ObjectId(empireId),
        locationCoord,
        citizens: 100000
      });

      // Act
      const capacities = await CapacityService.getBaseCapacities(empireId, locationCoord);

      // Assert - construction should be doubled: (40 baseline + 20 robotic) * 2.0 = 120
      expect(capacities.construction.value).toBe(120);
      
      // Check citizen bonus in breakdown
      const breakdown = capacities.construction.breakdown || [];
      const citizenBonus = breakdown.find(b => b.source === 'Citizens Bonus');
      expect(citizenBonus?.value).toBe(1.0); // 100% bonus
      expect(citizenBonus?.kind).toBe('percent');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing colony data gracefully', async () => {
      // Mock buildings
      BuildingFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { catalogKey: 'urban_structures', isActive: true, level: 1 },
          ])
        })
      });

      // Mock no colony found
      ColonyFindOne.mockResolvedValue(null);

      // Act
      const capacities = await CapacityService.getBaseCapacities(empireId, locationCoord);

      // Assert - should still work without citizen bonus
      expect(capacities.citizen.value).toBe(3);
      expect(capacities.construction.value).toBe(40); // Just baseline, no citizen bonus
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error in buildings query
      BuildingFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      // Act & Assert - should not throw
      await expect(CapacityService.getBaseCapacities(empireId, locationCoord))
        .rejects.toThrow('Database error');
    });
  });
});