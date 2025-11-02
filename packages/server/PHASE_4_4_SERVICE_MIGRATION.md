# Phase 4.4: Migrate Key Services to Use New Types

## Goal
Adopt the new type system (`ApplicationError` hierarchy, response types, structured data types) in core services that power the API routes.

## Priority Services (by usage frequency)

### Tier 1: Critical (Used by multiple routes)
1. **EmpireService** - Empire data, credits, history
   - `getCreditHistory()` - Returns `CreditTransaction[]` 
   - `getEmpireDetails()` - Returns empire data structure
   - **Status:** Partially typed (uses interfaces, no error classes)

2. **EmpireResolutionService** - User → Empire lookup
   - `resolveEmpireByUserObject()` - Critical dependency
   - **Status:** Uses generic Error throws

3. **DashboardService** - Dashboard aggregation
   - `getDashboardData()` - Returns combined dashboard data
   - **Status:** Not yet reviewed

4. **DefensesService** - Defense structures
   - `getStatus()` - Status for bases
   - `start()` - Start construction
   - **Status:** Not yet reviewed

5. **UnitsService** - Unit production
   - `getQueue()` - Production queue
   - **Status:** Not yet reviewed

### Tier 2: Important (Single domain)
6. **StructuresService** / **StructureService** - Building structures
7. **ResourceService** - Resource calculations
8. **TechService** - Technology/research
9. **FleetMovementService** - Fleet operations

## Migration Strategy

### Phase A: Service Error Handling (All Tiers)
```typescript
// BEFORE
static async getCreditHistory(user: any) {
  if (!empireRow) {
    throw new Error(ERROR_MESSAGES.EMPIRE_NOT_FOUND);
  }
}

// AFTER
static async getCreditHistory(user: any) {
  if (!empireRow) {
    throw new NotFoundError('Empire', userId);
  }
}
```

### Phase B: Response Type Standardization
```typescript
// BEFORE
interface CreditTransaction {
  _id: string;
  amount: number;
  type: string;
  // ... more fields
}

// AFTER (Explicit return type)
static async getCreditHistory(
  user: any,
  options: CreditHistoryOptions = {}
): Promise<CreditTransaction[]> {
  // Same logic, but typed response
}
```

### Phase C: Input Validation Using Error Types
```typescript
// BEFORE
if (!locationCoord || !defenseKey) {
  throw new Error('Invalid input');
}

// AFTER
if (!locationCoord || !defenseKey) {
  throw new ValidationError('Required: locationCoord, defenseKey', {
    missing: [...(locationCoord ? [] : ['locationCoord']), ...]
  });
}
```

## Implementation Order

### Step 1: EmpireService (High Usage)
- [ ] Update error handling to use error classes
- [ ] Add explicit return type annotations
- [ ] Document return data structures

### Step 2: EmpireResolutionService (Dependency)
- [ ] Replace generic Error with typed errors
- [ ] Ensure all null/undefined cases throw appropriate errors

### Step 3: DashboardService (Dashboard Routes)
- [ ] Review current implementation
- [ ] Add error handling with typed errors
- [ ] Define dashboard data response structure

### Step 4: DefensesService (Defense Routes)
- [ ] Implement typed errors for all error paths
- [ ] Add validation using typed errors
- [ ] Document error scenarios

### Step 5: UnitsService (Unit Routes)
- [ ] Apply same pattern as DefensesService
- [ ] Ensure consistent error codes

### Step 6: Remaining Services (As Time Allows)
- StructuresService
- ResourceService
- TechService
- FleetMovementService

## Common Error Patterns

### Authentication/Authorization
```typescript
if (!user?.id) {
  throw new AuthenticationError('User not authenticated');
}

if (!hasPermission) {
  throw new AuthorizationError('Insufficient privileges');
}
```

### Validation
```typescript
if (amount <= 0) {
  throw new ValidationError('Amount must be positive', { amount });
}

if (!isValidCoordinate(coord)) {
  throw new ValidationError('Invalid coordinate format', { coordinate: coord });
}
```

### Database/Not Found
```typescript
if (!empireRow) {
  throw new NotFoundError('Empire', empireId);
}

if (!unit) {
  throw new NotFoundError('Unit');
}
```

### Business Logic
```typescript
if (defenseAlreadyExists) {
  throw new ConflictError('Defense already in progress at this location');
}

if (insufficientResources) {
  throw new BadRequestError('Insufficient credits for this operation', {
    required: costCalculated,
    available: currentCredits
  });
}
```

### Service Unavailable
```typescript
if (!supabaseConnection) {
  throw new ServiceUnavailableError('Database temporarily unavailable');
}

if (externalServiceDown) {
  throw new ExternalServiceError('MapService', 'Failed to validate coordinate');
}
```

## Type Definition Standards

### Service Method Signatures
```typescript
export class EmpireService {
  /**
   * Get credit transaction history
   * @param user - Authenticated user object
   * @param options - Query options (limit, sort)
   * @returns Promise<CreditTransaction[]>
   * @throws NotFoundError if empire not found
   * @throws DatabaseError if query fails
   */
  static async getCreditHistory(
    user: AuthenticatedUser,
    options: CreditHistoryOptions = {}
  ): Promise<CreditTransaction[]> {
    // implementation
  }
}
```

### Option Objects (for clarity)
```typescript
export interface CreditHistoryOptions {
  limit?: number;  // Max 200, default 50
  sort?: 'asc' | 'desc';  // Sort direction
  startDate?: Date;  // Optional: filter by date
}
```

### Response DTOs
```typescript
export interface CreditTransaction {
  id: string;
  empireId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  note: string | null;
  balanceAfter: number | null;
  createdAt: string; // ISO string
}
```

## Testing Considerations

After migration, each service should:
- ✅ Throw correct error types in error scenarios
- ✅ Return properly typed response objects
- ✅ Handle null/undefined inputs with ValidationError
- ✅ Validate business constraints (amount > 0, valid coords, etc.)
- ✅ Have consistent error messages and codes

## Benefits

✅ **Better Error Handling** - Type-safe error throwing with appropriate HTTP codes  
✅ **Type Safety** - Services return predictable, typed responses  
✅ **Maintainability** - Error scenarios clearly defined in service contracts  
✅ **Consistency** - All services follow same patterns  
✅ **Better Debugging** - Error codes and context help troubleshooting  

## Estimated Effort

- Tier 1 Services (5 services): 2-3 hours
- Tier 2 Services (4 services): 1-2 hours  
- Testing & Validation: 1 hour
- **Total: 4-6 hours**

## Success Criteria

✅ All Tier 1 services use typed errors instead of generic Error  
✅ All service methods have documented error-throwing scenarios  
✅ Services maintain backward compatibility (same return structures)  
✅ Error codes match error type hierarchy (401, 403, 404, 422, 500, etc.)  
✅ No generic "Error" thrown from services (except during critical system failures)  
