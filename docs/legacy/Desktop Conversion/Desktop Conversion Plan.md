# Desktop Conversion — Current Status (2025‑09‑04)

This section summarizes progress made and the immediate next steps to get the Electron desktop build rendering the game UI and talking to the API reliably in development.

Phase Status Summary
- [x] Phase 1: Initial assessment and technical decisions — COMPLETE
- [x] Phase 2: Desktop shell prototype and client port — COMPLETE
- [x] Phase 3: Backend services for auth/sync/realtime — COMPLETE
- [x] Phase 4: Offline/online hybrid and data model — COMPLETE
- [x] Phase 5: Performance and security hardening — COMPLETE
- [x] Phase 6: Build, packaging, signing, auto‑update — COMPLETE
- [ ] Phase 7: Test matrix and beta rollout
- [ ] Phase 8: Distribution and launch
- [ ] Phase 9: Maintenance and scaling

Accomplishments
- Electron dependencies unblocked in pnpm workspace
  - Removed workspace override that ignored Electron postinstall
  - Verified root package.json has "pnpm.allowedBuiltDependencies": ["electron"]
  - Confirmed Electron binaries available: electron --version → v31.7.7
- Client build compatibility for file://
  - Set Vite base: './' in packages/client/vite.config.ts
  - Rebuilt client successfully
- Desktop app launch flow
  - packages/desktop scripts:
    - predev builds @game/shared then @game/client
    - dev runs electron .
  - The Electron window opens
- Renderer blank‑screen fix and diagnostics
  - Added main‑process diagnostics in packages/desktop/src/main.js:
    - Auto‑open DevTools on ready‑to‑show
    - did-fail-load and render-process-gone logging
    - console-message piping for renderer logs
    - Index path logging
  - Preload fixed for sandbox/contextIsolation:
    - Replaced ESM preload with CommonJS preload.cjs to resolve “Cannot use import statement outside a module”
    - Updated BrowserWindow webPreferences.preload to preload.cjs
  - Router compatibility for Electron:
    - Switched to HashRouter when running under Electron/file:// (falls back to BrowserRouter on web)
- Current runtime behavior
  - Desktop window renders the app shell (no fatal blank), DevTools shows logs
  - Expected Dev warning about CSP from Electron (will not appear when packaged)
  - Renderer logs show outbound API attempts (e.g., “Dashboard API Response …”), indicating runtime is executing

Open Issues (dev notes)
- No blocking issues for Phase 2 completion.
- Electron GPU/disk cache warnings observed on Windows (OneDrive paths) are benign for development.
- CSP warning is expected in development and will not show once packaged with proper CSP.

Smoke Validation Note: Phase 3 backend services are confirmed working end-to-end from the desktop app. Refresh tokens are securely stored via keytar in the OS keychain, access tokens are kept in renderer memory only, token refresh flows through the desktop bridge and rotates refresh tokens, and JWT authentication works for Socket.IO connections with proper reconnect behavior.

Immediate Next Steps (Baby Steps)
1) Phase 4 planning — offline/online hybrid
   - Define local persistence choice (SQLite via main-process IPC or IndexedDB for caches)
   - List events to queue while offline and reconcile rules
2) Production hardening (later)
   - Add CSP meta for packaged build
   - Prepare resolveClientIndex() production path (e.g., path.join(process.resourcesPath, 'app', 'client', 'index.html'))

Developer Run Commands (Windows)
- Desktop: pnpm --filter @game/desktop dev
- Server: pnpm --filter @game/server dev
- Find process on 3001: netstat -ano | findstr :3001
- Kill process (if required): taskkill /PID 10192 /F

Progress Checklist
- [x] Electron shell launches
- [x] Vite base set to './' for file:// assets
- [x] Preload script fixed (CommonJS) for sandbox/contextIsolation
- [x] Router switches to HashRouter under Electron/file://
- [x] Main‑process diagnostics enabled (DevTools, failure hooks, console forwarding)
- [x] Server running concurrently on port 3001 (resolve port conflict / reuse healthy server)
- [x] Desktop UI verified end‑to‑end (login → dashboard) with server alive
- [x] Dev CORS for Electron validated (Origin: null requests accepted in dev; no .env change required)
- [x] resolveClientIndex packaged path implemented
- [x] Token storage hardening for desktop (access token via keytar in OS keychain; in‑memory use in renderer)

Comprehensive plan: Porting a browser game to a cross‑platform desktop app with online services

