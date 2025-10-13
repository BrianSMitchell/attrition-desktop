# Coding Standards - Attrition Space Strategy Game

## Overview

This document defines the coding standards and conventions for the Attrition project. Consistent coding standards improve code readability, maintainability, and collaboration across the development team.

## Language and Framework Standards

### TypeScript Standards

#### Type Definitions
```typescript
// ✅ Preferred: Interface for object shapes
interface User {
  readonly id: string;
  readonly email: string;
  readonly createdAt: Date;
  isActive: boolean;
}

// ✅ Preferred: Type aliases for unions and primitives
type UserStatus = 'active' | 'inactive' | 'suspended';
type ResourceType = 'metal' | 'crystal' | 'deuterium' | 'energy';

// ✅ Preferred: Generic constraints
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

// ✅ Preferred: Utility types
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[keyof T];
```

#### Function Signatures
```typescript
// ✅ Preferred: Clear parameter types with defaults
async function createUser(
  userData: CreateUserRequest,
  options: { sendWelcomeEmail?: boolean } = {}
): Promise<User> {
  // Implementation
}

// ✅ Preferred: Proper return types
async function getUsersByEmpire(empireId: string): Promise<User[]> {
  // Implementation
}

// ✅ Preferred: Generic function signatures
function createService<T extends ServiceConfig>(
  config: T
): Service<T> {
  // Implementation
}
```

#### Class Design
```typescript
// ✅ Preferred: Clear class structure
export class UserManagementService {
  // Static methods for service pattern
  public static async createUser(userData: CreateUserRequest): Promise<User> {
    // Implementation
  }

  public static async updateUser(
    userId: string,
    updates: UpdateUserRequest
  ): Promise<User> {
    // Implementation
  }

  // Private methods clearly marked
  private static validateUserData(userData: CreateUserRequest): void {
    // Implementation
  }

  private static async hashPassword(password: string): Promise<string> {
    // Implementation
  }
}

// ❌ Avoid: Mixed static and instance methods
export class PoorlyDesignedService {
  constructor(private database: Database) {}

  public createUser(userData: CreateUserRequest): Promise<User> {
    // Instance method in service class
  }

  public static getInstance(): PoorlyDesignedService {
    // Singleton pattern creates tight coupling
  }
}
```

### React Standards

#### Component Structure
```typescript
// ✅ Preferred: Clear component organization
interface GameDashboardProps {
  empire: Empire;
  gameState: GameState;
  onAction: (action: GameAction) => void;
}

export const GameDashboard: React.FC<GameDashboardProps> = ({
  empire,
  gameState,
  onAction
}) => {
  // Custom hooks
  const { resources, isLoading } = useResources(empire.id);
  const { buildings } = useBuildings(empire.id);

  // Event handlers
  const handleBuildingClick = useCallback((building: Building) => {
    onAction({ type: 'BUILDING_CLICK', building });
  }, [onAction]);

  // Early returns for loading/error states
  if (isLoading) return <LoadingSpinner />;
  if (!empire) return <ErrorMessage message="Empire not found" />;

  return (
    <div className={styles.dashboard}>
      <ResourcePanel resources={resources} />
      <BuildingPanel buildings={buildings} onBuildingClick={handleBuildingClick} />
      <GameStatusPanel gameState={gameState} />
    </div>
  );
};
```

#### Hook Usage
```typescript
// ✅ Preferred: Proper custom hook patterns
export const useGameState = (empireId: string) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadGameState = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const state = await GameService.getGameState(empireId);

        if (mounted) {
          setGameState(state);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    };

    loadGameState();

    return () => {
      mounted = false;
    };
  }, [empireId]);

  return { gameState, isLoading, error, refetch: loadGameState };
};
```

### Node.js Standards

#### Service Layer Pattern
```typescript
// ✅ Preferred: Clean service pattern
export class ResourceCalculationService {
  public static async calculateDashboardResources(empire: Empire): Promise<DashboardResources> {
    // Pure business logic only
    const metalProduction = this.calculateMetalProduction(empire);
    const crystalProduction = this.calculateCrystalProduction(empire);
    const deuteriumProduction = this.calculateDeuteriumProduction(empire);

    return {
      metal: metalProduction,
      crystal: crystalProduction,
      deuterium: deuteriumProduction,
      total: metalProduction + crystalProduction + deuteriumProduction
    };
  }

  private static calculateMetalProduction(empire: Empire): number {
    const baseProduction = empire.buildings
      .filter(b => b.type === 'METAL_MINE')
      .reduce((sum, building) => sum + building.level * 30, 0);

    const researchBonus = empire.research.economy.level * 0.1 + 1;
    return Math.floor(baseProduction * researchBonus);
  }
}
```

