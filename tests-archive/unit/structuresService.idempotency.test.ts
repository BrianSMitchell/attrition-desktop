/// <reference types="jest" />
import { DB_FIELDS } from '../packages/server/src/constants/database-fields';
/**
 * Idempotency test for StructuresService.start
 * With multi-queue enabled, duplicates are only rejected when two identical requests
 * attempt to create the exact same identity (same Q sequence) concurrently.
 * This test simulates that race: first call inserts Q1, second call collides on Q1 and returns ALREADY_IN_PROGRESS.
 */

import type { BuildingKey } from '@game/shared'

// -------------------- Mocks --------------------

// Empire.findById
const EmpireFindById = jest.fn()
jest.mock('../models/Empire', () => ({
  Empire: { findById: (...args: any[]) => EmpireFindById(...args) },
}))

// Location.findOne
const LocationFindOne = jest.fn()
jest.mock('../models/Location', () => ({
  Location: { findOne: (...args: any[]) => LocationFindOne(...args) },
}))

// Building.* used by service
const BuildingFind = jest.fn().mockImplementation((_filter) => ({
  // Service uses .find(...).select('constructionCompleted').lean() (and may .sort(...).lean())
  select: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue([]),
    sort: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    }),
  }),
})) // energy calc path
const BuildingCountDocuments = jest.fn()
const BuildingUpdateOne = jest.fn()
const BuildingFindOne = jest.fn()

jest.mock('../models/Building', () => ({
  Building: {
    find: (...args: any[]) => BuildingFind(...args),
    countDocuments: (...args: any[]) => BuildingCountDocuments(...args),
    updateOne: (...args: any[]) => BuildingUpdateOne(...args),
    findOne: (...args: any[]) => BuildingFindOne(...args),
  },
}))

// CapacityService.getBaseCapacities (needed by service)
const GetBaseCapacities = jest.fn()
jest.mock('../services/capacityService', () => ({
  CapacityService: { getBaseCapacities: (...args: any[]) => GetBaseCapacities(...args) },
}))

// Import after mocks
import { StructuresService } from '../../packages/desktop/src/services/structuresService'

// -------------------- Helpers --------------------

function makeEmpire(overrides: Partial<any> = {}) {
  return {
    _id: 'emp1',
    userId: 'user1',
    resources: { credits: 100000, metal: 0, energy: 0, research: 0 },
    techLevels: new Map<string, number>([[DB_FIELDS.EMPIRES.ENERGY, 5]]),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('StructuresService.start - Idempotency (double-submit)', () => {
  const empireId = '64a7b2c3d4e5f6a7b8c9d0e1'
  const locationCoord = 'A00:00:00:00'
  const buildingKey: BuildingKey = 'solar_plants' as BuildingKey

  beforeEach(() => {
    jest.clearAllMocks()
    // Valid empire and owned location
    EmpireFindById.mockResolvedValue(makeEmpire())
    LocationFindOne.mockResolvedValue({ coord: locationCoord, owner: 'user1' })
    // No pre-existing queued items by findOne path; service will allow new construction (L1)
    BuildingFindOne.mockResolvedValue(null)
    // Energy/capacity stable
    GetBaseCapacities.mockResolvedValue({ construction: { value: 120 } })
  })

  it('first call inserts Q1, second call collides on Q1 and returns ALREADY_IN_PROGRESS', async () => {
    // Simulate both requests observing the same pre-count (0) -> both aim for :Q1
    BuildingCountDocuments
      .mockResolvedValueOnce(0) // for first call
      .mockResolvedValueOnce(0) // for second call (race)

    // First upsert inserts (has upsertedId). Second upsert reports no insertion (duplicate filter)
    BuildingUpdateOne
      .mockResolvedValueOnce({ upsertedId: 'newQ1' })
      .mockResolvedValueOnce({}) // no upsertedId => didInsert === false -> ALREADY_IN_PROGRESS

    // Execute two sequential calls (race simulated via mocks)
    const res1 = await StructuresService.start(empireId, locationCoord, buildingKey)
    const res2 = await StructuresService.start(empireId, locationCoord, buildingKey)

    // First succeeds
    expect(res1.success).toBe(true)

    // Second returns ALREADY_IN_PROGRESS canonical payload
    expect((res2 as any).success).toBe(false)
    expect((res2 as any).code).toBe('ALREADY_IN_PROGRESS')
    expect(typeof (res2 as any).details?.identityKey).toBe('string')

    // Verify both attempted the same identity filter (Q1)
    const expectedPrefix = `${empireId}:${locationCoord}:${buildingKey}:L1:Q1`
    const filters = BuildingUpdateOne.mock.calls.map((c: any[]) => c[0])
    expect(filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ identityKey: expectedPrefix, isActive: false }),
      ])
    )
  })
})
