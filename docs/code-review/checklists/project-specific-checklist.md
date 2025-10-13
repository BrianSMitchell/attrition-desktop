# Project-Specific Code Review Checklist - Attrition Space Strategy Game

## Overview

This checklist covers Attrition-specific patterns, game mechanics, and architectural concerns that complement the Fowler's taxonomy checklist. These items are tailored to the unique requirements of a real-time space strategy game with Supabase backend and React frontend.

## Legend

- **🔴 Critical**: Must fix - impacts game functionality or player experience
- **🟡 Major**: Should fix - affects maintainability or performance
- **🟢 Minor**: Nice to fix - improves code quality
- **ℹ️ Info**: Informational - no action required

## 1. Supabase Migration Patterns

### 1.1 Database Migration Consistency
Ensuring proper migration from MongoDB to Supabase patterns.

**Detection Questions:**
- Are UUID formats used consistently (no MongoDB ObjectIds)?
- Are database queries using proper Supabase patterns?
- Are error handling patterns consistent with Supabase expectations?
- Are database constraints and RLS policies properly implemented?

**Examples to Watch:**
```typescript
// ❌ Legacy MongoDB patterns in Supabase code
const user = await supabase
  .from('users')
  .findOne({ _id: userId }) // Wrong: MongoDB pattern
  .then(result => result.data);

// ✅ Proper Supabase patterns
const { data: user, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .maybeSingle();
```

**Severity**: 🔴 Critical

### 1.2 ID Consistency Validation
Ensuring proper UUID format usage for Supabase primary keys.

**Detection Questions:**
- Are all entity IDs validated as proper UUID format?
- Are UUID validation patterns consistent across routes?
- Are error messages clear for invalid ID formats?
- Are ID validation regex patterns using standard UUID v4 format?

**Examples to Watch:**
```typescript
// ❌ Inconsistent ID validation
if (userId.length !== 24) { // Wrong: MongoDB ObjectId length
  return res.status(400).json({ error: 'Invalid user ID' });
}

// ✅ Proper UUID validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(userId)) {
  return res.status(400).json({
    success: false,
    code: 'INVALID_USER_ID',
    message: 'Invalid user ID format'
  });
}
```

**Severity**: 🟡 Major

### 1.3 Query Optimization Patterns
Efficient database queries for game performance.

**Detection Questions:**
- Are count queries using `head: true` to avoid data transfer?
- Are complex authorization queries using single queries with OR conditions?
- Are pagination queries using `range()` method properly?
- Are database indexes considered for query performance?

**Examples to Watch:**
```typescript
// ❌ Inefficient count query
const { data: messages } = await supabase
  .from('messages')
  .select('*')
  .eq('user_id', userId);
const count = messages?.length || 0;

// ✅ Efficient count query
const { count } = await supabase
  .from('messages')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId);
```

**Severity**: 🟡 Major

## 2. Game Architecture Patterns

### 2.1 Service Extraction Implementation
Proper implementation of the established service extraction pattern.

**Detection Questions:**
- Are route handlers focused only on HTTP concerns?
- Are business logic methods extracted to appropriate service classes?
- Are service classes following single responsibility principle?
- Are controller classes properly separating HTTP from business logic?

**Examples to Watch:**
```typescript
// ❌ Mixed concerns in route handler
router.post('/dashboard', async (req, res) => {
  // HTTP parsing (5 lines)
  // Business logic: resource calculation (30 lines)
  // Business logic: empire validation (20 lines)
  // HTTP response formatting (5 lines)
});

// ✅ Clean service extraction
router.post('/dashboard', async (req, res) => {
  try {
    const data = await DashboardController.getDashboardData(req.body);
    return res.json(DashboardResponse.format(data));
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});
```

**Severity**: 🔴 Critical

### 2.2 Domain Service Organization
Proper organization of domain-specific services.

**Detection Questions:**
- Are services organized by domain (UserManagement, PlanetClaiming, etc.)?
- Are service methods focused on single domain responsibilities?
- Are service dependencies injected properly without tight coupling?
- Are service interfaces well-defined and consistent?

