/// <reference types="jest" />

/**
 * Unit tests for BaseStatsService key-only aggregation behavior.
 * - Ensures documents missing catalogKey are skipped with standardized diagnostic
 * - Verifies no legacy type→key inference is used (inputs use catalogKey only)
 */

const BuildingFind = jest.fn();
jest.mock('../models/Building', () => ({
  Building: { find: (...args: any[]) => BuildingFind(...args) },
}));

const LocationFindOne = jest.fn();
jest.mock('../models/Location', () => ({
  Location: { findOne: (...args: any[]) => LocationFindOne(...args) },
}));

const computeEnergyBalanceMock = jest.fn().mockReturnValue({
  produced: 0,
  consumed: 0,
  balance: 0,
  reservedNegative: 0,
});
const getBuildingSpecMock = jest.fn().mockImplementation((key: string) => {
  // Minimal spec fields used by BaseStatsService
  return {
    areaRequired: 1,
    populationRequired: 2,
    economy: 0,
    energyDelta: key === 'consumer_test' ? -1 : 0,
  };
});

jest.mock('@game/shared', () => ({
  // Only the pieces BaseStatsService uses
  computeEnergyBalance: (...args: any[]) => computeEnergyBalanceMock(...args),
  getBuildingSpec: (...args: any[]) => getBuildingSpecMock(...args),
}));

import { BaseStatsService } from '../../packages/desktop/src/services/baseStatsService';

type FindChain<T> = {
  select: jest.MockedFunction<any>;
  lean: jest.MockedFunction<any>;
};

const makeFindChain = <T,>(resolved: T): FindChain<T> => {
  const lean = jest.fn().mockResolvedValue(resolved);
  const select = jest.fn().mockReturnValue({ lean });
  // Return shape chained usage: .select(...).lean()
  return { select, lean } as any;
};

describe('BaseStatsService - catalogKey-only aggregation', () => {
  const empireId = '64a7b2c3d4e5f6a7b8c9d0e1';
  const coord = 'A00:00:00:00';

  let currentBuildings: any[] = [];
  let currentLocation: any = null;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default dataset
    currentBuildings = [];
    currentLocation = {
      result: {
        area: 10,
        fertility: 3,
        solarEnergy: 5,
        yields: { gas: 2 },
      },
      properties: {},
    };

    BuildingFind.mockImplementation(() => makeFindChain(currentBuildings));
    LocationFindOne.mockImplementation(() => makeFindChain(currentLocation));
  });

  test('skips and warns when catalogKey is missing', async () => {
    currentBuildings = [
      {
        _id: 'abc123',
        level: 1,
        isActive: true,
        pendingUpgrade: false,
        // catalogKey intentionally omitted/undefined
      },
    ];
    BuildingFind.mockImplementation(() => makeFindChain(currentBuildings));

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await BaseStatsService.getBaseStats(empireId, coord);

    expect(warnSpy).toHaveBeenCalledWith(
      '[BaseStatsService] skip: missing catalogKey _id=%s',
      'abc123'
    );

    // Ensure computeEnergyBalance called with zero buildings when only missing keys present
    expect(computeEnergyBalanceMock).toHaveBeenCalledTimes(1);
    const arg = (computeEnergyBalanceMock as jest.Mock).mock.calls[0][0];
    expect(Array.isArray(arg.buildingsAtBase)).toBe(true);
    expect(arg.buildingsAtBase.length).toBe(0);

    warnSpy.mockRestore();
  });

  test('uses catalogKey-only inputs (no legacy type mapping)', async () => {
    currentBuildings = [
      {
        _id: 'b1',
        level: 1,
        isActive: true,
        pendingUpgrade: false,
        catalogKey: 'urban_structures',
      },
    ];
    BuildingFind.mockImplementation(() => makeFindChain(currentBuildings));

    await BaseStatsService.getBaseStats(empireId, coord);

    // computeEnergyBalance should receive our single building keyed by catalogKey
    expect(computeEnergyBalanceMock).toHaveBeenCalledTimes(1);
    const arg = (computeEnergyBalanceMock as jest.Mock).mock.calls[0][0];
    expect(arg).toHaveProperty('buildingsAtBase');
    expect(arg.buildingsAtBase).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'urban_structures',
          level: 1,
          isActive: true,
        }),
      ])
    );

    // getBuildingSpec should have been looked up by catalogKey (not type)
    expect(getBuildingSpecMock).toHaveBeenCalledWith('urban_structures');

    // Verify population capacity uses fertility per level for Urban Structures
    const dto = await BaseStatsService.getBaseStats(empireId, coord);
    expect(dto.population.capacity).toBe(1 * currentLocation.result.fertility);
  });
});
