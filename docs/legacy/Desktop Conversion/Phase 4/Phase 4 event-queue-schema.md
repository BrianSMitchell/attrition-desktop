# Phase 4: Event Queue Schema Documentation

## Overview

The event queue schema defines the SQLite table structure for storing offline actions in the desktop application. This enables queuing of game actions (build, research, etc.) during offline periods and batch syncing upon reconnection. The schema ensures data integrity, idempotency, and efficient querying for pending items.

## Database Table: eventQueue

- **File**: SQLite database at `~/.attrition-desktop/eventQueue.db` (or app data dir).
- **Table Name**: `eventQueue`
- **Primary Key**: `id` (auto-increment INTEGER)

### Schema Definition (SQL)

```sql
CREATE TABLE eventQueue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,  -- 'structures' | 'defenses' | 'units' | 'research'
  payload TEXT NOT NULL,  -- JSON string: { empireId, locationCoord?, catalogKey, identityKey, options? }
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'success' | 'failed'
  attempts INTEGER DEFAULT 0,
  error TEXT,  -- JSON string of last error { code, message }
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  processedAt DATETIME,
  UNIQUE(kind, identityKey)  -- Prevent duplicate queuing
);

-- Indexes for performance
CREATE INDEX idx_status ON eventQueue(status);
CREATE INDEX idx_createdAt ON eventQueue(createdAt);
CREATE INDEX idx_kind_status ON eventQueue(kind, status);
```

### Fields Explanation

- **id**: Unique auto-increment ID for local tracking.
- **kind**: Action type; determines server endpoint and validation (e.g., 'research' → POST /api/game/tech/start).
- **payload**: JSON-serialized object with action details:
  ```json
  {
    "empireId": "ObjectId string",
    "locationCoord": "A00:00:00:00" (for base-bound actions),
    "catalogKey": "energy_research",
    "identityKey": "empireId-kind-catalogKey-timestamp",
    "options": { "quantity": 5 } (e.g., for units batch)
  }
  ```
- **status**: Workflow state; 'pending' for unflushed, 'success'/'failed' post-sync.
- **attempts**: Flush retry count; max 3 before permanent failure.
- **error**: Last failure details (JSON); for debugging and retry decisions.
- **Timestamps**: Track lifecycle; used for ordering flushes and staleness checks (e.g., purge failed >7d).

### Constraints and Validation

- **UNIQUE(kind, identityKey)**: Prevents re-queuing duplicates; server also checks for idempotency.
- **Payload Validation**: On insert, parse JSON and validate with Zod schemas per kind (from @game/shared/validation.ts).
- **Size Limits**: Payload < 1KB; queue depth alert if >100 pending.
- **Purge Policy**: Delete 'success' after 24h; keep 'failed' for 7d (user review); auto-vacuum db.

## Usage in Workflow

### Enqueue (Offline Action)
- Renderer: Extract payload → preload IPC → main inserts row with status='pending'.
- Validate: Parse payload JSON, ensure required fields (empireId, catalogKey), generate identityKey if missing.

### Flush (Reconnect)
- Main: Query `SELECT * FROM eventQueue WHERE status='pending' ORDER BY createdAt LIMIT 50`.
- Batch POST to /api/sync/events with [{kind, payload}].
- On response: Update rows based on processed/failed arrays (attempts++, status, error, processedAt).

### Query Helpers (db.js)
- `getPendingBatch(limit=50)`: SELECT pending, ordered by createdAt.
- `markProcessed(identityKeys, kind)`: UPDATE status='success', processedAt=now() WHERE (kind, identityKey) IN (...).
- `markFailed(identityKey, kind, errorJson)`: UPDATE status='failed', attempts=attempts+1, error=errorJson WHERE ...; if attempts>=3, no retry.
- `purgeOld()`: DELETE WHERE status='success' AND createdAt < now() - 24h OR status='failed' AND createdAt < now() - 7d.

## Security Considerations

- **Local Only**: SQLite not encrypted by default; consider SQLCipher for sensitive payloads (empireId redacted in logs).
- **No Secrets**: Payloads contain no tokens; empireId validated server-side.
- **Integrity**: Use transactions for batch updates; UNIQUE constraint prevents race-condition duplicates.
- **Redaction**: Logs show anonymized previews (e.g., "[EventQueue] Queued research: energy_research"); full payload only in debug mode.

## Testing

- **Unit (db.test.js)**: Insert/query/update with various statuses; assert UNIQUE constraint blocks duplicates.
- **Integration**: Enqueue multiple → flush batch → assert db updates match server response.
- **E2E**: Offline queue → reconnect → verify server queues populated, db cleared for success.

## Change Control

Schema changes (new fields, indexes) require db migration script (e.g., scripts/migrate-eventqueue-v1-to-v2.ts). Align with .clinerules/dto-error-schema-and-logging.md for error payloads in 'error' field.