**Examples to Watch:**
```typescript
// ❌ Feature envy: AuthService doing user management
class AuthService {
  async register(userData: any) {
    // User creation logic (should be in UserManagementService)
    // Planet claiming logic (should be in PlanetClaimingService)
    // Empire setup logic (should be in EmpireManagementService)
  }
}

// ✅ Proper domain separation
class AuthService {
  async register(userData: any) {
    const user = await UserManagementService.createUser(userData);
    const planet = await PlanetClaimingService.setupStarterPlanet(user.id);
    return { user, planet };
  }
}
```

**Severity**: 🔴 Critical

### 2.3 Controller Pattern Implementation
Proper implementation of the controller pattern for HTTP concerns.

**Detection Questions:**
- Are controller classes focused only on business logic orchestration?
- Are HTTP concerns (request parsing, response formatting) in route handlers?
- Are controller methods pure functions without HTTP dependencies?
- Are controller responses properly formatted for API consumers?

**Examples to Watch:**
```typescript
// ❌ HTTP concerns in controller
class DashboardController {
  async getDashboardData(req: Request, res: Response) { // HTTP dependency
    const resources = await this.calculateResources(empire);
    res.json({ success: true, data: resources }); // HTTP response
  }
}

// ✅ Pure controller pattern
class DashboardController {
  static async getDashboardData(empire: Empire, userId: string) {
    // Pure business logic only
    const resources = await ResourceCalculationService.calculateDashboardResources(empire);
    return { resources, empire, userId };
  }
}
```

**Severity**: 🟡 Major

## 3. Real-time Features Patterns

### 3.1 WebSocket Integration
Proper WebSocket and real-time update patterns.

**Detection Questions:**
- Are WebSocket events sent at appropriate intervals (not too frequently)?
- Are real-time updates including proper error handling?
- Are WebSocket subscriptions properly cleaned up?
- Are sensitive data properly filtered from real-time broadcasts?

**Examples to Watch:**
```typescript
// ❌ Excessive real-time updates
class GameLoopService {
  async processTick(): Promise<void> {
    for (const empire of activeEmpires) {
      // Sending updates every tick (too frequent!)
      this.socket.emit('empire-update', { empire }); // Sensitive data exposure
    }
  }
}

// ✅ Proper real-time patterns
class GameLoopService {
  async processTick(): Promise<void> {
    const updates = await this.collectSignificantChanges();
    if (updates.length > 0) {
      this.socket.emit('game-events', this.sanitizeForBroadcast(updates));
    }
  }
}
```

**Severity**: 🟡 Major

### 3.2 Subscription Management
Proper Supabase subscription and real-time sync patterns.

**Detection Questions:**
- Are Supabase subscriptions properly managed (subscribe/unsubscribe)?
- Are real-time updates handled gracefully with error recovery?
- Are subscription channels appropriately filtered?
- Are subscription cleanup handled on component unmount?

**Severity**: 🟡 Major

## 4. Game Logic Patterns

### 4.1 Resource Calculation Consistency
Consistent resource calculation and game balance logic.

**Detection Questions:**
- Are resource calculations using the established service patterns?
- Are game balance formulas consistent across different services?
- Are resource updates properly synchronized across game systems?
- Are resource validation rules consistently applied?

**Examples to Watch:**
```typescript
// ❌ Inconsistent resource calculations
// ResourceCalculationService
async calculateCredits(empire: Empire): Promise<number> {
  return empire.buildings.reduce((sum, b) => sum + b.level * 100, 0) * 1.5;
}

// BuildingService
async calculateBuildingCost(building: Building): Promise<number> {
  return building.level * 200; // Different multiplier!
}

// ❌ Resource updates not synchronized
// Service A updates metal, Service B unaware
await ResourceService.updateMetal(empireId, amount);
await BuildingService.processUpgrades(empireId); // May use stale data
```

**Severity**: 🔴 Critical

### 4.2 Game State Synchronization
Proper synchronization of game state across multiplayer features.

