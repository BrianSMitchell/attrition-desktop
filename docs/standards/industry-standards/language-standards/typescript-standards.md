# TypeScript Development Standards

## Overview

This document establishes comprehensive TypeScript development standards based on Microsoft's official guidelines, community best practices, and the specific requirements of the Attrition space strategy game. These standards ensure type safety, maintainability, and performance for large-scale TypeScript applications.

## Core TypeScript Standards

### Type System Best Practices

#### Strict Type Checking
- **Standard**: Enable all strict type checking options
- **Configuration**:
  ```json
  {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true
  }
  ```
- **Rationale**: Prevents runtime errors, improves code quality and developer experience

#### Interface vs Type Aliases
- **Interfaces** for object shapes and class contracts:
  ```typescript
  interface GameEntity {
    id: string;
    name: string;
    position: Vector3D;
    createdAt: Date;
  }
  ```
- **Type aliases** for unions, primitives, and complex types:
  ```typescript
  type ResourceType = 'metal' | 'crystal' | 'deuterium' | 'energy';
  type GameState = 'playing' | 'paused' | 'finished';
  type Coordinates = [number, number, number];
  ```

#### Generic Constraints
- **Use constraints** for better type safety:
  ```typescript
  function calculateDistance<T extends GameEntity>(entity1: T, entity2: T): number {
    // Implementation with type-safe property access
  }
  ```
- **Avoid excessive generics** that reduce readability

### Code Organization Standards

#### Module Structure
- **Single Responsibility**: One class/interface per file for complex types
- **Barrel Exports**: Use index.ts for clean public APIs:
  ```typescript
  // services/index.ts
  export { UserManagementService } from './UserManagementService';
  export { PlanetClaimingService } from './PlanetClaimingService';
  export { ResourceCalculationService } from './ResourceCalculationService';
  ```
- **Feature-based Organization**: Group related files in feature directories

#### Import/Export Patterns
- **Named imports** for specific functions/types:
  ```typescript
  import { UserManagementService } from '../services/UserManagementService';
  ```
- **Default imports** only for React components and main modules
- **No namespace imports** in modern TypeScript code

### Class Design Standards

#### Constructor Patterns
- **Dependency Injection**: Use constructor injection for services:
  ```typescript
  constructor(
    private userService: UserManagementService,
    private planetService: PlanetClaimingService
  ) {}
  ```
- **Property Initialization**: Initialize properties in constructor or as class properties
- **No public fields**: Use private fields with public getters when needed

#### Method Design
- **Single Responsibility**: Methods should do one thing well
- **Parameter Limits**: Maximum 5 parameters per method
- **Return Types**: Always specify return types for public methods
- **Async/Await**: Use for all asynchronous operations

### Error Handling Standards

#### Custom Error Classes
- **Domain-specific errors** for game logic:
  ```typescript
  export class InsufficientResourcesError extends Error {
    constructor(resource: string, required: number, available: number) {
      super(`Insufficient ${resource}: required ${required}, available ${available}`);
      this.name = 'InsufficientResourcesError';
    }
  }
  ```

#### Error Boundaries
- **React Error Boundaries** for component error handling
- **Service-level error handling** with proper error propagation
- **User-friendly error messages** without exposing implementation details

### Type Safety Standards

#### Null and Undefined Handling
- **Strict null checks** enabled at all times
- **Optional properties** clearly marked with `?`:
  ```typescript
  interface UserPreferences {
    theme?: 'light' | 'dark';
    notifications?: boolean;
    language?: string;
  }
  ```
- **Non-null assertion** (`!`) used sparingly and with justification

#### Union Types vs Enums
- **Union types** for simple string/number literals:
  ```typescript
  type BuildingType = 'mine' | 'factory' | 'research-lab' | 'defense';
  ```
- **Enums** for bit flags or when reverse mapping is needed:
  ```typescript
  enum GameStatus {
    Initializing = 1,
    Playing = 2,
    Paused = 4,
    Finished = 8
  }
  ```

### Performance Standards

#### Type Instantiation
- **Avoid type assertions** that bypass compiler checks:
  ```typescript
  // Avoid
  const entity = gameObject as GameEntity;

  // Prefer
  function isGameEntity(obj: any): obj is GameEntity {
    return obj && typeof obj === 'object' && 'id' in obj;
  }
  ```
- **Generic constraints** to ensure type safety without runtime checks

#### Bundle Size Optimization
- **Tree shaking support**: Use named exports and avoid side effects in module initialization
- **Dynamic imports** for route-based code splitting:
  ```typescript
  const GameComponent = lazy(() => import('./components/GameComponent'));
  ```

## Advanced TypeScript Patterns

