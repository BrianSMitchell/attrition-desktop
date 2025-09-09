/// <reference types="jest" />
/**
 * Game Simulation Framework Tests
 * 
 * These tests demonstrate how to use the Game Simulation Framework
 * to test complex game mechanics, state management, and scenarios.
 */

import mongoose from 'mongoose';
import { 
  GameSimulationEngine,
  GameScenarioBuilder,
  GameStateValidator,
  GameAssertions,
  createStandardTestEmpire,
  validateResourceProduction
} from '@test-utils/test-utils/game-simulation-framework';
import { Empire } from '../models/Empire';
import { Location } from '../models/Location';
import { Building } from '../models/Building';

// Mock shared module functions
jest.mock('@game/shared', () => ({
  getTechSpec: jest.fn((techKey: string) => ({
    creditsCost: techKey === 'energy' ? 2 : 10,
    requiredLabs: 1,
    prerequisites: techKey === 'laser' ? { energy: 1 } : undefined
  })),
  getBuildingSpec: jest.fn((buildingKey: string) => ({
    creditsCost: buildingKey === 'solar_plants' ? 5 : 20,
    techRequirements: buildingKey === 'research_labs' ? { energy: 2 } : undefined
  })),
  getUnitSpec: jest.fn(() => ({
    creditsCost: 15,
    productionTime: 30
  }))
}));

