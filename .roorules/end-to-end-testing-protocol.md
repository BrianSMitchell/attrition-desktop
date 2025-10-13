---
description: Guidelines for comprehensive end-to-end testing of full-stack applications using browser automation and system integration validation
author: Cline Self-Improvement Protocol
version: 1.1
tags: ["testing", "browser-automation", "system-integration", "end-to-end", "validation", "quality-assurance"]
globs: ["*"]
---

# End-to-End Testing Protocol

## Overview

This rule provides systematic guidelines for conducting comprehensive end-to-end testing of full-stack applications, particularly complex systems with real-time features, authentication flows, and multi-component user interfaces. Based on successful validation of complete user journeys in game development environments.

## Browser Automation Testing Strategy

### Systematic User Journey Validation

**Complete Flow Testing Protocol:**
1. **Registration → Authentication → Core Functionality → Advanced Features**
2. **Step-by-step interaction with proper wait times between actions**
3. **Coordinate-based targeting for form inputs and interface elements**
4. **Real-time system validation during user interactions**
5. **Performance monitoring throughout the testing process**

### Desktop Electron Testing Integration

**Electron-Specific Testing Patterns:**
- **App Lifecycle Testing**: Launch, minimize, restore, close behaviors
- **IPC Communication**: Secure inter-process communication validation
- **File System Access**: Local file operations and security boundaries
- **Auto-Update Flow**: Update detection, download, and installation testing
- **Desktop Integration**: System notifications, tray interactions, window management

**Playwright Electron Setup:**
```typescript
import { test, expect, _electron as electron } from '@playwright/test';

test('Electron app launches and loads game', async () => {
  const electronApp = await electron.launch({ 
    args: ['packages/desktop/dist/main.js'] 
  });
  
  const window = await electronApp.firstWindow();
  await expect(window).toHaveTitle(/Attrition/);
  
  // Test desktop-specific features
  await window.locator('[data-testid="minimize-button"]').click();
  await expect(window).toBeHidden();
  
  await electronApp.close();
});
```

**Desktop vs Browser Test Strategy:**
- **Browser Tests**: Server API validation, core game logic, authentication
- **Electron Tests**: Desktop integration, file system, app lifecycle, launcher communication
- **Shared Tests**: UI components, game mechanics, user journeys (can run in both)

**Key Testing Phases:**
- **Account Creation**: Registration form validation, email/username uniqueness, password security
- **Authentication Flow**: Login process, JWT token handling, session persistence
- **Core Application Features**: Primary user workflows and essential functionality
- **Advanced System Integration**: Complex features, real-time updates, cross-system communication
- **Performance Validation**: Animation smoothness, response times, resource usage

### Browser Interaction Best Practices

**Form Field Targeting:**
- Use precise coordinate targeting for form inputs across different interface states
- Account for dynamic UI changes and modal overlays
- Implement proper wait times for form validation and submission
- Handle different input types (text, email, password, dropdowns)

**Modal System Navigation:**
- Navigate through multiple modal layers and tab systems systematically
- Handle modal state changes and backdrop interactions
- Test modal-to-modal transitions and complex navigation flows
- Verify proper modal cleanup and state management

**Real-Time State Coordination:**
- Coordinate browser actions with server-side processing and database updates
- Monitor WebSocket connections and real-time notifications
- Validate state synchronization between client and server
- Test concurrent user actions and system responses

### PowerShell-safe Playwright Invocation and Test Credentials

- Use the canonical test account documented in `.clinerules/login-credentials-usage.md`.
- On Windows PowerShell, set environment variables in-line using `$env:` and then invoke Playwright. Do not chain commands with `&&` (see `.clinerules/powershell-command-syntax.md`).

Example (PowerShell-safe one-liner):
```
$env:TEST_EMAIL="test@test.com"; $env:TEST_PASSWORD="•••"; pnpm exec playwright test e2e/energy.gating.spec.ts
```