**Detection Questions:**
- Are game state changes properly broadcast to all affected players?
- Are concurrent modifications handled with proper conflict resolution?
- Are game state queries returning consistent snapshots?
- Are optimistic updates properly rolled back on conflicts?

**Severity**: 🔴 Critical

### 4.3 Empire Resolution Patterns
Consistent empire and user resolution across services.

**Detection Questions:**
- Are empire resolution patterns using the established EmpireResolutionService?
- Are user context patterns consistent across route handlers?
- Are empire validation rules uniformly applied?
- Are error messages consistent for empire-related failures?

**Examples to Watch:**
```typescript
// ❌ Inconsistent empire resolution
// Route A
const empire = await Empire.findById(req.body.empireId);
// Route B
const empire = await supabase.from('empires').select('*').eq('user_id', userId);
// Route C
const empire = await getUserEmpire(userId);

// ✅ Consistent pattern
// All routes use EmpireResolutionService
const empire = await EmpireResolutionService.resolveEmpireByUserId(userId);
```

**Severity**: 🟡 Major

## 5. Performance Patterns

### 5.1 Game Loop Efficiency
Efficient game loop and background processing patterns.

**Detection Questions:**
- Are database queries in game loops properly optimized?
- Are expensive operations cached when appropriate?
- Are background tasks properly scheduled and monitored?
- Are resource-intensive operations properly batched?

**Examples to Watch:**
```typescript
// ❌ Inefficient game loop
async processGameLoop(): Promise<void> {
  for (const empire of allEmpires) { // Loading all empires every tick
    for (const building of empire.buildings) { // N+1 queries
      await supabase.from('buildings').select('*').eq('id', building.id);
    }
  }
}

// ✅ Optimized game loop
async processGameLoop(): Promise<void> {
  // Batch load required data
  const empiresWithBuildings = await this.loadActiveEmpiresWithBuildings();

  // Process in memory
  for (const empire of empiresWithBuildings) {
    await this.processEmpireTick(empire); // No additional queries
  }
}
```

**Severity**: 🟡 Major

### 5.2 Database Query Performance
Efficient database operations for game responsiveness.

**Detection Questions:**
- Are queries using proper indexes and filters?
- Are complex joins necessary or can they be optimized?
- Are database connections properly pooled?
- Are query results properly cached when appropriate?

**Severity**: 🟡 Major

## 6. Security Patterns

### 6.1 Authentication Integration
Proper authentication patterns across game features.

**Detection Questions:**
- Are authentication checks consistently applied to protected routes?
- Are user permissions properly validated for game actions?
- Are JWT tokens properly validated and refreshed?
- Are authentication errors providing appropriate feedback?

**Severity**: 🔴 Critical

### 6.2 Input Validation
Comprehensive input validation for game integrity.

**Detection Questions:**
- Are all user inputs properly validated and sanitized?
- Are game action parameters within acceptable ranges?
- Are resource amounts validated for game balance?
- Are coordinate and location data properly validated?

**Examples to Watch:**
```typescript
// ❌ Insufficient input validation
router.post('/build', async (req, res) => {
  const { buildingType, coordinates } = req.body;
  // No validation - vulnerable to exploits!
  await BuildingService.create(buildingType, coordinates);
});

// ✅ Proper validation
router.post('/build', async (req, res) => {
  const { buildingType, x, y } = req.body;

  if (!this.validateBuildingType(buildingType)) {
    return res.status(400).json({ error: 'Invalid building type' });
  }

  if (!this.validateCoordinates(x, y)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  await BuildingService.create(buildingType, { x, y });
});
```

**Severity**: 🔴 Critical

## 7. Error Handling Patterns

### 7.1 Game-Specific Error Handling
Proper error handling for game mechanics and user experience.

**Detection Questions:**
- Are game errors providing clear, actionable feedback to users?
- Are technical errors properly logged without exposing sensitive data?
- Are error recovery mechanisms in place for common failure scenarios?
- Are error patterns consistent across similar operations?

