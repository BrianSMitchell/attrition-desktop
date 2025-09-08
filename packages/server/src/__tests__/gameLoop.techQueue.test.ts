/// <reference types="jest" />
/**
 * Tests for GameLoopService.processTechQueue (capacity-driven tech completion)
 * We call the private method via (gameLoop as any).processTechQueue() to isolate behavior.
 */

import type { TechnologyKey } from '@game/shared'

// -------------------- Mocks --------------------

// Dynamic fixtures controlled per test
let mockEmpire: any = null
let mockDueItems: Array<any> = []

// Empire.findById
const EmpireFindById = jest.fn((_id: any) => mockEmpire)
jest.mock('../models/Empire', () => ({
  Empire: { findById: (id: any) => EmpireFindById(id) },
}))

// TechQueue.find returns all "due" items we configure
const TechQueueFind = jest.fn(async (_query: any) => mockDueItems)
jest.mock('../models/TechQueue', () => ({
  TechQueue: { find: (query: any) => TechQueueFind(query) },
}))

// Import after mocks are set up
import { gameLoop } from '../services/gameLoopService'

describe('GameLoopService.processTechQueue', () => {
  const empireId = '64a7b2c3d4e5f6a7b8c9d0e1'
  const locationCoord = 'A00:00:00:00'
  const techKey: TechnologyKey = 'energy'

  beforeEach(() => {
    jest.clearAllMocks()
    // Default empire with no tech unlocked
    mockEmpire = {
      _id: empireId,
      techLevels: new Map<string, number>(),
      save: jest.fn().mockResolvedValue(undefined),
    }
    // Default: one due item
    mockDueItems = [
      {
        empireId,
        locationCoord,
        techKey,
        status: 'pending',
        save: jest.fn().mockResolvedValue(undefined),
      },
    ]
  })

  it('promotes tech level to 1 and marks queue item completed', async () => {
    await (gameLoop as any).processTechQueue()

    // Empire techLevels should be updated
    expect(mockEmpire.save).toHaveBeenCalledTimes(1)
    expect(mockEmpire.techLevels instanceof Map).toBe(true)
    expect(mockEmpire.techLevels.get(techKey)).toBe(1)

    // Queue item should be marked completed and saved
    const item = mockDueItems[0]
    expect(item.status).toBe('completed')
    expect(item.save).toHaveBeenCalledTimes(1)
  })

  it('cancels queue item when empire is missing', async () => {
    mockEmpire = null // simulate missing empire

    await (gameLoop as any).processTechQueue()

    const item = mockDueItems[0]
    expect(item.status).toBe('cancelled')
    expect(item.save).toHaveBeenCalledTimes(1)
  })
})
