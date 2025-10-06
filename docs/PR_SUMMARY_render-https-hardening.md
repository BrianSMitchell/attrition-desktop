# PR Summary: Render HTTPS Health/Redirect Hardening

This PR implements reverse-proxy-aware HTTPS behavior for Render deployments and adds comprehensive tests.

References
- PRD: `tasks/0001-prd-render-https-hardening.md`
- Task List: `tasks/tasks-0001-prd-render-https-hardening.md`

Summary
- Detect reverse proxy TLS (Render) and skip local HTTPS probing.
- Short-circuit `/api/https-health` on Render with a friendly OK payload.
- Suppress noisy WARN logs for health/status redirects while still enforcing HTTPS for real traffic.
- Preserve strong security headers for `/health` and `/api/status`.
- Centralize env detection in `isReverseProxySSL()`.
- Add fast CI job to run only HTTPS/proxy tests.

Key changes
- `packages/server/src/index.ts`: respect reverse proxy TLS; guard health monitor; don’t auto-start in tests.
- `packages/server/src/utils/runtimeEnv.ts`: `isReverseProxySSL()` helper.
- `packages/server/src/utils/httpsHealthCheck.ts`: reverse-proxy short-circuit; `shouldStartHttpsHealthMonitor()`.
- `packages/server/src/middleware/httpsRedirect.ts`: suppress WARN for exempt paths in proxy mode.
- Docs: `docs/deployment/render-tls.md` with Render runbook.
- CI: `.github/workflows/https-proxy-tests.yml` runs only HTTPS/proxy tests.

Tests
- Reverse proxy detection: `runtimeEnv.test.ts`
- `/api/https-health` proxy short-circuit: `httpsHealthCheck.reverseProxy.test.ts`
- Health monitor gating: `httpsHealthMonitor.start.test.ts`
- Non-proxy health handler path (module-mocked): `httpsHealthCheck.nonProxy.test.ts`
- Redirect logging suppression for exempt paths: `httpsRedirect.logging.test.ts`
- trust proxy + `secure` detection: `trustProxy.test.ts`
- Headers on `/health` and `/api/status`: `headersOnHealthAndStatus.test.ts`
- Smoke: `renderConfigDocs.test.ts` validates Render flag and docs exist

Verification
- Local: `npm --prefix packages/server test -- <listed test files>`
- Post-deploy (Render): 
  - Confirm no recurring CRITICAL/ERROR TLS alerts.
  - `GET /api/status` → `secure: true`.
  - `GET /api/https-health` → 200 + reverse-proxy message.
  - `GET /health` → OK + security headers.

Deployment notes
- Render auto-deploys on merge to `main`. This PR is safe to merge; feature is isolated to HTTPS/proxy behavior.
