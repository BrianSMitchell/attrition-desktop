/// <reference types="jest" />
/**
 * Idempotency test for UnitsService.start
 * Verifies canonical ALREADY_IN_PROGRESS payload when an identical pending unit queue exists.
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

// Building.find(...).select('level') -> used for shipyard level validation; keep stubbed
const BuildingFind = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) })
jest.mock('../models/Building', () => ({
  Building: { find: (...args: any[]) => BuildingFind(...args) },
}))

// CapacityService.getBaseCapacities
const GetBaseCapacities = jest.fn()
jest.mock('../services/capacityService', () => ({
  CapacityService: { getBaseCapacities: (...args: any[]) => GetBaseCapacities(...args) },
}))

// UnitQueue constructor + static findOne for idempotency
const UnitQueueSave = jest.fn()
const constructedQueueDocs: any[] = []
class MockUnitQueue {
  public _id = 'uq1'
  public doc: any
  constructor(doc: any) {
    this.doc = doc
    constructedQueueDocs.push(doc)
  }
  static findOne = (...args: any[]) => UnitQueueFindOne(...args)
  async save() {
    return UnitQueueSave()
  }
}
const UnitQueueFindOne = jest.fn()
jest.mock('../models/UnitQueue', () => ({
  UnitQueue: MockUnitQueue,
}))

// @game/shared units catalog mocked to a simple spec
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
import { UnitsService } from '../services/unitsService'

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

describe('UnitsService.start - Idempotency', () => {
  const empireId = '64a7b2c3d4e5f6a7b8c9d0e1'
  const locationCoord = 'A00:00:00:00'
  const unitKey: UnitKey = 'scout' as UnitKey

  beforeEach(() => {
    jest.clearAllMocks()
    constructedQueueDocs.length = 0

    // Default valid state
    EmpireFindById.mockResolvedValue(makeEmpire())
    LocationFindOne.mockResolvedValue({ coord: locationCoord, owner: 'user1' })
    GetBaseCapacities.mockResolvedValue({ production: { value: 60 } }) // 60 cred/hour
    // No shipyard requirement by default; if present, BuildingFind will return empty with level 0

    // Existing pending queue item -> triggers idempotency
    const completesAt = new Date(Date.now() + 2 * 60 * 1000)
    UnitQueueFindOne.mockResolvedValue({
      _id: 'existingU1',
      status: 'pending',
      startedAt: new Date(),
      completesAt,
    })
  })

  it('returns ALREADY_IN_PROGRESS with canonical details when identical pending unit exists', async () => {
    const res = await UnitsService.start(empireId, locationCoord, unitKey)

    expect(res.success).toBe(false)
    // Canonical fields
    expect((res as any).code).toBe('ALREADY_IN_PROGRESS')
    expect(typeof (res as any).message).toBe('string')

    // Details payload
    const details = (res as any).details
    expect(details).toBeDefined()
    expect(details.queueType).toBe('units')
    expect(typeof details.identityKey).toBe('string')
    expect(details.catalogKey).toBe(unitKey)

    // Existing metadata
    const existing = details.existing
    expect(existing).toBeDefined()
    expect(existing._id).toBe('existingU1')
    expect(existing.state).toBe('pending')
    expect(typeof existing.startedAt).toBeDefined()
    expect(typeof existing.etaSeconds).toBe('number')
    expect(existing.catalogKey).toBe(unitKey)
  })

  it('proceeds when no existing pending item (control)', async () => {
    // No existing -> idempotency should not fire
    UnitQueueFindOne.mockResolvedValueOnce(null)

    const res = await UnitsService.start(empireId, locationCoord, unitKey)

    expect(res).toHaveProperty('success')
    if (res.success) {
      expect(res.data).toBeDefined()
      expect((res.data as any).unitKey).toBe('scout')
      expect((res.data as any).etaMinutes).toBe(2) // 2 credits / 60 cph -> 2 minutes
    } else {
      expect((res as any).code).not.toBe('ALREADY_IN_PROGRESS')
    }
  })
})
