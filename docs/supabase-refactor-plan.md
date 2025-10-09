# Supabase Integration Refactoring Plan

## Phase 1: Preparation and Assessment

### Scope Definition
**Target**: Refactor Supabase integration modules to improve modularity and maintainability

**Objectives**:
1. Create a unified Supabase service layer
2. Separate concerns between data access and business logic
3. Improve testability and mocking capability
4. Maintain backward compatibility with existing APIs

**Success Metrics**:
- Test coverage > 80%
- Each file < 300 lines
- Clear separation between Supabase queries and business logic
- All existing tests and functionality remain working

### Code Analysis Results
Current structure has several issues:
1. Direct Supabase client usage across files
2. Mixed concerns in authSupabase.ts (auth, empire creation, planet claiming)
3. Large, complex transaction flows in registration
4. Limited error handling and retry mechanisms
5. Hardcoded universe generation configuration

### Risk Assessment
**Potential Impacts**:
- Authentication system disruption
- Universe generation errors
- Data inconsistency in registration flow
- API response format changes

**Mitigation**:
- Comprehensive test suite before refactoring
- Gradual rollout with feature flags
- Backup of current implementation
- Thorough validation of data consistency

## Phase 2: Testing Foundation

### Test Coverage Plan

1. **Authentication Service Tests**:
   - User registration flow
   - Login validation
   - Error handling scenarios
   - Token generation/validation

2. **Universe Generation Tests**:
   - Configuration validation
   - Generation consistency
   - Error handling
   - Data structure validation

3. **Integration Tests**:
   - Complete registration flow
   - Universe existence checks
   - Database constraints
   - Transaction rollbacks

## Phase 3: Refactoring Steps

### Step 1: Create Supabase Service Layer
```typescript
// New file: src/services/supabase/client.ts
export class SupabaseClient {
  private static instance: SupabaseClient;
  private constructor() { /* ... */ }
  
  static getInstance(): SupabaseClient {
    if (!SupabaseClient.instance) {
      SupabaseClient.instance = new SupabaseClient();
    }
    return SupabaseClient.instance;
  }
  
  // Wrapped client methods with better error handling
  async query<T>(table: string, ...args: any[]): Promise<T> {
    try {
      // Add retry logic, error handling, etc.
    } catch (error) {
      // Standardized error handling
    }
  }
}
```

### Step 2: Implement Domain Services

1. **Authentication Service**:
```typescript
// New file: src/services/auth/AuthService.ts
export class AuthService {
  constructor(private supabase: SupabaseClient) {}
  
  async register(params: RegisterParams): Promise<RegisterResult> {
    // Implementation
  }
  
  async login(params: LoginParams): Promise<LoginResult> {
    // Implementation
  }
}
```

2. **Empire Service**:
```typescript
// New file: src/services/empire/EmpireService.ts
export class EmpireService {
  constructor(private supabase: SupabaseClient) {}
  
  async createEmpire(params: CreateEmpireParams): Promise<Empire> {
    // Implementation
  }
  
  async claimStarterPlanet(empireId: string): Promise<Location> {
    // Implementation
  }
}
```

3. **Universe Service**:
```typescript
// New file: src/services/universe/UniverseService.ts
export class UniverseService {
  constructor(
    private supabase: SupabaseClient,
    private config: UniverseConfig
  ) {}
  
  async generate(): Promise<void> {
    // Implementation
  }
  
  async exists(server: string): Promise<boolean> {
    // Implementation
  }
}
```

### Step 3: Configuration Improvements

1. Create typed configuration objects:
```typescript
// New file: src/config/UniverseConfig.ts
export interface UniverseConfig {
  serverName: string;
  galaxyCount: number;
  // ... other config
}

export const getUniverseConfig = (): UniverseConfig => ({
  // ... load from env or config file
});
```

### Step 4: New File Structure

```
src/
  services/
    supabase/
      client.ts           # Base Supabase client wrapper
      types.ts           # Shared Supabase types
    auth/
      AuthService.ts     # Authentication logic
      types.ts          # Auth-specific types
    empire/
      EmpireService.ts   # Empire management
      types.ts          # Empire-specific types
    universe/
      UniverseService.ts # Universe generation
      types.ts          # Universe-specific types
  config/
    supabase.ts         # Supabase configuration
    UniverseConfig.ts   # Universe generation config
```

## Phase 4: Implementation Order

1. Create base SupabaseClient wrapper
2. Implement and test AuthService
3. Implement and test EmpireService
4. Implement and test UniverseService
5. Update auth.ts routes to use new services
6. Create migration script for universe generation

## Phase 5: Validation Plan

1. **Unit Tests**:
   - Each service method
   - Error handling paths
   - Configuration validation

2. **Integration Tests**:
   - Complete registration flow
   - Universe generation
   - Error scenarios

3. **Performance Tests**:
   - Registration throughput
   - Universe generation time
   - Query response times

## Phase 6: Rollout Strategy

1. Deploy service layer changes
2. Migrate auth endpoints one at a time
3. Test universe generation in staging
4. Gradual production rollout

## Success Criteria

1. All tests passing
2. No regression in functionality
3. Improved code organization
4. Better error handling
5. Easier testing and mocking
6. Cleaner separation of concerns

## Estimated Timeline

- Phase 1 (Preparation): 1 day
- Phase 2 (Testing): 2 days
- Phase 3 (Implementation): 3-4 days
- Phase 4 (Validation): 1-2 days
- Phase 5 (Rollout): 1-2 days

Total: 8-11 days