#### Controller Pattern
```typescript
// ✅ Preferred: Clean controller pattern
export class DashboardController {
  public static async getDashboardData(
    empire: Empire,
    userId: string
  ): Promise<DashboardResponse> {
    // Pure business logic orchestration
    const resources = await ResourceCalculationService.calculateDashboardResources(empire);
    const credits = await CreditService.calculateCreditsPerHour(empire);
    const buildings = await BuildingService.getBuildingQueue(empire.id);

    return {
      resources,
      credits,
      buildings,
      lastUpdated: new Date()
    };
  }
}
```

## Naming Conventions

### General Rules
- **Descriptive**: Names should clearly indicate purpose and content
- **Consistent**: Use same naming patterns across similar concepts
- **Pronounceable**: Avoid abbreviations that make code hard to read
- **Case-Appropriate**: Use correct case for language and context

### TypeScript/JavaScript

#### Variables and Functions
```typescript
// ✅ Preferred: Clear, descriptive names
const userAuthenticationService = new UserAuthenticationService();
const calculateOptimalFleetComposition = (ships, mission) => { };
const isBuildingConstructionComplete = (building) => { };

// ❌ Avoid: Unclear or abbreviated names
const u = new UserService(); // What is 'u'?
const calc = (a, b) => { }; // What does this calculate?
const done = (b) => { }; // Done what?
```

#### Classes and Interfaces
```typescript
// ✅ Preferred: Clear class and interface names
class EmpireManagementService { }
class ResourceCalculationEngine { }
interface BuildingConstructionRequest { }
interface FleetMovementCommand { }

// ❌ Avoid: Unclear or generic names
class Manager { } // Manages what?
class Helper { } // Helps with what?
class Data { } // What kind of data?
```

#### Constants and Enums
```typescript
// ✅ Preferred: SCREAMING_SNAKE_CASE for constants
const MAX_BUILDING_QUEUE_SIZE = 10;
const MINIMUM_RESOURCE_REQUIREMENT = 100;
const WEBSOCKET_CONNECTION_TIMEOUT = 30000;

// ✅ Preferred: PascalCase for enum values
enum BuildingType {
  METAL_MINE = 'metal_mine',
  CRYSTAL_MINE = 'crystal_mine',
  DEUTERIUM_SYNTHESIZER = 'deuterium_synthesizer'
}

// ✅ Preferred: camelCase for enum keys
enum ResourceType {
  metal = 'metal',
  crystal = 'crystal',
  deuterium = 'deuterium'
}
```

### File and Directory Naming

#### File Names
```typescript
// ✅ Preferred: Clear, descriptive file names
user-management.service.ts
resource-calculation.service.ts
building-construction.controller.ts
empire-dashboard.component.tsx
game-state.hook.ts

// ✅ Preferred: Domain-based organization
services/
  user-management.service.ts
  resource-calculation.service.ts
  building-construction.service.ts
controllers/
  dashboard.controller.ts
  auth.controller.ts
components/
  game-dashboard.component.tsx
  resource-panel.component.tsx
hooks/
  use-game-state.hook.ts
  use-buildings.hook.ts
```

#### Directory Structure
```typescript
// ✅ Preferred: Feature-based organization
src/
  features/
    auth/
      components/
      services/
      controllers/
      types/
    game/
      components/
      services/
      controllers/
      types/
    buildings/
      components/
      services/
      controllers/
      types/

// ❌ Avoid: Type-based organization (creates tight coupling)
src/
  components/
  services/
  controllers/
  types/
  utils/
```

## Code Style Guidelines

### Formatting Standards

#### Indentation and Spacing
```typescript
// ✅ Preferred: Consistent indentation and spacing
export class ExampleService {
  public static async exampleMethod(
    param1: string,
    param2: number
  ): Promise<ExampleResponse> {
    const result = await this.performOperation(param1, param2);

    if (result.success) {
      return {
        data: result.data,
        timestamp: new Date()
      };
    } else {
      throw new Error(`Operation failed: ${result.error}`);
    }
  }

  private static async performOperation(
    param1: string,
    param2: number
  ): Promise<OperationResult> {
    // Implementation with proper spacing
    return {
      success: true,
      data: `Processed ${param1} with ${param2}`
    };
  }
}
```

