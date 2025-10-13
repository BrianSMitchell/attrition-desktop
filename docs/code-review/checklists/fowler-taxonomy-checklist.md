# Fowler's Taxonomy Code Smell Detection Checklist

## Overview

This checklist provides a structured approach to identifying Martin Fowler's 22 code smells, adapted for Attrition's space strategy game context. Use this checklist during manual code reviews to complement automated tools and ensure code maintainability.

## Legend

- **🔴 Critical**: Must fix - significant impact on maintainability or functionality
- **🟡 Major**: Should fix - meaningful improvement opportunity
- **🟢 Minor**: Nice to fix - cosmetic or minor improvement
- **ℹ️ Info**: Informational - no action required

## 1. Bloaters

Bloaters are code, methods, and classes that have increased to such gargantuan proportions that they are hard to work with.

### 1.1 Long Method
Methods exceeding recommended length thresholds.

**Detection Questions:**
- Does the method exceed 50 lines (excluding comments and empty lines)?
- Does the method perform multiple distinct operations?
- Can the method be broken into smaller, focused methods?
- Does the method have complex conditional logic or loops?

**Game-Specific Context:**
- Service methods handling multiple game mechanics (resource calculation + fleet operations)
- Controller methods with complex game state validation
- Database query methods with multiple joins and transformations

**Examples to Watch:**
```typescript
// ❌ Too many responsibilities in one method
async processGameTick(empireId: string) {
  // Resource calculation (20 lines)
  // Technology research (15 lines)
  // Building construction (25 lines)
  // Fleet movement (30 lines)
  // Combat resolution (40 lines)
}

// ✅ Better: Extract to focused services
async processGameTick(empireId: string) {
  await this.resourceCalculationService.processTick(empireId);
  await this.technologyService.processResearch(empireId);
  await this.buildingService.processConstruction(empireId);
  await this.fleetService.processMovement(empireId);
  await this.combatService.resolveBattles(empireId);
}
```

**Severity**: 🟡 Major

### 1.2 Large Class (God Class)
Classes with too many responsibilities or methods.

**Detection Questions:**
- Does the class have more than 20 methods?
- Does the class handle multiple unrelated domains?
- Can functionality be extracted to separate classes?
- Is the class over 500 lines long?

**Game-Specific Context:**
- Service classes handling multiple game systems
- Controller classes with mixed HTTP and business logic concerns
- Model classes with excessive properties and methods

**Examples to Watch:**
```typescript
// ❌ Mixed concerns in one service
class GameService {
  // User management (10 methods)
  // Planet operations (15 methods)
  // Fleet management (20 methods)
  // Technology research (12 methods)
  // Building construction (18 methods)
}

// ✅ Better: Domain-focused services
class UserManagementService { /* User operations only */ }
class PlanetClaimingService { /* Planet operations only */ }
class FleetManagementService { /* Fleet operations only */ }
class TechnologyService { /* Research operations only */ }
class BuildingService { /* Construction operations only */ }
```

**Severity**: 🔴 Critical

### 1.3 Primitive Obsession
Using primitive data types instead of small objects for simple tasks.

**Detection Questions:**
- Are primitive types used for complex domain concepts?
- Are there strings representing different concepts (status, type, category)?
- Are there numbers representing different units or measurements?
- Can primitive types be replaced with domain-specific types?

**Game-Specific Context:**
- Resource amounts as plain numbers instead of Resource objects
- Planet coordinates as separate x,y numbers instead of Coordinate objects
- Technology levels as plain numbers instead of TechnologyLevel objects

**Examples to Watch:**
```typescript
// ❌ Primitive obsession
interface Planet {
  x: number;          // Should be Coordinate
  y: number;
  resource: number;   // Should be ResourceAmount
  status: string;     // Should be PlanetStatus enum
}

// ✅ Better: Domain objects
interface Planet {
  coordinates: Coordinate;
  resources: ResourceAmount;
  status: PlanetStatus;
}
```

**Severity**: 🟡 Major

### 1.4 Long Parameter List
Methods with excessive parameter counts.

**Detection Questions:**
- Does the method have more than 5 parameters?
- Can related parameters be grouped into objects?
- Are parameters passed through multiple method calls?
- Can parameter objects be used instead of individual parameters?

**Game-Specific Context:**
- Service methods requiring empire, user, planet, and resource data
- Controller methods with multiple query parameters
- Database query methods with extensive filter criteria

