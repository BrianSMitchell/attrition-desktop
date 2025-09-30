# Phase 4: Bootstrap API Endpoint Documentation

## Overview

The bootstrap API endpoint (`/api/sync/bootstrap`) provides the desktop application with initial state synchronization when starting up or reconnecting after offline periods. This endpoint is crucial for Phase 4's offline/online hybrid functionality, ensuring the renderer (client) receives up-to-date empire, bases, and game state without redundant API calls.

## Endpoint Details

- **Method**: POST (to support payload with auth token if needed)
- **Path**: `/api/sync/bootstrap`
- **Authentication**: Required; uses JWT token from keytar (main process) passed via IPC to preload, then to renderer API client.
- **Request Body**: Optional; currently empty, but extensible for future selective sync (e.g., { since: timestamp }).
- **Response Shape**: Standardized DTO per .clinerules/dto-error-schema-and-logging.md
  - Success:
    ```json
    {
      "success": true,
      "data": {
        "empire": { /* full Empire doc */ },
        "bases": [ /* array of Base summaries */ ],
        "timestamp": "ISO string"
      },
      "message": "Bootstrap complete"
    }
    ```
  - Error: Standard error schema with codes like "AUTH_REQUIRED", "SERVER_ERROR".

## Implementation Flow

1. **Main Process (desktop/main.js)**:
   - IPC handler: `ipcMain.handle('db:bootstrap:fetchAndCache', async (event, token) => { ... })`
   - Retrieves access token from keytar (APP_ID, "access").
   - Calls renderer API: `httpClient.post('/api/sync/bootstrap', {}, { headers: { Authorization: `Bearer ${token}` } })`.
   - Caches response in SQLite (eventQueueService or db.js): store as JSON under key 'bootstrap:last' with timestamp.
   - Returns cached or fresh data to renderer via IPC.

2. **Preload Bridge (preload.cjs)**:
   - Exposes `window.desktop.db.bootstrap.fetchAndCache()` to renderer, which invokes main IPC.
   - Handles token pass-through without exposing keytar directly.

3. **Renderer (client/services/api.ts)**:
   - No direct call; uses the preload bridge for security.
   - On success, updates Zustand stores (authStore, baseStore, etc.) with received data.

## Security Considerations

- Token Handling: Access token is memory-only in renderer; refresh token in keytar (main). No IPC exposure of tokens.
- Data Validation: Response parsed with shared Zod schemas from @game/shared/validation.ts.
- Caching: SQLite entries encrypted if sensitive; version-checked against server to prevent stale data.
- Rate Limiting: Server-side limit to 1/min per empire to prevent abuse.

## Error Handling

- Auth Failures: Main process retries refresh (single-flight via api.refreshSingleFlight), falls back to cached data if available.
- Network Errors: Renderer shows offline banner; queues actions via eventQueue.
- Validation Errors: Discard invalid cached data; force fresh bootstrap on next online.

## Testing

- Unit: Test IPC handler with mocked httpClient and keytar.
- Integration: E2E with Playwright: simulate offline → online, assert stores update from bootstrap.
- Edge: Bootstrap with stale cache (timestamp > 1h old) → force refresh.

## Change Control

Updates to response shape require aligning server routes/sync.ts, client services, and desktop db.js caching logic. See .clinerules/dto-error-schema-and-logging.md for schema evolution.
