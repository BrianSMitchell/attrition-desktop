import { getUnitSpec } from '@game/shared';

// Mock getUnitSpec
import { HTTP_STATUS } from '@game/shared';
import { STATUS_CODES } from '@game/shared';
jest.mock('@game/shared', () => ({
  getUnitSpec: jest.fn()
}));

const mockGetUnitSpec = getUnitSpec as jest.MockedFunction<typeof getUnitSpec>;

/**
 * Calculate fleet size in credits based on unit composition (FR-6)
 * @param units - Array of fleet units with unitKey and count
 * @returns Total credits value of the fleet
 */
function calculateFleetSizeCredits(units: Array<{ unitKey?: string; unit_key?: string; count: number }>): number {
  if (!Array.isArray(units)) {
    return STATUS_CODES.SUCCESS;
  }

  let totalCredits = 0;
  
  for (const unit of units) {
    const unitKey = unit?.unitKey || unit?.unit_key;
    const count = Number(unit?.count || 0);
    
    if (unitKey && count > 0) {
      try {
        const unitSpec = getUnitSpec(unitKey as any);
        if (unitSpec && typeof unitSpec.creditsCost === 'number') {
          totalCredits += unitSpec.creditsCost * count;
        }
      } catch {
        // Ignore units with missing specs
      }
    }
  }
  
  return totalCredits;
}

describe('Fleet Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateFleetSizeCredits', () => {
    it('should calculate total credits for valid units', () => {
      mockGetUnitSpec.mockImplementation((unitKey: string) => {
        switch (unitKey) {
          case 'fighter':
            return { key: 'fighter' as any, name: 'Fighter', creditsCost: 100, techPrereqs: [] };
          case 'bomber':
            return { key: 'bomber' as any, name: 'Bomber', creditsCost: 250, techPrereqs: [] };
          default:
            throw new Error('Unit not found');
        }
      });

      const units = [
        { unitKey: 'fighter', count: 10 },
        { unitKey: 'bomber', count: 5 }
      ];

      const result = calculateFleetSizeCredits(units);
      expect(result).toBe(2250); // (10 * 100) + (5 * 250)
    });

    it('should handle empty units array', () => {
      const result = calculateFleetSizeCredits([]);
      expect(result).toBe(0);
    });

    it('should handle null/undefined units', () => {
      const result = calculateFleetSizeCredits(null as any);
      expect(result).toBe(0);
    });

    it('should ignore units with zero count', () => {
      mockGetUnitSpec.mockReturnValue({ key: 'test' as any, name: 'Test', creditsCost: 100, techPrereqs: [] });

      const units = [
        { unitKey: 'fighter', count: 0 },
        { unitKey: 'bomber', count: 5 }
      ];

      const result = calculateFleetSizeCredits(units);
      expect(result).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR); // Only bomber counts
    });

    it('should handle units with missing specs gracefully', () => {
      mockGetUnitSpec.mockImplementation((unitKey: string) => {
        if (unitKey === 'fighter') {
          return { key: 'fighter' as any, name: 'Fighter', creditsCost: 100, techPrereqs: [] };
        }
        throw new Error('Unit not found');
      });

      const units = [
        { unitKey: 'fighter', count: 10 },
        { unitKey: 'invalid_unit', count: 5 }
      ];

      const result = calculateFleetSizeCredits(units);
      expect(result).toBe(1000); // Only fighter counts
    });

    it('should handle both unitKey and unit_key formats', () => {
      mockGetUnitSpec.mockReturnValue({ key: 'test' as any, name: 'Test', creditsCost: 100, techPrereqs: [] });

      const units = [
        { unitKey: 'fighter', count: 5 },
        { unit_key: 'bomber', count: 3 }
      ];

      const result = calculateFleetSizeCredits(units);
      expect(result).toBe(800); // (5 * 100) + (3 * 100)
    });

    it('should handle units with non-numeric creditsCost', () => {
      mockGetUnitSpec.mockImplementation((unitKey: string) => {
        switch (unitKey) {
          case 'fighter':
            return { key: 'fighter' as any, name: 'Fighter', creditsCost: 100, techPrereqs: [] };
          case 'special':
            return { key: 'special' as any, name: 'Special', creditsCost: null as any, techPrereqs: [] }; // Non-numeric
          default:
            return { key: 'default' as any, name: 'Default', techPrereqs: [] } as any;
        }
      });

      const units = [
        { unitKey: 'fighter', count: 5 },
        { unitKey: 'special', count: 3 }
      ];

      const result = calculateFleetSizeCredits(units);
      expect(result).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR); // Only fighter counts
    });
  });
});