**Examples to Watch:**
```typescript
// ❌ Too many parameters
async createBuilding(
  userId: string,
  empireId: string,
  planetId: string,
  buildingType: string,
  x: number,
  y: number,
  resources: number,
  priority: number
): Promise<Building>

// ✅ Better: Parameter objects
async createBuilding(request: CreateBuildingRequest): Promise<Building>
```

**Severity**: 🟡 Major

### 1.5 Data Clumps
Groups of data items that are always used together.

**Detection Questions:**
- Do the same 2-3 data items appear in multiple method signatures?
- Are related values passed as separate parameters?
- Can data clumps be extracted into coherent objects?
- Do data clumps appear in multiple classes?

**Game-Specific Context:**
- Resource amounts (metal, crystal, deuterium) always used together
- Planet coordinates (x, y) always passed as pairs
- Empire statistics (level, score, resources) frequently grouped

**Examples to Watch:**
```typescript
// ❌ Data clumps
interface Empire {
  metal: number;
  crystal: number;
  deuterium: number;
  level: number;
  score: number;
}

// ✅ Better: Grouped data objects
interface Empire {
  resources: Resources;
  statistics: EmpireStatistics;
}
```

**Severity**: 🟢 Minor

## 2. Duplicators

Duplicators represent situations where code duplication creates maintenance problems.

### 2.1 Duplicated Code
Identical or very similar code appearing in multiple places.

**Detection Questions:**
- Does similar code appear in multiple files?
- Are there copy-pasted blocks of code?
- Can common functionality be extracted to shared utilities?
- Do similar algorithms appear in different contexts?

**Game-Specific Context:**
- Resource calculation logic repeated across services
- Empire validation logic duplicated in multiple controllers
- Database query patterns repeated across data access layers

**Examples to Watch:**
```typescript
// ❌ Duplicated in multiple services
// ResourceCalculationService
async calculateCredits(empire: Empire): Promise<number> {
  const baseProduction = empire.buildings
    .filter(b => b.type === 'METAL_MINE')
    .reduce((sum, b) => sum + b.level * 100, 0);
  return baseProduction * empire.research.economy;
}

// ❌ Same logic in EconomyService
async calculateCredits(empire: Empire): Promise<number> {
  const baseProduction = empire.buildings
    .filter(b => b.type === 'METAL_MINE')
    .reduce((sum, b) => sum + b.level * 100, 0);
  return baseProduction * empire.research.economy;
}
```

**Severity**: 🔴 Critical

### 2.2 Similar Classes
Classes that perform similar functions but with slight variations.

**Detection Questions:**
- Do multiple classes implement similar functionality?
- Can inheritance or composition reduce the duplication?
- Are there parallel class hierarchies doing similar things?
- Can a common base class or utility be extracted?

**Game-Specific Context:**
- Multiple service classes with similar database operations
- Controller classes with repetitive request/response handling
- Game entity classes with similar lifecycle management

**Severity**: 🟡 Major

## 3. Change Preventers

Change preventers make it hard to modify code due to tight coupling and poor design.

### 3.1 Shotgun Surgery
Making a single change requires modifications in multiple places.

**Detection Questions:**
- Does a small change require editing multiple files?
- Are related changes scattered across the codebase?
- Can the functionality be centralized to reduce spread?
- Is there a single place that should handle this responsibility?

**Game-Specific Context:**
- Empire data updates requiring changes in multiple services
- Resource calculations affecting multiple game systems
- User authentication changes impacting multiple controllers

**Examples to Watch:**
```typescript
// ❌ Shotgun surgery: Resource changes in multiple places
// ResourceCalculationService
async updateMetal(empireId: string, amount: number) {
  // Update empire resources
  // Update building production rates
  // Update technology bonuses
  // Update UI displays
}

// FleetService
async updateMetal(empireId: string, amount: number) {
  // Update fleet construction costs
  // Update trade calculations
}

// BuildingService
async updateMetal(empireId: string, amount: number) {
  // Update construction costs
  // Update production rates
}
```

**Severity**: 🔴 Critical

### 3.2 Divergent Change
A single class requiring changes for different reasons.

**Detection Questions:**
- Does the class change for unrelated reasons?
- Can the class be split by responsibility?
- Are there multiple distinct sets of methods that change together?
- Does the class violate the Single Responsibility Principle?

**Game-Specific Context:**
- Service classes handling both game logic and HTTP concerns
- Controller classes mixing authentication and game operations
- Database services mixing queries and business logic

