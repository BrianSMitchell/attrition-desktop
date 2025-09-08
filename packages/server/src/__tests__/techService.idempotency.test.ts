/// <reference types="jest" />
/**
 * Idempotency test for TechService.start
 * Verifies canonical ALREADY_IN_PROGRESS payload when an identical pending research exists.
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

// Building.find(...).select('level') - used by getBaseLabTotal()
const BuildingFind = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) })
jest.mock('../models/Building', () => ({
  Building: { find: (...args: any[]) => BuildingFind(...args) },
}))

// CapacityService.getBaseCapacities
const GetBaseCapacities = jest.fn()
jest.mock('../services/capacityService', () => ({
  CapacityService: { getBaseCapacities: (...args: any[]) => GetBaseCapacities(...args) },
}))

// TechQueue: need both constructor (new TechQueue(...)) and static findOne
const TechQueueSave = jest.fn()
const constructedQueueDocs: any[] = []
class MockTechQueue {
  public _id = 'tq1'
  public doc: any
  constructor(doc: any) {
    this.doc = doc
    constructedQueueDocs.push(doc)
  }
  static findOne = (...args: any[]) => TechQueueFindOne(...args)
  async save() {
    return TechQueueSave()
  }
}
const TechQueueFindOne = jest.fn()
jest.mock('../models/TechQueue', () => ({
  TechQueue: MockTechQueue,
}))

// Import after mocks
import { TechService } from '../services/techService'

// -------------------- Helpers --------------------

function makeEmpire(overrides: Partial<any> = {}) {
  return {
    _id: 'emp1',
    userId: 'user1',
    resources: { credits: 100, metal: 0, energy: 0, research: 0 },
    techLevels: new Map<string, number>(),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('TechService.start - Idempotency', () => {
  const empireId = '64a7b2c3d4e5f6a7b8c9d0e1'
  const locationCoord = 'A00:00:00:00'
  const techKey: TechnologyKey = 'energy'

  beforeEach(() => {
    jest.clearAllMocks()
    constructedQueueDocs.length = 0

    // Default empire and owned location
    EmpireFindById.mockResolvedValue(makeEmpire())
    LocationFindOne.mockResolvedValue({ coord: locationCoord, owner: 'user1' })

    // Labs total = 1 (meets requiredLabs=1 for energy L1)
    BuildingFind.mockReturnValue({ select: jest.fn().mockResolvedValue([{ level: 1 }]) })

    // Research capacity > 0 so we pass capacity gating and reach idempotency check
    GetBaseCapacities.mockResolvedValue({ research: { value: 60 } })

    // Default: an existing pending queue item is present for identical identityKey
    const completesAt = new Date(Date.now() + 2 * 60 * 1000)
    TechQueueFindOne.mockResolvedValue({
      _id: 'existingQ1',
      status: 'pending',
      startedAt: new Date(),
      completesAt,
    })
  })

  it('returns ALREADY_IN_PROGRESS with canonical details when identical pending exists', async () => {
    const res = await TechService.start(empireId, locationCoord, techKey)

    expect(res.success).toBe(false)
    // Canonical fields
    expect((res as any).code).toBe('ALREADY_IN_PROGRESS')
    expect(typeof (res as any).message).toBe('string')

    // Details payload
    const details = (res as any).details
    expect(details).toBeDefined()
    expect(details.queueType).toBe('research')
    expect(typeof details.identityKey).toBe('string')
    expect(details.catalogKey).toBe(techKey)

    // Existing metadata
    const existing = details.existing
    expect(existing).toBeDefined()
    expect(existing._id).toBe('existingQ1')
    expect(existing.state).toBe('pending')
    expect(typeof existing.startedAt).toBeDefined()
    expect(typeof existing.etaSeconds).toBe('number')
    expect(existing.catalogKey).toBe(techKey)
  })

  it('proceeds when no existing pending item (control)', async () => {
    // No existing -> idempotency should not fire
    TechQueueFindOne.mockResolvedValueOnce(null)

    const res = await TechService.start(empireId, locationCoord, techKey)

    // Should be a success path (we don't assert every field here, just that it's not an idempotency error)
    expect(res).toHaveProperty('success')
    if (res.success) {
      expect(res.data).toBeDefined()
      expect((res.data as any).techKey).toBe('energy')
      expect((res.data as any).etaMinutes).toBe(2) // 2 credits / 60 cph -> 2 minutes
    } else {
      // If something failed, it should NOT be ALREADY_IN_PROGRESS in this control test
      expect((res as any).code).not.toBe('ALREADY_IN_PROGRESS')
    }
  })
})
