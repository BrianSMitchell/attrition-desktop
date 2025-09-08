# Game Simulation and State Testing Framework

## 📋 Table of Contents

- [Introduction](#introduction)
- [Core Concepts](#core-concepts)
- [Framework Components](#framework-components)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Testing Patterns](#testing-patterns)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)
- [Extension Points](#extension-points)

---

## 🎯 Introduction

The Game Simulation and State Testing Framework provides comprehensive tools for testing Attrition's complex game mechanics, including:

- **State Management Testing**: Validate empire states, resource flows, and game progression
- **Resource Calculation Validation**: Test production, consumption, and balance mechanics
- **Turn-Based Logic Testing**: Simulate game turns and time-based events
- **Scenario Testing**: Run complete game scenarios with multiple players
- **Game Balance Testing**: Validate that game mechanics work as intended

### Key Benefits

- **Isolated Testing**: Test game logic without UI dependencies
- **Time Control**: Fast-forward or control simulation time for efficient testing
- **State Validation**: Comprehensive validation of game state integrity
- **Scenario Automation**: Automated testing of complex game scenarios
- **Performance Monitoring**: Track resource usage and game performance metrics

---

## 🏗️ Core Concepts

### Game Simulation Engine

The core engine manages:
- Empire creation and management
- Game loop execution
- Time acceleration and fast-forwarding
- State synchronization between memory and database
- Metrics collection and reporting

### Empire Test State

Represents a complete empire state for testing:

```typescript
interface EmpireTestState {
  empireId: string;
  userId: string;
  resources: ResourceCost & { energy: number; metal: number; research: number };
  territories: string[];
  technologies: Map<TechnologyKey, number>;
  buildings: BuildingTestState[];
  units: UnitTestState[];
  queues: {
    tech: TechQueueState[];
    units: UnitQueueState[];
    buildings: BuildingQueueState[];
  };
}
```

### Game Assertions

Declarative conditions that validate game state:

```typescript
interface GameAssertion {
  type: 'resource' | 'technology' | 'building' | 'unit' | 'queue' | 'custom';
  empireId?: string;
  condition: (state: EmpireTestState) => boolean;
  description: string;
  required?: boolean;
}
```

---

## 🔧 Framework Components

### 1. GameSimulationEngine

The main engine for running game simulations.

```typescript
const engine = new GameSimulationEngine({
  startingResources: {
    credits: 10000,
    energy: 1000,
    metal: 1000,
    research: 100
  },
  timeAcceleration: 1000,
  maxSimulationTime: 60000,
  debug: true
});
```

**Key Methods:**
- `createTestEmpire(userId, territories)`: Create a test empire
- `addTestBuilding(empireId, location, buildingKey, level)`: Add buildings
- `startTechnology(empireId, location, techKey)`: Start research
- `runSimulation(duration, assertions)`: Run simulation with validation
- `fastForward(hours)`: Skip time forward
- `cleanup()`: Clean up test data

### 2. GameScenarioBuilder

High-level builder for creating and running game scenarios.

```typescript
const scenario = new GameScenarioBuilder({
  debug: true,
  startingResources: { credits: 50000, energy: 5000, metal: 2000, research: 500 }
});

// Build scenario
const empire = await scenario.addEmpire('player1');
await scenario.addBuilding(empire.empireId, 'A00:00:00:00', 'solar_plants', 3);

// Add assertions
scenario
  .assertResourceMinimum(empire.empireId, 'credits', 40000)
  .assertBuildingCount(empire.empireId, 'solar_plants', 3);

// Run scenario
const result = await scenario.run(30000);
```

### 3. GameStateValidator

Validates game state integrity and constraints.

```typescript
const errors = GameStateValidator.validateGameState(empireState);
if (errors.length > 0) {
  console.error('Game state validation failed:', errors);
}
```

**Validation Types:**
- Resource constraints (no negative resources)
- Technology prerequisites
- Building requirements
- Unit production requirements

### 4. Common Assertions

Pre-built assertions for common game conditions.

```typescript
// Resource assertions
GameAssertions.empireHasCredits(empireId, minimum);
GameAssertions.noNegativeResources(empireId);

// Technology assertions  
GameAssertions.empireHasTechnology(empireId, techKey, level);

// Building assertions
GameAssertions.empireHasBuilding(empireId, buildingKey, count);
```

---

## 💡 Usage Examples

### Basic Empire Testing

```typescript
describe('Empire Resource Management', () => {
  test('should generate resources over time', async () => {
    const engine = new GameSimulationEngine({
      startingResources: { credits: 1000, energy: 500, metal: 300, research: 100 }
    });

    try {
      // Create empire with production buildings
      const empire = await engine.createTestEmpire('player1');
      await engine.addTestBuilding(empire.empireId, 'A00:00:00:00', 'solar_plants', 3);
      await engine.addTestBuilding(empire.empireId, 'A00:00:00:00', 'metal_mines', 2);

      // Record initial resources
      const initialState = engine.getEmpireState(empire.empireId);
      const initialCredits = initialState!.resources.credits;

      // Fast-forward time
      await engine.fastForward(2); // 2 hours

      // Check resource increases
      const finalState = engine.getEmpireState(empire.empireId);
      expect(finalState!.resources.credits).toBeGreaterThan(initialCredits);
    } finally {
      await engine.cleanup();
    }
  });
});
```

### Technology Research Testing

```typescript
describe('Technology Research', () => {
  test('should complete research and unlock building', async () => {
    const scenario = new GameScenarioBuilder({
      startingResources: { credits: 20000, energy: 5000, metal: 2000, research: 1000 }
    });

    // Setup empire with research infrastructure
    const empire = await scenario.addEmpire('researcher');
    await scenario.addBuilding(empire.empireId, 'A00:00:00:00', 'research_labs', 5);

    // Start research
    const engine = scenario.getEngine();
    await engine.startTechnology(empire.empireId, 'A00:00:00:00', 'advanced_materials');

    // Add assertions
    scenario
      .assertTechnologyLevel(empire.empireId, 'advanced_materials', 1)
      .assertResourceMinimum(empire.empireId, 'credits', 10000);

    // Run scenario with enough time for research
    const result = await scenario.run(60000); // 1 minute

    expect(result.success).toBe(true);
    expect(result.finalState[0].technologies.get('advanced_materials')).toBeGreaterThanOrEqual(1);
  });
});
```

### Multi-Player Scenario Testing

```typescript
describe('Multi-Player Scenarios', () => {
  test('should handle multiple empires competing for resources', async () => {
    const scenario = new GameScenarioBuilder({
      startingResources: { credits: 15000, energy: 3000, metal: 1500, research: 300 }
    });

    // Create competing empires
    const player1 = await scenario.addEmpire('player1', ['A00:00:00:00']);
    const player2 = await scenario.addEmpire('player2', ['A00:00:00:01']);

    // Set up different strategies
    await scenario.addBuilding(player1.empireId, 'A00:00:00:00', 'solar_plants', 4); // Energy focus
    await scenario.addBuilding(player1.empireId, 'A00:00:00:00', 'research_labs', 2);

    await scenario.addBuilding(player2.empireId, 'A00:00:00:01', 'metal_mines', 4); // Metal focus
    await scenario.addBuilding(player2.empireId, 'A00:00:00:01', 'factories', 3);

    // Add balanced assertions
    scenario
      .assertResourceMinimum(player1.empireId, 'credits', 10000)
      .assertResourceMinimum(player2.empireId, 'credits', 10000)
      .addAssertion(GameAssertions.noNegativeResources(player1.empireId))
      .addAssertion(GameAssertions.noNegativeResources(player2.empireId));

    // Run competitive scenario
    const result = await scenario.run(45000);

    expect(result.success).toBe(true);
    expect(result.finalState).toHaveLength(2);
    expect(result.metrics.totalBuildingsCompleted).toBeGreaterThan(6);
  });
});
```

### Game Balance Testing

```typescript
describe('Game Balance Validation', () => {
  test('should maintain economic balance across different strategies', async () => {
    const strategies = [
      { name: 'Energy Focus', buildings: [['solar_plants', 5], ['research_labs', 2]] },
      { name: 'Metal Focus', buildings: [['metal_mines', 5], ['factories', 2]] },
      { name: 'Balanced', buildings: [['solar_plants', 3], ['metal_mines', 2], ['research_labs', 2]] }
    ];

    const results = [];

    for (const strategy of strategies) {
      const scenario = new GameScenarioBuilder({
        startingResources: { credits: 25000, energy: 4000, metal: 2000, research: 500 }
      });

      const empire = await scenario.addEmpire(`${strategy.name.toLowerCase()}-player`);
      
      for (const [building, level] of strategy.buildings) {
        await scenario.addBuilding(empire.empireId, 'A00:00:00:00', building as any, level as number);
      }

      const result = await scenario.run(30000);
      results.push({
        strategy: strategy.name,
        finalCredits: result.finalState[0].resources.credits,
        buildingsCompleted: result.metrics.totalBuildingsCompleted,
        resourceGeneration: result.metrics.averageResourceGenerationPerHour
      });
    }

    // Validate balance - no strategy should be overwhelmingly dominant
    const creditSpread = Math.max(...results.map(r => r.finalCredits)) - Math.min(...results.map(r => r.finalCredits));
    const maxCredits = Math.max(...results.map(r => r.finalCredits));
    
    // Credit spread should be reasonable (less than 50% of maximum)
    expect(creditSpread / maxCredits).toBeLessThan(0.5);
  });
});
```

### Resource Production Validation

```typescript
describe('Resource Production Calculations', () => {
  test('should calculate production rates accurately', async () => {
    const engine = new GameSimulationEngine({
      debug: true,
      startingResources: { credits: 5000, energy: 1000, metal: 500, research: 200 }
    });

    try {
      const empire = await engine.createTestEmpire('producer');
      
      // Add known production buildings
      await engine.addTestBuilding(empire.empireId, 'A00:00:00:00', 'solar_plants', 2); // +200 energy/hour
      await engine.addTestBuilding(empire.empireId, 'A00:00:00:00', 'credit_banks', 3); // +300 credits/hour

      const initialState = engine.getEmpireState(empire.empireId);
      const initialResources = { ...initialState!.resources };

      // Run for exactly 1 hour of game time
      await engine.fastForward(1);

      const finalState = engine.getEmpireState(empire.empireId);
      const finalResources = { ...finalState!.resources };

      // Validate expected production
      const expectedCreditsPerHour = 300; // Based on building levels
      const validation = validateResourceProduction(
        initialResources,
        finalResources,
        expectedCreditsPerHour,
        1, // 1 hour
        0.05 // 5% tolerance
      );

      expect(validation.valid).toBe(true);
    } finally {
      await engine.cleanup();
    }
  });
});
```

---

## 📚 API Reference

### GameSimulationEngine

#### Constructor Options

```typescript
interface GameSimulationConfig {
  startingResources: {
    credits: number;
    energy: number;
    metal: number;
    research: number;
  };
  timeAcceleration: number;      // Time acceleration factor
  maxSimulationTime: number;     // Maximum simulation time in ms
  debug: boolean;                // Enable debug logging
}
```

#### Core Methods

```typescript
// Empire Management
async createTestEmpire(userId: string, territories?: string[]): Promise<EmpireTestState>
async addTestBuilding(empireId: string, locationCoord: string, buildingKey: BuildingKey, level?: number): Promise<void>

// Game Actions
async startTechnology(empireId: string, locationCoord: string, techKey: TechnologyKey): Promise<ActionResult>
async startBuilding(empireId: string, locationCoord: string, buildingKey: BuildingKey): Promise<ActionResult>
async startUnit(empireId: string, locationCoord: string, unitKey: UnitKey, quantity?: number): Promise<ActionResult>

// Simulation Control
async runSimulation(durationMs: number, assertions?: GameAssertion[]): Promise<GameScenarioResult>
async runGameTick(): Promise<void>
async fastForward(hours: number): Promise<void>

// State Access
getEmpireState(empireId: string): EmpireTestState | undefined
getAllEmpireStates(): EmpireTestState[]

// Cleanup
async cleanup(): Promise<void>
```

### GameScenarioBuilder

#### Fluent API Methods

```typescript
// Empire Setup
async addEmpire(userId: string, territories?: string[]): Promise<EmpireTestState>
async addBuilding(empireId: string, locationCoord: string, buildingKey: BuildingKey, level?: number): Promise<void>

// Assertions (Chainable)
addAssertion(assertion: GameAssertion): GameScenarioBuilder
assertResourceMinimum(empireId: string, resourceType: keyof ResourceCost, minimum: number): GameScenarioBuilder
assertTechnologyLevel(empireId: string, techKey: TechnologyKey, minimumLevel: number): GameScenarioBuilder
assertBuildingCount(empireId: string, buildingKey: BuildingKey, minimumCount: number): GameScenarioBuilder

// Execution
async run(durationMs?: number): Promise<GameScenarioResult>
async fastForward(hours: number): Promise<void>
getEngine(): GameSimulationEngine
```

### GameStateValidator

#### Static Methods

```typescript
static validateResourceConstraints(state: EmpireTestState): string[]
static validateTechnologyPrerequisites(state: EmpireTestState): string[]
static validateBuildingRequirements(state: EmpireTestState): string[]
static validateGameState(state: EmpireTestState): string[]
```

### Result Types

```typescript
interface GameScenarioResult {
  success: boolean;              // Overall success
  duration: number;              // Actual duration in ms
  iterations: number;            // Number of game ticks
  finalState: EmpireTestState[]; // Final empire states
  metrics: GameMetrics;          // Performance metrics
  errors: string[];              // Validation errors
  warnings: string[];            // Non-critical issues
}

interface GameMetrics {
  totalResourcesGenerated: ResourceCost & { energy: number; metal: number; research: number };
  totalResourcesSpent: ResourceCost & { energy: number; metal: number; research: number };
  totalTechnologiesCompleted: number;
  totalBuildingsCompleted: number;
  totalUnitsProduced: number;
  averageResourceGenerationPerHour: number;
  resourceEfficiencyRatio: number;
}
```

---

## 🎯 Testing Patterns

### 1. Progressive Empire Development

Test empires developing through different phases:

```typescript
test('should progress through empire development phases', async () => {
  const scenario = new GameScenarioBuilder();
  const empire = await scenario.addEmpire('progressive-player');

  // Phase 1: Basic infrastructure
  await scenario.addBuilding(empire.empireId, 'A00:00:00:00', 'solar_plants', 1);
  await scenario.fastForward(0.5);

  // Phase 2: Research capability
  await scenario.addBuilding(empire.empireId, 'A00:00:00:00', 'research_labs', 1);
  await scenario.fastForward(1);

  // Phase 3: Advanced production
  const engine = scenario.getEngine();
  await engine.startTechnology(empire.empireId, 'A00:00:00:00', 'advanced_manufacturing');
  
  scenario.assertTechnologyLevel(empire.empireId, 'advanced_manufacturing', 1);
  
  const result = await scenario.run(30000);
  expect(result.success).toBe(true);
});
```

### 2. Resource Constraint Testing

Test behavior under resource limitations:

```typescript
test('should handle resource scarcity gracefully', async () => {
  const scenario = new GameScenarioBuilder({
    startingResources: { credits: 100, energy: 50, metal: 25, research: 10 }
  });

  const empire = await scenario.addEmpire('poor-player');
  
  // Attempts should fail due to insufficient resources
  const engine = scenario.getEngine();
  const buildResult = await engine.startBuilding(empire.empireId, 'A00:00:00:00', 'research_labs');
  
  expect(buildResult.success).toBe(false);
  expect(buildResult.reasons).toContain('insufficient_credits');
});
```

### 3. Time-Based Event Testing

Test events that occur over time:

```typescript
test('should handle time-based research completion', async () => {
  const engine = new GameSimulationEngine({ debug: true });
  
  try {
    const empire = await engine.createTestEmpire('researcher');
    await engine.addTestBuilding(empire.empireId, 'A00:00:00:00', 'research_labs', 3);
    
    // Start research with known completion time
    const techResult = await engine.startTechnology(empire.empireId, 'A00:00:00:00', 'energy');
    expect(techResult.success).toBe(true);
    
    // Fast-forward past completion time
    const completionHours = techResult.data.etaMinutes / 60;
    await engine.fastForward(completionHours + 0.1);
    
    // Technology should be completed
    const finalState = engine.getEmpireState(empire.empireId);
    expect(finalState!.technologies.get('energy')).toBeGreaterThanOrEqual(1);
  } finally {
    await engine.cleanup();
  }
});
```

### 4. State Consistency Validation

Test that game state remains consistent:

```typescript
test('should maintain state consistency throughout simulation', async () => {
  const engine = new GameSimulationEngine();
  
  try {
    const empire = await engine.createTestEmpire('consistent-player');
    
    // Run simulation with state validation
    const result = await engine.runSimulation(10000, [
      GameAssertions.noNegativeResources(empire.empireId),
      {
        type: 'custom',
        empireId: empire.empireId,
        condition: (state) => {
          const errors = GameStateValidator.validateGameState(state);
          return errors.length === 0;
        },
        description: 'Game state should remain valid',
        required: true
      }
    ]);
    
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  } finally {
    await engine.cleanup();
  }
});
```

---

## ⚡ Performance Considerations

### Memory Management

- **Empire Cleanup**: Always call `cleanup()` after tests
- **State Caching**: Framework caches empire states for performance
- **Database Cleanup**: Automatically removes test data

```typescript
// Always use try/finally for cleanup
const engine = new GameSimulationEngine();
try {
  // Test logic here
} finally {
  await engine.cleanup();
}
```

### Time Acceleration

- **Fast-Forward vs Simulation**: Use `fastForward()` for time skips, `runSimulation()` for real-time logic
- **Tick Throttling**: Framework automatically throttles ticks to prevent overwhelming system

```typescript
// Efficient time management
await engine.fastForward(24); // Skip 24 hours instantly
await engine.runSimulation(5000); // Run 5 seconds of real-time simulation
```

### Resource Optimization

- **Shared Resources**: Reuse engines across related tests
- **Minimal Assertions**: Only add necessary assertions
- **Targeted Testing**: Focus tests on specific game aspects

---

## 🔧 Troubleshooting

### Common Issues

#### Test Database Connection

```typescript
// Ensure test database is configured
beforeAll(async () => {
  const mongoUri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/attrition-test';
  await mongoose.connect(mongoUri);
});
```

#### Memory Leaks

```typescript
// Always clean up resources
afterEach(async () => {
  await engine?.cleanup();
});
```

#### Timing Issues

```typescript
// Use appropriate timeouts for operations
const result = await engine.runSimulation(30000); // 30 second timeout
```

### Debug Mode

Enable debug mode for detailed logging:

```typescript
const engine = new GameSimulationEngine({ debug: true });
```

### State Validation Errors

```typescript
// Add comprehensive state validation
const errors = GameStateValidator.validateGameState(empireState);
if (errors.length > 0) {
  console.error('State validation failed:', errors);
}
```

---

## 🔌 Extension Points

### Custom Assertions

```typescript
const customAssertion: GameAssertion = {
  type: 'custom',
  empireId: 'emp1',
  condition: (state) => {
    // Custom validation logic
    return state.buildings.filter(b => b.level > 5).length >= 3;
  },
  description: 'Empire should have at least 3 high-level buildings',
  required: true
};
```

### Custom Metrics

```typescript
class ExtendedGameSimulationEngine extends GameSimulationEngine {
  private customMetrics = {
    diplomaticActions: 0,
    tradeVolume: 0
  };

  protected updateMetrics(): void {
    super.updateMetrics();
    // Add custom metric calculations
  }
}
```

### Event Hooks

```typescript
class HookedGameSimulationEngine extends GameSimulationEngine {
  async runGameTick(): Promise<void> {
    await this.onBeforeTick();
    await super.runGameTick();
    await this.onAfterTick();
  }

  protected async onBeforeTick(): Promise<void> {
    // Custom pre-tick logic
  }

  protected async onAfterTick(): Promise<void> {
    // Custom post-tick logic
  }
}
```

---

## 📋 Best Practices

### Test Organization

```typescript
describe('Game Simulation Tests', () => {
  describe('Empire Development', () => {
    // Group related tests
  });

  describe('Resource Management', () => {
    // Focus on specific aspects
  });
});
```

### Assertion Strategy

```typescript
// Use required assertions for critical game rules
scenario.addAssertion({
  type: 'resource',
  condition: (state) => state.resources.credits >= 0,
  description: 'Credits should never be negative',
  required: true // Test fails if this fails
});

// Use optional assertions for balance validation
scenario.addAssertion({
  type: 'custom',
  condition: (state) => state.buildings.length <= 50,
  description: 'Empire should not have excessive buildings',
  required: false // Warning only
});
```

### Performance Testing

```typescript
test('should maintain performance under load', async () => {
  const engine = new GameSimulationEngine();
  
  try {
    // Create multiple empires
    const empires = await Promise.all([
      engine.createTestEmpire('player1'),
      engine.createTestEmpire('player2'),
      engine.createTestEmpire('player3')
    ]);

    const startTime = Date.now();
    await engine.runSimulation(10000);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(12000); // Should complete within reasonable time
  } finally {
    await engine.cleanup();
  }
});
```

---

**Document Status**: ✅ Active  
**Next Review**: 2024-12-07  
**Owner**: QA Team  
**Contributors**: Game Development Team

---

For questions about the Game Simulation Framework, please refer to the example tests or contact the development team.
