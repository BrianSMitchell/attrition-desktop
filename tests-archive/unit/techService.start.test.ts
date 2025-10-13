/// <reference types="jest" />
import { DB_FIELDS } from '../packages/server/src/constants/database-fields';
/**
 * Tests for TechService.start (capacity-driven queues)
 * - Mirrors mocking pattern from generateUniverse.test.ts
 */

import type { TechnologyKey } from '@game/shared'

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

// Building.find(...).select(DB_FIELDS.BUILDINGS.LEVEL) -> Promise<Array<{ level: number }>>
const BuildingFind = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) })
jest.mock('../models/Building', () => ({
  Building: { find: (...args: any[]) => BuildingFind(...args) },
}))

// CapacityService.getBaseCapacities -> { research: { value } }
const GetBaseCapacities = jest.fn()
jest.mock('../services/capacityService', () => ({
  CapacityService: { getBaseCapacities: (...args: any[]) => GetBaseCapacities(...args) },
}))

// TechQueue constructor used with "new TechQueue(...)"
const TechQueueSave = jest.fn()
const constructedQueueDocs: any[] = []
class MockTechQueue {
  public _id = 'q1'
  public doc: any
  constructor(doc: any) {
    this.doc = doc
    constructedQueueDocs.push(doc)
  }
  async save() {
    return TechQueueSave()
  }
}
jest.mock('../models/TechQueue', () => ({
  TechQueue: MockTechQueue,
}))

// Import after mocks
import { TechService } from '../../packages/desktop/src/services/techService'

/** Helpers */
function makeEmpire(overrides: Partial<any> = {}) {
  return {
    _id: 'emp1',
    userId: 'user1',
    resources: { credits: 100, metal: 0, energy: 0, research: 0 },
    // Map for techLevels (as used by service)
    techLevels: new Map<string, number>(),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const empireId = '64a7b2c3d4e5f6a7b8c9d0e1'

describe('TechService.start (capacity-driven)', () => {
  const locationCoord = 'A00:00:00:00'
  const techKey: TechnologyKey = DB_FIELDS.EMPIRES.ENERGY // creditsCost=2, requiredLabs=1

  beforeEach(() => {
    jest.clearAllMocks()
    constructedQueueDocs.length = 0
    // Default: labs total 0 unless test sets otherwise
    BuildingFind.mockReturnValue({ select: jest.fn().mockResolvedValue([]) })
  })

  it('fails when location not owned by empire user (reasons includes not_owner)', async () => {
    // Empire exists
    EmpireFindById.mockResolvedValue(makeEmpire({ userId: 'user1' }))

    // Location exists but owned by someone else
    LocationFindOne.mockResolvedValue({ coord: locationCoord, owner: 'other-user' })

    const result = await TechService.start(empireId, locationCoord, techKey)
    expect(result.success).toBe(false)
    expect(result).toHaveProperty('reasons')
    expect(result.reasons).toContain('not_owner')
  })

  it('fails when research capacity is zero (reasons includes no_research_capacity)', async () => {
    // Owned location
    EmpireFindById.mockResolvedValue(makeEmpire({ userId: 'user1' }))
    LocationFindOne.mockResolvedValue({ coord: locationCoord, owner: 'user1' })

    // Labs total = 1 (meets spec.requiredLabs=1)
    BuildingFind.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue([{ level: 1 }]),
    })

    // Capacity: research = 0
    GetBaseCapacities.mockResolvedValue({ research: { value: 0 } })

    const result = await TechService.start(empireId, locationCoord, techKey)
    expect(result.success).toBe(false)
    expect(result.reasons).toContain('no_research_capacity')
  })

  it('fails when insufficient credits (reasons from canStartTech include a credits message)', async () => {
    // Owned location
    EmpireFindById.mockResolvedValue(
      makeEmpire({ userId: 'user1', resources: { credits: 1, metal: 0, energy: 0, research: 0 } })
    )
    LocationFindOne.mockResolvedValue({ coord: locationCoord, owner: 'user1' })

    // Labs total = 1 (meets spec)
    BuildingFind.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue([{ level: 1 }]),
    })

    // Capacity is positive, but we expect the early canStartTech credit gating to block first
    GetBaseCapacities.mockResolvedValue({ research: { value: 100 } })

    const result = await TechService.start(empireId, locationCoord, techKey)
    expect(result.success).toBe(false)
    expect(Array.isArray((result as any).reasons)).toBe(true)
    // Expect one of the reasons to mention credits requirement
    const reasons: string[] = (result as any).reasons
    expect(reasons.some(r => /Requires .*credits/i.test(r))).toBe(true)
  })

  it('succeeds and enqueues TechQueue with expected ETA, deducts credits', async () => {
    const empire = makeEmpire({ userId: 'user1', resources: { credits: 100, metal: 0, energy: 0, research: 0 } })
    EmpireFindById.mockResolvedValue(empire)
    LocationFindOne.mockResolvedValue({ coord: locationCoord, owner: 'user1' })

    // Labs total = 1 (meets requiredLabs=1 for energy)
    BuildingFind.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue([{ level: 1 }]),
    })

    // Capacity: research = 60 cred/hour
    GetBaseCapacities.mockResolvedValue({ research: { value: 60 } })

    const before = Date.now()
    const result = await TechService.start(empireId, locationCoord, techKey)
    const after = Date.now()

    expect(result.success).toBe(true)
    const data = (result as any).data
    expect(data).toBeDefined()
    expect(data.techKey).toBe(DB_FIELDS.EMPIRES.ENERGY)
    // ETA minutes: creditsCost=2, capacity=60 => (2/60)*60 = 2 minutes
    expect(data.etaMinutes).toBe(2)
    expect(typeof data.completesAt).toBeDefined()

    // Verify a queue was constructed and saved
    expect(constructedQueueDocs.length).toBe(1)
    expect(TechQueueSave).toHaveBeenCalledTimes(1)

    // Validate completesAt is roughly now + 2 minutes
    const completesAt = (constructedQueueDocs[0].completesAt as Date).getTime()
    const minMs = before + 2 * 60 * 1000
    const maxMs = after + 2 * 60 * 1000 + 2000 // allow small skew
    expect(completesAt).toBeGreaterThanOrEqual(minMs)
    expect(completesAt).toBeLessThanOrEqual(maxMs)

    // Credits deducted by 2
    expect(empire.resources.credits).toBe(98)
    expect(empire.save).toHaveBeenCalledTimes(1)
  })
})