Assumptions
- Current game is JS/TS web app (HTML/CSS/JS) using Canvas/WebGL (e.g., Phaser/Three.js/React).
- Backend exists or will be created (Node.js/Express in examples), using REST + WebSockets.
- Goal: Windows/macOS/Linux installers, local runtime (fast, potential offline), but login to central server for online features.

High‑level phases and timeline (solo or small team)
1) Initial assessment and technical decisions (1–2 weeks) — COMPLETE
2) Desktop shell prototype and client port (2–4 weeks) — COMPLETE
3) Backend services for auth/sync/realtime (2–4 weeks; parallelizable)
4) Offline/online hybrid and data model (1–2 weeks)
5) Performance and security hardening (1–2 weeks; ongoing)
6) Build, packaging, signing, auto‑update (1–2 weeks)
7) Test matrix and beta rollout (2–3 weeks)
8) Distribution and launch (≈1 week)
9) Maintenance and scaling (ongoing)

Detailed Checklists by Phase

1) Initial Assessment — Checklist
Deliverables
- [x] Feature inventory, dependency map, performance targets
- [x] Reuse vs. rework list
- [x] Risk register with mitigations

Frontend
- [x] Rendering path (Canvas/WebGL/WebGPU) reviewed for desktop constraints
- [x] Inputs: keyboard/mouse, pointer lock, gamepad, window focus handling
- [x] Networking: REST + WebSockets; CORS rules used by browser build
- [x] Storage overview: IndexedDB/localStorage/ServiceWorker caches, save structures
- [x] Bundler: Vite/Webpack asset pipeline and URL resolution
- [x] Permissions: Notifications, clipboard, window management, DPI scaling

Backend
- [x] Auth approach: forms, JWT, refresh strategy
- [x] Realtime: Socket.IO/ws topology
- [x] Data store: Postgres/Mongo; indexes for user/profile/state
- [x] Rate limits, logs, metrics plan

Reuse vs. Rework
- [x] Reuse: UI, rendering, game logic, most services
- [x] Rework: asset URLs (file:// vs custom protocol), save paths, token storage, CSP, auto‑update, crash logging

Compliance
- [x] Privacy Policy/ToS/telemetry consent (plan)
- [x] COPPA/age‑gating/regional storage rules (plan)

2) Desktop Shell Prototype & Client Port — Checklist
Project & Build
- [x] Electron chosen; project scaffolding under packages/desktop
- [x] Preload bridge (CommonJS) with contextIsolation & sandbox on; nodeIntegration off
- [x] Vite base='./' for file:// asset paths
- [x] predev builds @game/shared then @game/client; dev runs electron
- [x] resolveClientIndex implemented for packaged path (production)

Runtime & Routing
- [x] HashRouter under Electron/file://; BrowserRouter on web
- [x] Main-process diagnostics: DevTools auto-open, did-fail-load/render-process-gone, console-message piping

Server & Connectivity
- [x] Server reachable at http://localhost:3001; /api/status returns 200
- [x] Dev CORS behavior validated with Origin: null (accepted; no .env change needed)
- [x] Desktop app login → dashboard verified (runtime logs show API responses)

Dev Ergonomics
- [x] Server + desktop concurrent dev loop confirmed
- [x] Electron disk/GPU cache warnings acknowledged as benign in dev

Exit Criteria
- [x] Shell loads client dist reliably
- [x] App renders without blank screen; navigation functional
- [x] Server integration works with desktop (basic flows)

3) Backend Services for Auth/Sync/Realtime — Checklist
Auth
- [x] Login/register/refresh/logout endpoints
- [x] Desktop: keytar integration for refresh token (secure OS keychain)
- [x] Access token kept in memory in renderer
- [x] Token refresh path validated from desktop app

Realtime
- [x] Socket.IO/ws integration working
- [x] JWT auth for sockets confirmed from desktop
- [x] Reconnect/backoff behavior with desktop

DTO/Errors/Observability
- [x] Standard DTO: success/data/message and errors: code/message/details
- [x] Structured logs (request id, user id, latency)
- [ ] Desktop-specific telemetry fields (opt-in)

