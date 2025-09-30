# E2E Test Plan — Deterministic Idempotency (Structures & Research)

References:
- .clinerules/queue-idempotency.md
- .clinerules/dto-error-schema-and-logging.md
- .clinerules/end-to-end-testing-protocol.md
- .clinerules/tabular-build-ui-standard-and-test-plan.md
- .clinerules/login-credentials-usage.md

Objective:
Stabilize idempotency assertions for Structures and Research by removing UI-timing flakiness. Use test-only seeding, deterministic base/target selection, server-side eligibility polling, and a direct API POST pair. Acceptance is exactly one HTTP 200 and one HTTP 409 OR a canonical JSON error payload with code ALREADY_IN_PROGRESS.

Status (2025-08-30):
- Implemented in:
  - e2e/idempotency.structures.spec.ts
  - e2e/idempotency.research.spec.ts
- Units kept skipped until units start path exists.

Scope:
- Structures: POST /api/game/structures/start
- Research: POST /api/game/tech/start
- (Defenses/Units unchanged for this plan; Units remains skipped in Phase A)

Canonical DTO expectations:
- Success
  {
    "success": true,
    "data": { /* endpoint-specific */ },
    "message": "..."
  }
- Error
  {
    "success": false,
    "code": "ALREADY_IN_PROGRESS",
    "message": "...",
    "details": { "identityKey": "..." },
    "error": "..." // router mirrors message to error when missing
  }

Environment & Preconditions:
- Dev stack running, DB connected.
- NODE_ENV=test active for Playwright webServer to expose test-only routes.
- Use the existing Primary Test Account, do not register new users (see .clinerules/login-credentials-usage.md).

Deterministic Flow (per domain)
1) Seeding (test-only routes, gated by NODE_ENV=test)
   - Structures: POST /api/game/test/seed-structures
     - Returns a deterministic base coordinate (coord) with enough resources.
   - Research: POST /api/game/test/seed-research
     - Returns the same seeded base coordinate and sufficient credits + labs.

2) Optional cleanup (Structures)
   - DELETE /api/game/test/buildings/queued/:catalogKey
   - Remove likely blockers (e.g., robotic_factories) before eligibility scan.

3) Eligibility polling (server authoritative)
   - Structures: GET /api/game/bases/:coord/structures → until any items[i].canStart === true
   - Research:  GET /api/game/tech/status?base=:coord → until at least one eligible technology
   - Short timeout (2–3s), 100–200ms interval.

4) Deterministic base selection
   - Use the coord returned by the seeding endpoint.

5) Deterministic target selection (priority list)
   - Structures priority:
     ['robotic_factories','metal_refineries','research_labs','shipyards','spaceports','economic_centers','command_centers','android_factories']
   - Research priority:
     ['energy','computer','armour','laser','missiles','stellar_drive','plasma','warp_drive','shielding','stealth','photon','artificial_intelligence','cybernetics','tachyon_communications','anti_gravity']
   - Pick the first eligible target from the list.

6) Direct API POST pair (idempotency assertion)
   - Send two sequential authenticated POST requests with identical payloads:
     - Structures: POST /api/game/structures/start { locationCoord, buildingKey }
     - Research:   POST /api/game/tech/start       { locationCoord, techKey }
   - Do not rely on UI double-click timing.

7) Acceptance criteria
   - Exactly one success (HTTP 200)
   - And one HTTP 409 OR a canonical error payload with code "ALREADY_IN_PROGRESS"
   - Union-safe checks: allow either status 409 OR JSON with { success:false, code:"ALREADY_IN_PROGRESS" }

8) Observability (optional)
   - Server logs for idempotency:
     - [StructuresService.start] idempotent identityKey=… state=queued|active itemId=…
     - [TechService.start] idempotent identityKey=… state=pending|queued itemId=…
   - Do not fail the test based on logs; use them for diagnosis.

Playwright Helpers

