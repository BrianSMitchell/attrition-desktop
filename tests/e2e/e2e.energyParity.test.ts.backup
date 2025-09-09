/// <reference types="jest" />
/**
 * E2E-style validations for:
 * 1) Energy gating logs (standardized parseable line) with positive/negative projections
 * 2) Capacity Parity ETA formula
 *
 * These tests exercise StructuresService.start with controlled mocks and capture console.log lines.
 */

import type { BuildingKey } from "@game/shared";

// -------------------- Runtime Mocks --------------------

// Empire.findById
const EmpireFindById = jest.fn();
jest.mock("../models/Empire", () => ({
  Empire: { findById: (...args: any[]) => EmpireFindById(...args) },
}));

// Location.findOne
const LocationFindOne = jest.fn();
jest.mock("../models/Location", () => ({
  Location: { findOne: (...args: any[]) => LocationFindOne(...args) },
}));

// Building model: supports new Building(...).save(), and static find/findOne for queries
const BuildingFindOne = jest.fn();
// Provide a query-chainable mock: .select().lean().then(...)
const BuildingFind = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue([]),
  }),
});
const BuildingSave = jest.fn();
class MockBuilding {
  [key: string]: any;
  constructor(doc: any) {
    Object.assign(this, doc);
  }
  async save() {
    return BuildingSave();
  }
  static find(...args: any[]) {
    return BuildingFind(...args);
  }
  static findOne(...args: any[]) {
    return BuildingFindOne(...args);
  }
}
jest.mock("../models/Building", () => ({
  Building: MockBuilding,
}));

// CapacityService.getBaseCapacities
const GetBaseCapacities = jest.fn();
jest.mock("../services/capacityService", () => ({
  CapacityService: {
    getBaseCapacities: (...args: any[]) => GetBaseCapacities(...args),
  },
}));

// Shared catalog + helpers (configurable per-test)
const CanStartByTech = jest.fn().mockReturnValue({ ok: true, unmet: [] as any[] });
const GetBuildingSpec = jest.fn().mockReturnValue({
  key: "research_lab",
  name: "Research Lab",
  mappedType: "research_lab",
  creditsCost: 2,
  energyDelta: -1,
});
const GetStructureCreditCostForLevel = jest.fn().mockReturnValue(2);
const ComputeEnergyBalance = jest.fn().mockReturnValue({
  produced: 2,
  consumed: 0,
  balance: 2,
  reservedNegative: 0,
});
jest.mock("@game/shared", () => {
  // keep types at compile time; runtime just needs functions we call
  return {
    // validator/gating
    canStartBuildingByTech: (...args: any[]) => CanStartByTech(...args),

    // catalog
    getBuildingSpec: (...args: any[]) => GetBuildingSpec(...args),
    getStructureCreditCostForLevel: (...args: any[]) =>
      GetStructureCreditCostForLevel(...args),

    // energy helper adoption in StructuresService
    computeEnergyBalance: (...args: any[]) => ComputeEnergyBalance(...args),
    canStartWithDelta: ({
      balance,
      reservedNegative,
      delta,
    }: {
      balance: number;
      reservedNegative: number;
      delta: number;
    }) => balance + reservedNegative + delta >= 0,
  };
});

// Import after mocks
import { StructuresService } from "../services/structuresService";

// -------------------- Helpers --------------------