Notes:
- Replace `•••` with the out-of-band password as described in the login credentials rule. Never commit credentials to the repository.
- For deterministic negative-projection scenarios, consider a future API-seeded or double-POST variant per `.clinerules/end-to-end-testing-protocol.md` (Idempotency Checks) and `.clinerules/queue-idempotency.md`.

## Full-Stack System Integration Testing

### Development Environment Validation

**Monorepo Development Server Management:**
- Verify PNPM workspace setup with concurrent client/server development
- Test build order dependencies (shared → server → client)
- Validate development server startup and hot reload functionality
- Monitor terminal output for errors and system health

**Database Integration Testing:**
- Confirm MongoDB Atlas connection stability and data persistence
- Test transaction safety and rollback capabilities
- Validate real-time game loop processing and resource updates
- Monitor database state changes during user interactions

### Authentication System Validation

**Complete Authentication Flow:**
- Registration with form validation and error handling
- Login process with JWT token generation and storage
- Session persistence across browser refreshes and navigation
- Logout functionality and token cleanup

**Security Testing:**
- Password hashing and storage validation
- JWT token expiration and refresh handling
- Protected route access control
- CORS configuration and cross-origin request handling

### Real-Time Game System Testing

**Game Loop and Resource Management:**
- Verify background service processing (60-second intervals)
- Test resource production calculations and time-based updates
- Validate building construction timers and completion processing
- Monitor WebSocket connections for real-time notifications

**Building Construction System:**
- Test resource deduction and validation (credits, metal, energy)
- Verify construction queue management and timer accuracy
- Validate building completion and production rate updates
- Test transaction safety and rollback on failures

**Interactive Map System:**
- Validate coordinate system navigation (A00:10:22:10 format)
- Test zoom controls and multi-level navigation
- Verify territory visualization and empire ownership display
- Test search functionality and coordinate validation

### Defenses Start Flow

- Navigate to Base Detail → Defense tab.
- Verify compact table columns: Defense | Credits | Energy | Area | Requires | Start (per `.clinerules/ui-table-consistency.md`).
- Confirm default sort by credits ascending and right-aligned Start action column.
- For an ineligible row, verify:
  - Red reasons line under the name.
  - Disabled button tooltip includes `reasons.join('; ')`.
- Attempt a Start for an eligible defense:
  - On success: refresh the table and verify state reflects the change.
  - On failure: assert a clear error message is shown.
- Energy gating validation:
  - Ensure feasibility aligns with `.clinerules/energy-budget-consistency.md`.
  - If server emits logs for gating, capture and validate produced, consumed, balance, reservedNegative, delta, and projected values (e.g., tags used for structures or a defense-equivalent).
- Run at least one positive and one negative projection scenario.

### Research Start Flow

- Navigate to Base Detail → Research tab.
- Verify compact table columns: Technology | Credits | Labs | Requires | Effect | Time | Start (per `.clinerules/ui-table-consistency.md`).
- If researchPerHour is not available, assert Time shows '—'. If it is available, assert Time shows a computed duration.
- Start an eligible research item:
  - On success: verify the Start button reflects active state and a countdown appears for the active item; other rows should be disabled until completion.
  - On failure: assert a clear error message is shown.
- When a research is active, verify countdown updates over time and ends close to the server-reported completion.
- After completion (or manual reset in test data), verify the table updates: level increments, eligibility recalculates, and Start buttons re-enable accordingly.

### Catalog Key Validation (All Start Endpoints)

- For Structures/Defenses/Units/Research start endpoints, attempt a request without `catalogKey` and assert HTTP 400 with the exact payload:
```json
{
  "success": false,
  "code": "INVALID_REQUEST",
  "message": "catalogKey is required",
  "details": { "field": "catalogKey" }
}
```
- Additionally, for idempotent conflicts (409), assert the response includes `catalogKey` fields as specified in `.clinerules/queue-idempotency.md`.

