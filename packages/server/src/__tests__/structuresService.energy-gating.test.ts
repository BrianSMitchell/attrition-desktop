/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="jest" />

/**
 * Energy feasibility gating for StructuresService.start
 * Objective: Enforce canonical rule — DO NOT pre-count queued producers.
 * Consumers (delta < 0) are allowed only if: balance + reservedNegative + delta >= 0
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

// Building.findOne / Building.find / Building.updateOne
const BuildingFindOne = jest.fn()
const BuildingFind = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue([]),
  }),
})
const BuildingUpdateOne = jest.fn()
jest.mock('../models/Building', () => ({
  Building: {
    findOne: (...args: any[]) => BuildingFindOne(...args),
    find: (...args: any[]) => BuildingFind(...args),
    updateOne: (...args: any[]) => BuildingUpdateOne(...args),
    // syncIndexes is optionally called; provide a no-op to avoid unhandled rejections
    syncIndexes: jest.fn().mockResolvedValue(undefined),
  },
}))

// CapacityService.getBaseCapacities (ensure cap > 0 so we reach energy gating)
const GetBaseCapacities = jest.fn()
jest.mock('../services/capacityService', () => ({
  CapacityService: { getBaseCapacities: (...args: any[]) => GetBaseCapacities(...args) },
}))

// Import after mocks
import { StructuresService } from '../services/structuresService'

// -------------------- Helpers --------------------

function makeEmpire(overrides: Partial<any> = {}) {
  return {
    _id: 'emp1',
    userId: 'user1',
    resources: { credits: 100, metal: 0, energy: 0, research: 0 },
    techLevels: new Map<string, number>(), // research_labs has no prereqs
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeOwnedLocation(overrides: Partial<any> = {}) {
  return {
    coord: 'A00:00:00:00',
    owner: 'user1',
    // Provide planet fields used by energy feasibility
    result: { solarEnergy: 0, yields: { gas: 0 } },
    ...overrides,
  }
}

describe('StructuresService.start - Energy gating (no pre-count of queued producers)', () => {
  const empireId = '64a7b2c3d4e5f6a7b8c9d0e1'
  const locationCoord = 'A00:00:00:00'
  const buildingKey: BuildingKey = 'research_labs' as BuildingKey // consumer (delta = -1)

  let logSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    // Silence logs; we will assert on exact log line content, so capture calls
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    // No existing doc matched by identity (so it's a first-time construction path)
    BuildingFindOne.mockResolvedValue(null)

    // Valid empire and owned location
    EmpireFindById.mockResolvedValue(makeEmpire())
    LocationFindOne.mockResolvedValue(makeOwnedLocation())

    // Ensure construction capacity is positive
    GetBaseCapacities.mockResolvedValue({ construction: { value: 60 } })

    // Default: no existing buildings (overridden in individual tests)
    BuildingFind.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    })

    // Avoid side effects when success path executes (not primary focus here)
    BuildingUpdateOne.mockResolvedValue({ upsertedCount: 1 })
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  it('denies when balance=0, reservedNegative=0 and delta=-1 (no queued producers)', async () => {
    // Existing active buildings: two research labs (each delta -1), baseline +2
    // produced = 2 (baseline), consumed = 2 => balance = 0, reservedNegative = 0
    const existing = [
      { _id: 'b1', catalogKey: 'research_labs', isActive: true, level: 1 },
      { _id: 'b2', catalogKey: 'research_labs', isActive: true, level: 1 },
    ]
    BuildingFind.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(existing),
      }),
    })

    const res = await StructuresService.start(empireId, locationCoord, buildingKey)

    expect(res.success).toBe(false)
    expect((res as any).code).toBe('INSUFFICIENT_ENERGY')
    expect((res as any).message).toMatch(/energy/i)
    // Assert standardized log line (no queued producers pre-counted)
    const found = logSpy.mock.calls
      .map((c) => String(c[0]))
      .find((s) =>
        /^\[StructuresService\.start\]\s+key=research_labs\s+delta=-1\s+produced=2\s+consumed=2\s+balance=0\s+reserved=0\s+projectedEnergy=-1$/.test(
          s.trim(),
        ),
      )
    expect(found).toBeTruthy()
    // Details payload should reflect canonical fields
    const details = (res as any).details
    expect(details).toBeDefined()
    expect(details.balance).toBe(0)
    expect(details.reservedNegative).toBe(0)
    expect(details.delta).toBe(-1)
    expect(details.projectedEnergy).toBe(-1)
    // Ensure no pre-count fields are leaked
    expect('queuedPositiveGain' in details).toBe(false)
    expect('projectedBalanceAtStart' in details).toBe(false)
  })

  it('allows when a queued positive producer exists earlier in order (order-aware projection)', async () => {
    // Same base as above but add one queued positive producer (fusion_plants: delta +4)
    // New canonical behavior: earlier queued producers lift projection before the candidate.
    const existing = [
      { _id: 'b1', catalogKey: 'research_labs', isActive: true, level: 1 },
      { _id: 'b2', catalogKey: 'research_labs', isActive: true, level: 1 },
      { _id: 'b3', catalogKey: 'fusion_plants', isActive: false, level: 1 }, // queued positive
    ]
    BuildingFind.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(existing),
      }),
    })

    const res = await StructuresService.start(empireId, locationCoord, buildingKey)

    // With order-aware projection: 0 (balance) + 0 (reserved) + 4 (producer) + (-1) = +3 → allow
    expect(res.success).toBe(true)
    expect(BuildingUpdateOne).toHaveBeenCalled()
  })
})
