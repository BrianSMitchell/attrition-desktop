/// <reference types="jest" />

/**
 * Capacity Parity Tests
 *
 * Goals (per .clinerules/capacity-parity.md):
 * 1) Verify CapacityService.getBaseCapacities passes through construction.value from @game/shared.computeAllCapacities
 * 2) Verify StructuresService.start computes ETA as:
 *    minutes = max(1, ceil((creditsCost / constructionPerHour) * 60))
 *    - Boundary cases: 1-minute floor, exact hour boundary (60.0), just-over boundary (60.1 -> 61)
 *
 * Production code MUST NOT be changed by this test unless a parity bug is revealed.
 */

/* =========================
 * Jest Mocks
 * ========================= */

// Mocks for Mongoose-backed models (minimal behaviors used by StructuresService.start)
const EmpireFindById = jest.fn();
jest.mock('../models/Empire', () => ({
  Empire: {
    findById: (...args: any[]) => EmpireFindById(...args),
  },
}));

const BuildingFind = jest.fn();
const BuildingFindOne = jest.fn();
const BuildingUpdateOne = jest.fn();
const BuildingSyncIndexes = jest.fn();
jest.mock('../models/Building', () => ({
  Building: {
    find: (...args: any[]) => BuildingFind(...args),
    findOne: (...args: any[]) => BuildingFindOne(...args),
    updateOne: (...args: any[]) => BuildingUpdateOne(...args),
    syncIndexes: (...args: any[]) => BuildingSyncIndexes(...args),
  },
}));

const LocationFindOne = jest.fn();
jest.mock('../models/Location', () => ({
  Location: {
    findOne: (...args: any[]) => LocationFindOne(...args),
  },
}));

// Mock TechService to avoid hitting getBaseLabTotal (which queries Building.find().select('level'))
const TechGetStatus = jest.fn();
jest.mock('../services/techService', () => ({
  TechService: {
    getStatus: (...args: any[]) => TechGetStatus(...args),
  },
}));

// Shared library mocks used by both CapacityService and StructuresService
const computeAllCapacitiesMock = jest.fn();
let getCostReturn = 0;

const getBuildingSpecMock = jest.fn().mockImplementation((key: string) => {
  return {
    key,
    name: key,
    mappedType: key, // legacy compatibility in StructuresService persistence
    creditsCost: getCostReturn,
    energyDelta: 0, // Producer (or neutral) to avoid energy gating block
  };
});

const canStartBuildingByTechMock = jest.fn().mockReturnValue({ ok: true, unmet: [] });
const computeEnergyBalanceMock = jest.fn().mockReturnValue({
  produced: 0,
  consumed: 0,
  balance: 0,
  reservedNegative: 0,
});
const canStartWithDeltaMock = jest.fn().mockReturnValue(true);

let getStructureCreditCostForLevelMock = jest
  .fn()
  .mockImplementation((_key: string, _level: number) => getCostReturn);

jest.mock('@game/shared', () => ({
  // Capacity aggregation used by CapacityService
  computeAllCapacities: (...args: any[]) => computeAllCapacitiesMock(...args),

  // StructuresService dependencies
  getBuildingsList: () => [],
  getBuildingSpec: (...args: any[]) => getBuildingSpecMock(...args),
  canStartBuildingByTech: (...args: any[]) => canStartBuildingByTechMock(...args),
  getStructureCreditCostForLevel: (...args: any[]) => getStructureCreditCostForLevelMock(...args),
  computeEnergyBalance: (...args: any[]) => computeEnergyBalanceMock(...args),
  canStartWithDelta: (...args: any[]) => canStartWithDeltaMock(...args),
}));

import { CapacityService } from '../services/capacityService';
import { StructuresService } from '../services/structuresService';

type FindChain<T> = {
  select: jest.MockedFunction<any>;
  lean: jest.MockedFunction<any>;
};

const makeFindChain = <T,>(resolved: T): FindChain<T> => {
  const lean = jest.fn().mockResolvedValue(resolved);
  const select = jest.fn().mockReturnValue({ lean });
  return { select, lean } as any;
};

/* =========================
 * Test Data Helpers
 * ========================= */

const empireId = '64a7b2c3d4e5f6a7b8c9d0e1';
const locationCoord = 'A00:00:00:00';
const buildingKey = 'robotic_factories';

const makeEmpireDoc = (startingCredits: number) => {
  const doc: any = {
    _id: 'emp1',
    userId: { toString: () => 'owner1' },
    resources: { credits: startingCredits },
    techLevels: {}, // allow all
    save: jest.fn().mockResolvedValue(undefined),
  };
  return doc;
};

const makeLocationDoc = () => {
  const doc: any = {
    _id: 'loc1',
    coord: locationCoord,
    owner: { toString: () => 'owner1' }, // must match empire.userId
    result: { solarEnergy: 0, yields: { gas: 0 } },
  };
  return doc;
};

/* =========================
 * Tests
 * ========================= */