### Base Events Summary Checks

- Preconditions:
  - You are authenticated and have at least one owned base coordinate (empire.territories non-empty).
  - Optional: use test seed routes to ensure deterministic conditions when available.
- Construction queued:
  1. Call `GET /api/game/bases/summary` and record the current `construction.queued` for a target base coord.
  2. Start a structure via `POST /api/game/structures/start` with `{ locationCoord, buildingKey }` for that coord (ensure eligibility or use seeding helpers first).
  3. In the client, navigate to the Bases page and click Refresh.
  4. Assert that the `Construction` column shows an incremented queued count for that coord; verify other coords are unchanged.
- Research summary (Phase 3 queue):
  1. Ensure there is a pending research queue item for the empire (e.g., via `POST /api/game/tech/start` or test seeding).
  2. Call `GET /api/game/bases/summary` and assert:
     - `research` is not null
     - `research.name` equals `getTechSpec(techKey).name` from `@game/shared` (fallback to `techKey` string acceptable)
     - `research.remaining >= 0` (milliseconds until completion)
- Optional real-time (Phase B):
  - If the server emits `base:construction:queued` to the empire room on successful Structure start, subscribe in the client test harness and auto-refresh the Base Events Summary on receipt to validate live updates without manual refresh.

### Idempotency Checks

- Prefer two concurrent POSTs with identical payload for a deterministic race on Start/Build endpoints (structures, defenses, units, research).
- Seed adequate credits/resources to avoid 400 errors during race-time deductions.
- Acceptance: exactly one 200 success and either HTTP 409 or a canonical error payload with `code: "ALREADY_IN_PROGRESS"` (see `.clinerules/dto-error-schema-and-logging.md`). During migration, tests may accept the canonical payload even if status is not yet 409.
- Capture standardized log lines when available:
  - Energy feasibility: `[StructuresService.start] key=<catalogKey> delta=<delta> produced=<produced> consumed=<consumed> balance=<balance> reserved=<reservedNegative> projectedEnergy=<projectedEnergy>`
  - Idempotency: `[Tag] idempotent identityKey=<...> state=<queued|active> itemId=<id>`

#### Deterministic API POST Pair (Preferred when UI timing is flaky)

- When UI Start buttons rapidly disable/change state and double‑click timing is flaky, assert idempotency directly at the API layer:
  - Seed via test‑only routes if available (e.g., `POST /api/game/test/seed-structures`, `POST /api/game/test/seed-research`).
  - Poll server eligibility until an item reports `canStart === true` (e.g., `GET /api/game/bases/:coord/structures` or `GET /api/game/tech/status?base=:coord`).
  - Select base deterministically (use the seeded coord) and pick the first eligible target from a fixed priority list.
  - Send two sequential authenticated POSTs with identical payload to the start endpoint.
  - Acceptance: exactly one 200 and one 409 OR a canonical JSON error payload with `code: "ALREADY_IN_PROGRESS"` (see `.clinerules/dto-error-schema-and-logging.md` and `.clinerules/queue-idempotency.md`).
- Reference test plan with copy‑pastable helpers: `docs/test-plans/e2e-idempotency-double-click.md`

## User Interface Testing Strategy

### Complex Interface Navigation

**Multi-Component System Testing:**
- Test hierarchical component interactions (Store → Management → Overview/Detail → Card)
- Validate state management across component hierarchies
- Test tab-based navigation within complex interfaces
- Verify loading states and error handling throughout the UI

**Modal System Integration:**
- Test modal state management with Zustand stores
- Validate modal-to-modal transitions and complex workflows
- Test backdrop interactions and escape key handling
- Verify proper modal cleanup and memory management

### Performance Validation During Testing

**Animation and Interaction Performance:**
- Monitor 60fps animation performance during user interactions
- Test canvas-based visualizations under different load conditions
- Validate smooth transitions and responsive user interface elements
- Monitor memory usage and resource consumption

