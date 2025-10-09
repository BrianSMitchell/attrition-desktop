## Relevant Files

Current Files to Modify:
- `packages/server/src/services/authSupabase.ts` - Authentication service implementation to refactor
- `packages/server/src/scripts/generateUniverseSupabase.ts` - Universe generation script to refactor
- `packages/server/src/routes/auth.ts` - Routes that use Supabase authentication
- `packages/server/src/config/supabase.ts` - Supabase client configuration

New Files to Create:
- `packages/server/src/services/supabase/client.ts` - Base Supabase client wrapper
- `packages/server/src/services/supabase/types.ts` - Shared Supabase type definitions
- `packages/server/src/services/auth/AuthService.ts` - Authentication service implementation
- `packages/server/src/services/auth/types.ts` - Auth-specific types
- `packages/server/src/services/empire/EmpireService.ts` - Empire management service
- `packages/server/src/services/empire/types.ts` - Empire-specific types
- `packages/server/src/services/universe/UniverseService.ts` - Universe generation service
- `packages/server/src/services/universe/types.ts` - Universe-specific types
- `packages/server/src/config/UniverseConfig.ts` - Universe configuration types and loader

Test Files to Create:
- `packages/server/src/services/supabase/__tests__/client.test.ts`
- `packages/server/src/services/auth/__tests__/AuthService.test.ts`
- `packages/server/src/services/empire/__tests__/EmpireService.test.ts`
- `packages/server/src/services/universe/__tests__/UniverseService.test.ts`

### Notes

- All new test files will be placed in `__tests__` directories alongside their implementation
- Run tests with `npm test` from the packages/server directory
- Consider creating a mock Supabase client for testing

## Tasks

- [ ] 1.0 Setup Testing Infrastructure
  - [ ] 1.1 Create Jest configuration for Supabase service tests
    - Create jest.config.js with TypeScript support
    - Configure test environment and module aliases
    - Verify configuration with simple test run
  - [ ] 1.2 Create mock Supabase client for testing
    - Implement basic mock client class
    - Add method stubs for all Supabase operations
    - Write tests to verify mock behavior
  - [ ] 1.3 Setup test environment variables
    - Create .env.test file
    - Add mock Supabase credentials
    - Write environment validation tests
  - [ ] 1.4 Create test utilities for common test operations
    - Implement database cleanup helpers
    - Create test data factories
    - Write tests for utility functions
  - [ ] 1.5 Run full test suite to verify infrastructure

- [ ] 2.0 Implement Base Supabase Layer
  - [ ] 2.1 Create SupabaseClient wrapper class
    - Implement singleton pattern
    - Add configuration validation
    - Write tests for initialization
  - [ ] 2.2 Implement retry logic and error handling
    - Add exponential backoff retry mechanism
    - Implement error classification
    - Write tests for retry behavior
  - [ ] 2.3 Add query builder wrappers
    - Implement type-safe query builders
    - Add result transformation helpers
    - Write tests for query building
  - [ ] 2.4 Add transaction support
    - Implement transaction wrapper
    - Add rollback handling
    - Write transaction tests
  - [ ] 2.5 Write integration tests for SupabaseClient
  - [ ] 2.6 Run full test suite

- [ ] 3.0 Implement Authentication Service
  - [ ] 3.1 Create auth types and interfaces
    - Define service interfaces
    - Create request/response types
    - Write type tests
  - [ ] 3.2 Implement AuthService registration logic
    - Implement user creation
    - Add password hashing
    - Write registration tests
  - [ ] 3.3 Implement AuthService login logic
    - Add credential validation
    - Implement token generation
    - Write login tests
  - [ ] 3.4 Write integration tests for AuthService
    - Test registration flow
    - Test login flow
    - Test error cases
  - [ ] 3.5 Update auth routes to use new AuthService
    - Refactor route handlers
    - Update error handling
    - Write route tests
  - [ ] 3.6 Run full test suite

- [ ] 4.0 Implement Empire Service
  - [ ] 4.1 Create empire types and interfaces
    - Define empire model
    - Create service interfaces
    - Write type tests
  - [ ] 4.2 Implement empire creation logic
    - Add empire initialization
    - Implement resource allocation
    - Write creation tests
  - [ ] 4.3 Implement starter planet claiming
    - Add planet selection logic
    - Implement atomic claiming
    - Write claiming tests
  - [ ] 4.4 Write integration tests for EmpireService
    - Test empire creation
    - Test planet claiming
    - Test error cases
  - [ ] 4.5 Update registration flow to use EmpireService
    - Integrate with AuthService
    - Update registration handler
    - Write integration tests
  - [ ] 4.6 Run full test suite

- [ ] 5.0 Implement Universe Service
  - [ ] 5.1 Create universe configuration types
    - Define generation parameters
    - Add validation rules
    - Write type tests
  - [ ] 5.2 Implement universe generation logic
    - Add coordinate system
    - Implement generation algorithm
    - Write generation tests
  - [ ] 5.3 Add progress reporting and batch processing
    - Implement progress tracking
    - Add batch insertion
    - Write batch processing tests
  - [ ] 5.4 Write integration tests for UniverseService
    - Test full generation
    - Test configuration validation
    - Test error cases
  - [ ] 5.5 Create new universe generation script
    - Implement CLI interface
    - Add progress reporting
    - Write script tests
  - [ ] 5.6 Run full test suite

- [ ] 6.0 Migration and Cleanup
  - [ ] 6.1 Create feature flags for gradual rollout
    - Implement feature flag system
    - Add toggle points
    - Write feature flag tests
  - [ ] 6.2 Write migration guide
    - Document breaking changes
    - Create upgrade steps
    - Add rollback procedures
  - [ ] 6.3 Deprecate old Supabase implementations
    - Add deprecation warnings
    - Create migration examples
    - Write migration tests
  - [ ] 6.4 Remove legacy code
    - Remove old implementations
    - Update dependencies
    - Run full test suite
  - [ ] 6.5 Final verification
    - Run all tests
    - Verify feature flags
    - Check documentation