4) Offline/Online Hybrid & Data Model — Checklist [COMPLETE]
- [x] Local persistence: SQLite via main-process IPC (db.js with better-sqlite3)
- [x] Caching: Catalogs and profile snapshot in SQLite (version-checked; invalidated on mismatch)
- [x] Event queue: Tier A schema for offline actions (eventQueue table; enqueue/flush via eventQueueService.ts)
- [x] Conflict resolution: Server-side idempotency checks (identityKey uniqueness); client retries up to 3x
- [x] Offline UX: NetworkContext for status, SyncFeedback UI, gating of Start/Build actions (NetworkAwareButton)
- [x] Bootstrap sync: /api/sync/bootstrap endpoint for initial state (see Phase 4 bootstrap-api-endpoint.md)
- [x] Security: Main-only auth, memory-only access tokens, redaction policy (see Phase 4 security-and-data-integrity.md)

Developer Integration Notes:
- Run: pnpm --filter @game/desktop dev (starts Electron with server on 3001)
- Key files: packages/desktop/src/main.js (IPC handlers), preload.cjs (bridge), db.js (SQLite ops), eventQueueService.ts (enqueue/flush)
- Testing: pnpm --filter @game/desktop test (unit/IPC); playwright test e2e/offline.spec.ts (simulate offline, assert queue/flush)
- Offline simulation: Use Playwright context.setOffline(true); verify enqueue, then online → flush success, db cleared
- Logs: Check [DesktopMain.http] tags for bootstrap/sync errors (redacted); [EventQueue] for flush outcomes
- See consolidated docs: docs/Desktop Conversion/Phase 4/Phase 4 Developer Guide.md for full workflows and examples

5) Performance & Security Hardening — Checklist [COMPLETE]
- [x] CSP meta for packaged build (no unsafe-eval)
- [x] IPC surface audit; reduce attack surface
- [x] WebGL/renderer tuning; FPS baseline under stress
- [x] Memory footprint benchmarks
- [x] Sentry/Rollbar integration (opt-in) for crash reporting
- [x] Security headers, HSTS, TLS everywhere for server
- [x] JWT security enhancements (jti claims, short TTL, validation)
- [x] Device fingerprinting for token binding
- [x] Token revocation infrastructure
- [x] Brute force protection for auth endpoints
- [x] Real-time security monitoring and alerting
- [x] Session invalidation on suspicious activity
- [x] Comprehensive token security audit documentation

6) Build, Packaging, Signing, Auto‑update — Checklist [COMPLETE]
- [x] electron-builder config (targets: Win/macOS/Linux)
- [x] Code signing: certs/secrets setup (Windows/macOS) - configured for dev
- [x] Auto‑updates: electron-updater + provider (GitHub Releases)
- [x] Update notification UI with download progress
- [x] Update settings panel for user control
- [x] Blockmap/delta updates configured
- [x] Development builds tested and working
- [x] Cross-platform packaging configuration

7) Test Matrix & Beta Rollout — Checklist
- [x] Automated tests: unit/integration/E2E (Electron via Playwright)
- [x] Performance benchmarks: startup time, FPS, memory
- [x] Cross‑OS manual testing: Windows, macOS (Intel/ARM), Linux
- [x] DPI scaling, multi‑monitor, fullscreen tests
- [x] Private beta logistics (Steam branches/itch/gated downloads)

8) Distribution & Launch — Checklist
- [ ] Release channels & hosting (website/GitHub Releases/itch/Steam)
- [x] Installer signing and integrity (SHA256)
- [x] Auto‑update endpoints finalized
- [ ] Launch comms and support channels

9) Maintenance & Scaling — Checklist
- [ ] Bug triage cadence and crash symbol uploads
- [ ] Zero‑downtime schema migrations
- [ ] Horizontal scale WS (sticky sessions/pub-sub)
- [ ] Privacy-preserving analytics (consent-gated)
- [ ] Quarterly security posture reviews and dependency audits

3) Porting the Client‑Side Code
Project layout (Electron example)
/desktop
  package.json           // app metadata + electron-builder config
  main.js                // main process
  preload.js             // secure IPC bridge
  icon.(ico|icns|png)
  dist/                  // built web app from Vite/Webpack

Main process (Electron) skeleton
const { app, BrowserWindow, protocol, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 720, show: false,
    backgroundColor: '#111318',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.once('ready-to-show', () => win.show());
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  win.webContents.setBackgroundThrottling(false);

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

Preload (secure bridge)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  version: () => ipcRenderer.invoke('app:version'),
  // narrow surface for any native features you add
});

Renderer usage
window.desktop?.version().then(v => console.log(v));

