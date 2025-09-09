/// <reference types="jest" />
/**
 * Atomic/no-double-activation test for processTechQueue
 * Ensures multiple due items for the same tech do not "double level" the empire.
 *
 * We simulate a race by returning the same queue item reference twice from TechQueue.find(),
 * and we assert the resulting tech level is promoted to target once (level 1), not twice.
 */

import type { TechnologyKey } from "@game/shared";
import { gameLoop } from '../../packages/desktop/src/services/gameLoopService';

// -------------------- Mocks --------------------

// Dynamic fixtures controlled per test
let mockEmpire: any = null;
let mockDueItems: Array<any> = [];

// Empire.findById
const EmpireFindById = jest.fn((_id: any) => mockEmpire);
jest.mock("../models/Empire", () => ({
  Empire: { findById: (id: any) => EmpireFindById(id) },
}));

// TechQueue.find returns all "due" items we configure
const TechQueueFind = jest.fn(async (_query: any) => mockDueItems);
jest.mock("../models/TechQueue", () => ({
  TechQueue: { find: (query: any) => TechQueueFind(query) },
}));

describe("GameLoopService.processTechQueue — atomic duplicate safety", () => {
  const empireId = "64a7b2c3d4e5f6a7b8c9d0e1";
  const locationCoord = "A00:00:00:00";
  const techKey: TechnologyKey = "energy";

  beforeEach(() => {
    jest.clearAllMocks();
    // Default empire with no tech unlocked
    mockEmpire = {
      _id: empireId,
      techLevels: new Map<string, number>(),
      save: jest.fn().mockResolvedValue(undefined),
    };

    // Single due item (target level 1)
    const item = {
      empireId,
      locationCoord,
      techKey,
      status: "pending",
      level: 1,
      save: jest.fn().mockResolvedValue(undefined),
    };

    // Simulate a race where the same item appears twice
    mockDueItems = [item, item];
  });

  it("promotes tech level to 1 only once even if duplicate due items are processed", async () => {
    await (gameLoop as any).processTechQueue();

    // Empire techLevels should be updated exactly to 1
    expect(mockEmpire.save).toHaveBeenCalled();
    expect(mockEmpire.techLevels instanceof Map).toBe(true);
    expect(mockEmpire.techLevels.get(techKey)).toBe(1);

    // The queue item may be saved multiple times, but state should end completed
    const item = mockDueItems[0];
    expect(item.status).toBe("completed");
    expect(item.save).toHaveBeenCalled();
  });

  it("with existing level 1, remains level 1 after duplicates (idempotent max)", async () => {
    // Pre-populate existing level
    mockEmpire.techLevels.set(techKey, 1);

    await (gameLoop as any).processTechQueue();

    // Should remain level 1, not increment beyond target
    expect(mockEmpire.techLevels.get(techKey)).toBe(1);
  });
});
