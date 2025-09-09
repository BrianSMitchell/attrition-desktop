/// <reference types="jest" />
/**
 * Tests for GameLoopService.processUnitQueue (capacity-driven unit completion)
 * We call the private method via (gameLoop as any).processUnitQueue() to isolate behavior.
 */

// -------------------- Mocks --------------------

// Dynamic fixtures controlled per test
let mockEmpire: any = null
let mockDueItems: Array<any> = []

// Empire.findById
const EmpireFindById = jest.fn((_id: any) => mockEmpire)
jest.mock('../models/Empire', () => ({
  Empire: { findById: (id: any) => EmpireFindById(id) },
}))

// UnitQueue.find returns all "due" items we configure
const UnitQueueFind = jest.fn(async (_query: any) => mockDueItems)
jest.mock('../models/UnitQueue', () => ({
  UnitQueue: { find: (query: any) => UnitQueueFind(query) },
}))

// Import after mocks are set up
import { gameLoop } from '../services/gameLoopService'

describe('GameLoopService.processUnitQueue', () => {
  const empireId = '64a7b2c3d4e5f6a7b8c9d0e1'
  const locationCoord = 'A00:00:00:00'
  const unitKey = 'scout'

  beforeEach(() => {
    jest.clearAllMocks()
    // Default empire exists
    mockEmpire = {
      _id: empireId,
      save: jest.fn().mockResolvedValue(undefined),
    }
    // Default: one due item
    mockDueItems = [
      {
        empireId,
        locationCoord,
        unitKey,
        status: 'pending',
        save: jest.fn().mockResolvedValue(undefined),
      },
    ]
  })

  it('marks unit queue item completed when empire exists', async () => {
    await (gameLoop as any).processUnitQueue()

    // Queue item should be marked completed and saved
    const item = mockDueItems[0]
    expect(item.status).toBe('completed')
    expect(item.save).toHaveBeenCalledTimes(1)
  })

  it('cancels unit queue item when empire is missing', async () => {
    mockEmpire = null // simulate missing empire

    await (gameLoop as any).processUnitQueue()

    const item = mockDueItems[0]
    expect(item.status).toBe('cancelled')
    expect(item.save).toHaveBeenCalledTimes(1)
  })
})