**Network and API Performance:**
- Test API response times and error handling
- Validate concurrent request handling and rate limiting
- Test WebSocket connection stability and message handling
- Monitor database query performance during peak usage

### Inline Planet-Derived Hints (Structures)

Preconditions:
- Universe/planet context is available for the selected base via `universeService.getLocationByCoord` (fields: `result.solarEnergy`, `result.yields.{gas,metal,crystals}`, `result.fertility`).

Test Steps:
1. Navigate to Base Detail → Structures tab.
2. For rows with planet-dependent gains, assert inline hints render in the name block when the corresponding planet context value is numeric:
   - `solar_plants`: expect `(+{solarEnergy} energy here)`
   - `gas_plants`: expect `(+{gas} energy here)`
   - `metal_refineries`: expect `(+{metal} metal here)`
   - `urban_structures`: expect `(+{fertility} fertility here)`
   - `crystal_mines`: expect `(+{crystals} crystals here)`
3. Assert the hint formatting and behavior:
   - Appears after the “(Level N)” badge when N > 0.
   - Uses `ml-2 text-xs text-gray-400` styling.
   - Uses `toLocaleString()` for numeric formatting.
   - Only one hint is rendered per row and only when the value is numeric.
   - No changes to columns, sorting, or Start/Build action alignment.

Notes:
- This aligns with `.clinerules/tabular-build-ui-standard-and-test-plan.md` (Inline Planet-Derived Hints) and `.clinerules/planet-context-hints.md`.

### Tab Persistence (Base Page)

Preconditions:
- You are authenticated and viewing a base you own (owner view renders BaseDetail with inner tabs).
- The Base page supports route-synced tab state per `.clinerules/complex-react-component-architecture.md` (query param `?tab=`).

Test Steps:
1. Navigate to the Base page either by:
   - Direct deep link with `?tab=structures`, e.g., `/base/A00:00:00:00?tab=structures`, or
   - Clicking the “Structures” tab in the BaseDetail header (should update the URL to include `?tab=structures`).
2. Assert the URL contains `?tab=structures` and the “Structures” tab is visibly active.
3. Click “Build” on any eligible row (or trigger any action that causes a data refresh).
4. Refresh the browser page.
5. Assert:
   - The URL still contains `?tab=structures`.
   - The “Structures” tab remains active (content rendered matches Structures view).
6. Navigate to another tab (e.g., Research), then use browser back/forward:
   - Back should restore `?tab=structures` and the Structures tab active
   - Forward should restore the other tab and its `?tab=` value

Notes:
- The active tab should be the single source of truth in the Detail component, with the URL kept in sync via `onPanelChange`.
- Use `navigate({ search: ... }, { replace: true })` when writing `?tab=` to avoid polluting history for every click while preserving back/forward correctness.
- This test complements “Inline Planet-Derived Hints (Structures)” and should run quickly as a focused UI behavior check.

## Database State Verification

### Live Data Validation

**Transaction Safety Testing:**
- Confirm proper data persistence through live user interactions
- Test rollback capabilities during failed operations
- Validate atomic operations and race condition prevention
- Monitor data consistency across concurrent user actions

**Real-Time System Validation:**
- Test game loop processing and resource update accuracy
- Validate building construction state management
- Test WebSocket message delivery and state synchronization
- Monitor database performance under real-time load

### Data Integrity Verification

**Cross-System Data Consistency:**
- Validate data synchronization between client and server
- Test empire state management and resource calculations
- Verify building ownership and location validation
- Test coordinate system data integrity and navigation

## Testing Workflow Implementation

### Systematic Testing Approach

**Pre-Testing Setup:**
1. **Environment Preparation**: Start development servers, verify database connections
2. **System Health Check**: Confirm all services are running and responsive
3. **Test Data Preparation**: Set up clean test environment with known initial state
4. **Performance Baseline**: Establish baseline metrics for comparison

