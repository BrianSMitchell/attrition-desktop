# Task List: Render HTTPS Health/Redirect Hardening (Reverse Proxy TLS)

This file contains the high-level parent tasks derived from PRD `0001-prd-render-https-hardening.md`. Per the workflow, only parent tasks are listed below for now. Reply with "Go" when you want me to generate detailed sub‑tasks.

## Relevant Files

- `packages/server/src/index.ts` - Server bootstrap; proxy detection; startup of HTTPS health monitor (enable/disable); trust proxy.
- `packages/server/src/utils/httpsHealthCheck.ts` - HTTPS health check route and periodic monitor; reverse proxy short‑circuit behavior.
- `packages/server/src/middleware/httpsRedirect.ts` - HTTP→HTTPS redirect logic; proxy header handling; exempt paths and logging.
- `packages/server/src/middleware/securityHeaders.ts` - Helmet and related security headers stack; CSP/HSTS presence on endpoints.
- `render.yaml` - Render service configuration; environment variables for reverse proxy TLS mode.
- `config/production.yml` - Production configuration documentation (references for rate limits, logging, security).
- `config/security.yml` - Centralized security configuration notes; CORS/CSP/session settings.
- `tests/security/httpsEnforcement.test.ts` - Existing test coverage for HTTPS enforcement and headers (to extend/verify as needed).
- `packages/server/src/utils/__tests__/runtimeEnv.test.ts` - Unit tests for reverse‑proxy TLS detection helper (isReverseProxySSL).
- `packages/server/src/utils/__tests__/httpsHealthCheck.reverseProxy.test.ts` - Tests that `/api/https-health` short‑circuits and returns 200 in reverse proxy mode.
- `packages/server/src/__tests__/trustProxy.test.ts` - Asserts trust proxy is set and secure detection via `X-Forwarded-Proto` on `/api/status`.
- `tests/integration/bootstrap.test.js` (and related integration tests) - General integration sanity; potential place to assert proxy‑mode health behavior.

### Notes

- Run tests with: `npm --prefix packages/server test`
- Build server with: `npm --prefix packages/server run build`
- For local HTTPS testing (non‑Render), use `FORCE_HTTPS=true` with local certs per project docs.

## Tasks

- [ ] 1.0 Implement robust reverse‑proxy TLS detection and guards
- [x] 1.1 Confirm Render env flags are present and documented (`RENDER=true` by platform, `USE_REVERSE_PROXY_SSL=true` in render.yaml).
- [x] 1.2 Ensure a single, consistent guard is used across startup and routes to identify reverse proxy TLS mode (index.ts and utils should both respect it).
- [x] 1.3 Verify `app.set('trust proxy', 1)` remains set so `req.secure` and `X-Forwarded-Proto` are honored.
- [x] 1.4 Review `httpsRedirectMiddleware` logging: avoid noisy WARN logs triggered by internal or synthetic requests in production.
- [x] 1.5 Add a clear INFO log at startup indicating the active TLS mode (reverse proxy vs self‑hosted HTTPS).
- [x] 1.6 Sanity‑check dev behavior: reverse proxy guard must not interfere with `FORCE_HTTPS=true` local testing.
  - [x] 1.7 Add Jest tests for reverse‑proxy detection and /api/https-health short‑circuit (proxy mode).
  - [x] 1.8 Add Jest/supertest tests for trust proxy setting and `/api/status` secure detection.

- [ ] 2.0 Adjust HTTPS health monitoring and endpoints for proxy mode
  - [x] 2.1 Disable periodic `HttpsHealthMonitor` when reverse proxy TLS mode is detected.
  - [x] 2.2 Short‑circuit `/api/https-health` under reverse proxy mode to return HTTP 200 with a clear message (local HTTPS checks skipped).
  - [x] 2.3 Ensure the short‑circuit payload includes minimal structured data (timestamp, reason, checks placeholder) for monitoring clarity.
  - [x] 2.4 Remove or suppress internal HTTP→HTTPS probes that cause redirect warnings when in proxy mode.
  - [x] 2.5 Confirm that in non‑proxy mode, the monitor still runs and the route performs real local checks.
  - [x] 2.6 Gate the monitoring interval by env (`HTTPS_HEALTH_CHECK_INTERVAL_MINUTES`) only when not in proxy mode.
  - [x] 2.7 Update logs to INFO where appropriate and eliminate recurring CRITICALs originating from expected proxy behavior.
  - [x] 2.8 Add Jest tests to assert: monitor disabled in proxy mode, `/api/https-health` short‑circuit 200 + message, and non‑proxy mode performs real checks.

