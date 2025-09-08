# Attrition Desktop App - Implementation Todo List

## Core Bootstrap Functionality
- [x] Register server sync routes (`/api/sync/bootstrap`)
- [x] Build validation for server endpoint
- [x] Implement desktop bootstrap handlers (IPC handlers in main process)
- [x] Update preload bridge (expose bootstrap methods to renderer)
- [x] Test bootstrap functionality
- [x] Run API-only backend (no Vite)

## Online/Offline Hybrid Features
- [x] Implement online/offline monitoring
- [x] Add connection status banner UI
- [x] Gate Start/Build actions while offline
- [x] Implement network status detection in main process

## Event Queue System
- [x] Design Tier A event queue schema
- [x] Implement local event queue storage in SQLite
- [x] Add event queue CRUD operations in db.js
- [x] Implement batch flush functionality on reconnect
- [x] Add queue synchronization logic

## Logging and Monitoring
- [x] Add standardized logs/tags for bootstrap operations
- [x] Write unit tests for IPC handlers
- [x] Write unit tests for bootstrap functionality
- [x] Write unit tests for event queue
- [x] Write integration tests for end-to-end flow

## Logging and Monitoring
- [x] Add standardized logs/tags for bootstrap operations
- [x] Add standardized logs/tags for queue flush operations
- [x] Implement error logging and reporting
- [x] Add performance monitoring for sync operations (service, IPC handlers, preload bridge, renderer dashboard; unit + IPC tests added)

## Security and Data Integrity
- [x] Verify secure token handling (Phase 4 main-only auth; refresh in keytar; access token memory-only; removed access-token IPC; tests updated)
- [x] Implement proper error handling for renderer network operations (shared Axios client with normalized errors and single-flight refresh)
- [x] Implement proper error handling for desktop/main network operations
- [x] Add data validation for cached content
- [x] Implement version checking for cached data

## Bootstrap Token Pass-through Adoption
- [x] Audit renderer bootstrap callers (client): no usages of `window.desktop.db.bootstrap.fetchAndCache` found; no patches required
- [x] Remove legacy `keytar(APP_ID, "access")` fallback in main's `db:bootstrap:fetchAndCache` and update tests to require token param

## UI Integration
- [x] Add offline status indicators in UI
- [x] Implement sync status display
- [x] Add user feedback for sync operations
- [x] Handle offline action queuing in UI

## Documentation
- [x] Document security and data integrity (Phase 4 token flow, IPC responsibilities, redaction)
- [X] Document bootstrap API endpoint
- [x] Document event queue schema
- [x] Document offline sync workflow
- [x] Update developer documentation (see Phase 4 Developer Guide.md and updated Desktop Conversion Plan.md)
