# Startup Optimization and Critical Fixes Task List

## Relevant Files

- `packages/desktop/src/services/errorLoggingService.js` - Contains the critical error event queueing logic that needs fixing
- `packages/desktop/src/services/eventQueueService.js` - Event queue service that processes error events
- `packages/desktop/src/db.js` - Database operations including event queue management
- `packages/server/src/services/resourceService.ts` - Game loop resource calculations with excessive logging
- `packages/server/src/services/empireEconomyService.ts` - Economy service called by resource calculations
- `packages/desktop/package.json` - Build script configuration for parallelization
- `packages/client/package.json` - Client build configuration
- `packages/shared/package.json` - Shared package build configuration
- `packages/desktop/src/main.js` - Main Electron process with CSP configuration

### Notes

- Priority order is critical - error event queue must be fixed first as it's causing massive performance degradation
- Database cleanup operations should be tested on a backup first
- Build script changes may require pnpm workspace configuration updates

## Tasks

- [x] 1.0 PRIORITY 1: Fix Error Event Queue (URGENT)
  - [x] 1.1 Disable error event queueing in ErrorLoggingService except for fatal production errors
  - [x] 1.2 Create database cleanup method to clear existing 5595 error events
  - [x] 1.3 Add environment-based conditional logic for error event queueing
  - [x] 1.4 Test error logging still works without event queue spam

- [x] 2.0 PRIORITY 2: Clear Existing Error Queue Database
  - [x] 2.1 Implement clearErrorQueue method in EventQueueService
  - [x] 2.2 Add database method to delete events by kind
  - [x] 2.3 Execute cleanup on existing database
  - [x] 2.4 Verify queue count reduction after cleanup

- [x] 3.0 PRIORITY 3: Optimize Game Loop Logging
  - [x] 3.1 Add DEBUG_RESOURCES environment flag check
  - [x] 3.2 Wrap verbose resource logging in debug conditionals
  - [x] 3.3 Remove redundant database verification queries
  - [x] 3.4 Optimize credits calculation to reduce redundant calls

- [x] 4.0 PRIORITY 4: Parallelize Build Process
  - [x] 4.1 Analyze current build dependency chain
  - [x] 4.2 Modify build scripts to enable parallel shared/client builds
  - [x] 4.3 Update workspace configuration for build optimization
  - [x] 4.4 Test build process improvements and measure time reduction

- [x] 5.0 PRIORITY 5: Clean Up Development Warnings
  - [x] 5.1 Replace util._extend usage with Object.assign()
  - [x] 5.2 Configure proper CSP for Electron renderer security
  - [x] 5.3 Address service initialization redundancy
  - [x] 5.4 Clean up deprecation warnings and technical debt
