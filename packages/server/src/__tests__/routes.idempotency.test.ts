/// <reference types="jest" />

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

// Mock services so we can force ALREADY_IN_PROGRESS without touching databases
const TechStart = jest.fn()
jest.mock('../services/techService', () => ({
  TechService: {
    start: (...args: any[]) => TechStart(...args),
  },
}))

const StructuresStart = jest.fn()
jest.mock('../services/structuresService', () => ({
  StructuresService: {
    getStatus: jest.fn(), // not used here
    start: (...args: any[]) => StructuresStart(...args),
  },
}))

const DefensesStart = jest.fn()
jest.mock('../services/defensesService', () => ({
  DefensesService: {
    getStatus: jest.fn(), // not used here
    start: (...args: any[]) => DefensesStart(...args),
  },
}))

const UnitsStart = jest.fn()
jest.mock('../services/unitsService', () => ({
  UnitsService: {
    getStatus: jest.fn(), // not used here
    start: (...args: any[]) => UnitsStart(...args),
  },
}))

// Build an express app instance for supertest with only the game router mounted
function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/game', gameRouter)
  return app
}

describe('Router-level idempotency (HTTP 409) mapping', () => {
  const app = makeApp()

  beforeEach(() => {
    jest.clearAllMocks()
    // Route guards require an empire for req.user._id; return a minimal doc
    EmpireFindOne.mockResolvedValue({
      _id: 'emp1',
      userId: 'user1',
    })

    const already: any = {
      success: false as const,
      code: 'ALREADY_IN_PROGRESS',
      message: 'An identical item is already queued or active.',
      details: { identityKey: 'emp1:A00:00:00:00:key' },
    }

    TechStart.mockResolvedValue(already)
    StructuresStart.mockResolvedValue(already)
    DefensesStart.mockResolvedValue(already)
    UnitsStart.mockResolvedValue(already)
  })

  test('POST /api/game/tech/start → 409 with union-safe payload', async () => {
    const res = await request(app)
      .post('/api/game/tech/start')
      .send({ locationCoord: 'A00:00:00:00', techKey: 'energy' })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({
      success: false,
      code: 'ALREADY_IN_PROGRESS',
    })
    expect(res.body).toHaveProperty('message')
    expect(res.body).toHaveProperty('error') // router mirrors message into error when missing
    expect(res.body).toHaveProperty('details.identityKey')
  })

  test('POST /api/game/structures/start → 409 with union-safe payload', async () => {
    const res = await request(app)
      .post('/api/game/structures/start')
      .send({ locationCoord: 'A00:00:00:00', buildingKey: 'solar_plants' })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({
      success: false,
      code: 'ALREADY_IN_PROGRESS',
    })
    expect(res.body).toHaveProperty('message')
    expect(res.body).toHaveProperty('error')
    expect(res.body).toHaveProperty('details.identityKey')
  })

  test('POST /api/game/defenses/start → 409 with union-safe payload', async () => {
    const res = await request(app)
      .post('/api/game/defenses/start')
      .send({ locationCoord: 'A00:00:00:00', defenseKey: 'defense_station' })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({
      success: false,
      code: 'ALREADY_IN_PROGRESS',
    })
    expect(res.body).toHaveProperty('message')
    expect(res.body).toHaveProperty('error')
    expect(res.body).toHaveProperty('details.identityKey')
  })

  test('POST /api/game/units/start → 409 with union-safe payload', async () => {
    const res = await request(app)
      .post('/api/game/units/start')
      .send({ locationCoord: 'A00:00:00:00', unitKey: 'scout' })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({
      success: false,
      code: 'ALREADY_IN_PROGRESS',
    })
    expect(res.body).toHaveProperty('message')
    expect(res.body).toHaveProperty('error')
    expect(res.body).toHaveProperty('details.identityKey')
  })
})
