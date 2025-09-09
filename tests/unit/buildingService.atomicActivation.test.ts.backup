/// <reference types="jest" />
/**
 * Atomic transition test for BuildingService.completeDueConstructions
 * Ensures a queued→active transition for the SAME building document is idempotent
 * (i.e., does not double-apply upgrade level changes) even if processed twice.
 *
 * We simulate a race by returning the same document reference twice from Building.find().
 */

import { BuildingService } from "../services/buildingService";

// -------------------- Mocks --------------------

// Dynamic fixtures controlled per test
let mockDocs: any[] = [];

// Building.find returns our configured docs (two references to the same doc)
const BuildingFind = jest.fn(async (_query: any) => mockDocs);
jest.mock("../models/Building", () => ({
  Building: { find: (query: any) => BuildingFind(query) },
}));

describe("BuildingService.completeDueConstructions — atomic activation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("increments level exactly once when the same doc is processed twice", async () => {
    // Arrange: a single pending-upgrade building due for activation
    const initialLevel = 3;

    const doc: any = {
      _id: "507f1f77bcf86cd799439011",
      isActive: false,
      level: initialLevel,
      pendingUpgrade: true,
      constructionCompleted: new Date(Date.now() - 60_000), // due
      save: jest.fn().mockResolvedValue(undefined),
    };

    // Simulate a race where the same doc is present twice in the result set
    mockDocs = [doc, doc]; // same reference twice

    // Act
    const result = await BuildingService.completeDueConstructions();

    // Assert: level only increments once (3 -> 4) and upgrade flag cleared
    expect(doc.level).toBe(initialLevel + 1);
    expect(doc.pendingUpgrade).toBe(false);

    // Activated and completion cleared
    expect(doc.isActive).toBe(true);
    expect(doc.constructionCompleted).toBeUndefined();

    // Saved at least once (may be saved twice depending on loop, but state is idempotent)
    expect(doc.save).toHaveBeenCalled();

    // Result summary is best-effort; we only assert that activation occurred
    expect(result.activatedCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(result.activatedIds)).toBe(true);
  });
});
