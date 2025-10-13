---
description: Standardize desktop network status indicators (online/degraded/offline) using NetworkContext as the single source of truth; define a reusable StatusDot UI atom, placement rules with ConnectionBanner, accessibility, and Electron-specific network detection.
author: Cline Self-Improvement Protocol
version: 2.0
tags: ["ui", "network", "offline", "react", "electron", "testing", "accessibility", "desktop"]
globs: [
  "packages/client/src/contexts/NetworkContext.tsx",
  "packages/client/src/components/ui/StatusDot.tsx",
  "packages/client/src/components/layout/Layout.tsx",
  "packages/client/src/components/layout/ConnectionBanner.tsx",
  "packages/desktop/src/**/*.ts"
]
---

# Network Status Indicators — Desktop Electron Standard

Companion to Complex React Component Architecture and UI banner patterns. This rule defines how the desktop Electron application exposes and renders **persistent** online/degraded/offline indicators in tandem with the **transient** ConnectionBanner, ensuring clarity without duplication or drift.

## Desktop Architecture Context

This rule is designed for **desktop-only Electron applications** where network detection differs from browser environments:
- Uses Electron's `navigator.onLine` and custom server reachability checks
- No browser-specific CORS or origin restrictions
- Desktop-specific offline behavior patterns
- Integration with Electron's network change events

## Objective

- Provide a consistent, unobtrusive header indicator that reflects connectivity state at all times.
- Keep the transient banner for event-driven notifications (drop/reconnect) without visual duplication.
- Derive UI strictly from the single source of truth: `NetworkContext`.

## Authoritative Source of Truth

- `packages/client/src/contexts/NetworkContext.tsx`
  - Exposes:
    - `status: { isOnline: boolean; isApiReachable: boolean; lastChecked: number; latencyMs?: number; error?: string }`
    - `isFullyConnected = status.isOnline && status.isApiReachable`
  - Polls `/api/status` periodically and listens to `online/offline` browser events.

## State Mapping (UI)

Derive a simple three-state indicator:

- `offline`: `!status.isOnline`
- `degraded`: `status.isOnline && !status.isApiReachable` (Internet available, server unreachable)
- `online`: `status.isOnline && status.isApiReachable`

Latency text may be shown when `online` and `latencyMs` is present.

## Reusable UI Atom: StatusDot

File: `packages/client/src/components/ui/StatusDot.tsx`

Canonical API (already implemented):
```tsx
type State = "online" | "degraded" | "offline";

interface Props {
  state: State;
  showLabel?: boolean;   // Default false – show label only for degraded/offline
  size?: "sm" | "md";    // Default "sm"
  title?: string;        // Tooltip text
  className?: string;
}
```

Visuals (dark UI):
- online → dot: `bg-green-400`, label: `text-green-400`
- degraded → dot: `bg-yellow-400`, label: `text-yellow-400`
- offline → dot: `bg-red-400`, label: `text-red-400`

Accessibility:
- Wrap in a container with `role="status"` and `aria-label` set to label text (`Online`, `Degraded`, `Offline`).
- Provide a clear `title` for hover/tooltips.

Implementation guidance:
- Use namespace import per SSR/Jest interoperability: `import * as React from "react";`
- Avoid inline JSX returns from non-component helpers.

## Placement Rules

- Persistent indicator (header):
  - Place within the top navigation cluster (right side), always visible.
  - Show `showLabel` only when state !== `online` to minimize noise.
  - When `online` and `latencyMs` exists, show `(Nms)` in `text-xs text-gray-400`.
  - Example file: `packages/client/src/components/layout/Layout.tsx`

- Transient banner:
  - `ConnectionBanner` remains event-driven and temporary (e.g., shows on disconnect and briefly on reconnect).
  - Avoid duplicating message content between banner and header indicator.

- Sidebar “Server Status”:
  - May continue showing connection/latency in detail (no change required).

## Tooltip Copy (Suggested)

- Offline: `"No internet connection. Actions are limited; queued items will sync later."`
- Degraded: `"Server unreachable. Viewing cached data; actions are limited."`
- Online: `"Online"`

## Testing Requirements

- Unit:
  - `StatusDot` renders correct colors and labels for each state; `role="status"` + `aria-label` accurate.
- Integration:
  - `Layout` shows:
    - Red dot + “Offline” label when offline
    - Yellow dot + “Degraded” label when degraded
    - Green dot only when online; latency `(Nms)` if provided
  - No duplication with `ConnectionBanner` messaging (banner is transient; indicator is persistent).
- E2E (Electron/Browser):
  - Toggle offline (simulate navigator offline + failing `/api/status`) and assert header indicator state.
  - On recovery, assert indicator returns to green and latency appears when available.

## Success Criteria

- A small, unobtrusive header indicator reflects connectivity state at all times.
- Banner remains transient without duplicating header messaging.
- All indicators derive from `NetworkContext` to prevent drift.

## Change Control

- Any change to the indicator’s state mapping must be reflected here and in:
  - `NetworkContext` contract
  - `StatusDot` styling
  - `Layout` mapping logic
  - Associated tests (unit/integration/E2E)
