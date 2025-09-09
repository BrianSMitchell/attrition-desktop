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

describe('Universe Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock random function
    mockRandom.mockReset();
  });

  it('should generate consistent universe with seeded randomness', async () => {
    // Set up predictable random sequence
    let callCount = 0;
    mockRandom.mockImplementation(() => {
      const values = [
        0.5,   // Number of star systems in first region (25)
        0.25,  // Position of first star system (25)
        0.75,  // Number of bodies in first system (15)
        0.1,   // Type of first body (planet)
        0.8,   // Fertility of first body (8)
        0.3,   // Metal resource (30)
        0.6,   // Crystal resource (60)
        0.9,   // Gas resource (90)
      ];
      return values[callCount++ % values.length] || 0.5;
    });

    // Mock successful database operations
    mockLocationModel.deleteMany.mockResolvedValue({ deletedCount: 0 });
    mockLocationModel.insertMany.mockResolvedValue([]);
    mockLocationModel.countDocuments.mockResolvedValue(0);

    // Import and run the generation function
    const { generateUniverseData } = await import('../../packages/server/src/scripts/generateUniverse');
    
    const locations = generateUniverseData();

    // Verify the structure and consistency
    expect(locations).toBeDefined();
    expect(Array.isArray(locations)).toBe(true);
    expect(locations.length).toBeGreaterThan(0);

    // Check first location has expected structure
    const firstLocation = locations[0];
    expect(firstLocation).toHaveProperty('coord');
    expect(firstLocation).toHaveProperty('type');
    expect(firstLocation).toHaveProperty('properties');
    expect(firstLocation.properties).toHaveProperty('fertility');
    expect(firstLocation.properties).toHaveProperty('resources');

    // Verify coordinate format
    expect(firstLocation.coord).toMatch(/^A\d{2}:\d{2}:\d{2}:\d{2}$/);

    // Test that the same seed produces the same results
    callCount = 0; // Reset call count
    const locations2 = generateUniverseData();
    
    // First few locations should be identical
    expect(locations[0]).toEqual(locations2[0]);
    expect(locations[1]).toEqual(locations2[1]);
    expect(locations[2]).toEqual(locations2[2]);
  });

  it('should generate locations for multiple galaxies', async () => {
    // Set up mock for consistent generation
    mockRandom.mockReturnValue(0.5);
    
    mockLocationModel.deleteMany.mockResolvedValue({ deletedCount: 0 });
    mockLocationModel.insertMany.mockResolvedValue([]);
    mockLocationModel.countDocuments.mockResolvedValue(0);

    const { generateUniverseData } = await import('../../packages/server/src/scripts/generateUniverse');
    const locations = generateUniverseData();

    // Check that we have locations from different galaxies
    const galaxies = new Set();
    locations.forEach(location => {
      const [server, galaxy] = location.coord.split(':');
      galaxies.add(galaxy);
    });

    // Should have locations from at least 2 galaxies (limited test scope)
    expect(galaxies.size).toBeGreaterThanOrEqual(2);
  });

  it('should generate both planets and asteroids', async () => {
    // Set up mock to generate variety
    let callCount = 0;
    mockRandom.mockImplementation(() => {
      // Alternate between values that create planets and asteroids
      return callCount++ % 4 < 2 ? 0.3 : 0.8; // 0.3 = planet, 0.8 = asteroid
    });

    mockLocationModel.deleteMany.mockResolvedValue({ deletedCount: 0 });
    mockLocationModel.insertMany.mockResolvedValue([]);
    mockLocationModel.countDocuments.mockResolvedValue(0);

    const { generateUniverseData } = await import('../../packages/server/src/scripts/generateUniverse');
    const locations = generateUniverseData();

    const types = new Set(locations.map(loc => loc.type));
    expect(types.has('planet')).toBe(true);
    expect(types.has('asteroid')).toBe(true);
  });

  it('should generate valid resource values', async () => {
    mockRandom.mockReturnValue(0.5);
    
    mockLocationModel.deleteMany.mockResolvedValue({ deletedCount: 0 });
    mockLocationModel.insertMany.mockResolvedValue([]);
    mockLocationModel.countDocuments.mockResolvedValue(0);

    const { generateUniverseData } = await import('../../packages/server/src/scripts/generateUniverse');
    const locations = generateUniverseData();

    // Check resource values are within expected ranges
    locations.slice(0, 10).forEach(location => {
      const { resources } = location.properties;
      expect(resources.metal).toBeGreaterThanOrEqual(0);
      expect(resources.metal).toBeLessThanOrEqual(100);
      expect(resources.crystal).toBeGreaterThanOrEqual(0);
      expect(resources.crystal).toBeLessThanOrEqual(100);
      expect(resources.gas).toBeGreaterThanOrEqual(0);
      expect(resources.gas).toBeLessThanOrEqual(100);
    });
  });
});