**Examples to Watch:**
```typescript
// ❌ Poor error handling
catch (error) {
  console.log(error); // Not logged properly
  return res.status(500).json({ error: 'Something went wrong' }); // Not helpful
}

// ✅ Proper game error handling
catch (error) {
  logger.error('Building construction failed', {
    error: error.message,
    userId,
    buildingType,
    coordinates
  });

  if (error.code === 'INSUFFICIENT_RESOURCES') {
    return res.status(400).json({
      error: 'Insufficient resources for construction',
      required: error.required,
      available: error.available
    });
  }

  return res.status(500).json({
    error: 'Construction failed',
    message: 'Please try again or contact support'
  });
}
```

**Severity**: 🟡 Major

## 8. Testing Integration Patterns

### 8.1 Test Coverage for Game Logic
Proper test coverage for critical game functionality.

**Detection Questions:**
- Are critical game mechanics covered by unit tests?
- Are service extractions properly tested in isolation?
- Are integration tests covering key user journeys?
- Are edge cases and error conditions properly tested?

**Severity**: 🟡 Major

## 9. Documentation Patterns

### 9.1 Code Documentation Quality
Maintaining code documentation standards.

**Detection Questions:**
- Are complex game algorithms properly documented?
- Are service interfaces clearly documented?
- Are architectural decisions explained in comments?
- Are API changes properly documented?

**Examples to Watch:**
```typescript
// ❌ Poor documentation
async calculateResourceProduction(empire: Empire): Promise<number> {
  return empire.buildings.map(b => b.level * 100).reduce((a, b) => a + b, 0);
}

// ✅ Well documented
/**
 * Calculates total resource production per hour for an empire
 * Includes base production from mines and multipliers from research
 * @param empire - The empire to calculate production for
 * @returns Total resources produced per hour
 */
async calculateResourceProduction(empire: Empire): Promise<number> {
  const baseProduction = empire.buildings
    .filter(b => b.type === 'RESOURCE_MINE')
    .map(b => b.level * 100) // 100 resources per level
    .reduce((sum, production) => sum + production, 0);

  const researchMultiplier = empire.research.economy.level * 0.1 + 1;
  return Math.floor(baseProduction * researchMultiplier);
}
```

**Severity**: 🟢 Minor

## 10. Code Quality Integration

### 10.1 ESLint Rule Compliance
Adherence to project-specific ESLint rules.

**Detection Questions:**
- Are custom ESLint rules for ID consistency followed?
- Are logging rules (no-excessive-logging) properly implemented?
- Are complexity thresholds respected?
- Are service extraction requirements met?

**Severity**: 🟡 Major

### 10.2 Metrics Threshold Compliance
Adherence to code metrics and complexity thresholds.

**Detection Questions:**
- Are cyclomatic complexity limits respected?
- Are maintainability indices within acceptable ranges?
- Are duplication ratios below thresholds?
- Are file sizes within reasonable limits?

**Severity**: 🟢 Minor

## Review Priority Matrix

### High Priority (Review First)
1. **Service Extraction**: Any mixed concerns in route handlers
2. **Database Migration**: MongoDB patterns in Supabase code
3. **Game Logic**: Resource calculations and game balance
4. **Security**: Authentication and input validation
5. **Real-time Features**: WebSocket and subscription patterns

### Medium Priority (Review Second)
1. **Error Handling**: Consistent error patterns and user feedback
2. **Performance**: Query optimization and game loop efficiency
3. **Documentation**: Complex game logic documentation
4. **Code Quality**: ESLint and metrics compliance

### Low Priority (Review Last)
1. **Code Style**: Formatting and naming consistency
2. **Comments**: Non-critical documentation improvements
3. **Organization**: File and folder organization

## Integration with Automated Tools

This checklist works with Attrition's automated quality assurance:

- **Custom ESLint Rules**: Detect basic pattern violations
- **Code Metrics System**: Identify complexity and maintainability issues
- **TypeScript**: Catch type-related errors and inconsistencies
- **Git Hooks**: Enforce pre-commit and pre-push quality checks

---

**Last Updated**: 2025-10-10
**Version**: 1.0.0
**Status**: Active