Asset handling
- Prefer loadFile() with bundled assets in dist/.
- If you rely on fetch URLs at runtime, serve via https to your server OR register a custom app:// protocol.
- Avoid file:// CORS pitfalls by referencing bundled relative paths or app protocol.

Windowing/UI
- Fullscreen toggle (F11 / Ctrl+Cmd+F).
- DPI scaling: test 125–200%; use CSS zoom or OS scaling as needed.
- Gamepad: test navigator.getGamepads across OSes.
- Clipboard, file dialogs: use IPC from renderer to main; never enable nodeIntegration.

4) Server Setup and Integration
Auth endpoints
- POST /auth/register { email, username, password }
- POST /auth/login { identifier, password } → { accessToken (JWT), refreshToken, user }
- POST /auth/refresh { refreshToken } → new tokens
- POST /auth/logout { refreshToken } (invalidate)
- Optional OAuth: /auth/oauth/:provider redirect → callback → token issuance

Example login client code (fetch with TLS)
const res = await fetch('https://api.yourgame.com/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
if (!res.ok) throw new Error('Login failed');
const { accessToken, refreshToken, user } = await res.json();

WebSockets
- Use JWT to authenticate the socket connection (query param or auth header).
- Server joins user to rooms: user:{id}, match:{id}, guild:{id}.
- Revalidate tokens periodically or on reconnect; handle backoff.

Security best practices
- HTTPS everywhere; HSTS; secure cookies only if using cookie auth.
- Store access tokens in memory; store refresh tokens encrypted at rest (SQLite/Keytar on desktop, or server‑side only with rotating refresh).
- Rate limiting (per IP/Account), IP allow/deny, bot detection for critical endpoints.
- Validate all payloads (e.g., zod/celebrate/joi), sanitize inputs, enforce schema.
- Servers authoritative for gameplay; never trust client for economy/combat calculations.

Error/DTO conventions
- Success: { success: true, data, message? }
- Error: { success: false, code, message, details? } (consistent codes: INVALID_REQUEST, NOT_AUTHENTICATED, NOT_AUTHORIZED, ALREADY_IN_PROGRESS, INSUFFICIENT_RESOURCES, etc.)
- Structured logs for observability (request id, user id, latency).

5) Authentication and User Management
Flows
- Registration (email verification optional), Login, Logout.
- Password reset: request → email token → confirm reset.
- Session management: short‑lived access token (5–15 min) + refresh token (7–30 days).
- Desktop storage:
  - Access token in memory only.
  - Refresh token in secure store: 
    - Electron: keytar (OS keychain) or encrypted SQLite in app.getPath('userData').
    - Tauri: tauri-plugin-store/tauri-plugin-stronghold.
- Disconnected states
  - If access token expired and offline, switch to offline mode (limited features).
  - Queue non‑critical events locally for later sync.

Pseudocode (token refresh)
if (isAccessExpired() && hasRefresh()) {
  const res = await fetch('/auth/refresh', { method: 'POST', body: { refreshToken }});
  if (res.ok) setAccess(await res.json());
  else forceReauth();
}

6) Offline/Online Hybrid
Goals
- Allow limited solo play offline; sync back on reconnect.
- Prevent duping/cheats by keeping authoritative items server‑side.

Local data store
- IndexedDB (renderer) or better: SQLite via:
  - Electron: better-sqlite3/sqlite3 from main process behind IPC.
  - Tauri: tauri-plugin-sql (SQLite).
- What to cache:
  - User profile snapshot, cosmetics.
  - Read‑only content: catalogs, static data, localization.
  - Client‑side progress for truly offline modes (flagged as local‑only) OR queue of intent events with signatures for later reconciliation.

Sync strategy
- Last‑write‑wins for user preferences.
- CRDT or event‑sourced queues for gameplay events (optional, more complex).
- Conflict rules documented; server can reject stale/invalid events with reason codes.

7) Performance Optimizations
Renderer and GPU
- Ensure hardware acceleration is on (Electron default; disable only for driver bugs).
- WebGL context attributes tuned for your game (antialias, preserveDrawingBuffer false unless needed).
- Use OffscreenCanvas/Workers for heavy draw (where supported) or split logic from render loop.
- Texture atlas packing, sprite batching, avoid state thrash.
- Minimize layout thrash; requestAnimationFrame cadence.

Main/IPC
- Keep long‑running tasks off main thread; use Node worker_threads/child_process or Rust commands in Tauri.
- Narrow IPC surface; batch messages.

