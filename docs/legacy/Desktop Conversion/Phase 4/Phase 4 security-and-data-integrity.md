# Phase 4 — Security and Data Integrity

Status: Implemented

This document codifies the Desktop Phase 4 changes and posture: main-only auth, memory-only access tokens in the renderer, no access-token IPC, explicit token pass-through for bootstrap, and standardized redaction across desktop and client logs.

## Executive Summary

- Main-only auth
  - Login/register/refresh handled in Electron main via IPC.
  - refreshToken stored and rotated in OS keychain via keytar; never exposed to the renderer.
  - IPC responses to renderer are sanitized; no refresh tokens ever cross the bridge.
- Access token policy
  - Access token is short-lived and lives only in renderer memory (tokenProvider.ts).
  - No persistence to disk/keytar by the desktop flow; no access-token IPC surfaces exist.
- Bootstrap token pass-through
  - Renderer calls `window.desktop.db.bootstrap.fetchAndCache(accessToken?)` and passes its in-memory access token.
  - Main requires provided token param. Legacy `keytar(APP_ID, "access")` fallback removed.
- Redaction policy (desktop + client)
  - Logging services recursively redact keys matching `/^(authorization|token|refreshToken)$/i` (case-insensitive, nested objects).
  - Redaction applies prior to logging and persistence.
- Electron security flags
  - `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` on BrowserWindows.

## Architecture and Token Flow (Textual)

Renderer (React)
- Holds access token in memory only (tokenProvider).
- Requests auth via `window.desktop.auth.login/register` (IPC).
- Invokes `window.desktop.db.bootstrap.fetchAndCache(accessToken)` after login/refresh to sync catalogs/profile.

Preload
- Exposes a safe, typed surface:
  - `auth: { login, register, refresh }`
  - `tokens: { saveRefresh, deleteRefresh, hasRefresh }` (refresh only)
  - `db.bootstrap.fetchAndCache(accessToken?)`

Main (Electron)
- Implements IPC handlers for `auth:*` and `db:bootstrap:fetchAndCache`.
- Stores `refreshToken` in keytar(APP_ID, "refresh") only; never returns it to renderer.
- Sanitizes all auth responses (`{ success: true, data: { token, user, empire } }`).

## IPC Contracts and Sanitize Pattern (Main)

Auth (login/register)
```js
// packages/desktop/src/main.js (sketch)
ipcMain.handle('auth:login', async (_event, creds) => {
  const res = await fetch(`${API}/auth/login`, { method: 'POST', body: JSON.stringify(creds) })
  const json = await res.json()
  // Rotate/store refresh in keytar, never expose to renderer
  const refresh = json?.data?.refreshToken
  if (refresh) await keytar.setPassword(APP_ID, 'refresh', refresh)

  // Sanitize response
  return {
    success: true,
    data: {
      token: json?.data?.token,
      user: json?.data?.user,
      empire: json?.data?.empire
    },
    message: json?.message
  }
})

ipcMain.handle('auth:refresh', async () => {
  const refresh = await keytar.getPassword(APP_ID, 'refresh')
  const res = await fetch(`${API}/auth/refresh`, { method: 'POST', body: JSON.stringify({ refreshToken: refresh }) })
  const json = await res.json()

  // Rotate refresh
  const next = json?.data?.refreshToken
  if (next) await keytar.setPassword(APP_ID, 'refresh', next)

  // Return access token only
  return { ok: true, token: json?.data?.token }
})
```

Bootstrap (token pass-through)
```js
ipcMain.handle('db:bootstrap:fetchAndCache', async (_event, accessTokenParam) => {
  // Phase 4 policy: require provided param (no legacy fallback)
  const accessToken = accessTokenParam


  const res = await fetch(`${API}/sync/bootstrap`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  const json = await res.json()

  // Cache catalogs/profile in desktop db and return canonical DTO
  await db.cacheBootstrap(json?.data)
  return { success: json?.success === true, data: json?.data, message: json?.message }
})
```

## Cache Version Checking & Invalidation

- The main process compares the stored `sync_state['bootstrap_version']` with the incoming `normalized.version` on every bootstrap.
- On mismatch (prev exists and differs from next):
  - `desktopDb.clearCachedContent()` deletes only versioned caches:
    - Removes rows from `catalogs` and `profile_snapshot`
    - Preserves `event_queue`, `kv_store`, `sync_state`, `error_logs`, and performance metrics
  - Emits an info log with `{ from, to }` and a performance metric:
    - `operation: 'cache_invalidate'`, with `context: { from, to }`
