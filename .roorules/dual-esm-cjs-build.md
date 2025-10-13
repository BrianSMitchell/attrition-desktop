---
description: Dual ESM/CJS build pattern for shared TypeScript libraries in monorepos. Ensures Vite (ESM) and Node/Jest (CJS) compatibility with an exports map.
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["typescript", "build", "esm", "cjs", "vite", "node", "monorepo"]
globs: ["packages/*/package.json", "packages/*/tsconfig*.json"]
---

# Dual ESM/CJS Build Template for Shared Libraries

## Objective

Provide a robust, repeatable pattern to publish shared TypeScript libraries that work with:
- Vite-based clients that expect ESM and named exports
- Node/Jest backends/tools that may still consume CommonJS

This eliminates errors like:
- `does not provide an export named 'X'` (caused by CJS-only output under Vite)
- TS6304 / TS5069 errors when composing multiple TS build configs

## When to Use

- Packages under `packages/shared` or any internal library consumed by both client (Vite) and server/Jest
- You see ESM named export errors in the browser or require/interop problems on the server

## Directory Layout

```
packages/shared/
├── src/
├── dist/
│   ├── esm/
│   ├── cjs/
│   └── types/
├── tsconfig.json
├── tsconfig.esm.json
├── tsconfig.cjs.json
└── package.json
```

## TS Configs

Keep common settings in `tsconfig.json` (target, strict, rootDir, etc.). Add two targeted configs:

`tsconfig.esm.json`
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ES2020",
    "moduleResolution": "Bundler",
    "outDir": "./dist/esm",
    "declaration": true,
    "declarationDir": "./dist/types",
    "emitDeclarationOnly": false,
    "tsBuildInfoFile": "./dist/esm.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

`tsconfig.cjs.json`
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "outDir": "./dist/cjs",
    "declaration": false,
    "declarationMap": false,
    "emitDeclarationOnly": false,
    "tsBuildInfoFile": "./dist/cjs.tsbuildinfo",
    "composite": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

Notes:
- ESM build emits `.d.ts` to `dist/types`
- CJS build disables `declaration` and `declarationMap` to avoid TS6304/TS5069
- Separate `tsBuildInfoFile` to prevent collisions

## package.json Exports Map

Update the library `package.json`:

```json
{
  "main": "dist/cjs/index.js",
  "module": "dist/esm/index.js",
  "types": "dist/types/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    }
  },
  "scripts": {
    "build": "rimraf dist && tsc -p tsconfig.esm.json && tsc -p tsconfig.cjs.json"
  }
}
```

Critical:
- Do NOT add `"type": "module"` unless you want to make the whole package ESM — the exports map already cleanly routes import (ESM) vs require (CJS)
- Ensure all entrypoints are re-exported in `src/index.ts` (e.g., `export * from './utils';`)

## Build Steps

1. Apply the config/template above
2. Build the library:
   - `pnpm --filter @game/shared build`
3. Restart client dev server (Vite) so it uses the new ESM outputs
4. Verify server/Jest still work via CJS entry

## Troubleshooting

- Browser error: “does not provide an export named 'X'”
  - Cause: CJS-only dist published; fix by using this dual-build template
- TS6304: Composite projects may not disable declaration emit
  - Set `"composite": false` in `tsconfig.cjs.json` when `"declaration": false`
- TS5069: `declarationMap` without `declaration` or `composite`
  - Set `"declarationMap": false` in `tsconfig.cjs.json`
- Vite still failing after a build
  - Stop and restart the dev server to clear module graph cache
  - Confirm `dist/esm/index.js` contains proper `export` statements

### Stale build artifacts and verification checklist

Stale TypeScript build metadata or cached module graphs can reference removed files (e.g., tsconfig.tsbuildinfo still mentioning old sources). Do not use these artifacts as a source-of-truth. Use this checklist instead:

1) Verify sources directly
   - Use a file listing (e.g., list_files) under `src/` to confirm a file truly exists/does not exist.

2) Clean and rebuild shared libraries
   - Run `rimraf dist` (or `pnpm --filter @game/shared build` which already clears dist per this template).
   - Rebuild the shared package(s) first.

3) Restart dev servers and clear Vite module graph
   - Stop and restart the Vite dev server to clear module graph cache after rebuilding shared packages.
   - If you still see references to deleted files, repeat step 2 and ensure the dev server fully restarts.

4) Trust the built dist outputs
   - Confirm `dist/esm` and `dist/cjs` reflect the expected entrypoints after rebuild.
   - If errors persist, double-check the `exports` map and that all public APIs are re-exported from `src/index.ts`.

## Checklist

- [ ] `tsconfig.esm.json` and `tsconfig.cjs.json` exist and point to separate outDirs
- [ ] package.json has `main`, `module`, `types`, and `exports` entries configured
- [ ] Built artifacts present in `dist/esm`, `dist/cjs`, and `dist/types`
- [ ] Client imports like `import { foo } from '@pkg/shared'` resolve successfully
- [ ] Server/Jest can still `require('@pkg/shared')` or run via ts-jest