describe('Capacity Parity — CapacityService and StructuresService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCostReturn = 0;

    // Default Empire and Location responses
    EmpireFindById.mockResolvedValue(makeEmpireDoc(1_000_000));
    LocationFindOne.mockResolvedValue(makeLocationDoc());

    // Default Building behaviors — treat as new construction path
    // Support both call shapes:
    //  - CapacityService: Building.find(...).select('type level isActive catalogKey').lean()
    //  - TechService.getBaseLabTotal: Building.find(...).select('level')
    BuildingFind.mockImplementation(() => ({
      select: jest.fn((sel: any) => {
        if (sel === 'level') {
          // Return labs array for TechService path
          return Promise.resolve([]);
        }
        // Return chainable object for CapacityService path
        return { lean: jest.fn().mockResolvedValue([]) };
      }),
    }));
    // First call (existing?) -> null, second call (fetch inserted) -> minimal stub
    BuildingFindOne.mockReset();
    BuildingFindOne.mockResolvedValueOnce(null).mockResolvedValue({ _id: 'new1' });
    // Simulate a successful upsert insert path
    BuildingUpdateOne.mockResolvedValue({ upsertedCount: 1, upsertedId: 'new1' });
    // Allow syncIndexes to be called safely
    BuildingSyncIndexes.mockResolvedValue(undefined);
  });

  test('CapacityService passes through construction.value from @game/shared.computeAllCapacities', async () => {
    // Arrange: computeAllCapacities returns known construction value
    computeAllCapacitiesMock.mockReturnValueOnce({
      construction: { value: 123.45 },
      production: { value: 0 },
      research: { value: 0 },
    });

    // Ensure CapacityService location chain returns the expected shape
    // (CapacityService calls Location.findOne().select(...).lean())
    LocationFindOne.mockImplementation(() =>
      makeFindChain({
        result: { yields: { metal: 0 }, fertility: 0 },
        positionBase: { solarEnergy: 0 },
      })
    );

    // Avoid TechService.getBaseLabTotal side-effects for this test
    TechGetStatus.mockResolvedValue({ techLevels: {}, baseLabTotal: 0, credits: 0, eligibility: {} });

    // Act
    const { construction } = await CapacityService.getBaseCapacities(empireId, locationCoord);

    // Assert
    expect(construction).toBeDefined();
    expect(construction.value).toBe(123.45);
  });

  describe('StructuresService.start — ETA parity minutes = max(1, ceil((creditsCost / cap) * 60))', () => {
    const spyCap = () => jest.spyOn(CapacityService, 'getBaseCapacities');

    test('1-minute floor when creditsCost/cap yields < 1 minute', async () => {
      // Arrange
      const cap = 1000; // credits/hour
      const creditsCost = 1; // credits
      getCostReturn = creditsCost;

      spyCap().mockResolvedValue({
        construction: { value: cap },
        production: { value: 0 },
        research: { value: 0 },
      } as any);

      // Act
      const res = await StructuresService.start(empireId, locationCoord, buildingKey);

      // Assert
      expect(res.success).toBe(true);
      const minutes = (res as any).data?.etaMinutes;
      expect(minutes).toBe(1); // floor
      expect((res as any).data?.constructionCapacityCredPerHour).toBe(cap);
    });

    test('exact 60 minutes at hour boundary (creditsCost == cap)', async () => {
      // Arrange
      const cap = 60; // credits/hour
      const creditsCost = 60; // exactly 1 hour
      getCostReturn = creditsCost;

      spyCap().mockResolvedValue({
        construction: { value: cap },
        production: { value: 0 },
        research: { value: 0 },
      } as any);

      // Act
      const res = await StructuresService.start(empireId, locationCoord, buildingKey);

      // Assert
      expect(res.success).toBe(true);
      const minutes = (res as any).data?.etaMinutes;
      expect(minutes).toBe(60); // exact boundary, no rounding up beyond 60
    });

    test('60.1 minutes rounds up to 61', async () => {
      // Arrange
      const cap = 600; // credits/hour
      const creditsCost = 601; // 601/600 hours = 1.001666.. * 60 = 60.1 minutes -> ceil -> 61
      getCostReturn = creditsCost;

      spyCap().mockResolvedValue({
        construction: { value: cap },
        production: { value: 0 },
        research: { value: 0 },
      } as any);

      // Act
      const res = await StructuresService.start(empireId, locationCoord, buildingKey);

      // Assert
      expect(res.success).toBe(true);
      const minutes = (res as any).data?.etaMinutes;
      expect(minutes).toBe(61);
    });

    test('extremely large creditsCost computes finite etaMinutes (no overflow)', async () => {
      // Arrange
      const cap = 2000; // credits/hour
      const creditsCost = 1_000_000_000; // 1e9 credits
      getCostReturn = creditsCost;

      spyCap().mockResolvedValue({
        construction: { value: cap },
        production: { value: 0 },
        research: { value: 0 },
      } as any);

      // Ensure sufficient credits for very large cost (avoid INSF error path)
      EmpireFindById.mockResolvedValue(makeEmpireDoc(creditsCost));

      // Act
      const res = await StructuresService.start(empireId, locationCoord, buildingKey);

      // Assert
      expect(res.success).toBe(true);
      const minutes = (res as any).data?.etaMinutes;
      // expected = ceil((1e9 / 2000) * 60) = ceil(500000 * 60) = 30000000
      expect(minutes).toBe(30_000_000);
    });

    test('very low but non-zero capacity yields large etaMinutes (no zero/Infinity)', async () => {
      // Arrange
      const cap = 0.0001; // credits/hour (very low but non-zero)
      const creditsCost = 1; // credits
      getCostReturn = creditsCost;

      spyCap().mockResolvedValue({
        construction: { value: cap },
        production: { value: 0 },
        research: { value: 0 },
      } as any);

      // Act
      const res = await StructuresService.start(empireId, locationCoord, buildingKey);

      // Assert
      expect(res.success).toBe(true);
      const minutes = (res as any).data?.etaMinutes;
      // expected = ceil((1 / 0.0001) * 60) = ceil(10000 * 60) = 600000
      expect(minutes).toBe(600_000);
    });
  });
});