Auth header derivation (from persisted Zustand store):
```ts
import type { Page } from '@playwright/test';

export async function getAuthHeaders(page: Page): Promise<Record<string, string>> {
  // Assumes the client persists auth under 'auth-storage' with shape { state: { token: string } }
  const raw = await page.evaluate(() => localStorage.getItem('auth-storage'));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    const token = parsed?.state?.token;
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
  } catch {
    return {};
  }
}
```

Structures eligibility polling:
```ts
import type { Page } from '@playwright/test';

export async function waitForEligibleStructure(page: Page, coord: string, timeoutMs = 3000) {
  const baseApi = 'http://localhost:3001/api';
  const headers = await getAuthHeaders(page);
  const interval = 200;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const resp = await page.request.get(`${baseApi}/game/bases/${coord}/structures`, { headers });
    const json: any = await resp.json().catch(() => ({}));
    const items = json?.data?.items || [];
    if (Array.isArray(items) && items.some((it: any) => it?.canStart === true)) return true;
    await page.waitForTimeout(interval);
  }
  return false;
}
```

Research eligibility polling:
```ts
import type { Page } from '@playwright/test';

export async function waitForEligibleTech(page: Page, coord: string, timeoutMs = 3000) {
  const baseApi = 'http://localhost:3001/api';
  const headers = await getAuthHeaders(page);
  const interval = 200;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const resp = await page.request.get(`${baseApi}/game/tech/status?base=${encodeURIComponent(coord)}`, { headers });
    const json: any = await resp.json().catch(() => ({}));
    const items = json?.data || [];
    if (Array.isArray(items) && items.some((it: any) => it?.canStart === true)) return true;
    await page.waitForTimeout(interval);
  }
  return false;
}
```

Deterministic target selection utilities:
```ts
export const STRUCTURE_PRIORITY = [
  'robotic_factories','metal_refineries','research_labs','shipyards',
  'spaceports','economic_centers','command_centers','android_factories'
] as const;

export const TECH_PRIORITY = [
  'energy','computer','armour','laser','missiles','stellar_drive','plasma',
  'warp_drive','shielding','stealth','photon','artificial_intelligence',
  'cybernetics','tachyon_communications','anti_gravity'
] as const;

export function selectFirstEligibleKey<T extends { key: string; canStart?: boolean }>(
  items: T[],
  priority: readonly string[]
): string | undefined {
  const eligible = new Set(items.filter(i => i?.canStart === true).map(i => i.key));
  return priority.find(p => eligible.has(p));
}
```

Example: Structures idempotency (direct POST pair)
```ts
import { test, expect } from '@playwright/test';
import { getAuthHeaders, waitForEligibleStructure, STRUCTURE_PRIORITY, selectFirstEligibleKey } from './helpers';

test('Structures idempotency via direct POST pair', async ({ page }) => {
  // Pre-auth: login UI or restore storage; ensure token in localStorage 'auth-storage'
  const baseApi = 'http://localhost:3001/api';
  const headers = await getAuthHeaders(page);

  // Seed (test-only)
  const seedResp = await page.request.post(`${baseApi}/game/test/seed-structures`, { headers });
  const seedJson: any = await seedResp.json();
  const baseCoord = seedJson?.data?.coord;
  expect(baseCoord).toBeTruthy();

  // Optional cleanup for known blockers
  await page.request.delete(`${baseApi}/game/test/buildings/queued/robotic_factories`, { headers }).catch(() => {});

  // Poll eligibility
  const ok = await waitForEligibleStructure(page, baseCoord, 3000);
  expect(ok).toBeTruthy();

  // Fetch items, pick deterministic target
  const listResp = await page.request.get(`${baseApi}/game/bases/${baseCoord}/structures`, { headers });
  const listJson: any = await listResp.json();
  const items = listJson?.data?.items || [];
  const buildingKey = selectFirstEligibleKey(items, STRUCTURE_PRIORITY);
  expect(buildingKey).toBeTruthy();

  // Direct POST pair
  const first = await page.request.post(`${baseApi}/game/structures/start`, {
    headers, data: { locationCoord: baseCoord, buildingKey }
  });
  const second = await page.request.post(`${baseApi}/game/structures/start`, {
    headers, data: { locationCoord: baseCoord, buildingKey }
  });

  const statuses = [first.status(), second.status()];
  const bodies = await Promise.all([first.json().catch(() => ({})), second.json().catch(() => ({}))]);

  const has200 = statuses.includes(200);
  const has409OrCanonical =
    statuses.includes(409) ||
    bodies.some(b => b && b.success === false && b.code === 'ALREADY_IN_PROGRESS');

  expect(has200 && has409OrCanonical).toBe(true);
});
```

