# Attrition Game Architecture Standards

## Overview

This document establishes architecture standards specific to the Attrition space strategy game, focusing on real-time multiplayer game development, service-oriented design, and performance optimization for large-scale strategy gaming.

## Game Architecture Principles

### Real-time System Architecture

#### WebSocket Communication Patterns
- **Event-driven messaging** for real-time updates:
  ```typescript
  // Game event types
  type GameEvent =
    | { type: 'EMPIRE_UPDATE'; empireId: string; changes: Partial<Empire> }
    | { type: 'BATTLE_RESULT'; battleId: string; result: BattleOutcome }
    | { type: 'RESOURCE_UPDATE'; empireId: string; resources: ResourceState };

  // WebSocket message handler
  class GameEventHandler {
    handleMessage(message: GameEvent): void {
      switch (message.type) {
        case 'EMPIRE_UPDATE':
          this.updateEmpireDisplay(message.empireId, message.changes);
          break;
        case 'BATTLE_RESULT':
          this.displayBattleResult(message.result);
          break;
        // ... other event types
      }
    }
  }
  ```

#### State Synchronization Strategy
- **Optimistic updates** for responsive UI:
  ```typescript
  async function executeGameAction(action: GameAction) {
    // Optimistic update
    const optimisticResult = applyOptimisticUpdate(action);

    try {
      // Server request
      const serverResult = await sendToServer(action);

      // Confirm or rollback
      if (serverResult.success) {
        confirmOptimisticUpdate(optimisticResult);
      } else {
        rollbackOptimisticUpdate(optimisticResult);
      }
    } catch (error) {
      rollbackOptimisticUpdate(optimisticResult);
      showErrorMessage(error);
    }
  }
  ```

### Service-Oriented Game Architecture

#### Service Layer Separation
- **HTTP Controllers**: Handle requests, validation, responses only
- **Business Services**: Game logic, calculations, state management
- **Data Services**: Database operations, external API calls

#### Game Entity Services
```typescript
// Empire Management Service
export class EmpireManagementService {
  static async getEmpire(empireId: string): Promise<Empire> {
    return await database.empires.findById(empireId);
  }

  static async updateResources(empireId: string, resources: ResourceDelta): Promise<void> {
    const empire = await this.getEmpire(empireId);

    // Business logic for resource updates
    const updatedResources = calculateNewResourceState(empire.resources, resources);

    await database.empires.update(empireId, { resources: updatedResources });
    await this.notifyResourceChange(empireId, resources);
  }
}

// Resource Calculation Service
export class ResourceCalculationService {
  static calculateProductionRate(empire: Empire): ResourceRates {
    const baseRate = this.getBaseProductionRate(empire);
    const modifiers = this.getProductionModifiers(empire);

    return {
      metal: baseRate.metal * modifiers.research,
      crystal: baseRate.crystal * modifiers.research,
      deuterium: baseRate.deuterium * modifiers.research,
      energy: baseRate.energy * modifiers.buildings
    };
  }
}
```

## Game Loop Architecture

### Real-time Game Loop
- **Multiple time scales**:
  - **10-second intervals**: Resource production, building completion
  - **60-second intervals**: Research progress, unit training
  - **5-minute intervals**: Fleet movements, battle resolution

#### Game Loop Service
```typescript
export class GameLoopService {
  private timers: Map<GameInterval, NodeJS.Timeout> = new Map();

  start(): void {
    // 10-second game loop
    this.timers.set(GameInterval.COMPLETION, setInterval(() => {
      this.processCompletions();
    }, 10 * 1000));

    // 60-second game loop
    this.timers.set(GameInterval.RESOURCE, setInterval(() => {
      this.processResourceUpdates();
    }, 60 * 1000));

    // 5-minute game loop
    this.timers.set(GameInterval.MAINTENANCE, setInterval(() => {
      this.processMaintenanceTasks();
    }, 5 * 60 * 1000));
  }

  stop(): void {
    this.timers.forEach(timer => clearInterval(timer));
    this.timers.clear();
  }

  private async processCompletions(): Promise<void> {
    const completedItems = await database.getCompletedItems();

    for (const item of completedItems) {
      await this.handleCompletion(item);
    }
  }
}
```

