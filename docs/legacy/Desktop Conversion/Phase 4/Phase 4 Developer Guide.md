# Phase 4 Developer Guide: Offline/Online Hybrid and Data Model

Companion to Desktop Conversion Plan.md (Phase 4 COMPLETE). This guide consolidates implementation details for the desktop app's offline/online hybrid features, including bootstrap sync, event queuing, offline workflows, and security. It covers code locations, usage, testing, and troubleshooting for developers.

## Overview

Phase 4 implements a robust offline/online hybrid model for the Attrition desktop app using Electron:
- **Bootstrap Sync**: Initial state loading via /api/sync/bootstrap, with caching in SQLite (db.js).
- **Event Queue**: Tier A schema for queuing offline actions (e.g., build/start) with idempotency (eventQueueService.ts).
- **Offline Sync Workflow**: Enqueue during offline, batch flush on reconnect, with UI feedback (NetworkContext, SyncFeedback).
- **Security**: Main-only auth (keytar for refresh tokens), memory-only access tokens in renderer, redaction policy (errorLoggingService).
- **Data Model**: SQLite for local persistence (caches, queues); version-checked to prevent staleness.

Key principles (per .clinerules/dto-error-schema-and-logging.md):
- Canonical DTOs for all API responses.
- Structured logs with tags like [DesktopMain.http], [EventQueue].
- Idempotency via identityKey (see .clinerules/queue-idempotency.md).

Dependencies:
- better-sqlite3 for SQLite (main process).
- Zod for validation (@game/shared/validation.ts).
- Axios for HTTP (shared client in api.ts with single-flight refresh).

Run commands (PowerShell-safe, per .clinerules/powershell-command-syntax.md):
```
cd packages/desktop
pnpm dev
```
This starts Electron with server on 3001. For testing: `pnpm --filter @game/desktop test`.

## Bootstrap API Integration

### Endpoint Spec (server/routes/sync.ts)
- **Method**: POST /api/sync/bootstrap
- **Auth**: Bearer token (from renderer memory).
- **Request**: Empty body (future: { since: timestamp } for delta sync).
- **Response** (success):
  ```json
  {
    "success": true,
    "data": {
      "empire": { /* full Empire doc */ },
      "bases": [ /* Base summaries */ ],
      "timestamp": "2025-09-06T13:13:00Z",
      "version": "1.0.0"  // For cache invalidation
    },
    "message": "Bootstrap complete"
  }
  ```
- Errors: Standard { success: false, code, message, details } (e.g., AUTH_REQUIRED).

### Desktop Flow (main.js)
1. Renderer calls `window.desktop.db.bootstrap.fetchAndCache(token)` (preload.cjs invokes IPC).
2. Main (ipcMain.handle('db:bootstrap:fetchAndCache', async (event, token) => { ... })):
   - Requires token param (no legacy keytar fallback).
   - Fetches via httpClient.js (with Authorization header).
   - If success and version mismatch: desktopDb.clearCachedContent() (removes catalogs/profile_snapshot only).
   - Caches to SQLite: desktopDb.cacheBootstrap(data).
3. Returns sanitized DTO to renderer; updates stores (baseStore, etc.).

Code example (main.js excerpt):
```js
ipcMain.handle('db:bootstrap:fetchAndCache', async (_event, accessToken) => {
  const accessToken = accessToken;  // Required; throw if missing
  const res = await fetch(`${API_BASE_URL}/sync/bootstrap`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const json = await res.json();
  if (json.success) {
    const { data } = json;
    const currentVersion = desktopDb.getSyncState('bootstrap_version');
    if (currentVersion && currentVersion !== data.version) {
      desktopDb.clearCachedContent();  // Invalidate stale caches
      console.log(`[DesktopMain.bootstrap] Cache invalidated: from ${currentVersion} to ${data.version}`);
    }
    await desktopDb.cacheBootstrap(data);
    desktopDb.setSyncState('bootstrap_version', data.version);
  }
  return { success: json.success, data: json.data, message: json.message };
});
```

### Renderer Usage (services/bootstrap.ts)
```ts
import { getToken } from './tokenProvider';

export async function bootstrapDesktop() {
  const token = await getToken();
  if (!token) throw new Error('No access token for bootstrap');
  const result = await window.desktop.db.bootstrap.fetchAndCache(token);
  if (result.success) {
    // Update stores
    baseStore.setBases(result.data.bases);
    // etc.
  } else {
    throw new ApiError(result.code, result.message);
  }
}
```

Testing: packages/desktop/src/__tests__/bootstrap.test.js (mock httpClient, assert caching/version check).

## Event Queue Schema and Operations

### Schema (db.js / eventQueue table)
SQLite table for offline actions (see Phase 4 event-queue-schema.md for full SQL):
- Columns: id (PK), kind (structures/research/etc.), payload (JSON), status (pending/sent/failed), attempts, error (JSON), timestamps.
- UNIQUE(kind, identityKey) for idempotency.
- Indexes: status, createdAt, kind_status.

### Operations (eventQueueService.ts)
Singleton class for enqueue/dequeue/flush/mark-status.

Enqueue example:
```ts
const queue = new EventQueueService();
const eventId = await queue.enqueue('structures', {
  empireId: 'empire123',
  locationCoord: 'A00:00:00:00',
  catalogKey: 'solar_plants'
}, { identityKey: 'empire123:A00:00:00:00:solar_plants' });
```

Flush (batch, with perf metrics):
```ts
const results = await queue.flushPendingEvents(50);  // Returns { flushed, failed }
```

