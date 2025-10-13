---
description: Enforce parity between server and client for capacity-driven ETAs and time formatting. Prevents drift in construction timing and user-facing estimates.
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["capacity", "eta", "parity", "timing", "ui-vs-server", "formatting"]
globs: ["packages/server/src/**/*.ts", "packages/client/src/**/*.ts", "packages/client/src/**/*.tsx", "packages/shared/src/**/*.ts"]
---

# Capacity Parity Rule (ETA and Formatting)

## Objective
Ensure that any ETA displayed in the UI matches the server's authoritative computation for construction/upgrade time based on shared capacity inputs. Prevent drift caused by slightly different formulas, rounding, or formatting on client vs server.

## Authoritative Source

- Server computes authoritative ETA using:
  - `creditsCost / constructionPerHour` (hours) → convert to minutes
  - Round up to the nearest minute (minimum of 1 minute)
- Server obtains `constructionPerHour` from `packages/shared/src/capacities.ts` via the server `CapacityService.getBaseCapacities`.

## Client Parity Requirements

- Client displays ETAs using the same inputs used by the server (constructionPerHour from capacities service response).
- Client must NOT recompute capacities using alternative formulas.
- Client must apply identical rounding and minimum-floor rules:
  - `minutes = max(1, ceil((creditsCost / constructionPerHour) * 60))`

## Formatting Policy

- Standardize H/M/S formatting for UI when required:
  - If minutes >= 60, display hours and minutes (e.g., `1h 05m`)
  - Else display minutes (e.g., `12m`)
  - Seconds may be omitted for build ETAs to avoid flicker; if shown, use `mm:ss` for sub-hour where appropriate.
- Do not display “0m” — minimum display is `1m`.

## Shared Utilities (Optional)

- If multiple UI surfaces need formatting, extract a small helper:
  - `formatEtaMinutes(minutes: number): string`
  - Encapsulate `>= 60` rule and zero-floor avoidance.

## Testing Requirements

- Unit tests (server):
  - Verify `creditsCost / constructionPerHour` produces expected minutes with `ceil` and `min 1`.
- Unit tests (client):
  - Given server-provided `constructionPerHour` and known `creditsCost`, confirm UI computed minutes exactly match server result for several cases (boundary around 1 minute and hour thresholds).
- Integration/E2E:
  - For a known structure with known cost and capacity, assert the client shows the same ETA text immediately after a Start action is accepted.

## Change Control

- Any change to the ETA formula or rounding must:
  - Update this rule
  - Update the server implementation
  - Update client parity code (and formatting helper if present)
  - Update related tests

## Success Criteria

- ETA values match between server responses/logs and client displays.
- No reports of “UI showed N minutes but server completed in M” caused by rounding or capacity mismatches.
- Tests cover edge cases (exact hour boundaries, near-zero capacity, large costs).