### Resource Management Architecture

#### Resource State Management
- **Atomic resource updates**:
  ```typescript
  async function updateResources(empireId: string, updates: ResourceUpdate[]): Promise<void> {
    return await database.transaction(async (client) => {
      // Lock empire for atomic updates
      const empire = await client.empires.findById(empireId).forUpdate();

      // Calculate new resource state
      const newResources = calculateResourceDelta(empire.resources, updates);

      // Update atomically
      await client.empires.update(empireId, { resources: newResources });

      // Log transaction
      await client.resourceLedger.logTransaction(empireId, updates);
    });
  }
  ```

#### Production Calculation Engine
```typescript
export class ProductionEngine {
  static calculateHourlyProduction(empire: Empire): ResourceRates {
    const buildings = empire.buildings;
    const research = empire.research;

    return {
      metal: this.calculateMineProduction(buildings.mines, research.mining),
      crystal: this.calculateCrystalMineProduction(buildings.crystalMines, research.mining),
      deuterium: this.calculateSynthesizerProduction(buildings.synthesizers, research.plasma),
      energy: this.calculateSolarProduction(buildings.solarPlants, research.energy)
    };
  }

  private static calculateMineProduction(level: number, miningTech: number): number {
    const baseProduction = 30 * level * Math.pow(1.1, level);
    const techMultiplier = 1 + (miningTech * 0.1);

    return Math.floor(baseProduction * techMultiplier);
  }
}
```

## Multiplayer Architecture

### Synchronization Patterns
- **Server authoritative** state management:
  ```typescript
  class GameStateManager {
    private gameState: Map<string, GameEntity> = new Map();

    // Client sends action
    async handleClientAction(action: ClientAction): Promise<void> {
      // Validate action
      if (!this.validateAction(action)) {
        throw new InvalidActionError('Action not allowed');
      }

      // Apply server-side
      const newState = await this.applyAction(action);

      // Broadcast to all clients
      await this.broadcastStateUpdate(action.entityId, newState);
    }
  }
  ```

### Battle System Architecture
- **Asynchronous battle resolution**:
  ```typescript
  export class BattleEngine {
    async resolveBattle(battleId: string): Promise<BattleResult> {
      const battle = await database.battles.findById(battleId);

      // Simulate battle in background
      const result = await this.simulateBattle(battle);

      // Update participants
      await this.updateBattleParticipants(battle, result);

      // Notify clients
      await this.notifyBattleResult(battleId, result);

      return result;
    }

    private async simulateBattle(battle: Battle): Promise<BattleResult> {
      // Turn-based or real-time battle simulation
      const rounds = await this.runBattleSimulation(battle);

      return this.calculateBattleOutcome(rounds);
    }
  }
  ```

## Database Architecture Standards

### Supabase Integration Patterns
- **Row Level Security (RLS)** for data protection:
  ```sql
  -- Enable RLS on empires table
  ALTER TABLE empires ENABLE ROW LEVEL SECURITY;

  -- Policy: Users can only access their own empire
  CREATE POLICY "Users can access own empire" ON empires
    FOR ALL USING (auth.uid() = user_id);
  ```

#### Query Optimization
- **Efficient count queries**:
  ```typescript
  // ✅ Good - uses head: true for count only
  const { count } = await supabase
    .from('buildings')
    .select('*', { count: 'exact', head: true })
    .eq('empire_id', empireId);

  // ✅ Good - database-level pagination
  const { data: buildings } = await supabase
    .from('buildings')
    .select('*')
    .eq('empire_id', empireId)
    .range(offset, offset + limit - 1);
  ```

#### Real-time Subscriptions
- **Targeted subscriptions** for specific game events:
  ```typescript
  // Subscribe to empire changes only
  const empireSubscription = supabase
    .channel('empire-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'empires',
        filter: `id=eq.${empireId}`
      },
      (payload) => handleEmpireChange(payload)
    )
    .subscribe();
  ```

## Performance Standards

### Game Loop Performance
- **Sub-millisecond processing** for real-time responsiveness:
  ```typescript
  class PerformanceMonitor {
    @MeasureExecutionTime()
    async processResourceUpdates(): Promise<void> {
      const empires = await this.getActiveEmpires();

      for (const empire of empires) {
        await this.updateEmpireResources(empire);
      }
    }
  }
  ```