function makeEmpire(overrides: Partial<any> = {}) {
  return {
    _id: "64a7b2c3d4e5f6a7b8c9d0e1",
    userId: "user1",
    resources: { credits: 1_000, metal: 0, energy: 0, research: 0 },
    techLevels: new Map<string, number>(),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function parseEnergyLog(line: string) {
  // Example:
  // [StructuresService.start] key=research_lab delta=-1 produced=2 consumed=0 balance=1 reserved=0 projectedEnergy=0
  const m =
    line &&
    line.match(
      /\[StructuresService\.start\]\s+key=(\S+)\s+delta=(-?\d+)\s+produced=(-?\d+)\s+consumed=(-?\d+)\s+balance=(-?\d+)\s+reserved=(-?\d+)\s+projectedEnergy=(-?\d+)/
    );
  if (!m) return null;
  const [
    _full,
    key,
    delta,
    produced,
    consumed,
    balance,
    reserved,
    projectedEnergy,
  ] = m;
  return {
    key,
    delta: Number(delta),
    produced: Number(produced),
    consumed: Number(consumed),
    balance: Number(balance),
    reservedNegative: Number(reserved),
    projectedEnergy: Number(projectedEnergy),
  };
}

async function withCapturedLogs<T>(
  fn: () => Promise<T>,
  prefix = "[StructuresService.start]"
): Promise<{ result: T; lines: string[] }> {
  const orig = console.log;
  const lines: string[] = [];
  // Capture but also forward to original for visibility during test runs
  console.log = (...args: any[]) => {
    const msg = args.map(String).join(" ");
    if (!prefix || msg.startsWith(prefix)) {
      lines.push(msg);
    }
    orig(...args);
  };
  try {
    const result = await fn();
    return { result, lines };
  } finally {
    console.log = orig;
  }
}

// -------------------- Tests --------------------

describe("E2E - Energy Gating Logs and Capacity Parity", () => {
  const empireId = "64a7b2c3d4e5f6a7b8c9d0e1";
  const locationCoord = "A00:00:00:00";
  const buildingKey: BuildingKey = "research_lab" as BuildingKey;

  beforeEach(() => {
    jest.clearAllMocks();

    // Defaults
    EmpireFindById.mockResolvedValue(makeEmpire());
    LocationFindOne.mockResolvedValue({ coord: locationCoord, owner: "user1" });
    BuildingFindOne.mockResolvedValue(null); // no existing building queued/active
    BuildingFind.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]), // no existing buildings at base
      }),
    });

    GetBaseCapacities.mockResolvedValue({ construction: { value: 60 } }); // 60 credits/hour by default
    CanStartByTech.mockReturnValue({ ok: true, unmet: [] });

    GetBuildingSpec.mockReturnValue({
      key: "research_lab",
      name: "Research Lab",
      mappedType: "research_lab",
      creditsCost: 2,
      energyDelta: -1,
    });

    GetStructureCreditCostForLevel.mockReturnValue(2);

    ComputeEnergyBalance.mockReturnValue({
      produced: 2,
      consumed: 0,
      balance: 2,
      reservedNegative: 0,
    });
  });

  it("Positive projection: succeeds and logs projectedEnergy >= 0 with standardized line", async () => {
    // Arrange: force projectedEnergy = 0 (balance 1 + reserved 0 + delta -1 = 0)
    ComputeEnergyBalance.mockReturnValue({
      produced: 0,
      consumed: 0,
      balance: 1,
      reservedNegative: 0,
    });
    GetBuildingSpec.mockReturnValue({
      key: "research_lab",
      name: "Research Lab",
      mappedType: "research_lab",
      creditsCost: 2,
      energyDelta: -1, // consumer
    });

    const { result, lines } = await withCapturedLogs(() =>
      StructuresService.start(empireId, locationCoord, buildingKey)
    );

    // Assert success
    expect(result.success).toBe(true);

    // Find and parse the standardized energy log
    const energyLine = lines.find((l) =>
      l.startsWith("[StructuresService.start]")
    );
    expect(energyLine).toBeTruthy();

    const parsed = parseEnergyLog(energyLine!);
    expect(parsed).not.toBeNull();
    expect(parsed!.key).toBe("research_lab");
    expect(parsed!.delta).toBe(-1);
    expect(parsed!.balance).toBe(1);
    expect(parsed!.reservedNegative).toBe(0);
    expect(parsed!.projectedEnergy).toBeGreaterThanOrEqual(0);
    expect(parsed!.projectedEnergy).toBe(0); // exact
  });

  it("Negative projection: fails with INSUFFICIENT_ENERGY and logs projectedEnergy < 0", async () => {
    // Arrange: force projectedEnergy = -1 (balance 0 + reserved 0 + delta -1 = -1)
    ComputeEnergyBalance.mockReturnValue({
      produced: 0,
      consumed: 0,
      balance: 0,
      reservedNegative: 0,
    });
    GetBuildingSpec.mockReturnValue({
      key: "research_lab",
      name: "Research Lab",
      mappedType: "research_lab",
      creditsCost: 2,
      energyDelta: -1, // consumer
    });

    const { result, lines } = await withCapturedLogs(() =>
      StructuresService.start(empireId, locationCoord, buildingKey)
    );

    // Assert failure DTO per .clinerules/dto-error-schema-and-logging.md
    expect(result.success).toBe(false);
    const failure = result as any;
    expect(failure.code).toBe("INSUFFICIENT_ENERGY");
    expect(typeof failure.message).toBe("string");
    expect(failure.reasons).toEqual(
      expect.arrayContaining(["insufficient_energy"])
    );
    expect(failure.details).toMatchObject({
      produced: expect.any(Number),
      consumed: expect.any(Number),
      balance: expect.any(Number),
      reservedNegative: expect.any(Number),
      delta: -1,
      projectedEnergy: expect.any(Number),
    });

    // Standardized log line presence and correctness
    const energyLine = lines.find((l) =>
      l.startsWith("[StructuresService.start]")
    );
    expect(energyLine).toBeTruthy();

    const parsed = parseEnergyLog(energyLine!);
    expect(parsed).not.toBeNull();
    expect(parsed!.projectedEnergy).toBeLessThan(0);
    expect(parsed!.delta).toBe(-1);
  });

  it("Capacity parity (ETA): etaMinutes equals max(1, ceil((creditsCost / constructionPerHour) * 60))", async () => {
    // Arrange: choose clear values
    // creditsCost = 75, construction capacity = 37 cred/hour
    // hours = 75/37 ~= 2.027, minutes ~= 121.62 -> ceil -> 122
    const creditsCost = 75;
    const constructionPerHour = 37;
    GetStructureCreditCostForLevel.mockReturnValue(creditsCost);
    GetBaseCapacities.mockResolvedValue({
      construction: { value: constructionPerHour },
    });

    // Avoid energy gating: make delta 0 and energy plentiful
    GetBuildingSpec.mockReturnValue({
      key: "research_lab",
      name: "Research Lab",
      mappedType: "research_lab",
      creditsCost,
      energyDelta: 0,
    });
    ComputeEnergyBalance.mockReturnValue({
      produced: 10,
      consumed: 0,
      balance: 10,
      reservedNegative: 0,
    });

    const res = await StructuresService.start(
      empireId,
      locationCoord,
      buildingKey
    );
    expect(res.success).toBe(true);

    const data = (res as any).data;
    expect(data).toBeDefined();
    const expectedMinutes = Math.max(
      1,
      Math.ceil((creditsCost / constructionPerHour) * 60)
    );
    expect(data.etaMinutes).toBe(expectedMinutes);
    expect(data.constructionCapacityCredPerHour).toBe(constructionPerHour);
  });
});