#### Line Length and Wrapping
- **Maximum Line Length**: 100 characters for code, 120 for comments
- **Logical Breaks**: Break lines at logical points (operators, commas)
- **Consistent Indentation**: Use 2 spaces for continuation lines

```typescript
// ✅ Preferred: Proper line wrapping
const result = await this.complexDatabaseQuery(
  empireId,
  buildingType,
  resourceRequirement,
  constructionTimeframe
);

// ✅ Preferred: Long conditions properly wrapped
if (
  userHasPermission(user, 'BUILD_CONSTRUCTION') &&
  hasRequiredResources(empire, buildingCost) &&
  isValidConstructionLocation(coordinates)
) {
  // Implementation
}
```

### Comment Standards

#### Documentation Comments
```typescript
/**
 * Calculates the optimal production rate for a building based on level and research
 * @param building - The building to calculate production for
 * @param empire - The empire context for research bonuses
 * @returns The production rate per hour
 * @example
 * ```typescript
 * const rate = calculateBuildingProductionRate(building, empire);
 * console.log(`Production rate: ${rate}/hour`);
 * ```
 */
export function calculateBuildingProductionRate(
  building: Building,
  empire: Empire
): number {
  // Implementation
}
```

#### Inline Comments
```typescript
// ✅ Preferred: Explain complex logic
export class GameLoopService {
  public static async processGameTick(): Promise<void> {
    // Process empires in batches to avoid overwhelming database
    // Batch size determined by performance testing
    const batchSize = 10;

    for (let i = 0; i < activeEmpires.length; i += batchSize) {
      const batch = activeEmpires.slice(i, i + batchSize);

      // Process each empire's resources, research, and construction
      await Promise.all(
        batch.map(empire => this.processEmpireTick(empire))
      );
    }
  }
}

// ❌ Avoid: Obvious comments
export class UserService {
  public static async createUser(userData: UserData): Promise<User> {
    // Create the user (obvious from method name)
    const user = await this.saveUserToDatabase(userData);

    // Return the user (obvious from return type)
    return user;
  }
}
```

### Import/Export Standards

#### Import Organization
```typescript
// ✅ Preferred: Organized imports
// External libraries (alphabetical)
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@supabase/supabase-js';

// Internal utilities (alphabetical)
import { Logger } from '../utils/logger';
import { MetricsCollector } from '../utils/metrics-collector';

// Services (alphabetical by domain)
import { BuildingService } from '../services/building.service';
import { EmpireService } from '../services/empire.service';
import { ResourceService } from '../services/resource.service';

// Types (alphabetical)
import type { Building } from '../types/building.types';
import type { Empire } from '../types/empire.types';
import type { User } from '../types/user.types';

// ❌ Avoid: Disorganized imports
import { BuildingService } from '../services/building.service';
import { useState } from 'react';
import { supabase } from '@supabase/supabase-js';
import type { User } from '../types/user.types';
import { Logger } from '../utils/logger';
```

#### Export Patterns
```typescript
// ✅ Preferred: Named exports for services and utilities
export class UserManagementService {
  public static async createUser(userData: UserData): Promise<User> {
    // Implementation
  }
}

export interface CreateUserRequest {
  email: string;
  password: string;
  empireName: string;
}

// ✅ Preferred: Default exports for main components
export default function GameDashboard() {
  return <div>Game Dashboard</div>;
}

// ❌ Avoid: Mixed export patterns without clear rationale
export { UserService }; // Default export as named export
export default UserManagementService; // Class as default export
```

## Error Handling Standards

### Error Types
```typescript
// ✅ Preferred: Structured error hierarchy
export abstract class BaseError extends Error {
  public readonly name: string;
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.field = field;
  }
}

export class ResourceError extends BaseError {
  constructor(message: string, resourceType?: string) {
    super(message, 'RESOURCE_ERROR', 400);
    this.resourceType = resourceType;
  }
}
```

### Error Handling Patterns
```typescript
// ✅ Preferred: Comprehensive error handling
export class BuildingService {
  public static async createBuilding(
    request: CreateBuildingRequest
  ): Promise<Building> {
    try {
      // Validate input
      this.validateCreateBuildingRequest(request);

      // Check authorization
      await this.validateBuildingPermissions(request.userId, request.coordinates);

      // Check resources
      await this.validateResourceRequirements(request.userId, request.buildingType);

      // Create building
      const building = await this.performBuildingCreation(request);

      // Log success
      await AuditLogger.log('building_created', {
        buildingId: building.id,
        userId: request.userId,
        buildingType: request.buildingType
      });

      return building;

    } catch (error) {
      // Log error with context
      logger.error('Building creation failed', {
        error: error.message,
        userId: request.userId,
        buildingType: request.buildingType,
        coordinates: request.coordinates
      });

      // Re-throw with appropriate error type
      if (error instanceof ValidationError) {
        throw error;
      }

      if (error.code === 'INSUFFICIENT_RESOURCES') {
        throw new ResourceError('Insufficient resources for building construction');
      }

      throw new BuildingError(`Building creation failed: ${error.message}`);
    }
  }
}
```

