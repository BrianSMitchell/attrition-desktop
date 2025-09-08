/// <reference types="jest" />
/**
 * Idempotency test for DefensesService.start
 * Verifies canonical ALREADY_IN_PROGRESS payload is surfaced when underlying StructuresService returns idempotency.
 */

import type { DefenseKey } from '@game/shared'

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

// StructuresService.start - we will mock to force an ALREADY_IN_PROGRESS error
const StructuresStart = jest.fn()
jest.mock('../services/structuresService', () => ({
  StructuresService: { start: (...args: any[]) => StructuresStart(...args) },
}))

// @game/shared defenses catalog - provide simple spec with no heavy prereqs
let defenseSpec: any = {
  key: 'defense_station' as DefenseKey,
  name: 'Defense Station',
  techPrereqs: [],
}
const GetDefensesList = jest.fn(() => [defenseSpec])
jest.mock('@game/shared', () => {
  return {
    getDefensesList: () => GetDefensesList(),
  }
})

// Import after mocks
import { DefensesService } from '../services/defensesService'

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

describe('DefensesService.start - Idempotency (via StructuresService)', () => {
  const empireId = '64a7b2c3d4e5f6a7b8c9d0e1'
  const locationCoord = 'A00:00:00:00'
  const defenseKey: DefenseKey = 'defense_station' as DefenseKey

  beforeEach(() => {
    jest.clearAllMocks()

    // Valid empire and owned location
    EmpireFindById.mockResolvedValue(makeEmpire())
    LocationFindOne.mockResolvedValue({ coord: locationCoord, owner: 'user1' })

    // Force underlying StructuresService to return idempotency
    StructuresStart.mockResolvedValue({
      success: false,
      code: 'ALREADY_IN_PROGRESS',
      message: 'An identical item is already queued or active.',
      error: 'An identical item is already queued or active.',
      details: {
        queueType: 'structures',
        identityKey: `${empireId}:${locationCoord}:jump_gate`,
        catalogKey: 'jump_gate',
        existing: {
          _id: 'b123',
          state: 'queued',
          startedAt: new Date().toISOString(),
          etaSeconds: 120,
          catalogKey: 'jump_gate',
        },
      },
    })
  })

  it('surfaces ALREADY_IN_PROGRESS with canonical details', async () => {
    const res = await DefensesService.start(empireId, locationCoord, defenseKey)

    expect(res.success).toBe(false)
    expect((res as any).code).toBe('ALREADY_IN_PROGRESS')
    expect(typeof (res as any).message).toBe('string')

    const details = (res as any).details
    expect(details).toBeDefined()
    // The details come through from StructuresService; queueType may be "structures"
    expect(typeof details.identityKey).toBe('string')
    expect(details.existing).toBeDefined()
    expect(details.existing._id).toBe('b123')
    expect(details.existing.state).toBe('queued')
  })
})
