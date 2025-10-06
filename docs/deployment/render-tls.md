# Render Deployment: Reverse Proxy TLS Configuration

This document explains how the server behaves when deployed on Render with TLS terminated at the edge (reverse proxy TLS).

## Environment Flags

- RENDER=true
  - Set by Render automatically at runtime.
  - Signals that the platform is Render and that TLS will be terminated by the proxy.

- USE_REVERSE_PROXY_SSL=true
  - Explicit flag to enable reverse proxy TLS mode in the server.
  - In this mode, the server will not attempt to listen or probe local HTTPS (https://localhost:443) in production.
  - Set in render.yaml under `envVars`.

## Behavior in Reverse Proxy TLS Mode

- Startup
  - The server runs HTTP internally (PORT), relying on Render to provide HTTPS at the edge.
  - HttpsHealthMonitor is disabled, avoiding false failures like "HTTPS server not listening on port 443".
  - A startup log line indicates reverse proxy SSL termination is active.

- Health Endpoints
  - /api/https-health returns HTTP 200 and indicates that local HTTPS checks are skipped because TLS is terminated by the proxy.
  - /api/status and /health still return security headers and behave normally over HTTPS via the Render URL.

- HTTPS Enforcement
  - The server uses `app.set('trust proxy', 1)` so `req.secure` and `X-Forwarded-Proto` reflect the original HTTPS connection at the edge.
  - HTTP→HTTPS redirect logic is preserved for real client traffic; internal synthetic probes are not allowed to generate noisy warnings.

## Relevant Configuration

- render.yaml (example excerpt)

  - USE_REVERSE_PROXY_SSL is already set:

    - key: USE_REVERSE_PROXY_SSL
      value: true

- Optional
  - Consider relying on Render-assigned PORT instead of hardcoding. The app reads `process.env.PORT` already.

## Verification Checklist (Post-Deploy)

- No recurring CRITICAL/ERROR TLS alerts in Render logs over 24–48 hours.
- GET https://<your-service-on-render>/api/status shows `secure: true`.
- GET https://<your-service-on-render>/api/https-health returns 200 with a message indicating reverse proxy SSL mode.
- No repeating "PRODUCTION HTTP→HTTPS redirect" warnings from internal probes.
- Security headers (HSTS/XFO/NoSniff/CSP) present on /health and /api/status over HTTPS.