**Examples to Watch:**
```typescript
// ❌ Divergent change: Mixed concerns
class DashboardController {
  // HTTP request handling
  async getDashboard(req: Request, res: Response) { }

  // Resource calculations
  async calculateResources(empire: Empire) { }

  // Authentication checks
  async validateUser(req: Request) { }

  // Response formatting
  async formatResponse(data: any) { }
}
```

**Severity**: 🔴 Critical

## 4. Object-Orientation Abusers

Object-orientation abusers are smells that arise from incorrect or inappropriate use of OO principles.

### 4.1 Switch Statements
Complex switch statements that should use polymorphism.

**Detection Questions:**
- Do switch statements check the same attribute in multiple places?
- Can the switch be replaced with polymorphic method calls?
- Are there long chains of if-else statements?
- Does the switch handle different types or states?

**Game-Specific Context:**
- Building type switches for production calculations
- Technology type switches for research effects
- Fleet type switches for combat calculations

**Examples to Watch:**
```typescript
// ❌ Switch statement abuse
function calculateProduction(building: Building): number {
  switch (building.type) {
    case 'METAL_MINE':
      return calculateMetalProduction(building);
    case 'CRYSTAL_MINE':
      return calculateCrystalProduction(building);
    case 'DEUTERIUM_SYNTHESIZER':
      return calculateDeuteriumProduction(building);
    // ... more cases
  }
}

// ✅ Better: Polymorphic approach
interface Building {
  calculateProduction(): number;
}

class MetalMine implements Building {
  calculateProduction(): number { /* specific logic */ }
}
```

**Severity**: 🟡 Major

### 4.2 Refused Bequest
Subclasses not using inherited methods or properties.

**Detection Questions:**
- Do subclasses override methods to do nothing?
- Are inherited methods inappropriate for subclasses?
- Can inheritance be replaced with composition?
- Should the class hierarchy be redesigned?

**Game-Specific Context:**
- Game entity classes inheriting inappropriate base functionality
- Service classes inheriting database methods they don't need
- UI components inheriting behavior they override completely

**Severity**: 🟡 Major

## 5. Dispensables

Dispensables are unnecessary elements in code that should be removed.

### 5.1 Dead Code
Code that is never executed or no longer needed.

**Detection Questions:**
- Are there unused methods, classes, or variables?
- Are there commented-out blocks of code?
- Are there unreachable code paths?
- Can unused code be safely removed?

**Game-Specific Context:**
- Legacy database operations during Supabase migration
- Unused game mechanics from early development
- Commented debugging code left in production

**Examples to Watch:**
```typescript
// ❌ Dead code
class LegacyDatabaseService {
  // async connectMongoDB() { } // No longer used
  // async migrateToSupabase() { } // Migration complete
}

// ❌ Commented dead code
/*
const oldResourceCalculation = (empire) => {
  // This was replaced by ResourceCalculationService
  return empire.resources * 1.5;
};
*/
```

**Severity**: 🟢 Minor

### 5.2 Speculative Generality
Code built for future needs that never materialize.

**Detection Questions:**
- Are there abstract classes or methods with no concrete implementations?
- Are there unused parameters or configuration options?
- Are there overly generic solutions for simple problems?
- Can specialized code replace generic solutions?

**Game-Specific Context:**
- Over-engineered plugin systems for simple game mechanics
- Complex configuration systems for rarely changed settings
- Generic entity systems for simple game objects

**Examples to Watch:**
```typescript
// ❌ Speculative generality
interface PluginSystem {
  registerPlugin(plugin: GenericPlugin): void;
  unregisterPlugin(id: string): void;
  executePluginHook(hook: string, data: any): any;
}

// When you only need:
class SimpleEventEmitter {
  emit(event: string, data: any): void { }
}
```

**Severity**: 🟢 Minor

### 5.3 Console.log Abuse
Excessive or inappropriate use of console logging.

**Detection Questions:**
- Are console.log statements left in production code?
- Are debug logs providing sensitive information?
- Are there console.log statements in loops or frequently called methods?
- Can proper logging frameworks replace console usage?

**Game-Specific Context:**
- Debug logs exposing sensitive game state
- Console logs in game loop methods affecting performance
- Development logs left in production builds

**Examples to Watch:**
```typescript
// ❌ Console.log abuse
class GameLoopService {
  async processTick(): Promise<void> {
    console.log('Processing game tick...'); // Too frequent
    console.log(`Empire ${empire.id} resources:`, empire.resources); // Sensitive data

    for (const building of empire.buildings) {
      console.log('Processing building:', building); // Loop logging
    }
  }
}
```

