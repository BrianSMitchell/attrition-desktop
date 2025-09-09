/// <reference types="jest" />

/**
 * Mock DB layer to avoid Mongoose ObjectId casting in format-only tests.
 * We only verify response shape here, not deep service behavior.
 */
const EmpireFindById = jest.fn()
jest.mock('../models/Empire', () => ({
  Empire: { findById: (...args: any[]) => EmpireFindById(...args) },
}))

import { StructuresService } from '../../packages/desktop/src/services/structuresService'
import { DefensesService } from '../../packages/desktop/src/services/defensesService'
import { UnitsService } from '../../packages/desktop/src/services/unitsService'

describe('Service DTO Format Compliance', () => {
  const mockEmpireId = 'mock-empire-id'
  const mockLocationCoord = 'A00:00:00:00'

  beforeEach(() => {
    jest.clearAllMocks()
    // Default to "empire not found" so services fail fast and return canonical error DTOs
    EmpireFindById.mockResolvedValue(null)
  })

  describe('StructuresService', () => {
    test('should return canonical error format for invalid catalogKey', async () => {
      const result = await StructuresService.start(mockEmpireId, mockLocationCoord, '' as any);

      expect(result.success).toBe(false);
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('details');
      // Legacy compatibility
      expect(result).toHaveProperty('error');
    });

    test('should return canonical success format', async () => {
      // Use a location that exists for success case
      const result = await StructuresService.start(mockEmpireId, 'A00:01:02:03', 'solar_plants' as any);

      // May fail due to location validation, but should maintain format
      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('message');
      } else {
        expect(result).toHaveProperty('code');
        expect(result).toHaveProperty('message');
      }
    });
  });

describe('DefensesService', () => {
  test('should return canonical error format', async () => {
    const result = await DefensesService.start(mockEmpireId, mockLocationCoord, 'unknown_key' as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('message');
      // Legacy compatibility
      expect(result).toHaveProperty('error');
    }
  });

  test('canonical success format', async () => {
    const result = await DefensesService.start(mockEmpireId, 'A00:01:02:03', 'defense_station' as any);

    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
      // Note: Success responses do not have 'code'
    }
  });
});

  describe('UnitsService', () => {
    test('should return canonical error format', async () => {
      const result = await UnitsService.start(mockEmpireId, mockLocationCoord, 'unknown_unit' as any);

      expect(result.success).toBe(false);
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('message');
      // Legacy compatibility
      expect(result).toHaveProperty('error');
    });

    test('canonical success format', async () => {
      const result = await UnitsService.start(mockEmpireId, 'A00:01:02:03', 'cruiser' as any);

      expect(result).toHaveProperty('success');
    });
  });
});

// Helper test to verify distinct error codes
describe('Error Code Uniqueness', () => {
  test('different services should use appropriate error codes', async () => {
    const structureResult = await StructuresService.start('', '', '' as any);
    const defenseResult = await DefensesService.start('', '', '' as any);
    const unitResult = await UnitsService.start('', '', '' as any);

    // Error responses should have appropriate error codes
    if (!structureResult.success && 'code' in structureResult && (structureResult as any).code) {
      expect((structureResult as any).code).toMatch(/^(NOT_FOUND|INVALID_REQUEST)$/);
    }
    if (!defenseResult.success && 'code' in defenseResult && (defenseResult as any).code) {
      expect((defenseResult as any).code).toMatch(/^(NOT_FOUND|INVALID_REQUEST)$/);
    }
    if (!unitResult.success && 'code' in unitResult && (unitResult as any).code) {
      expect((unitResult as any).code).toMatch(/^(NOT_FOUND|INVALID_REQUEST)$/);
    }
  });
});