Example: Research idempotency (direct POST pair)
```ts
import { test, expect } from '@playwright/test';
import { getAuthHeaders, waitForEligibleTech, TECH_PRIORITY, selectFirstEligibleKey } from './helpers';

test('Research idempotency via direct POST pair', async ({ page }) => {
  const baseApi = 'http://localhost:3001/api';
  const headers = await getAuthHeaders(page);

  // Seed (test-only)
  const seedResp = await page.request.post(`${baseApi}/game/test/seed-research`, { headers });
  const seedJson: any = await seedResp.json();
  const baseCoord = seedJson?.data?.coord;
  expect(baseCoord).toBeTruthy();

  // Poll eligibility
  const ok = await waitForEligibleTech(page, baseCoord, 3000);
  expect(ok).toBeTruthy();

  // Fetch status, pick deterministic tech
  const statusResp = await page.request.get(`${baseApi}/game/tech/status?base=${encodeURIComponent(baseCoord)}`, { headers });
  const statusJson: any = await statusResp.json();
  const items = statusJson?.data || [];
  const techKey = selectFirstEligibleKey(items, TECH_PRIORITY);
  expect(techKey).toBeTruthy();

  // Direct POST pair
  const first = await page.request.post(`${baseApi}/game/tech/start`, {
    headers, data: { locationCoord: baseCoord, techKey }
  });
  const second = await page.request.post(`${baseApi}/game/tech/start`, {
    headers, data: { locationCoord: baseCoord, techKey }
  });

  const statuses = [first.status(), second.status()];
  const bodies = await Promise.all([first.json().catch(() => ({})), second.json().catch(() => ({}))]);

  const has200 = statuses.includes(200);
  const has409OrCanonical =
    statuses.includes(409) ||
    bodies.some(b => b && b.success === false && b.code === 'ALREADY_IN_PROGRESS');

  expect(has200 && has409OrCanonical).toBe(true);
});
```

Acceptance Criteria (per endpoint)
- Exactly one successful enqueue (HTTP 200).
- The other call returns HTTP 409 OR a canonical error payload with code ALREADY_IN_PROGRESS.
- No duplicate items are created server-side (subsequent refresh shows one queued/active item).
- UI-specific checks (if present in a flow) should remain soft-path (no hard failure banners for idempotency).

Troubleshooting
- Both calls 200: verify server idempotency guard and DB uniqueness/index; see .clinerules/queue-idempotency.md.
- Second call not 409 and no canonical payload: check router mapping of ALREADY_IN_PROGRESS per .clinerules/dto-error-schema-and-logging.md.
- No eligible items: confirm seeding worked and polling interval/timeouts are sufficient.
- Flakiness: increase polling timeout to 3–5s; ensure test-only cleanup removed blockers.

Appendix — Expected Error Payload Example (409 or canonical)
```json
{
  "success": false,
  "code": "ALREADY_IN_PROGRESS",
  "message": "An identical item is already queued or active.",
  "error": "An identical item is already queued or active.",
  "details": {
    "identityKey": "emp1:A00:00:00:00:robotic_factories"
  }
}
```

Appendix — Expected Success Payload Example (200)
```json
{
  "success": true,
  "data": {
    "queueItem": { /* endpoint-specific */ },
    "etaMinutes": 12
  },
  "message": "Started."
}
```

Notes
- Keep Units spec skipped until the start path exists.
- Maintain NODE_ENV=test in Playwright webServer to keep test-only routes available.
- Windows/PowerShell: avoid Unix-style && chaining; use proper sequential commands or .cmd helpers.