## Testing Standards

### Test Organization
```typescript
// ✅ Preferred: Clear test structure
describe('BuildingService', () => {
  describe('createBuilding', () => {
    let mockDatabase: MockDatabase;
    let buildingService: BuildingService;

    beforeEach(() => {
      mockDatabase = createMockDatabase();
      buildingService = new BuildingService(mockDatabase);
    });

    describe('when valid request provided', () => {
      it('should create building successfully', async () => {
        // Arrange
        const request = createValidBuildingRequest();

        // Act
        const result = await buildingService.createBuilding(request);

        // Assert
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(mockDatabase.saveBuilding).toHaveBeenCalledWith(request);
      });
    });

    describe('when insufficient resources', () => {
      it('should throw ResourceError', async () => {
        // Arrange
        const request = createRequestWithInsufficientResources();

        // Act & Assert
        await expect(buildingService.createBuilding(request))
          .rejects.toThrow(ResourceError);
      });
    });
  });
});
```

### Test Naming Conventions
```typescript
// ✅ Preferred: Descriptive test names
describe('BuildingService', () => {
  describe('createBuilding', () => {
    it('should create building with valid request and sufficient resources', async () => {
      // Test implementation
    });

    it('should throw ValidationError when building type is invalid', async () => {
      // Test implementation
    });

    it('should throw ResourceError when user has insufficient resources', async () => {
      // Test implementation
    });

    it('should throw AuthorizationError when user cannot build at location', async () => {
      // Test implementation
    });
  });
});

// ❌ Avoid: Unclear test names
describe('BuildingService', () => {
  it('works', async () => { });
  it('fails correctly', async () => { });
  it('test 1', async () => { });
});
```

## Database Standards

### Query Patterns
```typescript
// ✅ Preferred: Consistent Supabase patterns
export class DatabaseService {
  public static async getUserById(userId: string): Promise<User | null> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to fetch user: ${error.message}`);
    }

    return user;
  }

  public static async getBuildingsByEmpire(
    empireId: string,
    options: { includeInactive?: boolean } = {}
  ): Promise<Building[]> {
    let query = supabase
      .from('buildings')
      .select('*')
      .eq('empire_id', empireId);

    if (!options.includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: buildings, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new DatabaseError(`Failed to fetch buildings: ${error.message}`);
    }

    return buildings || [];
  }
}
```

### Transaction Patterns
```typescript
// ✅ Preferred: Proper transaction handling
export class BuildingTransactionService {
  public static async createBuildingWithResources(
    buildingRequest: CreateBuildingRequest
  ): Promise<Building> {
    const { data, error } = await supabase.rpc('create_building_atomic', {
      building_data: buildingRequest,
      user_id: buildingRequest.userId,
      resource_deduction: buildingRequest.cost
    });

    if (error) {
      throw new DatabaseError(`Atomic building creation failed: ${error.message}`);
    }

    return data;
  }
}
```

## API Standards

### REST Endpoint Design
```typescript
// ✅ Preferred: RESTful endpoint patterns
// GET /api/empires/:id - Get specific empire
// GET /api/empires/:id/buildings - Get empire's buildings
// POST /api/empires/:id/buildings - Create building for empire
// PUT /api/buildings/:id - Update specific building
// DELETE /api/buildings/:id - Delete specific building

// ✅ Preferred: Consistent response formats
export class ApiResponse {
  public static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date()
    };
  }

  public static error(message: string, code?: string): ErrorResponse {
    return {
      success: false,
      error: message,
      code,
      timestamp: new Date()
    };
  }
}
```

### HTTP Status Codes
```typescript
// ✅ Preferred: Appropriate HTTP status codes
// 200 OK - Successful GET, PUT, DELETE operations
// 201 Created - Successful POST operations
// 204 No Content - Successful operation with no response body
// 400 Bad Request - Invalid request data
// 401 Unauthorized - Missing or invalid authentication
// 403 Forbidden - Valid authentication but insufficient permissions
// 404 Not Found - Resource not found
// 409 Conflict - Resource conflict (e.g., duplicate creation)
// 422 Unprocessable Entity - Valid data but business rule violation
// 429 Too Many Requests - Rate limiting triggered
// 500 Internal Server Error - Unexpected server error
```

## Performance Standards

### Algorithm Complexity
- **Database Queries**: Prefer O(log n) over O(n) operations
- **Game Loop Operations**: Maintain O(1) or O(log n) per empire
- **Real-time Updates**: Batch updates to avoid O(n²) broadcasting
- **Resource Calculations**: Cache expensive calculations with appropriate invalidation

### Memory Management
```typescript
// ✅ Preferred: Proper memory management
export class GameLoopService {
  private static activeTimers: Map<string, NodeJS.Timeout> = new Map();