### Memory Management
- **Object pooling** for game entities:
  ```typescript
  class EntityPool {
    private static pool: Map<string, GameEntity[]> = new Map();

    static getEntity(type: EntityType): GameEntity {
      const entities = this.pool.get(type) || [];

      if (entities.length > 0) {
        return entities.pop()!;
      }

      return this.createNewEntity(type);
    }

    static returnEntity(entity: GameEntity): void {
      entity.reset(); // Clear entity state
      const entities = this.pool.get(entity.type) || [];
      entities.push(entity);
      this.pool.set(entity.type, entities);
    }
  }
  ```

## Security Architecture

### Game State Security
- **Server-side validation** for all game actions:
  ```typescript
  class GameActionValidator {
    static validateAction(action: GameAction, empire: Empire): boolean {
      // Check resource availability
      if (action.cost && !this.hasRequiredResources(empire, action.cost)) {
        return false;
      }

      // Check technology requirements
      if (action.requiredTech && !this.hasRequiredTechnology(empire, action.requiredTech)) {
        return false;
      }

      // Check building requirements
      if (action.requiredBuildings && !this.hasRequiredBuildings(empire, action.requiredBuildings)) {
        return false;
      }

      return true;
    }
  }
  ```

### Anti-Cheat Measures
- **Input validation** at multiple layers:
  - Client-side: Basic format validation
  - Server-side: Business logic validation
  - Database: Constraint validation
- **Rate limiting** for game actions to prevent automation

## Scalability Standards

### Horizontal Scaling Support
- **Stateless services** for easy replication:
  ```typescript
  @Injectable()
  export class GameService {
    // No instance state - all data from database
    async processGameAction(action: GameAction): Promise<GameResult> {
      const empire = await this.getEmpireFromDatabase(action.empireId);
      // Process action...
    }
  }
  ```

### Database Scaling
- **Read replicas** for non-critical queries:
  ```typescript
  class DatabaseService {
    async getEmpireStats(empireId: string): Promise<EmpireStats> {
      // Use read replica for stats queries
      return await this.readReplica.query(
        'SELECT * FROM empire_stats WHERE empire_id = $1',
        [empireId]
      );
    }
  }
  ```

## Monitoring and Observability

### Game Metrics Collection
- **Performance metrics**:
  ```typescript
  interface GameMetrics {
    averageResponseTime: number;
    actionsPerSecond: number;
    concurrentBattles: number;
    resourceCalculationTime: number;
    databaseQueryTime: number;
  }
  ```

### Error Tracking
- **Game-specific error classification**:
  ```typescript
  enum ErrorSeverity {
    LOW = 'low',       // Non-critical, doesn't affect gameplay
    MEDIUM = 'medium', // Affects single player experience
    HIGH = 'high',     // Affects multiple players
    CRITICAL = 'critical' // Breaks core game functionality
  }
  ```

## Best Practices Summary

### Do
- ✅ Use service-oriented architecture for game logic
- ✅ Implement optimistic updates for responsive UI
- ✅ Use atomic transactions for resource updates
- ✅ Implement proper error handling at all levels
- ✅ Design stateless services for scalability
- ✅ Use Row Level Security for data protection

### Don't
- ❌ Store game state in memory for extended periods
- ❌ Use synchronous operations in game loops
- ❌ Mix HTTP concerns with business logic
- ❌ Ignore race conditions in multiplayer scenarios
- ❌ Skip input validation at any layer
- ❌ Use client-side validation as sole security measure

## References

- [Game Programming Patterns](http://gameprogrammingpatterns.com/)
- [Real-time Multiplayer Game Architecture](https://gafferongames.com/)
- [Supabase Real-time Documentation](https://supabase.com/docs/guides/realtime)
- [Node.js Game Server Best Practices](https://nodejs.org/en/docs/guides/)

## Version History

- **v1.0**: Initial game architecture standards
- **v1.1**: Added real-time system patterns and WebSocket standards
- **v1.2**: Enhanced service-oriented architecture guidelines

## Last Updated

2025-10-10