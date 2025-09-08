/// <reference types="jest" />
import express from 'express';
import request from 'supertest';
import gameRouter from '../routes/game';

// Bypass real auth; inject a fake user
jest.mock('../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { _id: 'user1' };
    next();
  },
}));

// Empire mock
const EmpireFindOne = jest.fn();
jest.mock('../models/Empire', () => ({
  Empire: {
    findOne: (...args: any[]) => EmpireFindOne(...args),
  },
}));

// Building mock
const BuildingFindById = jest.fn();
jest.mock('../models/Building', () => ({
  Building: {
    findById: (...args: any[]) => BuildingFindById(...args),
  },
}));

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/game', gameRouter);
  return app;
}

describe('DELETE /api/game/structures/queue/:id — refunds and branches', () => {
  const app = makeApp();

  beforeEach(() => {
    jest.clearAllMocks();

    // Minimal empire document with save()
    const empireDoc: any = {
      _id: 'emp1',
      userId: 'user1',
      resources: { credits: 1000 },
      save: jest.fn().mockResolvedValue(undefined),
    };
    EmpireFindOne.mockResolvedValue(empireDoc);
  });

  test('revert upgrade branch refunds credits and returns refundedCredits', async () => {
    // Arrange: queued upgrade doc (pendingUpgrade=true), isActive=false, creditsCost set
    const buildingDoc: any = {
      _id: 'b1',
      empireId: 'emp1',
      isActive: false,
      pendingUpgrade: true,
      creditsCost: 5000,
      constructionStarted: new Date(),
      constructionCompleted: null,
      save: jest.fn().mockResolvedValue(undefined),
    };
    BuildingFindById.mockResolvedValue(buildingDoc);

    // Act
    const res = await request(app).delete('/api/game/structures/queue/0123456789abcdef01234567');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.cancelledId).toBe('0123456789abcdef01234567');
    expect(res.body?.data?.revertedUpgrade).toBe(true);
    expect(res.body?.data?.deleted).toBe(false);
    expect(typeof res.body?.data?.refundedCredits).toBe('number');
    expect(res.body?.data?.refundedCredits).toBe(5000);
    expect(res.body?.message).toMatch(/refunded/i);

    // Ensure persistence methods were called
    const savedEmpire = await EmpireFindOne.mock.results[0].value;
    expect(savedEmpire.save).toHaveBeenCalled();
    expect(buildingDoc.save).toHaveBeenCalled();

    // Router resets creditsCost on revert to prevent double-refund
    expect(buildingDoc.creditsCost).toBe(0);
    // Router flips to active and clears scheduling fields
    expect(buildingDoc.isActive).toBe(true);
    expect(buildingDoc.pendingUpgrade).toBe(false);
  });

  test('first-time construction delete branch refunds credits and deletes doc', async () => {
    const deleteOne = jest.fn().mockResolvedValue(undefined);
    // pendingUpgrade=false → delete path
    const buildingDoc: any = {
      _id: 'b2',
      empireId: 'emp1',
      isActive: false,
      pendingUpgrade: false,
      creditsCost: 1234,
      deleteOne,
    };
    BuildingFindById.mockResolvedValue(buildingDoc);

    const res = await request(app).delete('/api/game/structures/queue/abcdef0123456789abcdef01');

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.cancelledId).toBe('abcdef0123456789abcdef01');
    expect(res.body?.data?.revertedUpgrade).toBe(false);
    expect(res.body?.data?.deleted).toBe(true);
    expect(res.body?.data?.refundedCredits).toBe(0);
    expect(res.body?.message).toMatch(/cancelled/i);

    expect(deleteOne).toHaveBeenCalled();

    const savedEmpire = await EmpireFindOne.mock.results[0].value;
    expect(savedEmpire.save).not.toHaveBeenCalled();
  });

  test('rejects invalid id quickly with 400', async () => {
    const res = await request(app).delete('/api/game/structures/queue/not-a-valid-objectid');
    expect(res.status).toBe(400);
    expect(res.body?.success).toBe(false);
  });

  test('rejects active items (not queued) with 400', async () => {
    const buildingDoc: any = {
      _id: 'b3',
      empireId: 'emp1',
      isActive: true, // guard triggers
    };
    BuildingFindById.mockResolvedValue(buildingDoc);

    const res = await request(app).delete('/api/game/structures/queue/0123456789abcdef01234567');
    expect(res.status).toBe(400);
    expect(res.body?.success).toBe(false);
  });
});
