/* @ts-nocheck */
// Mock seedrandom before importing the module
const mockRandom = jest.fn();
jest.mock('seedrandom', () => {
  return jest.fn(() => mockRandom);
});

// Mock mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    close: jest.fn(),
  },
}));

// Mock the Location model
const mockLocationModel = {
  deleteMany: jest.fn(),
  insertMany: jest.fn(),
  countDocuments: jest.fn(),
};

jest.mock('../models/Location', () => mockLocationModel);

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('Star Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default predictable randomness (constant)
    mockRandom.mockReturnValue(0.5);
    mockLocationModel.deleteMany.mockResolvedValue({ deletedCount: 0 });
    mockLocationModel.insertMany.mockResolvedValue([]);
    mockLocationModel.countDocuments.mockResolvedValue(0);
  });

  it('should include exactly one star (body 0) per system in generated test data', async () => {
    const { generateUniverseData } = await import('../scripts/generateUniverse');
    const locations = generateUniverseData();

    // Helper to parse coord "A00:10:22:10"
    const parse = (coord: string) => {
      const m = coord.match(/^([A-Z])(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
      if (!m) throw new Error(`Bad coord: ${coord}`);
      return {
        server: m[1],
        galaxy: parseInt(m[2], 10),
        region: parseInt(m[3], 10),
        system: parseInt(m[4], 10),
        body: parseInt(m[5], 10),
      };
    };

    // Group by server/galaxy/region/system
    const systems = new Map<string, { stars: number; nonStarBodyZero: number }>();
    for (const loc of locations) {
      const c = parse(loc.coord);
      const key = `${c.server}-${c.galaxy}-${c.region}-${c.system}`;
      const entry = systems.get(key) || { stars: 0, nonStarBodyZero: 0 };

      if (c.body === 0) {
        if (loc.type === 'star') {
          entry.stars += 1;
        } else {
          entry.nonStarBodyZero += 1;
        }
      }

      systems.set(key, entry);
    }

    // Every system must have exactly one star and no non-star at body 0
    for (const [key, entry] of systems.entries()) {
      expect(entry.stars).toBe(1);
      expect(entry.nonStarBodyZero).toBe(0);
    }
  });

  it('should never assign body 0 to planets or asteroids', async () => {
    const { generateUniverseData } = await import('../scripts/generateUniverse');
    const locations = generateUniverseData();

    const hasNonStarBodyZero = locations.some((loc) => {
      const m = loc.coord.match(/^([A-Z])(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
      if (!m) return false;
      const body = parseInt(m[5], 10);
      return body === 0 && loc.type !== 'star';
    });

    expect(hasNonStarBodyZero).toBe(false);
  });
});