**Severity**: 🟡 Major

## 6. Couplers

Couplers are smells that result from inappropriate coupling between classes.

### 6.1 Feature Envy
A method more interested in another class than its own.

**Detection Questions:**
- Does a method access data from another object more than its own?
- Can the method be moved to the class it envies?
- Is the method doing work that should be done by another class?
- Are there long parameter lists to access external data?

**Game-Specific Context:**
- Service methods accessing multiple other service's data
- Controller methods performing business logic from other domains
- Utility functions operating on data from multiple services

**Examples to Watch:**
```typescript
// ❌ Feature envy: AuthService doing user management
class AuthService {
  async login(credentials: LoginCredentials): Promise<Token> {
    // Authentication logic
    const user = await this.userService.findByEmail(credentials.email);
    const planet = await this.planetService.getStarterPlanet(user.id); // Envy!
    const empire = await this.empireService.createEmpire(user, planet); // Envy!

    return this.generateToken(user);
  }
}
```

**Severity**: 🔴 Critical

### 6.2 Middle Man
Classes that delegate too much work to other classes.

**Detection Questions:**
- Does the class simply delegate calls without adding value?
- Can clients call the delegated class directly?
- Is the middle man class just adding unnecessary complexity?
- Can inheritance or composition eliminate the middle man?

**Game-Specific Context:**
- Service layers that only delegate to other services
- Controller classes that only pass through to business logic
- Manager classes that don't add meaningful coordination

**Examples to Watch:**
```typescript
// ❌ Middle man: Just delegates
class GameManager {
  async processGameAction(action: GameAction): Promise<void> {
    return this.gameService.processAction(action); // Just delegates
  }

  async getGameState(): Promise<GameState> {
    return this.gameService.getState(); // Just delegates
  }
}

// ✅ Better: Remove middle man
// Clients call GameService directly
```

**Severity**: 🟡 Major

### 6.3 High Coupling
Classes that are tightly coupled and hard to change independently.

**Detection Questions:**
- Does changing one class require changes to many others?
- Are there many dependencies between classes?
- Can classes be tested independently?
- Are there circular dependencies?

**Game-Specific Context:**
- Services depending on multiple other services
- Game systems tightly coupled to specific data structures
- Controllers coupled to specific service implementations

**Examples to Watch:**
```typescript
// ❌ High coupling
class BuildingService {
  constructor(
    private resourceService: ResourceService,
    private technologyService: TechnologyService,
    private userService: UserService,
    private planetService: PlanetService,
    private fleetService: FleetService
  ) {} // Too many dependencies
}
```

**Severity**: 🔴 Critical

## 7. Additional Game-Specific Smells

### 7.1 Database Query Abuse
Inefficient or inappropriate database queries.

**Detection Questions:**
- Are there N+1 query problems?
- Are queries executed in loops?
- Are there missing database indexes?
- Are complex calculations done in database queries?

**Severity**: 🟡 Major

### 7.2 Real-time Sync Issues
Problems with WebSocket and real-time updates.

**Detection Questions:**
- Are WebSocket events sent too frequently?
- Are real-time updates missing error handling?
- Are subscription cleanup handled properly?
- Are sensitive data exposed in real-time updates?

**Severity**: 🟡 Major

### 7.3 Game Balance Logic Scattered
Game balance calculations spread across multiple places.

**Detection Questions:**
- Are resource calculations duplicated?
- Are game constants hardcoded in multiple places?
- Are balance formulas inconsistent?
- Can balance logic be centralized?

**Severity**: 🟡 Major

## Review Process

1. **Scan for Obvious Issues**: Look for long methods and large classes first
2. **Check for Duplication**: Search for similar code patterns
3. **Analyze Dependencies**: Look for tight coupling and feature envy
4. **Verify Game Logic**: Ensure game mechanics are correctly implemented
5. **Performance Check**: Identify potential performance issues
6. **Security Review**: Check for security vulnerabilities

## Automated Detection Integration

This checklist complements Attrition's automated tools:
- **ESLint Rules**: Detect basic code smells and style issues
- **Complexity Metrics**: Identify complex methods and classes
- **Custom Rules**: Project-specific smell detection
- **Manual Review**: Catch context-aware issues automated tools miss

---

**Last Updated**: 2025-10-10
**Version**: 1.0.0
**Status**: Active