Networking
- Binary protocols (protobuf/msgpack) if needed; compress payloads (permessage‑deflate).
- Backoff and jitter for reconnects.

Observability
- Frame time counters; GPU/driver info (diagnostics UI).
- Crash reporting: Sentry/Backtrace/Rollbar (dsn via env), opt‑in for PII.

8) Build, Packaging, Code Signing, Auto‑updates
Electron (electron‑builder)
- Targets:
  - Windows: nsis x64 (and arm64 if needed) → .exe
  - macOS: dmg/zip, hardened runtime, notarized, universal or split x64/arm64
  - Linux: AppImage + deb (and optionally rpm)
- Code signing:
  - Windows: Standard or EV code signing cert (EV speeds SmartScreen reputation).
  - macOS: Apple Developer ID, entitlements, notarization.
- Auto‑updates:
  - electron‑updater + provider (GitHub Releases, S3, or private server).
  - Delta updates (blockmap) to minimize download size.
  - Silent download + prompt to restart when idle.

Tauri
- cargo tauri build; tauri.conf.json for updater and endpoints.
- macOS signing/notarization via Apple Developer; Windows code signing via signtool.

CI/CD
- GitHub Actions with matrix builds (win‑latest, macos‑latest, ubuntu‑latest).
- Secure secrets for signing (certs/passwords) + notarization credentials.
- Draft release with artifacts; promote to public on QA sign‑off.

9) Testing and Debugging
Automated tests
- Unit (game logic, services).
- Integration (renderer ↔ backend via mocked server).
- E2E:
  - Electron: Playwright + @playwright/test controlling packaged app; or Spectron alternatives (Spectron deprecated).
  - Tauri: tauri-driver + WebDriver/Playwright.
- Performance benchmarks:
  - Startup time, FPS under load, memory footprint, shader compile times.

Manual/cross‑OS
- Windows 10 & 11 (nVidia/AMD/iGPU); macOS (Intel + Apple Silicon); Ubuntu 22.04 LTS.
- DPI scaling 125–200%; multi‑monitor; fullscreen on discrete and integrated GPUs.
- Network: offline, flappy Wi‑Fi, high latency, packet loss (tc/netem).

Beta program
- Private beta (Steam branches, itch restricted, or invite links).
- In‑app bug reporter (attach logs/system info).
- Feature flags and staged rollout for risky changes.

10) Deployment and Distribution
Channels
- Website + GitHub Releases: fast iteration, auto‑update pulls from Releases.
- itch.io: simple hosting, user‑friendly app.
- Steam: discovery, achievements, overlay, but more integration/labor.
- Enterprise/offline: provide signed installers; optional offline license files.

Auto‑updates
- Staggered rollout (percentage channels), rollback on elevated crash rate.
- Integrity (code‑signed installers; SHA256 checks published).

Server ops
- Deploy backend on managed platform (Fly.io/Render/Heroku‑like) or cloud (AWS/GCP/Azure).
- HTTPS (ACME/Let’s Encrypt), WAF (Cloudflare), DDoS protection for WS endpoints.
- Monitoring: metrics (Prometheus/Grafana), logs (ELK/OTel), uptime (SLOs/alerts).

11) Maintenance and Scaling
- Bug triage cadence, crash symbol uploads, feedback loop.
- Schema migrations with zero‑downtime (blue/green or rolling).
- Horizontal scale WS: sticky sessions or stateless with pub/sub (Redis, NATS) for room fan‑out.
- Matchmaking/state: colocate or dedicate in‑memory state services; consider Redis streams.
- Analytics: privacy‑preserving events (consent‑gated), funnel for retention; store minimal PII.
- Security posture reviews quarterly; dependency audits (npm audit/snyk).

12) Security Considerations
- Transport: TLS only; HSTS; pinned endpoints (optional).
- Auth: short‑lived JWT; rotate refresh; revoke list on server; device binding optional.
- Client storage: avoid storing access tokens on disk; refresh tokens encrypted OS keychain/SQLite with per‑device key.
- Tamper resistance: pack integrity checks, detect debugger/tamper patterns (best‑effort; do not rely exclusively).
- Anti‑cheat strategy: server authoritative; sanity checks for movement/resource deltas; rate limits; anomaly detection and shadow‑bans.
- GDPR/CCPA:
  - Lawful basis; consent for analytics/diagnostics; data subject requests (export/delete); data minimization; retention policy; DPA with processors; regional hosting if required.

