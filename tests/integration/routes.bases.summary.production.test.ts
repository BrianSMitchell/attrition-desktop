import express from 'express';
import request from 'supertest';
import gameRouter from '../routes/game';
import { getUnitSpec } from '@game/shared';

// Bypass real auth; inject a fake user
import { HTTP_STATUS } from '../packages/shared/src/response-formats';
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

// Building mock (no queued buildings by default, not relevant to this test)
const BuildingFind = jest.fn();
jest.mock('../models/Building', () => ({
  Building: {
    find: (..._args: any[]) => BuildingFind(),
  },
}));

// TechQueue mock (not used here but router queries it; return nulls)
const TechFindOne = jest.fn();
jest.mock('../models/TechQueue', () => ({
  TechQueue: {
    findOne: (..._args: any[]) => TechFindOne(),
  },
}));

// UnitQueue mock (drives production summary)
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

// Helpers to emulate database query chain semantics used in router
function queryWithLean<T>(value: T) {
  return { lean: jest.fn().mockResolvedValue(value) };
}
function queryWithSortAndLean<T>(value: T) {
  return { sort: jest.fn().mockReturnValue(queryWithLean(value)) };
}
function queryWithSelectAndLean<T>(value: T) {
  return { select: jest.fn().mockReturnValue(queryWithLean(value)) };
}

describe('GET /api/game/bases/summary — production (units) summary handling', () => {
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

    // Research not present (router tries scheduled first, then unscheduled)
    TechFindOne
      .mockReturnValueOnce(queryWithSortAndLean(null))
      .mockReturnValueOnce(queryWithSortAndLean(null));
  });

  test('returns scheduled production with remaining > 0 and percent between 0..100', async () => {
    const now = Date.now();
    const scheduled = [
      {
        unitKey: 'fighter',
        locationCoord: 'A00:00:00:00',
        startedAt: new Date(now - 2 * 60 * 1000),  // started 2 minutes ago
        completesAt: new Date(now + 8 * 60 * 1000), // completes in 8 minutes
        status: 'pending',
        createdAt: new Date(now - 3 * 60 * 1000),
      },
    ];

    // UnitQueue.find(...).select(...).lean()
    UnitFind.mockReturnValue(queryWithSelectAndLean(scheduled));

    const res = await request(app).get('/api/game/bases/summary');

    expect(res.status).toBe(HTTP_STATUS.OK);
    expect(res.body?.success).toBe(true);
    const bases = res.body?.data?.bases;
    expect(Array.isArray(bases)).toBe(true);
    expect(bases.length).toBe(1);

    const production = bases[0]?.production;
    expect(production).toBeTruthy();

    // queued count
    expect(typeof production.queued).toBe('number');
    expect(production.queued).toBe(1);

    // next object with resolved name and remaining
    expect(production.next).toBeTruthy();
    const expectedName = getUnitSpec('fighter' as any)?.name || 'fighter';
    expect(production.next.name).toBe(expectedName);

    // remaining should be positive
    expect(typeof production.next.remaining).toBe('number');
    expect(production.next.remaining).toBeGreaterThan(0);

    // percent within [0,100]
    expect(typeof production.next.percent).toBe('number');
    expect(production.next.percent).toBeGreaterThanOrEqual(0);
    expect(production.next.percent).toBeLessThanOrEqual(100);
  });

  test('returns waiting production (remaining=0, percent=0) when completesAt is missing', async () => {
    const now = Date.now();
    const unscheduled = [
      {
        unitKey: 'bomber',
        locationCoord: 'A00:00:00:00',
        status: 'pending',
        createdAt: new Date(now - 5 * 60 * 1000),
        // No startedAt / completesAt -> waiting state
      },
    ];

    UnitFind.mockReturnValue(queryWithSelectAndLean(unscheduled));

    const res = await request(app).get('/api/game/bases/summary');

    expect(res.status).toBe(HTTP_STATUS.OK);
    expect(res.body?.success).toBe(true);
    const bases = res.body?.data?.bases;
    expect(Array.isArray(bases)).toBe(true);
    expect(bases.length).toBe(1);

    const production = bases[0]?.production;
    expect(production).toBeTruthy();

    // queued count
    expect(production.queued).toBe(1);

    // waiting state (remaining 0, percent 0)
    expect(production.next).toBeTruthy();
    const expectedName = getUnitSpec('bomber' as any)?.name || 'bomber';
    expect(production.next.name).toBe(expectedName);
    expect(production.next.remaining).toBe(0);
    expect(production.next.percent).toBe(0);
  });
});