**Testing Execution:**
1. **User Journey Simulation**: Execute complete user workflows step-by-step
2. **System Integration Validation**: Test cross-system communication and data flow
3. **Performance Monitoring**: Track metrics throughout testing process
4. **Error Scenario Testing**: Test failure cases and recovery mechanisms

**Post-Testing Validation:**
1. **Data State Verification**: Confirm all data changes are properly persisted
2. **System Health Assessment**: Verify all services remain stable after testing
3. **Performance Analysis**: Compare metrics against baseline and requirements
4. **Cleanup and Documentation**: Clean test data and document findings

### Success Metrics and Validation Criteria

**Complete User Journey Success:**
- ✅ Registration → Login → Empire Creation → Building Construction → Map Navigation
- ✅ All form validations working correctly with proper error handling
- ✅ Real-time systems processing correctly (game loops, WebSocket connections)
- ✅ Database transactions completing successfully with proper persistence
- ✅ UI performance maintaining 60fps with responsive interactions

**System Integration Verification:**
- ✅ Authentication flow working end-to-end with proper token management
- ✅ Real-time game systems processing resources and construction timers
- ✅ Interactive map system functioning with coordinate navigation
- ✅ Cross-system communication working (client-server-database)
- ✅ Performance metrics meeting requirements under test load

**Quality Assurance Validation:**
- ✅ No critical errors or system failures during complete user journey
- ✅ Proper error handling and user feedback for all failure scenarios
- ✅ Data consistency maintained across all system components
- ✅ Security measures functioning correctly (authentication, authorization)
- ✅ User experience meeting design requirements and usability standards

## Energy Gating Checks

To prevent regressions between UI energy display and server feasibility gating, include these checks in your E2E suite. This aligns with .clinerules/energy-budget-consistency.md.

### Preconditions
- You have a base with known planet context (solarEnergy and gas yield visible in the UI).
- UI Energy Balance panel renders Produced, Consumed, and Balance values.
- Server emits energy-gating logs tagged with `[StructuresService.start]`.

### Positive Projection (Should Succeed)
1. Ensure the UI Energy Balance is non‑negative (e.g., +1 or higher).
2. Choose a consumer building (negative energy delta), such that:
   - projected = balance + reservedNegative + delta ≥ 0
3. Attempt to start the build.
4. Assert:
   - Request succeeds (2xx), toast shows success.
   - Server logs include `[StructuresService.start] ... balance=... reserved=... delta=... projectedEnergy=...` with projectedEnergy ≥ 0.

### Negative Projection (Should Fail)
1. Create conditions where the UI balance is near zero or negative OR ensure reservedNegative plus the consumer delta pushes the projection below 0.
2. Attempt to start the same consumer.
3. Assert:
   - Request fails (4xx) with a clear error: “Insufficient energy capacity to start this construction.”
   - Server logs include `[StructuresService.start] ... projectedEnergy=...` with projectedEnergy < 0.

### Log Capture Requirements
- Capture and store server log lines beginning with `[StructuresService.start]` during these tests.
- Validate presence of: produced, consumed, balance, reserved, delta, projectedEnergy.

## Common Testing Pitfalls to Avoid

1. **Incomplete User Journey Testing**: Test complete workflows, not just individual features
2. **Ignoring Real-Time System Validation**: Verify background services and WebSocket connections
3. **Insufficient Performance Monitoring**: Track metrics throughout testing, not just at the end
4. **Poor Error Scenario Coverage**: Test failure cases and recovery mechanisms thoroughly
5. **Inadequate Database State Verification**: Confirm data persistence and transaction safety
6. **Missing Cross-System Integration Testing**: Validate communication between all system components
7. **Insufficient Concurrent User Testing**: Test system behavior under multiple user load

This protocol ensures comprehensive validation of full-stack applications through systematic browser automation and real-time system integration testing, providing confidence in production deployment and user experience quality.