13) Budget and Resources (ballpark)
- Code signing
  - Apple Developer Program: ~$99/yr.
  - Windows Code Signing Cert: $70–$500/yr; EV $400–$700/yr (improves SmartScreen).
- Hosting
  - Small prod (API + WS + DB): $50–$200/mo (e.g., 1–2 app instances, Postgres 1–2 vCPU, Redis small).
  - CDN (static/patches): $10–$50/mo (usage‑dependent).
- Crash/telemetry: Sentry/Rollbar free tiers → $20–$100+/mo as scale grows.
- Steam fee: $100 one‑time per app; 30% revenue share; additional compliance/testing effort.
- Build CI minutes: free → $/mo for macOS runners if heavy.

Free/open‑source options
- Electron/Tauri (OSS), electron‑builder, autoUpdater, Socket.IO/ws, Postgres (Supabase), Nginx/Caddy, Keytar, better‑sqlite3, Playwright, GitHub Actions.

14) Adaptations for other engines
- Unity WebGL → desktop:
  - Prefer native desktop build (mono/IL2CPP) instead of WebGL inside Electron for performance and native inputs.
  - Rebuild networking with WebSocket or Steamworks; integrate a native updater (e.g., Steam/itch) or external patcher.
- Godot:
  - Export to desktop targets; embed HTTP/WS clients; use Godot’s autoload singleton for auth/session; deploy with Steam/itch or your own updater.

Concrete step‑by‑step (actionable checklist)
1) Decide shell: Electron vs Tauri. If you rely on Node libs (fs/sqlite/native addons), choose Electron; otherwise Tauri for size.
2) Create desktop shell repo/folder; wire minimal window loading your built index.html; disable nodeIntegration; add preload bridge.
3) Update asset paths to work from bundled dist (relative URLs or app://).
4) Implement auth UI flow (login/register/reset) pointed at your server; store access token in memory; refresh token in keychain/secure store.
5) Integrate WebSockets with JWT auth; handle backoff and reconnect; implement offline fallback behavior.
6) Add local persistence (SQLite or IndexedDB) for caches and queued events; define conflict rules.
7) Add diagnostics and crash reporting; add a user‑toggle for telemetry with clear consent copies.
8) Configure electron‑builder/tauri.conf:
   - Targets for Win/macOS/Linux, icons, artifact naming.
   - Auto‑update endpoint; test update flow with a staging channel.
9) Acquire signing credentials; set up CI to build/sign/notarize per OS.
10) Build test matrix; run performance and stability tests; organize closed beta; fix top issues.
11) Publish installers (website + GitHub Releases; optionally itch/Steam); enable updates; monitor crash/health dashboards.
12) Establish ongoing patch cadence; triage; scale server (read replicas, Redis) as concurrency grows.

References / Docs (recommended starting points)
- Electron: https://www.electronjs.org/docs/latest
- electron‑builder: https://www.electron.build/
- electron‑updater: https://www.electron.build/auto-update
- Tauri: https://tauri.app/
- Tauri Updater: https://tauri.app/v1/guides/distribution/updater/
- Socket.IO: https://socket.io/docs/v4/
- WebSockets (ws): https://github.com/websockets/ws
- OWASP ASVS + Cheat Sheets: https://cheatsheetseries.owasp.org/
- Apple notarization: https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution
- Windows code signing: https://learn.microsoft.com/windows/win32/seccrypto/signtool
- itch.io Butler: https://itch.io/docs/butler/
- Steamworks: https://partner.steamgames.com/doc

Pros/cons summary
- Electron: fastest path, best tooling; bigger footprint.
- Tauri: smallest binaries, strong security; fewer Node libs; mix Rust if you need native features.
- Managed auth (Auth0/Clerk): fastest auth; recurring cost/vendor lock‑in; self‑hosted JWT auth is cheaper but more engineering.
- Postgres vs Mongo: Postgres is better for relational constraints/analytics; Mongo is flexible for evolving inventories.

Legal notes
- Provide Privacy Policy/ToS; obtain explicit consent for telemetry.
- Honor data deletion/export (GDPR/CCPA).
- Ensure third‑party licenses are bundled/attributed; avoid GPL libs if you need permissive distribution.

This plan gives you a realistic, end‑to‑end path to deliver a signed, auto‑updating desktop game with secure online features, while preserving performance and adding optional offline play. It is structured to de‑risk early (shell choice, auth/storage design), keep security tight (IPC boundaries, token handling, TLS, authoritative server), and scale as your player base grows.