Mark status:
```ts
queue.markEventSent(eventId);  // On server success
queue.markEventFailed(eventId, JSON.stringify({ code: 'ALREADY_IN_PROGRESS', message: '...' }));  // On error
```

Perf monitoring: getPerformanceMetrics(24) returns array; getPerformanceStats(24) for aggregates (success rate, avg duration, etc.). Logs to db.logSyncPerformanceMetric().

Cleanup: deleteOldSentEvents(7), retryFailedEvents(3).

### Integration
- On network change (NetworkService): queue.handleNetworkChange(isOnline) → flush if online.
- Start interval: queue.startFlushInterval(30000) on app ready.
- Shutdown: await queue.shutdown() on app quit.

Testing: packages/desktop/src/__tests__/eventQueueService.test.js (insert/query/update, UNIQUE constraint).

## Offline Sync Workflow

### Flow (see Phase 4 offline-sync-workflow.md)
1. **Offline Detection**: NetworkContext polls /api/status; sets isOnline false.
2. **UI Gating**: NetworkAwareButton disables Start/Build; shows "Offline - Queued".
3. **Enqueue**: On action attempt, extract payload → preload IPC → main enqueues to SQLite.
4. **Reconnect**: NetworkContext detects online → trigger queue.flushPendingEvents().
5. **Flush**: Batch to /api/sync/events; update status based on server response (idempotent).
6. **Feedback**: SyncFeedback shows progress (e.g., "Flushing 5 events..."); toasts on completion/errors.
7. **Cleanup**: Purge old success/failed; retry failed up to 3x.

Conflict Resolution:
- Server checks identityKey uniqueness (per .clinerules/queue-idempotency.md).
- Client: On ALREADY_IN_PROGRESS, mark success; on other errors, retry or fail.

UI Components:
- Layout.tsx: Renders ConnectionBanner (transient) and StatusDot (persistent, per .clinerules/network-status-indicators.md).
- SyncContext: Provides isSyncing, pendingCount from queue.getPendingEventsCount().

Code example (renderer action handler):
```ts
if (!networkStatus.isOnline) {
  await window.desktop.queue.enqueue('structures', payload, options);
  toast('Action queued offline');
  return;
}
// Online: direct API call
```

Testing: e2e/offline.spec.ts (Playwright: context.setOffline(true) → enqueue → setOnline → assert flush/db clear).

## Security and Data Integrity

### Token Flow (see Phase 4 security-and-data-integrity.md)
- **Main-Only Auth**: Login/register/refresh in main.js (IPC); refreshToken in keytar, never to renderer.
- **Access Token**: Memory-only in renderer (tokenProvider.ts); passed explicitly to bootstrap IPC.
- **No Access-Token IPC**: Removed legacy surfaces; bootstrap requires param.
- **Redaction**: errorLoggingService redacts authorization/token/refreshToken recursively (tests in __tests__/errorLoggingService.redaction.test.ts).

Electron Flags (main.js):
```js
webPreferences: {
  preload: path.join(__dirname, 'preload.cjs'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true
}
```

Error Mapping (httpClient.js):
- NETWORK_UNAVAILABLE, TIMEOUT, etc. → canonical codes.
- Logs: [DesktopMain.http] with requestId, durationMs (redacted).

Cache Integrity:
- Version check in bootstrap: Invalidate if mismatch (clearCachedContent()).
- Payload validation: Zod on insert (shared/validation.ts).

Testing: packages/desktop/src/__tests__/main.ipc.comprehensive.test.js (auth/bootstrap/redaction).

## Testing and Validation

### Unit/Integration (desktop)
- `pnpm --filter @game/desktop test`: Covers IPC, db ops, queue service, perf metrics, redaction.
- Assertions: Enqueue idempotency, flush batch updates, version invalidation, token sanitization.

### E2E (Playwright)
- `pnpm exec playwright test e2e/offline.spec.ts`: Simulate offline → enqueue → online → flush success/fail.
- PowerShell-safe: `$env:TEST_EMAIL="test@test.com"; $env:TEST_PASSWORD="•••"; pnpm exec playwright test` (per .clinerules/login-credentials-usage.md).

### Manual
- Run desktop dev; toggle network (DevTools > Network > Offline) → attempt build → reconnect → verify queue flush.
- Check SQLite (~/.attrition-desktop/eventQueue.db) for events; logs for [EventQueue] tags.

## Troubleshooting

- **Bootstrap Fails**: Check [DesktopMain.bootstrap] logs; ensure token passed (no legacy fallback).
- **Queue Not Flushing**: Verify isOnline in NetworkContext; check getPendingEventsCount() >0; inspect db for status='pending'.
- **Redaction Missing**: Test with mock error including 'token'; assert '[REDACTED]' in logs.
- **Version Mismatch**: Cache cleared on bump; verify sync_state['bootstrap_version'] in db.
- **IPC Errors**: DevTools console; ensure preload.cjs exposes correctly.

Common Logs:
- [EventQueue] Enqueued/Flushed X events
- [DesktopMain.http] Bootstrap response: 200, duration 150ms
- [SyncPerformance] operation=flush_cycle_complete, success=true, batchSize=5

## Future Extensions

- New Event Kinds: Add to schema (ALTER TABLE), extend enqueue/sendEventToServer.
- Schema Migrations: scripts/migrate-eventqueue-v1-to-v2.ts (run on app start).
- Selective Sync: Add { since } to bootstrap request body.
- Advanced Conflicts: CRDT for non-idempotent events (future phase).

For changes, update this guide and .clinerules/dto-error-schema-and-logging.md. See .clinerules/end-to-end-testing-protocol.md for E2E expansion.
