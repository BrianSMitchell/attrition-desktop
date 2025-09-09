import express from 'express';
import request from 'supertest';
import gameRouter from '../routes/game';
import { getTechSpec } from '@game/shared';

// Bypass real auth; inject a fake user
jest.mock('../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { _id: 'user1' };
    next();
  },
}));

// Empire mock (provide territories so summary has a base)
const EmpireFindOne = jest.fn();
jest.mock('../models/Empire', () => ({
  Empire: {
    findOne: (...args: any[]) => EmpireFindOne(...args),
  },
}));

// Location mock (return one owned location)
const LocationFind = jest.fn();
jest.mock('../models/Location', () => ({
  Location: {
    find: (..._args: any[]) => LocationFind(),
  },
}));

// Colony mock (no named colony by default)
const ColonyFind = jest.fn();
jest.mock('../models/Colony', () => ({
  Colony: {
    find: (..._args: any[]) => ColonyFind(),
  },
}));

// Building mock (no queued buildings by default)
const BuildingFind = jest.fn();
jest.mock('../models/Building', () => ({
  Building: {
    find: (..._args: any[]) => BuildingFind(),
  },
}));

// TechQueue mock (we will control scheduled vs unscheduled behavior)
const TechFindOne = jest.fn();
jest.mock('../models/TechQueue', () => ({
  TechQueue: {
    findOne: (..._args: any[]) => TechFindOne(),
  },
}));

 // UnitQueue mock (ensure router doesn't hit real DB when summarizing production)
const UnitFind = jest.fn();
jest.mock('../models/UnitQueue', () => ({
  UnitQueue: {
    find: (..._args: any[]) => UnitFind(),
  },
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/game', gameRouter);
  return app;
}

// Helpers to emulate Mongoose query chain semantics used in router
function queryWithLean<T>(value: T) {
  return { lean: jest.fn().mockResolvedValue(value) };
}
function queryWithSortAndLean<T>(value: T) {
  return { sort: jest.fn().mockReturnValue(queryWithLean(value)) };
}
function queryWithSelectAndLean<T>(value: T) {
  return { select: jest.fn().mockReturnValue(queryWithLean(value)) };
}

describe('GET /api/game/bases/summary — research summary handling', () => {
  const app = makeApp();

  beforeEach(() => {
    jest.clearAllMocks();

    // Minimal empire with one territory
    EmpireFindOne.mockResolvedValue({
      _id: 'emp1',
      userId: 'user1',
      territories: ['A00:00:00:00'],
    });

    // Locations for the territory
    LocationFind.mockReturnValue(queryWithLean([
      { _id: 'loc1', coord: 'A00:00:00:00' },
    ]));

    // No named colonies by default
    ColonyFind.mockReturnValue(queryWithLean([]));

    // No queued buildings
BuildingFind.mockReturnValue(queryWithSelectAndLean([]));
    // No pending unit production by default
    UnitFind.mockReturnValue(queryWithSelectAndLean([]));
  });

  test('returns scheduled research with remaining > 0 and percent between 0..100', async () => {
    const now = Date.now();
    const scheduled = {
      techKey: 'energy',
      startedAt: new Date(now - 2 * 60 * 1000), // started 2 minutes ago
      completesAt: new Date(now + 8 * 60 * 1000), // completes in 8 minutes
      status: 'pending',
      charged: true,
    };

    // First query prefers scheduled items (completesAt != null)
    TechFindOne.mockReturnValueOnce(queryWithSortAndLean(scheduled));

    const res = await request(app).get('/api/game/bases/summary');

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    const bases = res.body?.data?.bases;
    expect(Array.isArray(bases)).toBe(true);
    expect(bases.length).toBe(1);

    const research = bases[0]?.research;
    expect(research).toBeTruthy();

    const expectedName = getTechSpec('energy' as any).name;
    expect(research.name).toBe(expectedName);

    // remaining should be positive
    expect(typeof research.remaining).toBe('number');
    expect(research.remaining).toBeGreaterThan(0);

    // percent within [0,100]
    expect(typeof research.percent).toBe('number');
    expect(research.percent).toBeGreaterThanOrEqual(0);
    expect(research.percent).toBeLessThanOrEqual(100);
  });

  test('returns unscheduled/waiting research with remaining=0 and percent=0 when completesAt is null', async () => {
    const unscheduled = {
      techKey: 'energy',
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
      status: 'pending',
      charged: false,
      completesAt: null,
    };

    // First call (scheduled preference) returns null
    TechFindOne
      .mockReturnValueOnce(queryWithSortAndLean(null))
      // Second call (fallback to earliest unscheduled pending by createdAt)
      .mockReturnValueOnce(queryWithSortAndLean(unscheduled));

    const res = await request(app).get('/api/game/bases/summary');

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    const bases = res.body?.data?.bases;
    expect(Array.isArray(bases)).toBe(true);
    expect(bases.length).toBe(1);

    const research = bases[0]?.research;
    expect(research).toBeTruthy();

    const expectedName = getTechSpec('energy' as any).name;
    expect(research.name).toBe(expectedName);

    // waiting state
    expect(research.remaining).toBe(0);
    expect(research.percent).toBe(0);
  });
});
