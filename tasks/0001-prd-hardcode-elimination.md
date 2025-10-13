# PRD: Systematic Hardcode Elimination

## Introduction/Overview

This PRD outlines the systematic elimination of hardcoded values throughout the Attrition codebase, replacing them with established constants from our recently created constants files. The goal is to achieve 100% elimination of hardcoded database table names, HTTP status codes, error messages, API endpoints, and database field references, transforming our codebase into a maintainable, DRY (Don't Repeat Yourself) system.

**Problem Statement:** Our codebase currently contains 200+ instances of hardcoded values scattered across 50+ files, creating maintenance overhead, increasing the risk of typos, and making refactoring difficult. With our new constants infrastructure in place, we can systematically eliminate these hardcoded references.

## Goals

1. **Complete Elimination:** Achieve 100% removal of hardcoded values in favor of constants
2. **Zero Regression:** Maintain all existing functionality without introducing bugs
3. **Improved Maintainability:** Enable single-point-of-change for database schemas, API paths, and error messages
4. **Enhanced Developer Experience:** Provide better IntelliSense, autocomplete, and type safety
5. **Documentation:** Create automated validation to prevent future hardcoding

## User Stories

**As a Developer:**
- I want to change a database table name in one place and have it update everywhere
- I want IntelliSense to help me use the correct field names and avoid typos
- I want consistent error messages across all API endpoints
- I want to easily find and modify API endpoint definitions

**As a Maintainer:**
- I want to ensure schema changes are reflected consistently across the entire codebase
- I want to catch hardcoding violations during code review
- I want confidence that refactoring won't break the application due to missed hardcoded references

**As a Code Reviewer:**
- I want automated tools to flag any new hardcoded values in PRs
- I want assurance that constants are being used correctly throughout the codebase

## Functional Requirements

### Phase 1: Database References (Priority 1)
1. **FR-1.1:** Replace all hardcoded database table names with `DB_TABLES` constants (50+ instances across 30+ files)
2. **FR-1.2:** Replace hardcoded database field names in SELECT clauses with `DB_FIELDS` constants
3. **FR-1.3:** Update all Supabase queries to use `DB_SELECTS` predefined patterns where applicable
4. **FR-1.4:** Ensure all database-related hardcoding in services, routes, and utilities is eliminated

### Phase 2: HTTP Response Management (Priority 2)
5. **FR-2.1:** Replace all hardcoded HTTP status codes with `HTTP_STATUS` constants (100+ instances)
6. **FR-2.2:** Replace manual error response construction with `RESPONSE_FORMAT` builders
7. **FR-2.3:** Standardize all error responses using `ERROR_CODES` constants
8. **FR-2.4:** Implement consistent success response formatting across all endpoints

### Phase 3: API Endpoint References (Priority 3)
9. **FR-3.1:** Replace hardcoded API paths in route comments with `API_ENDPOINTS` references
10. **FR-3.2:** Update any client-side or testing code that uses hardcoded endpoints
11. **FR-3.3:** Ensure all endpoint parameter substitution uses the `buildEndpoint` helper function

### Phase 4: Validation and Enforcement
12. **FR-4.1:** Create automated scripts to detect remaining hardcoded values
13. **FR-4.2:** Implement ESLint rules to prevent future hardcoding
14. **FR-4.3:** Add pre-commit hooks to validate constant usage
15. **FR-4.4:** Update development documentation to mandate constant usage

## Non-Goals (Out of Scope)

- **Configuration Values:** Environment variables and config files are intentionally excluded
- **Third-party Library Constants:** External library-specific hardcoded values that can't be abstracted
- **Test Data:** Hardcoded test fixtures and mock data (unless they reference production schemas)
- **Legacy Code:** Deprecated code scheduled for removal
- **Client-side Constants:** Frontend-specific hardcoding (this PRD focuses on server-side code)

## Design Considerations

### File-by-File Approach
- Process files systematically in alphabetical order within each service directory
- Maintain a checklist to track progress and ensure nothing is missed
- Focus on one file completely before moving to the next

### Import Strategy
```typescript
// Standard import pattern for all files
import { DB_TABLES, DB_FIELDS, DB_SELECTS } from '../../../constants/database-fields';
import { HTTP_STATUS, RESPONSE_FORMAT, ERROR_CODES } from '../../../constants/response-formats';
import { API_ENDPOINTS, buildEndpoint } from '../../../constants/api-endpoints';
```

### Transformation Examples
```typescript
// BEFORE
const result = await supabase
  .from('empires')
  .select('id, name, territories')
  .eq('user_id', userId);

if (!result.data) {
  return res.status(404).json({ success: false, error: 'Empire not found' });
}

// AFTER  
const result = await supabase
  .from(DB_TABLES.EMPIRES)
  .select(DB_SELECTS.EMPIRES.BASIC)
  .eq(DB_FIELDS.EMPIRES.USER_ID, userId);

if (!result.data) {
  return res.status(HTTP_STATUS.NOT_FOUND).json(RESPONSE_FORMAT.NOT_FOUND('Empire'));
}
```

## Technical Considerations

### Dependencies
- All constants files must be properly exported and importable
- TypeScript compilation must succeed after each file transformation
- Existing test suites must continue to pass without modification

### Performance Impact
- Constant reference overhead is negligible (compile-time resolution)
- Bundle size impact is minimal (constants are small strings/numbers)
- Runtime performance remains unchanged

### Risk Mitigation
- Single large PR approach enables comprehensive review and easy rollback
- All changes in a feature branch with comprehensive testing before merge
- Automated test suite execution after each service directory completion

## Success Metrics

### Quantitative Metrics
- **Primary:** 0 hardcoded database table names detected by search scripts
- **Primary:** 0 hardcoded HTTP status codes (e.g., `.status(404)`) in route files
- **Primary:** 0 hardcoded error messages duplicated across files
- **Secondary:** 100% of database queries use `DB_TABLES` constants
- **Secondary:** 100% of HTTP responses use `HTTP_STATUS` and `RESPONSE_FORMAT` constants

### Qualitative Metrics
- All TypeScript compilation succeeds without errors
- All existing tests pass without modification
- Code review identifies zero instances of missed hardcoding
- Developer feedback confirms improved maintainability

### Validation Scripts
```bash
# Database table hardcoding detection
grep -r "\.from('.*')" packages/server/src --include="*.ts" --exclude-dir="__tests__"

# HTTP status code hardcoding detection  
grep -r "\.status([0-9]" packages/server/src --include="*.ts" --exclude-dir="__tests__"

# Error message duplication detection
grep -r '".*not found"' packages/server/src --include="*.ts" -c
```

## Implementation Plan

### Week 1: Database References Elimination
**Days 1-2:** Services directory (`src/services/`)
- Process all service files alphabetically
- Focus on database query hardcoding
- Update imports and query patterns

**Days 3-4:** Routes directory (`src/routes/`)
- Process all route files systematically
- Update database references and response patterns
- Ensure consistent error handling

**Day 5:** Utilities and middleware (`src/utils/`, `src/middleware/`)
- Complete remaining database references
- Run validation scripts
- Execute full test suite

### Week 2: HTTP Responses and Final Cleanup
**Days 1-2:** HTTP Status Code Elimination
- Replace all hardcoded status codes
- Implement `RESPONSE_FORMAT` builders
- Standardize error responses

**Days 3-4:** API Endpoint References and Validation
- Update endpoint references in comments and documentation
- Implement automated validation scripts
- Set up ESLint rules and pre-commit hooks

**Day 5:** Final Validation and Documentation
- Run comprehensive validation scripts
- Execute full test suite
- Update development documentation
- Prepare single comprehensive PR for review

## Open Questions

1. **Existing Test Dependencies:** Should we update test files that may depend on hardcoded values, or leave them as-is for now?

2. **Error Message Localization:** Should we consider future internationalization when standardizing error messages?

3. **Database Migration Impact:** How should we handle any pending database migrations that might affect table/field names?

4. **Client-Server Constant Sharing:** Should we explore sharing constants between client and server code in future iterations?

## Acceptance Criteria

### Definition of Done
- [ ] Zero hardcoded database table names remain in codebase
- [ ] Zero hardcoded HTTP status codes remain in route handlers
- [ ] Zero duplicate error messages across the codebase
- [ ] All TypeScript compilation succeeds
- [ ] All existing tests pass
- [ ] Validation scripts report zero violations
- [ ] Code review approves the comprehensive changes
- [ ] Documentation updated with new constant usage guidelines

### Rollback Criteria
If any of the following occur, the changes will be rolled back immediately:
- More than 2 existing tests fail
- TypeScript compilation fails
- Any production API endpoint returns unexpected errors
- Performance degradation > 5% on key endpoints

## Resources and Timeline

**Timeline:** 10 business days (2 weeks)
**Resource Allocation:** 1 senior developer, full-time focus
**Review Requirements:** Comprehensive code review by technical lead
**Testing Requirements:** Full regression test suite execution

**Dependencies:**
- Existing constants files must be stable and complete
- No concurrent major refactoring of the affected codebase areas
- Access to staging environment for comprehensive testing

---

**Document Version:** 1.0  
**Created:** 2025-01-12  
**Owner:** Development Team  
**Status:** Ready for Implementation