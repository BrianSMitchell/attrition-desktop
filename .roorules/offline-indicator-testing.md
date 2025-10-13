---
description: Testing guide for persistent network status indicators and transient ConnectionBanner across unit, integration, and E2E (browser/Electron). Ensures non-duplication, accessibility, and accurate state mapping from NetworkContext.
author: Cline Self-Improvement Protocol
version: 2.0
tags: ["testing", "ui", "network", "electron", "playwright", "accessibility", "desktop"]
globs: [
  "packages/client/src/contexts/NetworkContext.tsx",
  "packages/client/src/components/ui/StatusDot.tsx",
  "packages/client/src/components/layout/Layout.tsx",
  "packages/client/src/components/layout/ConnectionBanner.tsx",
  "packages/desktop/src/**/*.ts",
  "e2e/**/*.spec.ts"
]
---

# Offline/Degraded/Online Indicator — Testing Companion

Companion to `.clinerules/network-status-indicators.md` and to `end-to-end-testing-protocol.md`. This guide standardizes how to test the persistent header indicator (StatusDot + latency text) and the transient ConnectionBanner so they remain consistent, accessible, and non-duplicative.

## Objectives

- Validate 3-state mapping correctness from NetworkContext (online, degraded, offline).
- Ensure the header indicator is persistent and unobtrusive; banner remains transient.
- Verify accessibility: role="status" + aria-label alignment.
- Prevent duplication/noise between banner and header indicator.

## Unit Tests

Scope: `packages/client`

1) StatusDot rendering
- Cases:
  - state="online" → green dot, optional label green when `showLabel`
  - state="degraded" → yellow dot, optional label yellow
  - state="offline" → red dot, optional label red
  - size="sm" → 8px (w-2 h-2), size="md" → 12px (w-3 h-3)
- Accessibility:
  - `role="status"` present
  - `aria-label` equals "Online" | "Degraded" | "Offline"
- Title tooltip reflects state or provided `title`

Example (Jest + @testing-library/react):
```tsx
import * as React from "react";
import { render, screen } from "@testing-library/react";
import StatusDot from "../../components/ui/StatusDot";

test("StatusDot: offline label + aria", () => {
  render(<StatusDot state="offline" showLabel />);
  const region = screen.getByRole("status", { name: /offline/i });
  expect(region).toBeInTheDocument();
  expect(region).toHaveTextContent(/offline/i);
});
```

2) ConnectionBanner messaging
- When `!isOnline` → message "No internet connection" and type=offline class
- When `isOnline && !isApiReachable` → message "Server unreachable" and type=degraded class
- Transient behavior:
  - When becoming online, banner should auto-hide after ~3s (use fake timers to assert hide)

## Integration Tests (React component)

1) Layout header indicator mapping
- Wrap Layout with a mocked NetworkContext provider
- Assert:
  - Offline → red dot + "Offline" label (showLabel true when not online)
  - Degraded → yellow dot + "Degraded" label
  - Online → green dot only; no label; if latency present, show "(Nms)"
- Sidebar “Server Status” independence: still shows Connected/Disconnected without interfering with header indicator.

2) Non-duplication behavior
- When connecting -> online, ensure banner is hidden after the transient window, but header indicator remains (green).
- When offline/degraded, both may be present briefly, but banner remains temporary while header indicator persists.

## E2E Tests (Browser/Electron via Playwright)

Preconditions:
- See `.clinerules/login-credentials-usage.md` for test credentials handling (Primary Test Account).
- Use PowerShell-safe env-var export per `.clinerules/powershell-command-syntax.md`.

Recommended invocation (PowerShell-safe):
```powershell
$env:TEST_EMAIL="test@test.com"; $env:TEST_PASSWORD="•••"; pnpm exec playwright test e2e/network.indicators.spec.ts
```

Scenarios:

1) Offline (no internet)
- Approach (Playwright):
  - Simulate offline via `context.setOffline(true)` OR intercept `/api/status` with abort/failure.
  - Expect header indicator: role="status", label "Offline", red dot present.
  - Expect ConnectionBanner with "No internet connection", then remains until restored.
- Selector hints:
  - Header indicator: `getByRole("status", { name: /offline/i })`
  - Banner text: `getByText(/No internet connection/i)`

2) Degraded (internet on, server unreachable)
- Approach:
  - Keep navigator online, but route `/api/status` → 503 or non-ok.
  - Expect header indicator label "Degraded" (yellow).
  - Banner shows "Server unreachable" transiently.
  - Ensure indicator persists; banner hides after its timer.

3) Online with latency
- Approach:
  - Route `/api/status` → 200 OK, measure request time or inject `latencyMs` via mock.
  - Expect header indicator green dot, no label; latency text visible when present: `(Nms)`.

4) Transition tests (non-duplication & persistence)
- Start offline → go online:
  - Banner briefly shows "Connected" then hides; header indicator remains green.
- Start degraded → online:
  - Verify degraded → online transition, correct tooltip messages.

Example Playwright snippet:
```ts
import { test, expect } from "@playwright/test";

test("header indicator reflects degraded state", async ({ page }) => {
  await page.route("**/api/status", route => route.fulfill({ status: 503, body: "{}" }));
  await page.goto("http://localhost:5173/dashboard");
  const indicator = page.getByRole("status", { name: /degraded/i });
  await expect(indicator).toBeVisible();
  const banner = page.getByText(/Server unreachable/i);
  await expect(banner).toBeVisible();
});
```

Notes:
- On Electron, ensure both server and desktop are running; for browser runs, only client+server are required.
- Where `context.setOffline(true)` is not feasible (Electron variant), prefer routing `/api/status` and optionally toggling `navigator.onLine` if supported.

## Accessibility Checks

- role="status" present in StatusDot
- aria-label equals expected state string (Online/Degraded/Offline)
- Tooltip conveys clear guidance for degraded/offline

## Acceptance Criteria

- Unit + integration tests confirm state mapping and accessibility.
- E2E confirms:
  - Offline → red + "Offline"; banner text shows and remains until resolved.
  - Degraded → yellow + "Degraded"; banner text shows transiently.
  - Online → green dot only; latency text optional.
- No persistent duplication between header indicator and ConnectionBanner messages; banner is transient.

## Maintenance

- When NetworkContext interface changes, update:
  - Mapping logic in Layout
  - StatusDot styling or props if needed
  - Tests (unit/integration/E2E)
- Keep test selectors stable (`role="status"`, label text) to avoid brittle tests.