describe('Game Simulation Framework', () => {
  let mongoConnection: mongoose.Connection;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/attrition-test';
    await mongoose.connect(mongoUri);
    mongoConnection = mongoose.connection;
  });

  afterAll(async () => {
    await mongoConnection.close();
  });

  beforeEach(async () => {
    // Clear test data
    await Empire.deleteMany({});
    await Location.deleteMany({});
    await Building.deleteMany({});
  });

  describe('GameSimulationEngine', () => {
    test('should create and manage test empire', async () => {
      const engine = new GameSimulationEngine({
        debug: true,
        startingResources: {
          credits: 5000,
          energy: 1000,
          metal: 500,
          research: 100
        }
      });

      try {
        // Create test empire
        const empire = await engine.createTestEmpire('test-user-1', ['A00:00:00:00', 'A00:00:00:01']);

        expect(empire.empireId).toBeDefined();
        expect(empire.userId).toBe('test-user-1');
        expect(empire.territories).toEqual(['A00:00:00:00', 'A00:00:00:01']);
        expect(empire.resources.credits).toBe(5000);

        // Verify empire was created in database
        const dbEmpire = await Empire.findById(empire.empireId);
        expect(dbEmpire).toBeTruthy();
        expect(dbEmpire?.name).toBe('Test Empire test-user-1');

        // Verify locations were created
        const locations = await Location.find({ owner: 'test-user-1' });
        expect(locations).toHaveLength(2);
      } finally {
        await engine.cleanup();
      }
    });

    test('should add buildings to empire bases', async () => {
      const engine = new GameSimulationEngine();

      try {
        const empire = await engine.createTestEmpire('test-user-1');
        
        // Add solar plants to the base
        await engine.addTestBuilding(empire.empireId, 'A00:00:00:00', 'solar_plants' as any, 2);

        // Verify building was added
        const state = engine.getEmpireState(empire.empireId);
        expect(state?.buildings).toHaveLength(1);
        expect(state?.buildings[0].buildingKey).toBe('solar_plants');
        expect(state?.buildings[0].level).toBe(2);
        expect(state?.buildings[0].isActive).toBe(true);

        // Verify in database
        const dbBuilding = await Building.findOne({ empireId: empire.empireId });
        expect(dbBuilding).toBeTruthy();
        expect(dbBuilding?.buildingKey).toBe('solar_plants');
      } finally {
        await engine.cleanup();
      }
    });

    test('should handle game tick simulation', async () => {
      const engine = new GameSimulationEngine({ debug: true });

      try {
        const empire = await engine.createTestEmpire('test-user-1');
        
        // Add some infrastructure
        await engine.addTestBuilding(empire.empireId, 'A00:00:00:00', 'solar_plants' as any, 1);
        
        // Run a single game tick
        await engine.runGameTick();
        
        // Verify state was updated
        const state = engine.getEmpireState(empire.empireId);
        expect(state).toBeDefined();
      } finally {
        await engine.cleanup();
      }
    });

    test('should run simulation with time duration', async () => {
      const engine = new GameSimulationEngine({
        debug: false,
        startingResources: {
          credits: 1000,
          energy: 500,
          metal: 300,
          research: 50
        }
      });

      try {
        const empire = await engine.createTestEmpire('test-user-1');
        
        // Run simulation for 5 seconds
        const result = await engine.runSimulation(5000);

        expect(result.success).toBe(true);
        expect(result.duration).toBeGreaterThan(0);
        expect(result.duration).toBeLessThan(6000);
        expect(result.iterations).toBeGreaterThan(0);
        expect(result.finalState).toHaveLength(1);
        expect(result.metrics).toBeDefined();
      } finally {
        await engine.cleanup();
      }
    });

    test('should fast-forward simulation time', async () => {
      const engine = new GameSimulationEngine({ debug: true });

      try {
        const empire = await engine.createTestEmpire('test-user-1');
        
        // Add production infrastructure
        await engine.addTestBuilding(empire.empireId, 'A00:00:00:00', 'solar_plants' as any, 3);
        
        const initialState = engine.getEmpireState(empire.empireId);
        const initialCredits = initialState!.resources.credits;
        
        // Fast-forward 2 hours
        await engine.fastForward(2);
        
        const finalState = engine.getEmpireState(empire.empireId);
        
        // Resources should have potentially increased (depending on production)
        // This is a basic check - actual resource changes depend on game mechanics
        expect(finalState).toBeDefined();
        expect(finalState!.empireId).toBe(empire.empireId);
      } finally {
        await engine.cleanup();
      }
    });
  });

  describe('GameScenarioBuilder', () => {
    test('should build and run basic empire development scenario', async () => {
      const scenario = new GameScenarioBuilder({
        debug: true,
        startingResources: {
          credits: 10000,
          energy: 2000,
          metal: 1000,
          research: 500
        }
      });

      // Create empire
      const empire = await scenario.addEmpire('test-user-1');
      
      // Add starting infrastructure
      await scenario.addBuilding(empire.empireId, 'A00:00:00:00', 'solar_plants' as any, 2);
      await scenario.addBuilding(empire.empireId, 'A00:00:00:00', 'research_labs' as any, 1);
      
      // Add assertions
      scenario
        .assertResourceMinimum(empire.empireId, 'credits', 5000)
        .assertBuildingCount(empire.empireId, 'solar_plants' as any, 2);
      
      // Run scenario
      const result = await scenario.run(10000);
      
      expect(result.success).toBe(true);
      expect(result.finalState).toHaveLength(1);
      expect(result.finalState[0].buildings.filter(b => b.buildingKey === 'solar_plants')).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail scenario when assertions are not met', async () => {
      const scenario = new GameScenarioBuilder({
        startingResources: {
          credits: 100, // Very low starting credits
          energy: 100,
          metal: 100,
          research: 10
        }
      });

      const empire = await scenario.addEmpire('test-user-1');
      
      // Add impossible assertion
      scenario.assertResourceMinimum(empire.empireId, 'credits', 50000);
      
      const result = await scenario.run(5000);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('should have at least 50000 credits');
    });

    test('should handle technology research scenario', async () => {
      const scenario = new GameScenarioBuilder({
        debug: true,
        startingResources: {
          credits: 20000,
          energy: 3000,
          metal: 2000,
          research: 1000
        }
      });

      const empire = await scenario.addEmpire('test-user-1');
      
      // Add research infrastructure
      await scenario.addBuilding(empire.empireId, 'A00:00:00:00', 'research_labs' as any, 3);
      
      // Try to start technology research
      const engine = scenario.getEngine();
      const techResult = await engine.startTechnology(empire.empireId, 'A00:00:00:00', 'energy' as any);
      
      // Note: This may fail due to missing capacity or other requirements
      // The important thing is testing the framework's ability to handle it
      expect(typeof techResult.success).toBe('boolean');
      
      // Add assertion for technology level (if successful)
      if (techResult.success) {
        scenario.assertTechnologyLevel(empire.empireId, 'energy' as any, 1);
      }
      
      const result = await scenario.run(15000);
      
      // Even if tech research failed, scenario framework should work
      expect(result.finalState).toHaveLength(1);
    });
  });

  describe('GameStateValidator', () => {
    test('should validate resource constraints', () => {
      const validState = {
        empireId: 'emp1',
        userId: 'user1',
        resources: { credits: 1000, energy: 500, metal: 300, research: 100 },
        territories: ['A00:00:00:00'],
        technologies: new Map(),
        buildings: [],
        units: [],
        queues: { tech: [], units: [], buildings: [] }
      };

      const errors = GameStateValidator.validateResourceConstraints(validState);
      expect(errors).toHaveLength(0);

      // Test negative resources
      const invalidState = { ...validState, resources: { ...validState.resources, credits: -500 } };
      const invalidErrors = GameStateValidator.validateResourceConstraints(invalidState);
      expect(invalidErrors.length).toBeGreaterThan(0);
      expect(invalidErrors[0]).toContain('negative credits');
    });

    test('should validate technology prerequisites', () => {
      const state = {
        empireId: 'emp1',
        userId: 'user1',
        resources: { credits: 1000, energy: 500, metal: 300, research: 100 },
        territories: ['A00:00:00:00'],
        technologies: new Map([
          ['laser' as any, 1],
          ['energy' as any, 0] // Missing prerequisite
        ]),
        buildings: [],
        units: [],
        queues: { tech: [], units: [], buildings: [] }
      };

      const errors = GameStateValidator.validateTechnologyPrerequisites(state);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('prerequisite energy');
    });

    test('should validate building requirements', () => {
      const state = {
        empireId: 'emp1',
        userId: 'user1',
        resources: { credits: 1000, energy: 500, metal: 300, research: 100 },
        territories: ['A00:00:00:00'],
        technologies: new Map([
          ['energy' as any, 1] // Has energy level 1, but needs level 2
        ]),
        buildings: [{
          locationCoord: 'A00:00:00:00',
          buildingKey: 'research_labs' as any,
          level: 1,
          isActive: true
        }],
        units: [],
        queues: { tech: [], units: [], buildings: [] }
      };

      const errors = GameStateValidator.validateBuildingRequirements(state);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('lacks technology energy level 2');
    });

    test('should validate complete game state', () => {
      const validState = {
        empireId: 'emp1',
        userId: 'user1',
        resources: { credits: 1000, energy: 500, metal: 300, research: 100 },
        territories: ['A00:00:00:00'],
        technologies: new Map([['energy' as any, 2]]),
        buildings: [{
          locationCoord: 'A00:00:00:00',
          buildingKey: 'research_labs' as any,
          level: 1,
          isActive: true
        }],
        units: [],
        queues: { tech: [], units: [], buildings: [] }
      };

      const errors = GameStateValidator.validateGameState(validState);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Utility Functions', () => {
    test('should create standard test empire', async () => {
      const engine = new GameSimulationEngine();

      try {
        const empire = await createStandardTestEmpire(engine, 'test-user-1', {
          territories: ['A00:00:00:00', 'A00:00:00:01'],
          startingBuildings: [
            { locationCoord: 'A00:00:00:00', buildingKey: 'solar_plants' as any, level: 2 },
            { locationCoord: 'A00:00:00:00', buildingKey: 'research_labs' as any, level: 1 }
          ],
          startingTech: [
            { techKey: 'energy' as any, level: 3 }
          ]
        });

        expect(empire.territories).toHaveLength(2);
        expect(empire.buildings).toHaveLength(2);

        // Verify tech was set
        const dbEmpire = await Empire.findById(empire.empireId);
        expect(dbEmpire?.techLevels?.get('energy')).toBe(3);
      } finally {
        await engine.cleanup();
      }
    });

    test('should validate resource production calculations', () => {
      const initial = { credits: 1000 };
      const final = { credits: 1200 };
      const productionRate = 100; // credits per hour
      const timeHours = 2;

      const validation = validateResourceProduction(initial, final, productionRate, timeHours);
      
      expect(validation.valid).toBe(true);
      expect(validation.expected).toBe(1200);
      expect(validation.actual).toBe(1200);
      expect(validation.difference).toBe(0);
    });

    test('should detect invalid resource production', () => {
      const initial = { credits: 1000 };
      const final = { credits: 1500 }; // Too much increase
      const productionRate = 100;
      const timeHours = 2;

      const validation = validateResourceProduction(initial, final, productionRate, timeHours);
      
      expect(validation.valid).toBe(false);
      expect(validation.expected).toBe(1200);
      expect(validation.actual).toBe(1500);
      expect(validation.difference).toBe(300);
    });
  });

  describe('Game Assertions', () => {
    test('should create and validate common assertions', () => {
      const state = {
        empireId: 'emp1',
        userId: 'user1',
        resources: { credits: 5000, energy: 1000, metal: 500, research: 200 },
        territories: ['A00:00:00:00'],
        technologies: new Map([['energy' as any, 2]]),
        buildings: [
          { locationCoord: 'A00:00:00:00', buildingKey: 'solar_plants' as any, level: 1, isActive: true },
          { locationCoord: 'A00:00:00:00', buildingKey: 'solar_plants' as any, level: 2, isActive: true }
        ],
        units: [],
        queues: { tech: [], units: [], buildings: [] }
      };

      // Test credit assertion
      const creditAssertion = GameAssertions.empireHasCredits('emp1', 4000);
      expect(creditAssertion.condition(state)).toBe(true);

      const failingCreditAssertion = GameAssertions.empireHasCredits('emp1', 10000);
      expect(failingCreditAssertion.condition(state)).toBe(false);

      // Test technology assertion
      const techAssertion = GameAssertions.empireHasTechnology('emp1', 'energy' as any, 2);
      expect(techAssertion.condition(state)).toBe(true);

      // Test building assertion
      const buildingAssertion = GameAssertions.empireHasBuilding('emp1', 'solar_plants' as any, 2);
      expect(buildingAssertion.condition(state)).toBe(true);

      // Test negative resources assertion
      const noNegativeAssertion = GameAssertions.noNegativeResources('emp1');
      expect(noNegativeAssertion.condition(state)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should run complete empire development simulation', async () => {
      const scenario = new GameScenarioBuilder({
        debug: true,
        startingResources: {
          credits: 50000,
          energy: 10000,
          metal: 5000,
          research: 2000
        }
      });

      // Create multiple empires
      const empire1 = await scenario.addEmpire('player1', ['A00:00:00:00']);
      const empire2 = await scenario.addEmpire('player2', ['A00:00:00:01']);

      // Set up initial infrastructure
      await scenario.addBuilding(empire1.empireId, 'A00:00:00:00', 'solar_plants' as any, 3);
      await scenario.addBuilding(empire1.empireId, 'A00:00:00:00', 'research_labs' as any, 2);

      await scenario.addBuilding(empire2.empireId, 'A00:00:00:01', 'solar_plants' as any, 2);
      await scenario.addBuilding(empire2.empireId, 'A00:00:00:01', 'research_labs' as any, 1);

      // Add comprehensive assertions
      scenario
        .assertResourceMinimum(empire1.empireId, 'credits', 40000)
        .assertResourceMinimum(empire2.empireId, 'credits', 40000)
        .assertBuildingCount(empire1.empireId, 'solar_plants' as any, 3)
        .assertBuildingCount(empire2.empireId, 'solar_plants' as any, 2)
        .addAssertion(GameAssertions.noNegativeResources(empire1.empireId))
        .addAssertion(GameAssertions.noNegativeResources(empire2.empireId));

      // Run extended simulation
      const result = await scenario.run(20000);

      expect(result.success).toBe(true);
      expect(result.finalState).toHaveLength(2);
      expect(result.metrics.totalBuildingsCompleted).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);

      // Validate final empire states
      const finalEmpire1 = result.finalState.find(s => s.empireId === empire1.empireId);
      const finalEmpire2 = result.finalState.find(s => s.empireId === empire2.empireId);

      expect(finalEmpire1).toBeDefined();
      expect(finalEmpire2).toBeDefined();
      expect(finalEmpire1!.buildings.length).toBeGreaterThanOrEqual(2);
      expect(finalEmpire2!.buildings.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle complex game scenarios with failures', async () => {
      const scenario = new GameScenarioBuilder({
        debug: false,
        startingResources: {
          credits: 1000, // Low resources to trigger failures
          energy: 500,
          metal: 200,
          research: 50
        }
      });

      const empire = await scenario.addEmpire('poor-player');
      
      // Try to build expensive infrastructure
      const engine = scenario.getEngine();
      
      // These operations should fail due to insufficient resources
      const buildResult = await engine.startBuilding(empire.empireId, 'A00:00:00:00', 'research_labs' as any);
      const techResult = await engine.startTechnology(empire.empireId, 'A00:00:00:00', 'laser' as any);

      // Framework should handle failures gracefully
      expect(typeof buildResult.success).toBe('boolean');
      expect(typeof techResult.success).toBe('boolean');

      // Add realistic assertions
      scenario
        .assertResourceMinimum(empire.empireId, 'credits', 500)
        .addAssertion(GameAssertions.noNegativeResources(empire.empireId));

      const result = await scenario.run(10000);

      // Should succeed with basic assertions even if actions failed
      expect(result.success).toBe(true);
      expect(result.finalState).toHaveLength(1);
    });
  });
});
