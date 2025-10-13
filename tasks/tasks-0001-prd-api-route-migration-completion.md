# Tasks: API Route Migration Completion

Based on PRD: `0001-prd-api-route-migration-completion.md`

## Relevant Files

### Fleet Management Routes
- `packages/server/src/routes/game/fleets.ts` - ✅ New fleet routes module containing fleet management endpoints (list, overview, detail, movement)
- `packages/server/src/__tests__/fleetRoutes.test.ts` - ✅ Unit tests for fleet routes (30 tests implemented)
- `packages/server/src/routes/game/index.ts` - ✅ Main game router with fleet routes mounted
- `packages/server/src/routes/v1/fleetRoutes.ts` - Existing v1 fleet routes (reference for migration)

### Services Integration
- `packages/server/src/services/fleets/FleetService.ts` - Fleet business logic service (may need creation)
- `packages/server/src/services/fleets/FleetService.test.ts` - Unit tests for FleetService
- `packages/server/src/services/fleets/FleetMovementService.ts` - Existing fleet movement service (verify integration)

### Route Deprecation
- `packages/server/src/middleware/deprecation.ts` - Middleware for adding deprecation headers
- `packages/server/src/middleware/deprecation.test.ts` - Unit tests for deprecation middleware
- `packages/server/src/routes/v1/index.ts` - V1 routes index, needs deprecation middleware

### Territory/Bases Verification
- `packages/server/src/routes/game/bases/index.ts` - Existing bases routes (verify completeness)
- `packages/server/src/routes/v1/territoryRoutes.ts` - V1 territory routes (audit for missing features)

### Documentation & Testing
- `packages/server/docs/api-migration.md` - Update migration documentation
- `packages/server/src/routes/game/__tests__/integration/fleet-routes.integration.test.ts` - Integration tests

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `fleets.ts` and `fleets.test.ts` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- All route tests should include authentication, error handling, and response format validation.

## Tasks

- [ ] 1.0 Fleet Management Routes Migration
  - [x] 1.1 Create fleet routes module with list endpoint (FR-1, FR-2)
  - [x] 1.2 Implement fleet detail endpoint (FR-3)
  - [x] 1.3 Create fleet movement endpoint (FR-4)
  - [x] 1.4 Add fleet overview endpoint for frontend compatibility (FR-5)
  - [ ] 1.5 Implement fleet size calculation and unit composition handling (FR-6, FR-7)
  - [ ] 1.6 Mount fleet routes in game router
  - [ ] 1.7 Write comprehensive unit tests for all fleet endpoints
  - [ ] 1.8 Test: `npx jest packages/server/src/routes/game/fleets.test.ts`

- [ ] 2.0 Route Deprecation Implementation
  - [ ] 2.1 Create deprecation middleware with header injection (FR-8, FR-9)
  - [ ] 2.2 Add deprecation usage logging functionality (FR-10)
  - [ ] 2.3 Apply deprecation middleware to all v1 routes (FR-11)
  - [ ] 2.4 Write unit tests for deprecation middleware
  - [ ] 2.5 Test: `npx jest packages/server/src/middleware/deprecation.test.ts`

- [ ] 3.0 Territory/Bases Migration Verification
  - [ ] 3.1 Audit v1 territory routes functionality (FR-16, FR-17)
  - [ ] 3.2 Compare with existing bases routes features
  - [ ] 3.3 Identify and document any missing functionality
  - [ ] 3.4 Implement missing territory features in bases routes (if any)
  - [ ] 3.5 Ensure backward compatibility for territory data structures (FR-18)
  - [ ] 3.6 Test: `npx jest packages/server/src/routes/game/bases`

- [ ] 4.0 API Consistency and Quality Assurance
  - [ ] 4.1 Validate all new routes follow response format standard (FR-12)
  - [ ] 4.2 Ensure authentication middleware applied consistently (FR-13)
  - [ ] 4.3 Verify empire resolution patterns match existing routes (FR-14)
  - [ ] 4.4 Test error handling and HTTP status codes (FR-15)
  - [ ] 4.5 Create integration tests for fleet route workflows
  - [ ] 4.6 Test: `npx jest packages/server/src/routes/game/__tests__/integration`

- [ ] 5.0 Documentation and Migration Completion
  - [ ] 5.1 Update API migration documentation with completed routes
  - [ ] 5.2 Document new fleet endpoints with request/response examples
  - [ ] 5.3 Create migration guide for frontend developers
  - [ ] 5.4 Update route deprecation timeline and removal plan
  - [ ] 5.5 Run full test suite to ensure no regressions
  - [ ] 5.6 Test: `npx jest` (run all tests)