- Caching then proceeds with fresh catalogs/profile, and `sync_state['bootstrap_version']` is updated to the new version.
- Rationale: prevents stale or shape‑incompatible cached data from being served after a catalog/profile version bump, while preserving user intent queues and telemetry.

## Preload Bridge (Exposed API)

```js
// packages/desktop/src/preload.cjs (excerpt)
contextBridge.exposeInMainWorld('desktop', {
  auth: {
    login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
    register: (payload) => ipcRenderer.invoke('auth:register', payload),
    refresh: () => ipcRenderer.invoke('auth:refresh'),
  },
  tokens: {
    saveRefresh: (rt) => ipcRenderer.invoke('tokens:saveRefresh', rt),
    deleteRefresh: () => ipcRenderer.invoke('tokens:deleteRefresh'),
    hasRefresh: () => ipcRenderer.invoke('tokens:hasRefresh'),
  },
  db: {
    bootstrap: {
      fetchAndCache: (accessToken) => ipcRenderer.invoke('db:bootstrap:fetchAndCache', accessToken),
    }
  }
})
```

## Renderer Usage (Memory-only Access Token)

Token provider (renderer)
```ts
// packages/client/src/services/tokenProvider.ts (concept)
let memoryToken: string | null = null

export async function setToken(token: string) { memoryToken = token }
export async function getToken(): Promise<string | null> { return memoryToken }
export async function clearToken() { memoryToken = null }
```

Axios/socket interceptors read the in-memory token.

Bootstrap invocation (renderer) — pass token explicitly:
```ts
import { getToken } from '../services/tokenProvider'

export async function bootstrapDesktop() {
  const token = await getToken()
  if (!token) throw new Error('No access token available for bootstrap')
  return await window.desktop.db.bootstrap.fetchAndCache(token)
}
```

## Redaction Policy (Desktop + Client)

- Keys redacted case-insensitively: `authorization`, `token`, `refreshToken`
- Applied recursively to nested objects.
- Implementations:
  - Desktop: `packages/desktop/src/services/errorLoggingService.js`
  - Client: `packages/client/src/services/errorLoggingService.ts`
- Tests:
  - Desktop: `packages/desktop/src/__tests__/errorLoggingService.redaction.test.js`
  - Client: `packages/client/src/services/__tests__/errorLoggingService.redaction.test.ts`

## Main-Process Network Error Handling (Phase 4)

- Canonical error mapping for main-process HTTP operations:
  - NETWORK_UNAVAILABLE — DNS/connection failures, offline, ECONNRESET
  - TIMEOUT — request exceeded configured timeout
  - INVALID_RESPONSE — non-JSON/garbled or missing expected fields
  - SERVER_ERROR — 5xx or unknown fatal
  - HTTP_<status> — non-2xx responses are surfaced with their numeric status (e.g., HTTP_401)
  - Pass-through: if the server returns a canonical `{ success: false, code, message, details? }`, that shape is preserved
- Logging tags and fields (redacted prior to persistence):
  - Tags: `[DesktopMain.http]` (low-level client), `[DesktopMain.bootstrap]` (bootstrap operation)
  - Fields: `{ requestId, method, urlPath, status, durationMs, code, message }`
  - All secrets (Authorization, token, refreshToken) are redacted recursively
- IPC guarantees:
  - Main never throws raw errors across IPC. Handlers always return a DTO:
    - Success: `{ success: true, data, message? }`
    - Error: `{ success: false, code, message, details?, status?, requestId?, durationMs? }`
- Implementation references:
  - HTTP client: `packages/desktop/src/services/httpClient.js`
    - Adds `requestId`, `durationMs`, normalized codes, and `[DesktopMain.http]` logs
  - Bootstrap/auth handlers: `packages/desktop/src/main.js`
    - Adds canonical `{ code, message }` on error and preserves server canonical error shapes
  - Redaction policy enforced via `packages/desktop/src/services/errorLoggingService.js`

## Do / Don’t

Do
- Keep refreshToken in keytar (main process) only.
- Keep access token memory-only in the renderer.
- Pass the renderer memory token to `db:bootstrap:fetchAndCache` explicitly.
- Use canonical DTO shapes for success/error.
- Let error logging services sanitize secrets before logging.