- [x] 3.0 Verify and harden middleware & headers in proxy context
  - [x] 3.1 Verify HTTPS enforcement uses `req.secure` or `X-Forwarded-Proto==='https'` paths reliably behind Render.
  - [x] 3.2 Confirm health/status endpoints behave correctly via Render HTTPS URL and do not generate self‑induced redirects.
  - [x] 3.3 Validate HSTS, X‑Frame‑Options, X‑Content‑Type‑Options, CSP headers on `/health` and `/api/status` via HTTPS.
  - [x] 3.4 Review CSP allowances (connectSrc/imgSrc/etc.) to ensure they do not break status/health responses; keep policy unchanged unless an issue is found.
  - [x] 3.5 Confirm CORS settings do not interfere with status/health.
  - [x] 3.6 Ensure security logging middleware does not classify the Render health/status traffic as suspicious.
  - [x] 3.7 Double‑check that `/api/status` reports `secure: true` via Render.
  - [x] 3.8 Document any minor header adjustments if discovered during validation.
  - [x] 3.9 Add Jest/supertest tests to validate: proxy header handling (`X-Forwarded-Proto`), no self‑induced redirects, headers present on `/health` and `/api/status`, and `secure: true` reported.

- [x] 4.0 Update configuration and documentation for Render deployments
  - [x] 4.1 Update README/ops notes with reverse proxy TLS behavior, key env vars, and a quick verification checklist.
  - [x] 4.2 Consider recommending removal of hardcoded `PORT` in render.yaml (optional) to rely on Render’s assigned `PORT`; document the tradeoff.
  - [x] 4.3 Note dev instructions for local HTTPS testing (`FORCE_HTTPS=true` and local certs) and clarify it does not apply to Render.
  - [x] 4.4 Include examples of expected logs on startup for each mode (proxy vs self‑hosted HTTPS) to aid junior devs.
  - [x] 4.5 Add Jest file‑based assertions verifying `render.yaml` contains `USE_REVERSE_PROXY_SSL: true` and `docs/deployment/render-tls.md` exists (smoke test).

- [x] 5.0 Add/extend tests and post‑deploy verification plan
  - [x] 5.1 Unit test: `/api/https-health` returns proxy short‑circuit 200 when `USE_REVERSE_PROXY_SSL=true` or `RENDER=true`.
  - [x] 5.2 Unit test: monitor does not start under reverse proxy mode; does start in non‑proxy mode.
  - [x] 5.3 Integration test: simulate proxy headers (`X-Forwarded-Proto: https`) and assert `/api/status` shows `secure: true`.
  - [x] 5.4 Integration test: ensure no noisy WARN logs are produced by the redirect middleware during proxy‑mode synthetic checks.
  - [x] 5.5 Header test: assert HSTS/XFO/NoSniff/CSP presence on `/health` and `/api/status` under HTTPS.
  - [ ] 5.6 Post‑deploy manual verification: check Render logs over 24–48h for 0 recurring CRITICAL/ERROR TLS alerts and absence of self‑induced redirect warnings.
  - [x] 5.7 Add test file stubs if missing: `packages/server/src/utils/__tests__/httpsHealthCheck.reverseProxy.test.ts`, extend `tests/security/httpsEnforcement.test.ts`, and add any needed integration tests.
  - [x] 5.8 Ensure tests can be run selectively (document `npm --prefix packages/server test -- <paths>` usage) and integrate into CI if applicable.
