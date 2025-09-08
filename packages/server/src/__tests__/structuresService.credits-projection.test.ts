/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="jest" />

/**
 * Credits behavior at queue-time (post-shift to start-time gating)
 *
 * Verifies the new contract:
 * - Queue-time MUST NOT be blocked by credits (regardless of projected income).
 * - EconomyService-based credits projection is not invoked by StructuresService.start.
 * - Scheduling and deduction are deferred to BuildingService.scheduleNextQueuedForBase.
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

// Building model (findOne, find, updateOne, syncIndexes, find for lists)
const BuildingFindOne = jest.fn()
const BuildingUpdateOne = jest.fn()
const BuildingSyncIndexes = jest.fn()

let mockFindPayload: any[] = []

const BuildingFind = jest.fn().mockImplementation((_filter: any) => {
  return {
    select: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFindPayload),
      }),
      lean: jest.fn().mockResolvedValue(mockFindPayload),
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

// EconomyService.computeEmpireEconomy — should NOT be called anymore by start()
const ComputeEmpireEconomy = jest.fn()
jest.mock('../services/economyService', () => ({
  EconomyService: { computeEmpireEconomy: (...args: any[]) => ComputeEmpireEconomy(...args) },
}))

// Import after mocks
import { StructuresService } from '../services/structuresService'

// -------------------- Helpers --------------------

function makeEmpire(overrides: Partial<any> = {}) {
  return {
    _id: 'emp1',
    userId: 'user1',
    resources: { credits: 0, metal: 0, energy: 0, research: 0 },
    techLevels: new Map<string, number>([
      ['energy', 30],
      ['computer', 30],
      ['armour', 30],
      ['warp_drive', 30],
    ]),
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
  GetBaseCapacities.mockResolvedValue({ construction: { value: 60 } }) // finite ETA
  BuildingSyncIndexes.mockResolvedValue(undefined)

  // No existing building doc for identity (new construction path)
  BuildingFindOne.mockResolvedValue(null)

  // Empty default for building list queries
  mockFindPayload = []

  // Insert path succeeds and returns upsert metadata
  BuildingUpdateOne.mockResolvedValue({ upsertedCount: 1 })

  // Base stats OK to avoid pop/area gating; positive energy balance
  GetBaseStats.mockResolvedValue({
    area: { total: 10, used: 0, free: 10 },
    energy: { produced: 2, consumed: 0, balance: 2 },
    population: { used: 0, capacity: 10, free: 10 },
    ownerIncomeCredPerHour: 0,
  })

  // Economy projection should NOT be used by queue-time start anymore
  ComputeEmpireEconomy.mockResolvedValue({ totalCreditsPerHour: 999 }) // even if set, we assert not called
})

// -------------------- Tests --------------------

describe('StructuresService.start — Credits behavior at queue-time', () => {
  it('does NOT call EconomyService and accepts queue even when credits are 0', async () => {
    // Ensure empire has 0 credits
    EmpireFindById.mockResolvedValue(makeEmpire({ resources: { credits: 0 } }))

    const res = await StructuresService.start(
      '64a7b2c3d4e5f6a7b8c9d0e1',
      'A00:00:00:00',
      'solar_plants' as BuildingKey // producer; no energy gating issues
    )

    expect(res.success).toBe(true)
    expect(BuildingUpdateOne).toHaveBeenCalled()

    // Critical: projection service MUST NOT be called at queue-time
    expect(ComputeEmpireEconomy).not.toHaveBeenCalled()

    // ETA is still provided for UI convenience
    const etaMinutes = (res as any)?.data?.etaMinutes
    expect(typeof etaMinutes).toBe('number')
    expect(etaMinutes).toBeGreaterThanOrEqual(1)
  })

  it('still accepts queue-time when a prior item is scheduled (candidate start in future), without projection', async () => {
    // Simulate an already scheduled item to create a future candidate window
    const now = Date.now()
    const candidateStart = new Date(now + 60 * 60 * 1000)
    mockFindPayload = [{ constructionCompleted: candidateStart }]

    // Empire remains at 0 credits — still should not block queuing
    EmpireFindById.mockResolvedValue(makeEmpire({ resources: { credits: 0 } }))

    const res = await StructuresService.start(
      '64a7b2c3d4e5f6a7b8c9d0e1',
      'A00:00:00:00',
      'metal_refineries' as BuildingKey
    )

    expect(res.success).toBe(true)
    expect(BuildingUpdateOne).toHaveBeenCalled()
    expect(ComputeEmpireEconomy).not.toHaveBeenCalled()
  })
})
