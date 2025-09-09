/// <reference types="jest" />
/**
 * Tests for UnitsService.start (capacity-driven unit production)
 */

import type { UnitKey, TechnologyKey } from '@game/shared'

// -------------------- Runtime Mocks --------------------

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

// Building.find(...).select('level') -> used for shipyard level validation
const BuildingFind = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) })
jest.mock('../models/Building', () => ({
  Building: { find: (...args: any[]) => BuildingFind(...args) },
}))

// CapacityService.getBaseCapacities
const GetBaseCapacities = jest.fn()
jest.mock('../services/capacityService', () => ({
  CapacityService: { getBaseCapacities: (...args: any[]) => GetBaseCapacities(...args) },
}))

// UnitQueue constructor used with "new UnitQueue(...)"
const UnitQueueSave = jest.fn()
const constructedQueueDocs: any[] = []
class MockUnitQueue {
  public _id = 'uq1'
  public doc: any
  constructor(doc: any) {
    this.doc = doc
    constructedQueueDocs.push(doc)
  }
  async save() {
    return UnitQueueSave()
  }
}
jest.mock('../models/UnitQueue', () => ({
  UnitQueue: MockUnitQueue,
}))

// @game/shared units catalog
let unitSpec: any = {
  key: 'scout' as UnitKey,
  name: 'Scout',
  creditsCost: 2,
  requiredShipyardLevel: undefined as number | undefined,
  techPrereqs: [] as Array<{ key: TechnologyKey; level: number }>,
}
const GetUnitsList = jest.fn(() => [unitSpec])
jest.mock('@game/shared', () => {
  return {
    getUnitsList: () => GetUnitsList(),
  }
})

// Import after mocks
import { UnitsService } from '../../packages/desktop/src/services/unitsService'

// -------------------- Helpers --------------------

function makeEmpire(overrides: Partial<any> = {}) {
  return {
    _id: '64a7b2c3d4e5f6a7b8c9d0e1',
    userId: 'user1',
    resources: { credits: 100, metal: 0, energy: 0, research: 0 },
    techLevels: new Map<string, number>(),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('UnitsService.start', () => {
  const empireId = '64a7b2c3d4e5f6a7b8c9d0e1'
  const locationCoord = 'A00:00:00:00'
  const unitKey: UnitKey = 'scout' as UnitKey

  beforeEach(() => {
    jest.clearAllMocks()
    constructedQueueDocs.length = 0
    // Reset default spec
    unitSpec = {
      key: 'scout' as UnitKey,
      name: 'Scout',
      creditsCost: 2,
      requiredShipyardLevel: undefined,
      techPrereqs: [],
    }
    // Defaults
    EmpireFindById.mockResolvedValue(makeEmpire())
    LocationFindOne.mockResolvedValue({ coord: locationCoord, owner: 'user1' })
    // Shipyard finder default: no shipyards
    BuildingFind.mockReturnValue({ select: jest.fn().mockResolvedValue([]) })
    GetBaseCapacities.mockResolvedValue({ production: { value: 60 } }) // 60 cred/hour
  })

  it('fails when not owner', async () => {
    LocationFindOne.mockResolvedValue({ coord: locationCoord, owner: 'other-user' })
    const res = await UnitsService.start(empireId, locationCoord, unitKey)
    expect(res.success).toBe(false)
    expect((res as any).reasons).toContain('not_owner')
  })

  it('fails when unknown unitKey', async () => {
    GetUnitsList.mockReturnValueOnce([]) // empty catalog
    const res = await UnitsService.start(empireId, locationCoord, unitKey)
    expect(res.success).toBe(false)
    expect((res as any).reasons).toContain('unknown_unit')
  })

  it('fails when tech prerequisites unmet (reasons text includes "Requires")', async () => {
    // Require AI level 1
    unitSpec.techPrereqs = [{ key: 'artificial_intelligence' as TechnologyKey, level: 1 }]
    const res = await UnitsService.start(empireId, locationCoord, unitKey)
    expect(res.success).toBe(false)
    const reasons: string[] = (res as any).reasons
    expect(reasons.some(r => /Requires .* \(current 0\)\./i.test(r))).toBe(true)
  })

  it('fails when required shipyard level not met', async () => {
    unitSpec.requiredShipyardLevel = 2
    // Return shipyards with max level 1
    BuildingFind.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue([{ level: 1 }]),
    })
    const res = await UnitsService.start(empireId, locationCoord, unitKey)
    expect(res.success).toBe(false)
    const reasons: string[] = (res as any).reasons
    const expected = 'Requires Shipyard level 2 at this base (current 1).'
    expect(reasons).toContain(expected)
  })

  it('fails when production capacity is zero', async () => {
    GetBaseCapacities.mockResolvedValueOnce({ production: { value: 0 } })
    const res = await UnitsService.start(empireId, locationCoord, unitKey)
    expect(res.success).toBe(false)
    expect((res as any).reasons).toContain('no_production_capacity')
  })

  it('fails when insufficient credits', async () => {
    EmpireFindById.mockResolvedValue(makeEmpire({ resources: { credits: 1, metal: 0, energy: 0, research: 0 } }))
    const res = await UnitsService.start(empireId, locationCoord, unitKey)
    expect(res.success).toBe(false)
    expect((res as any).reasons).toContain('insufficient_credits')
  })

  it('succeeds: enqueues UnitQueue with ETA and deducts credits', async () => {
    const empire = makeEmpire({ resources: { credits: 100, metal: 0, energy: 0, research: 0 } })
    EmpireFindById.mockResolvedValue(empire)
    // production: 60 cred/hour, creditsCost=2 => eta 2 minutes
    GetBaseCapacities.mockResolvedValueOnce({ production: { value: 60 } })

    const before = Date.now()
    const res = await UnitsService.start(empireId, locationCoord, unitKey)
    const after = Date.now()

    expect(res.success).toBe(true)
    const data = (res as any).data
    expect(data).toBeDefined()
    expect(data.unitKey).toBe('scout')
    expect(data.etaMinutes).toBe(2)

    // Ensure a queue was constructed and saved
    expect(constructedQueueDocs.length).toBe(1)
    expect(UnitQueueSave).toHaveBeenCalledTimes(1)

    // validate completesAt timing is roughly +2 minutes
    const completesAt = (constructedQueueDocs[0].completesAt as Date).getTime()
    const minMs = before + 2 * 60 * 1000
    const maxMs = after + 2 * 60 * 1000 + 2000
    expect(completesAt).toBeGreaterThanOrEqual(minMs)
    expect(completesAt).toBeLessThanOrEqual(maxMs)

    // credits deducted
    expect(empire.resources.credits).toBe(98)
    expect(empire.save).toHaveBeenCalledTimes(1)
  })
})
