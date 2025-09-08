/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */

import express from 'express'
import request from 'supertest'

// Mount the real router but mock auth + services + DB model dependencies
import gameRouter from '../routes/game'

// Mock authenticate to bypass real auth and inject a user
jest.mock('../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { _id: 'user1' }
    next()
  }
}))

// Mock Empire.findOne to return a minimal empire document so routes proceed
const EmpireFindOne = jest.fn()
jest.mock('../models/Empire', () => ({
  Empire: {
    findOne: (...args: any[]) => EmpireFindOne(...args),
  },
}))

// Mock StructuresService to simulate first-call success then ALREADY_IN_PROGRESS on second call
const StructuresStart = jest.fn()
jest.mock('../services/structuresService', () => ({
  StructuresService: {
    getStatus: jest.fn(), // not used here
    start: (...args: any[]) => StructuresStart(...args),
  },
}))

// Build an express app instance for supertest with only the game router mounted
function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/game', gameRouter)
  return app
}

describe('Router-level double submit (soft-path idempotency) — structures/start', () => {
  const app = makeApp()

  beforeEach(() => {
    jest.clearAllMocks()
    // Route guards require an empire for req.user._id; return a minimal doc
    EmpireFindOne.mockResolvedValue({
      _id: 'emp1',
      userId: 'user1',
    })

    const success: any = {
      success: true as const,
      data: {
        queueItem: { _id: 'q1', identityKey: 'emp1:A00:00:00:00:solar_plants', state: 'queued' },
        etaMinutes: 5,
      },
      message: 'Construction started.',
    }

    const already: any = {
      success: false as const,
      code: 'ALREADY_IN_PROGRESS',
      message: 'An identical item is already queued or active.',
      details: { identityKey: 'emp1:A00:00:00:00:solar_plants' },
    }

    // First call resolves success, second (and subsequent) resolve ALREADY_IN_PROGRESS
    StructuresStart
      .mockResolvedValueOnce(success)
      .mockResolvedValueOnce(already)
      .mockResolvedValue(already)
  })

  test('Double POST /api/game/structures/start → first 200 success, second 409 ALREADY_IN_PROGRESS', async () => {
    const payload = { locationCoord: 'A00:00:00:00', buildingKey: 'solar_plants' }

    // First submit
    const res1 = await request(app)
      .post('/api/game/structures/start')
      .send(payload)

    expect(res1.status).toBe(200)
    expect(res1.body).toMatchObject({
      success: true,
    })
    expect(res1.body).toHaveProperty('data.queueItem._id')
    expect(res1.body).toHaveProperty('message')

    // Second submit (approximate rapid double-click)
    const res2 = await request(app)
      .post('/api/game/structures/start')
      .send(payload)

    expect(res2.status).toBe(409)
    expect(res2.body).toMatchObject({
      success: false,
      code: 'ALREADY_IN_PROGRESS',
    })
    // Router mirrors message into error when missing; union-safe fields present
    expect(res2.body).toHaveProperty('message')
    expect(res2.body).toHaveProperty('error')
    expect(res2.body).toHaveProperty('details.identityKey')
  })
})
