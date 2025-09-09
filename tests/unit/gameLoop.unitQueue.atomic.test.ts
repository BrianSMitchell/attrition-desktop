/// <reference types="jest" />
/**
 * Atomic/no-double-activation test for processUnitQueue
 * Ensures duplicate due items for the same unit do not cause non-idempotent effects.
 *
 * Current unit completion path simply marks items "completed". This test verifies that
 * processing duplicate references is idempotent (resulting state is completed, without errors).
 */

// -------------------- Mocks --------------------

// Dynamic fixtures controlled per test
let mockEmpire: any = null;
let mockDueItems: Array<any> = [];

// Empire.findById
const EmpireFindById = jest.fn((_id: any) => mockEmpire);
jest.mock("../models/Empire", () => ({
  Empire: { findById: (id: any) => EmpireFindById(id) },
}));

// UnitQueue.find returns all "due" items we configure
const UnitQueueFind = jest.fn(async (_query: any) => mockDueItems);
jest.mock("../models/UnitQueue", () => ({
  UnitQueue: { find: (query: any) => UnitQueueFind(query) },
}));

// Import after mocks are set up
import { gameLoop } from '../../packages/desktop/src/services/gameLoopService';

describe("GameLoopService.processUnitQueue — atomic duplicate safety", () => {
  const empireId = "64a7b2c3d4e5f6a7b8c9d0e1";
  const locationCoord = "A00:00:00:00";
  const unitKey = "scout";

  beforeEach(() => {
    jest.clearAllMocks();
    // Empire exists
    mockEmpire = {
      _id: empireId,
      save: jest.fn().mockResolvedValue(undefined),
    };

    // Single due item
    const item = {
      empireId,
      locationCoord,
      unitKey,
      status: "pending",
      save: jest.fn().mockResolvedValue(undefined),
    };

    // Simulate a race where the same item appears twice in the result set
    mockDueItems = [item, item];
  });

  it("marks unit queue item completed even when duplicate references are processed", async () => {
    await (gameLoop as any).processUnitQueue();

    const item = mockDueItems[0];
    expect(item.status).toBe("completed");
    expect(item.save).toHaveBeenCalled();
  });

  it("cancels duplicate items when empire is missing (idempotent cancel)", async () => {
    mockEmpire = null; // simulate missing empire

    await (gameLoop as any).processUnitQueue();

    const item = mockDueItems[0];
    expect(item.status).toBe("cancelled");
    expect(item.save).toHaveBeenCalled();
  });
});