  public static startEmpireTimer(empireId: string): void {
    // Clear existing timer to prevent memory leaks
    this.clearEmpireTimer(empireId);

    const timer = setInterval(() => {
      this.processEmpireTick(empireId);
    }, 60000);

    this.activeTimers.set(empireId, timer);
  }

  public static clearEmpireTimer(empireId: string): void {
    const existingTimer = this.activeTimers.get(empireId);
    if (existingTimer) {
      clearInterval(existingTimer);
      this.activeTimers.delete(empireId);
    }
  }
}
```

## Security Standards

### Input Validation
```typescript
// ✅ Preferred: Comprehensive input validation
export class ValidationService {
  public static validateBuildingRequest(request: CreateBuildingRequest): void {
    // Type validation
    if (!request || typeof request !== 'object') {
      throw new ValidationError('Invalid request format');
    }

    // Required field validation
    if (!request.buildingType || typeof request.buildingType !== 'string') {
      throw new ValidationError('Building type is required');
    }

    // Format validation
    if (!this.isValidBuildingType(request.buildingType)) {
      throw new ValidationError('Invalid building type');
    }

    // Range validation
    if (request.quantity && (request.quantity < 1 || request.quantity > 100)) {
      throw new ValidationError('Quantity must be between 1 and 100');
    }

    // Coordinate validation
    if (!this.isValidCoordinate(request.x, request.y)) {
      throw new ValidationError('Invalid coordinates');
    }
  }
}
```

## Documentation Standards

### Code Documentation
- **Complex Logic**: Document algorithms with O(n) complexity or higher
- **Business Rules**: Explain game balance and business logic
- **API Contracts**: Document input/output contracts for public methods
- **Architecture Decisions**: Explain significant design choices

### README Standards
```markdown
# Module Name

## Overview
Brief description of what this module does and its responsibilities.

## Architecture
Explanation of how this module fits into the larger system.

## Key Classes/Components
- `PrimaryClass`: Main functionality description
- `HelperClass`: Supporting functionality description

## Usage Examples
```typescript
// Example usage code
```

## Testing
How to test this module and what scenarios are covered.

## Performance Considerations
Any performance implications or requirements.
```

## Version Control Standards

### Commit Message Format
```markdown
type(scope): description

[optional body]

[optional footer]

Types:
- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- style: Changes that do not affect the meaning of the code
- refactor: A code change that neither fixes a bug nor adds a feature
- perf: A code change that improves performance
- test: Adding missing tests or correcting existing tests
- chore: Changes to the build process or auxiliary tools

Examples:
feat(game-loop): add real-time resource calculations
fix(building): resolve construction queue deadlock
refactor(auth): extract user management service
perf(database): optimize empire query performance
```

### Branch Naming Conventions
```markdown
# Feature branches
feature/add-building-construction-system
feature/implement-fleet-combat-mechanics

# Bug fix branches
fix/building-construction-deadlock
fix/resource-calculation-overflow

# Refactoring branches
refactor/extract-user-management-service
refactor/improve-error-handling-patterns

# Hotfix branches
hotfix/security-authentication-bypass
hotfix/game-breaking-resource-bug
```

## Enforcement and Compliance

### Automated Enforcement
- **Pre-commit Hooks**: ESLint, Prettier, TypeScript compilation
- **Pre-push Hooks**: Full test suite, complexity analysis
- **CI/CD Pipeline**: Comprehensive quality gates
- **IDE Integration**: Real-time feedback in development environment

### Manual Compliance
- **Code Reviews**: Reviewers verify adherence to standards
- **Self-Review**: Authors verify their own compliance
- **Pair Programming**: Peer verification of standards compliance
- **Mentorship**: Senior developers guide standards adoption

---

**Last Updated**: 2025-10-10
**Version**: 1.0.0
**Status**: Active