### Conditional Types
- **For complex type logic**:
  ```typescript
  type ResourceValue<T extends ResourceType> = T extends 'energy' ? number :
                                             T extends 'metal' | 'crystal' | 'deuterium' ? number : never;
  ```
- **Template literal types** for string manipulation:
  ```typescript
  type EventName<T extends string> = `on${Capitalize<T>}`;
  ```

### Mapped Types
- **Transform existing types**:
  ```typescript
  type Optional<T> = {
    [P in keyof T]?: T[P];
  };

  type ReadonlyResource<T> = {
    readonly [P in keyof T]: T[P];
  };
  ```

### Utility Types Usage
- **Partial<T>**: For update operations
- **Required<T>**: When all properties must be present
- **Pick<T, K>**: For selecting specific properties
- **Omit<T, K>**: For excluding specific properties
- **Record<K, T>**: For key-value mappings

## Project-Specific Standards

### Game Entity Types
- **Consistent ID fields**: All entities use UUID strings:
  ```typescript
  interface BaseEntity {
    id: string; // UUID format
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Coordinate system**: Consistent 3D coordinate types:
  ```typescript
  interface Vector3D {
    x: number;
    y: number;
    z: number;
  }

  type Coordinates = [number, number, number];
  ```

### Service Layer Types
- **Request/Response contracts**:
  ```typescript
  interface CreateBuildingRequest {
    type: BuildingType;
    location: Coordinates;
    empireId: string;
  }

  interface CreateBuildingResponse {
    success: boolean;
    buildingId?: string;
    error?: string;
  }
  ```
- **Error types** for different failure modes

### Real-time System Types
- **WebSocket message types**:
  ```typescript
  interface WebSocketMessage<T = any> {
    type: string;
    payload: T;
    timestamp: Date;
    userId: string;
  }
  ```
- **State synchronization types** for multiplayer consistency

## Code Quality Standards

### Naming Conventions
- **PascalCase** for classes, interfaces, types, enums
- **camelCase** for functions, methods, properties, variables
- **UPPER_CASE** for constants and enum values
- **Descriptive names** that explain purpose and behavior

### Documentation Standards
- **TSDoc comments** for all public APIs:
  ```typescript
  /**
   * Calculates the distance between two game entities
   * @param entity1 First game entity
   * @param entity2 Second game entity
   * @returns Distance in game units
   * @throws {InvalidCoordinatesError} When coordinates are invalid
   */
  function calculateDistance(entity1: GameEntity, entity2: GameEntity): number {
    // Implementation
  }
  ```

### Testing Standards
- **Type-safe mocks** for external dependencies
- **Generic test utilities** for common game scenarios
- **Snapshot testing** for React component consistency

## Tool Integration

### ESLint Rules
- **@typescript-eslint/no-explicit-any**: Error level
- **@typescript-eslint/explicit-function-return-type**: Warn for public methods
- **@typescript-eslint/no-unused-vars**: Error level
- **@typescript-eslint/prefer-const**: Error level

### Build Tool Configuration
- **Source maps** enabled for debugging
- **Declaration files** generated for library consumption
- **Incremental compilation** for faster builds

## Migration and Compatibility

### Version Management
- **Regular updates** to latest stable TypeScript version
- **Compatibility testing** before major version upgrades
- **Gradual migration** for breaking changes

### Legacy Code Handling
- **Type-only imports** for migration compatibility:
  ```typescript
  import type { LegacyType } from './legacy-module';
  ```
- **@ts-ignore** used sparingly with justification comments

## Performance Benchmarks

### Type Checking Performance
- **Large union types** may impact IDE performance
- **Recursive types** should be used carefully
- **Module augmentation** preferred over global declarations

### Bundle Impact
- **Type definitions** excluded from production bundles
- **Generic constraints** preferred over type assertions for performance
- **Const assertions** for literal types when possible

## Best Practices Summary

### Do
- ✅ Use strict type checking options
- ✅ Prefer interfaces for object contracts
- ✅ Use union types for simple alternatives
- ✅ Provide explicit return types for public APIs
- ✅ Use TSDoc for documentation
- ✅ Leverage utility types for type transformations

### Don't
- ❌ Use `any` type without justification
- ❌ Mix different ID types (string vs number vs UUID)
- ❌ Use type assertions to bypass compiler checks
- ❌ Create deep inheritance hierarchies
- ❌ Use global declarations for module-specific types

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Effective TypeScript](https://effectivetypescript.com/)
- [TypeScript Design Patterns](https://www.typescriptlang.org/docs/handbook/advanced-types.html)

## Version History

- **v1.0**: Initial standards based on TypeScript 5.x
- **v1.1**: Added game-specific patterns and real-time system types
- **v1.2**: Integrated with project ESLint rules and build system

## Last Updated

2025-10-10