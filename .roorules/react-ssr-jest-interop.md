---
description: React SSR/Jest interop standard to prevent hook resolution errors and ESM/CJS pitfalls in tests and server-side rendering
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["react", "ssr", "jest", "ts-jest", "esm", "cjs", "testing", "interop"]
globs: ["packages/client/src/**/*.tsx", "packages/client/jest.config.cjs"]
---

# React SSR/Jest Interop Standard

This rule codifies patterns that prevent SSR/test-time failures such as “Cannot read properties of undefined (reading 'useReducer')” caused by ESM/CJS interop edge cases in ts-jest/Node environments.

## Objective

- Ensure React hooks always resolve correctly during SSR and Jest runs.
- Provide consistent import patterns and Jest environment configuration.
- Eliminate intermittent default import issues with ts-jest and mixed module graphs.

## Canonical Import Pattern (Hooks via Namespace)

Always import React as a namespace and reference hooks off the namespace.

Before (forbidden in SSR/ts-jest contexts):
```ts
import React, { useMemo, useState, useReducer } from "react";
const v = useMemo(() => 1, []);
```

After (required):
```ts
import * as React from "react";
const v = React.useMemo(() => 1, []);
const [state, setState] = React.useState(0);
const [, forceTick] = React.useReducer((x: number) => x + 1, 0);
```

Rationale:
- Under ts-jest SSR, the default import can be undefined for certain compiled graphs. Namespace import guarantees a stable binding.

## Jest Environment and Config

- Use jsdom for client component tests (DOM APIs required):
  - Install: `jest-environment-jsdom`
- Keep ts-jest settings under `transform` (avoid deprecated globals config).
- Optional: `esModuleInterop: true` may reduce interop noise, but not required with namespace import.

Example `packages/client/jest.config.cjs` snippet:
```js
module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(t|j)sx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json"
      }
    ]
  },
  testMatch: ["**/__tests__/**/*.test.ts?(x)"]
};
```

## Do/Don’t Summary

- Do: `import * as React from "react";` and use `React.useX`
- Don’t: Default import React + named hooks in SSR/Jest contexts
- Do: Set `testEnvironment: "jsdom"` for client tests
- Do: Keep ts-jest config under `transform`
- Optional: `esModuleInterop: true` is acceptable but not required

## Migration Checklist

- [ ] Replace `import React, { useX } from "react"` with `import * as React from "react"` across client components.
- [ ] Update all hook calls to `React.useX`.
- [ ] Ensure `jest-environment-jsdom` is installed and configured.
- [ ] Verify tests pass: `pnpm -C packages/client test`.

## Acceptance Criteria

- No SSR/Jest failures referencing undefined React default exports.
- All hooks resolve via `React.useX` in test/SSR contexts.
- Client tests pass consistently with jsdom.

## References

- Observed failure signature:
  - “TypeError: Cannot read properties of undefined (reading 'useReducer')”
- Resolution captured in docs/refactor-audit.md (2025‑08‑31: SSR/Jest interop fix for BuildTables).
