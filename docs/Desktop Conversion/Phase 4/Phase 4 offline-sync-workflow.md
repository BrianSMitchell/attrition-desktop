# Phase 4: Offline Sync Workflow Documentation

## Overview

Phase 4 introduces offline/online hybrid functionality for the desktop application, allowing users to queue actions (e.g., build structures, research tech) while offline and automatically sync them to the server upon reconnection. This workflow ensures seamless user experience, data integrity, and idempotency without losing progress during connectivity interruptions.

## High-Level Flow

1. **Offline Detection**: Renderer uses NetworkContext to detect `!isFullyConnected` (no internet or server unreachable).
2. **Action Queuing**: UI tables (StructuresBuildTable, etc.) show "Queue" buttons; on click, enqueue via preload IPC to main process.
3. **Local Storage**: Main process stores in SQLite eventQueue table (see Phase 4 event-queue-schema.md).
4. **Reconnection**: Main detects online → flushes pending queue items in batch to server.
5. **Server Processing**: Server processes batch atomically, using identityKey for idempotency.
6. **UI Feedback**: Renderer shows sync status via SyncContext/Toast; updates state from bootstrap on completion.

## Detailed Steps

### 1. Offline Action Initiation (Renderer)

- User interacts with UI (e.g., click "Queue" in ResearchBuildTable).
- Component extracts payload: { kind: 'research', empireId, locationCoord, catalogKey, identityKey: unique (empireId-kind-catalogKey-timestamp) }.
- Call `window.desktop.eventQueue.enqueue(kind, payload)` → preload invokes main IPC.
- Main: Insert into eventQueue with status='pending', attempts=0, createdAt=now().
- Renderer: Show success toast ("Queued for sync"); optimistic UI update (e.g., show queued count).

### 2. Queue Management (Main Process)

- Periodic check (every 30s when online): Query pending items ORDER BY createdAt.
- Batch size: 50 events max per flush.
- For each batch: POST `/api/sync/events` with array of { kind, payload }.
- Response: { success: true, processed: [identityKeys], failed: [{ identityKey, code, message }] }.
- Update local:
  - Processed: status='success'
  - Failed (retryable, e.g., INSUFFICIENT_RESOURCES): attempts +=1; if attempts <3, keep 'pending'; else 'failed' with error.
  - Non-retryable (e.g., INVALID_REQUEST): status='failed' immediately.

### 3. Server-Side Processing (/api/sync/events)

- Auth: Verify JWT; associate with empireId.
- Transaction: For each event:
  - Validate payload (Zod schema per kind).
  - Check idempotency: Query queues for matching identityKey (e.g., TechQueue with identityKey).
  - If duplicate: Skip (ALREADY_IN_PROGRESS).
  - Else: Process action (e.g., deduct credits, insert into TechQueue with completesAt).
- Commit all or rollback on any failure.
- Response: Per-event status; aggregate for batch.

### 4. Post-Sync UI Update (Renderer)

- Main IPC notifies renderer of flush complete → trigger bootstrap via `window.desktop.db.bootstrap.fetchAndCache()`.
- Renderer updates stores (baseStore, etc.) from bootstrap data.
- Show sync toast ("Synced X actions"); clear local optimistic state.

## Error Handling and Recovery

- **Queuing Failures**: Rare (local SQLite); retry once, show error toast.
- **Flush Failures**: Retry up to 3 attempts with exponential backoff (30s, 1m, 3m).
- **Partial Batch**: Processed items marked success; failed retried in next batch.
- **Stale Data**: Bootstrap includes timestamp; if >1h old, force full refresh.
- **User Intervention**: UI shows "Pending Sync: X items" badge; manual "Force Sync" button triggers flush.

## Security and Integrity

- **Idempotency**: identityKey prevents duplicates across offline/online.
- **Validation**: Server validates ownership (empire owns locationCoord), resources sufficient at sync time.
- **No Double-Dip**: Local queue prevents re-queuing; server checks existing queues.
- **Data Redaction**: Logs redact empireId/payload details; use .clinerules/dto-error-schema-and-logging.md for responses.
- **Offline Projections**: UI shows projected state (e.g., queued counts) without server roundtrip.

## Testing Strategy

- **Unit**: Queue insert/query/flush in db.js; mock server responses.
- **Integration**: IPC enqueue → local insert → simulated reconnect → flush → assert server queues.
- **E2E**: Playwright with network throttle: Queue offline → reconnect → assert UI updates, server state matches.
- **Edge**: Duplicate identityKey (should dedupe), max attempts (mark failed), partial batch failures.

## Monitoring and Logs

- Tags: [EventQueue.enqueue], [EventQueue.flush] with fields { kind, count, attempts, processed, failed }.
- Metrics: Flush latency, queue depth, failure rate.
- See .clinerules/dto-error-schema-and-logging.md for standardized logging.

## Change Control

Workflow changes require updates to preload/main/renderer code, db.js schema, and server routes/sync.ts. Align with .clinerules/queue-idempotency.md for server idempotency.
