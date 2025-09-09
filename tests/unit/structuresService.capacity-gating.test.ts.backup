/// <reference types="jest" />
/**
 * Population/Area feasibility gating for StructuresService.start
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

// Building.findOne (no existing) and Building.find (energy feasibility inputs)
const BuildingFindOne = jest.fn()
const BuildingFind = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue([]),
  }),
})
jest.mock('../models/Building', () => ({
  Building: {
    findOne: (...args: any[]) => BuildingFindOne(...args),
    find: (...args: any[]) => BuildingFind(...args),
  },
}))

// CapacityService.getBaseCapacities (ensure cap > 0 so we reach pop/area checks)
const GetBaseCapacities = jest.fn()
jest.mock('../services/capacityService', () => ({
  CapacityService: { getBaseCapacities: (...args: any[]) => GetBaseCapacities(...args) },
}))

// BaseStatsService.getBaseStats (the subject of the gating checks)
const GetBaseStats = jest.fn()
jest.mock('../services/baseStatsService', () => ({
  BaseStatsService: { getBaseStats: (...args: any[]) => GetBaseStats(...args) },
}))

// Import after mocks
import { StructuresService } from '../services/structuresService'

// -------------------- Helpers --------------------

function makeEmpire(overrides: Partial<any> = {}) {
  return {
    _id: 'emp1',
    userId: 'user1',
    resources: { credits: 100, metal: 0, energy: 0, research: 0 },
    techLevels: new Map<string, number>([['energy', 1]]),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeOwnedLocation() {
  return {
    coord: 'A00:00:00:00',
    owner: 'user1',
    // Provide planet fields used by energy feasibility
    result: { solarEnergy: 0, yields: { gas: 0 } },
  }
}

describe('StructuresService.start - Population/Area gating', () => {
  const empireId = '64a7b2c3d4e5f6a7b8c9d0e1'
  const locationCoord = 'A00:00:00:00'
  const buildingKey: BuildingKey = 'solar_plants' as BuildingKey // producer (delta > 0) to skip energy consumer enforcement

  beforeEach(() => {
    jest.clearAllMocks()

    // No existing queued/active doc for this catalogKey
    BuildingFindOne.mockResolvedValue(null)

    // Valid empire and owned location
    EmpireFindById.mockResolvedValue(makeEmpire())
    LocationFindOne.mockResolvedValue(makeOwnedLocation())

    // Ensure construction capacity is positive
    GetBaseCapacities.mockResolvedValue({ construction: { value: 60 } })

    // Energy inputs empty (no existing buildings)
    BuildingFind.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    })
  })

  it('rejects with INSUFFICIENT_POPULATION when free population is less than required', async () => {
    // BaseStats: no area bottleneck, population free = 0
    GetBaseStats.mockResolvedValue({
      area: { total: 10, used: 0, free: 10 },
      energy: { produced: 0, consumed: 0, balance: 0 },
      population: { used: 6, capacity: 6, free: 0 },
      ownerIncomeCredPerHour: 0,
    })

    const res = await StructuresService.start(empireId, locationCoord, buildingKey)

    expect(res.success).toBe(false)
    expect((res as any).code).toBe('INSUFFICIENT_POPULATION')
    expect((res as any).message).toMatch(/population/i)
    const details = (res as any).details
    expect(details).toBeDefined()
    expect(typeof details.required).toBe('number')
    expect(details.required).toBeGreaterThan(0)
    expect(details.free).toBe(0)
  })

  it('rejects with INSUFFICIENT_AREA when free area is less than required', async () => {
    // BaseStats: area free = 0, population OK
    GetBaseStats.mockResolvedValue({
      area: { total: 5, used: 5, free: 0 },
      energy: { produced: 0, consumed: 0, balance: 0 },
      population: { used: 0, capacity: 10, free: 10 },
      ownerIncomeCredPerHour: 0,
    })

    const res = await StructuresService.start(empireId, locationCoord, buildingKey)

    expect(res.success).toBe(false)
    expect((res as any).code).toBe('INSUFFICIENT_AREA')
    expect((res as any).message).toMatch(/area/i)
    const details = (res as any).details
    expect(details).toBeDefined()
    expect(typeof details.required).toBe('number')
    expect(details.free).toBe(0)
  })
})
