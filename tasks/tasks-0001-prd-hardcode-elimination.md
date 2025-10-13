# Tasks: Systematic Hardcode Elimination

## Relevant Files

- `packages/server/src/constants/database-fields.ts` - Contains DB_TABLES, DB_FIELDS, and DB_SELECTS constants that will replace hardcoded database references.
- `packages/server/src/constants/response-formats.ts` - Contains HTTP_STATUS, RESPONSE_FORMAT, and ERROR_CODES constants for standardizing API responses.
- `packages/server/src/constants/api-endpoints.ts` - Contains API_ENDPOINTS and buildEndpoint helper for eliminating hardcoded API paths.
- `packages/server/src/services/**/*.ts` - All service files (~30 files) that contain database queries and need constant imports.
- `packages/server/src/routes/**/*.ts` - All route files (~25 files) that contain hardcoded status codes and error messages.
- `packages/server/src/middleware/*.ts` - Middleware files that may contain hardcoded response patterns.
- `packages/server/src/utils/*.ts` - Utility files that may reference database tables or HTTP codes.
- `scripts/validation/hardcode-detector.ts` - New automated validation script to detect remaining hardcoded values.
- `scripts/validation/constants-validator.ts` - New script to validate proper constant usage.
- `.eslintrc.js` - ESLint configuration to add hardcoding prevention rules.
- `package.json` - For adding validation scripts and pre-commit hooks.
- `docs/development/constants-usage-guide.md` - New documentation for mandatory constant usage.

### Notes

- The codebase contains approximately 200+ hardcoded values across 50+ files based on our analysis.
- Constants infrastructure is already established and ready for use.
- File-by-file processing ensures systematic elimination without missing any instances.
- Single PR approach enables comprehensive review and easy rollback if needed.

## Tasks

- [ ] 1.0 Database References Elimination (Services Layer)
  - [ ] 1.1 Create baseline validation script to identify all hardcoded database references
  - [ ] 1.2 Process services directory alphabetically (authService.ts through unitsService.ts)
  - [ ] 1.3 Add required constant imports to each service file
  - [ ] 1.4 Replace hardcoded table names with DB_TABLES constants
  - [ ] 1.5 Replace hardcoded field names with DB_FIELDS constants
  - [ ] 1.6 Update SELECT clauses to use DB_SELECTS predefined patterns where applicable
  - [ ] 1.7 Process nested service directories (bases/, defenses/, economy/, etc.)
  - [ ] 1.8 Run TypeScript compilation check after each directory completion
  - [ ] 1.9 Execute existing test suite to ensure zero regressions
  
- [ ] 2.0 Database References Elimination (Routes Layer)  
  - [ ] 2.1 Process main routes directory files (admin.ts, auth.ts, game.ts, etc.)
  - [ ] 2.2 Add constant imports to route files needing database references
  - [ ] 2.3 Replace hardcoded database table names in route handlers
  - [ ] 2.4 Update database field references in route logic
  - [ ] 2.5 Process game routes subdirectories (bases/, territories/, tech/)
  - [ ] 2.6 Process v1 routes directory for legacy endpoint compatibility
  - [ ] 2.7 Ensure middleware directory database references use constants
  - [ ] 2.8 Update utils directory files that reference database schemas
  - [ ] 2.9 Run comprehensive test suite after routes layer completion
  
- [ ] 3.0 HTTP Response Standardization (All Layers)
  - [ ] 3.1 Create detection script for hardcoded HTTP status codes
  - [ ] 3.2 Replace hardcoded status codes with HTTP_STATUS constants in all route files
  - [ ] 3.3 Replace manual error response construction with RESPONSE_FORMAT builders
  - [ ] 3.4 Standardize error messages using ERROR_CODES constants
  - [ ] 3.5 Update service layer files that construct HTTP responses
  - [ ] 3.6 Ensure consistent success response formatting across all endpoints
  - [ ] 3.7 Update middleware files to use standardized response patterns
  - [ ] 3.8 Process authentication and error handling middleware
  - [ ] 3.9 Validate all API responses follow the established patterns
  - [ ] 3.10 Run integration tests to ensure API contract compatibility
  
- [ ] 4.0 API Endpoint References Cleanup
  - [ ] 4.1 Scan codebase for hardcoded API paths in comments and documentation
  - [ ] 4.2 Replace hardcoded endpoint references with API_ENDPOINTS constants
  - [ ] 4.3 Update route registration to use API_ENDPOINTS where applicable
  - [ ] 4.4 Ensure endpoint parameter substitution uses buildEndpoint helper
  - [ ] 4.5 Update any test files that use hardcoded endpoint paths
  - [ ] 4.6 Review client-side code references (if any) that need updating
  - [ ] 4.7 Update API documentation to reference constant definitions
  - [ ] 4.8 Verify all endpoint helpers and utilities use constants
  
- [ ] 5.0 Validation Scripts and Enforcement Tools
  - [ ] 5.1 Create comprehensive hardcode detection script (scripts/validation/hardcode-detector.ts)
  - [ ] 5.2 Implement database table name detection with regex patterns
  - [ ] 5.3 Implement HTTP status code detection for common patterns
  - [ ] 5.4 Create error message duplication detector
  - [ ] 5.5 Build constants usage validator (scripts/validation/constants-validator.ts)
  - [ ] 5.6 Add ESLint rules to prevent future hardcoding violations
  - [ ] 5.7 Configure pre-commit hooks for automatic validation
  - [ ] 5.8 Create development documentation (docs/development/constants-usage-guide.md)
  - [ ] 5.9 Add npm scripts for validation commands in package.json
  - [ ] 5.10 Run final comprehensive validation across entire codebase
  - [ ] 5.11 Execute full test suite and performance benchmarks
  - [ ] 5.12 Document rollback procedures and success metrics
