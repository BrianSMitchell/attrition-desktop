/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="jest" />
/**
 * Smart-Queue projected feasibility + deterministic scheduling tests
 *
 * Covers:
 * - Population projection: queued capacity producers (urban_structures/orbital_base)
 * - Area projection: queued capacity producers (terraform/multi_level_platforms)
 * - Energy projection: queued producers (solar_plants/gas_plants) enabling a negative-delta consumer
 * - Deterministic scheduling: constructionStarted chained from last scheduled completion
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

// Building model (findOne, find, updateOne, syncIndexes)
const BuildingFindOne = jest.fn()
const BuildingUpdateOne = jest.fn()
const BuildingSyncIndexes = jest.fn()

let mockEnergyExisting: any[] = []
let mockQueuedForCapacity: any[] = []
let mockScheduled: any[] = []

const BuildingFind = jest.fn().mockImplementation((filter: any) => {
  // Decide which list to return based on the filter
  // Energy inputs call: { empireId, locationCoord } (no isActive filter)
  // Queued capacity: { isActive: false } (no constructionCompleted criteria)
  // Scheduled chain: { isActive: false, constructionCompleted: { $ne: null } }
  const isQueuedCapacity = filter && filter.isActive === false && !filter.constructionCompleted
  const isScheduled = filter && filter.isActive === false && filter.constructionCompleted && filter.constructionCompleted.$ne != null

  const payload = isScheduled ? mockScheduled : (isQueuedCapacity ? mockQueuedForCapacity : mockEnergyExisting)

  return {
    select: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(payload),
      }),
      lean: jest.fn().mockResolvedValue(payload),
    }),
  }
})

jest.mock('../models/Building', () => ({
  Building: {
    findOne: (...args: any[]) => BuildingFindOne(...args),
    find: (...args: any[]) => BuildingFind(...args),
    updateOne: (...args: any[]) => BuildingUpdateOne(...args),
    syncIndexes: (...args: any[]) => BuildingSyncIndexes(...args),
  },
}))

// CapacityService.getBaseCapacities
const GetBaseCapacities = jest.fn()
jest.mock('../services/capacityService', () => ({
  CapacityService: { getBaseCapacities: (...args: any[]) => GetBaseCapacities(...args) },
}))

// BaseStatsService.getBaseStats
const GetBaseStats = jest.fn()
jest.mock('../services/baseStatsService', () => ({
  BaseStatsService: { getBaseStats: (...args: any[]) => GetBaseStats(...args) },
}))

// Import after mocks
import { StructuresService } from '../../packages/desktop/src/services/structuresService'

// -------------------- Helpers --------------------

function makeEmpire(overrides: Partial<any> = {}) {
  return {
    _id: 'emp1',
    userId: 'user1',
    resources: { credits: 100000, metal: 0, energy: 0, research: 0 },
    techLevels: new Map<string, number>([['energy', 30], ['computer', 30], ['armour', 30], ['warp_drive', 30]]),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeOwnedLocation(overrides: Partial<any> = {}) {
  return {
    coord: 'A00:00:00:00',
    owner: 'user1',
    result: { solarEnergy: 7, yields: { gas: 0 }, fertility: 5, area: 10 },
    properties: { fertility: 5 },
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()

  // Defaults
  EmpireFindById.mockResolvedValue(makeEmpire())
  LocationFindOne.mockResolvedValue(makeOwnedLocation())
  GetBaseCapacities.mockResolvedValue({ construction: { value: 60 } }) // ensures ETA minutes = 1 for L1 creditsCost=1
  BuildingSyncIndexes.mockResolvedValue(undefined)

  // No existing building doc for the identity (so we go into 'new construction' path)
  BuildingFindOne.mockResolvedValue(null)

  // Mocks lists
  mockEnergyExisting = []
  mockQueuedForCapacity = []
  mockScheduled = []

  // Insert path succeeds and returns upsert metadata
  BuildingUpdateOne.mockResolvedValue({ upsertedCount: 1 })
})

// -------------------- Tests --------------------

describe('StructuresService.start — Smart queue population projection', () => {
  it('accepts Metal Refineries when Urban Structures is queued first (free pop projected)', async () => {
    // BaseStats shows free pop 0 currently (would fail without projection)
    GetBaseStats.mockResolvedValue({
      area: { total: 10, used: 0, free: 10 },
      energy: { produced: 2, consumed: 0, balance: 2 },
      population: { used: 5, capacity: 5, free: 0 },
      ownerIncomeCredPerHour: 0,
    })

    // Queue has one population capacity producer: urban_structures
    mockQueuedForCapacity = [{ catalogKey: 'urban_structures' }]

    const res = await StructuresService.start(
      '64a7b2c3d4e5f6a7b8c9d0e1',
      'A00:00:00:00',
      'metal_refineries' as BuildingKey
    )

    expect(res.success).toBe(true)
    // Verify we attempted to insert (new construction)
    expect(BuildingUpdateOne).toHaveBeenCalled()
  })
})

describe('StructuresService.start — Smart queue area projection', () => {
  it('accepts a consumer requiring area when terraform is queued first', async () => {
    // Current area free 0 (would fail without projection)
    GetBaseStats.mockResolvedValue({
      area: { total: 5, used: 5, free: 0 },
      energy: { produced: 2, consumed: 0, balance: 2 },
      population: { used: 0, capacity: 10, free: 10 },
      ownerIncomeCredPerHour: 0,
    })

    // queued area capacity producer
    mockQueuedForCapacity = [{ catalogKey: 'terraform' }]

    const res = await StructuresService.start(
      '64a7b2c3d4e5f6a7b8c9d0e1',
      'A00:00:00:00',
      'metal_refineries' as BuildingKey // areaRequired=1 in catalog
    )

    expect(res.success).toBe(true)
    expect(BuildingUpdateOne).toHaveBeenCalled()
  })
})

describe('StructuresService.start — Smart queue energy projection', () => {
  it('allows a negative-delta consumer when a positive producer is queued ahead in order', async () => {
    // Build a baseline with balance = 0 using two active research labs (each -1) + baseline +2
    mockEnergyExisting = [
      { _id: 'b1', catalogKey: 'research_labs', isActive: true, level: 1 },
      { _id: 'b2', catalogKey: 'research_labs', isActive: true, level: 1 },
    ]

    // Queue a positive producer (fusion_plants: +4) BEFORE the new consumer
    // In this test harness, queued items are returned via the isActive:false query path
    mockQueuedForCapacity = [{ catalogKey: 'fusion_plants', isActive: false, level: 1 }]

    // Ensure population/area gating cannot interfere with this energy-focused test
    GetBaseStats.mockResolvedValue({
      area: { total: 100, used: 0, free: 100 },
      energy: { produced: 2, consumed: 2, balance: 0 },
      population: { used: 0, capacity: 100, free: 100 },
      ownerIncomeCredPerHour: 0,
    })

    // Candidate is a consumer with delta -1
    const res = await StructuresService.start(
      '64a7b2c3d4e5f6a7b8c9d0e1',
      'A00:00:00:00',
      'research_labs' as BuildingKey
    )

    // Debug aid to see failure details in CI logs
    // eslint-disable-next-line no-console
    console.log('Smart-queue energy test result:', JSON.stringify(res))

    // Order-aware projection should accept: projected = 0 (balance) + 0 (reserved) + 4 (queued producer) + (-1) = +3
    expect(res.success).toBe(true)
    expect(BuildingUpdateOne).toHaveBeenCalled()
  })
})

describe('StructuresService.start — Deterministic scheduling', () => {
  it('computes ETA and queues without setting schedule timestamps at queue-time', async () => {
    // BaseStats OK to avoid gating
    GetBaseStats.mockResolvedValue({
      area: { total: 10, used: 0, free: 10 },
      energy: { produced: 2, consumed: 0, balance: 2 },
      population: { used: 0, capacity: 10, free: 10 },
      ownerIncomeCredPerHour: 0,
    })

    // Scheduled queue has a prior completion time in the future
    const now = Date.now()
    const lastCompletion = new Date(now + 5 * 60 * 1000) // 5 minutes from now
    mockScheduled = [{ constructionCompleted: lastCompletion }]

    const res = await StructuresService.start(
      '64a7b2c3d4e5f6a7b8c9d0e1',
      'A00:00:00:00',
      'metal_refineries' as BuildingKey
    )
    expect(res.success).toBe(true)
    expect(BuildingUpdateOne).toHaveBeenCalled()

    // New design returns ETA but defers timestamps to the scheduler
    const etaMinutes = (res as any)?.data?.etaMinutes
    expect(typeof etaMinutes).toBe('number')
    expect(etaMinutes).toBeGreaterThanOrEqual(1)
  })
})