Don’t
- Don’t expose refreshToken to the renderer or preload.
- Don’t persist the access token by desktop code (no disk/keytar).
- Don’t reintroduce access-token IPC surfaces (`tokens:getAccess`, `tokens:setAccess`, `tokens:deleteAccess`).

## Tests and How to Run

Desktop unit/integration tests (IPC/auth/bootstrap/redaction):
- Location:
  - `packages/desktop/src/__tests__/main.ipc.test.js`
  - `packages/desktop/src/__tests__/main.ipc.comprehensive.test.js`
  - `packages/desktop/src/__tests__/bootstrap.test.js`
  - `packages/desktop/src/__tests__/integration.e2e.test.js`
  - `packages/desktop/src/__tests__/errorLoggingService.redaction.test.js`

Execution (once a script exists):
- Recommended (workspace): `pnpm --filter @game/desktop test`
- Or from package directory: `cd packages/desktop` then `pnpm test`

Key assertions:
- Auth IPC returns sanitized payloads; refresh rotation occurs in keytar.
- `db:bootstrap:fetchAndCache` requires token param (no legacy keytar access fallback).
- Redaction tests pass for desktop/client.

## Access-Token Fallback Removal — Completed

- Removal completed: `db:bootstrap:fetchAndCache` requires token param (no legacy keytar access fallback).

## Client Error Handling and Single‑Flight Refresh (Renderer)

- Shared Axios client (packages/client/src/services/api.ts)
  - Authorization is centralized via tokenProvider; request interceptor injects `Authorization: Bearer <token>` and `x-request-id` (supports AxiosHeaders and plain objects).
  - Error normalization returns `ApiError { code, message, status?, details? }` across all paths:
    - Server DTO failures (`success:false`) are rejected with normalized `ApiError`.
    - HTTP errors map to `HTTP_<status>` with best-effort `message` and `details`.
    - Transport/timeouts map to `TIMEOUT` when `error.code === "ECONNABORTED"` or message contains "timeout".
    - Generic network failures map to `NETWORK_ERROR`.
  - 401 handling uses single‑flight refresh:
    - Module‑scoped `refreshPromise` ensures exactly one active refresh.
    - On success, original request is replayed once with `_retry401Replayed` guard and cloned headers.
    - On failure, token is cleared and navigation to `/login` is triggered (guarded under Jest).
  - Dev‑only HTTP metrics are attached via `httpInstrumentation.ts` (NODE_ENV‑based guard; Jest/CJS‑safe).

- Representative services migrated to shared client
  - statusService.ts, basesService.ts, structuresService.ts, techService.ts all import `api` and either:
    - Return canonical `ApiResponse` payloads, or
    - Bubble normalized `ApiError` for global handling where appropriate (e.g., idempotent conflicts soft‑path to DTO).
  - Ensures uniform error behavior and eliminates per‑service Axios instances.

- Socket.IO auth alignment
  - packages/client/src/services/socket.ts reuses `API_BASE_URL` (strips `/api`) and shares the same `refreshAccessToken` single‑flight logic on `connect_error`.
  - On refresh success, updates socket auth token and reconnects; on failure, clears token and (outside tests) navigates to `/login`.

- Reachability and UI surfacing
  - packages/client/src/services/networkService.ts now reuses the shared `API_BASE_URL` for `/status` reachability checks (Jest‑safe; no `import.meta` parsing issues).
  - ConnectionBanner and NetworkAwareButton surface offline/degraded states consistently via NetworkContext.
  - Recommended UI mapping of normalized codes:
    - `NETWORK_ERROR` → “Network error. Check your connection.”
    - `TIMEOUT` → “Request timed out. Try again.”
    - `HTTP_5xx` → “Server unavailable. Please try again.”
    - `UNAUTHORIZED` → “Session expired. Please log in again.”

- Tests (renderer)
  - `packages/client/src/services/__tests__/api.error-mapping.test.ts` validates DTO, HTTP 500 (JSON/text), TIMEOUT, and NETWORK_ERROR normalization.
  - `packages/client/src/services/__tests__/api.refresh-single-flight.test.ts` validates concurrent 401s trigger a single refresh and both requests are replayed exactly once.

Notes:
- The Axios base URL is resolved Jest/Node‑safely via `process.env.VITE_API_URL` with a local default, and exported as `API_BASE_URL` for reuse across the renderer.
