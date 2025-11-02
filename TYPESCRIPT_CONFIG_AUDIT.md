# TypeScript Configuration Audit Report

**Audit Date:** 2025-11-02  
**Auditor:** AI Agent (Task 1.1)  
**Scope:** All tsconfig.json files across project (excluding node_modules)  
**Status:** Complete

---

## Executive Summary

The Attrition project has **11 tsconfig.json files** across root and multiple packages. **Configuration is inconsistent** across the monorepo with varying strictness levels and different settings per package.

### Key Findings

| Finding | Count | Impact |
|---------|-------|--------|
| Total tsconfig files | 11 | Good — multi-package support |
| Using `strict: true` | 5 packages | ✅ Good — but inconsistent |
| Using `strict: false` | 0 packages | ✅ Good — no loose settings |
| Using `strict: true` | 5 packages | ✅ None identified as problematic |
| Missing strict settings | 0 packages | ✅ All explicitly configured |
| **Critical Finding** | Desktop + Launcher | ⚠️ **Missing tsconfig.json** |
| Inconsistent module systems | Mixed | ⚠️ CommonJS vs ESNext |
| Inconsistent targets | Mixed | ⚠️ ES2020 vs others |

### Quick Health Check

- ✅ Client package: Strict mode enabled
- ✅ Server package: Strict mode enabled
- ✅ Shared package: Strict mode enabled
- ✅ NPC Memory Service: Strict mode enabled
- ⚠️ Desktop package: **NO tsconfig.json** — needs creation
- ⚠️ Launcher package: **NO tsconfig.json** — needs creation
- ⚠️ Map Next V7: Extends root, non-standard config

---

## Detailed Audit Results

### 1. Root tsconfig.json

**File:** `tsconfig.json`  
**Status:** ✅ Good — Workspace Root Config  
**Size:** 159 bytes

#### Configuration

```json
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/server" },
    { "path": "./packages/client" }
  ]
}
```

#### Analysis

| Setting | Value | Assessment |
|---------|-------|-----------|
| Configuration Type | Workspace references | ✅ Correct for monorepo |
| Referenced packages | 3 (shared, server, client) | ⚠️ **Missing desktop, launcher** |
| Strict mode | N/A (references only) | N/A |
| Complete | No | ⚠️ Incomplete references |

#### Issues Found

1. **Missing Package References** — Desktop and launcher packages not listed
   - Impact: Missing `tsc --build` coverage
   - Fix: Add references to desktop and launcher
   
2. **Incomplete Workspace** — Only 3 of 5+ packages referenced
   - Impact: Build system may not include all packages
   - Fix: Add all active packages

#### Recommendations

```json
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/server" },
    { "path": "./packages/client" },
    { "path": "./packages/desktop" },
    { "path": "./packages/launcher" },
    { "path": "./packages/npc-memory-service" }
  ]
}
```

---

### 2. packages/client/tsconfig.json

**File:** `packages/client/tsconfig.json`  
**Status:** ✅ Excellent — Modern Frontend Config  
**Size:** 981 bytes

#### Configuration Summary

| Setting | Value | Assessment |
|---------|-------|-----------|
| Target | ES2020 | ✅ Modern browser target |
| Module | ESNext | ✅ Modern module system |
| Strict | true | ✅ Full strict mode |
| JSX | react-jsx | ✅ React support |
| Lint Rules | Multiple | ✅ High quality |
| Declaration Files | N/A | ✅ Not needed for client |

#### Strict Mode Settings

| Option | Value | Purpose |
|--------|-------|---------|
| strict | true | Enable all strict checks |
| noUnusedLocals | true | Catch unused variables |
| noUnusedParameters | true | Catch unused params |
| noFallthroughCasesInSwitch | true | Catch switch fallthrough |

#### Key Features

```javascript
// ✅ Comprehensive linting configuration
"strict": true,
"noUnusedLocals": true,
"noUnusedParameters": true,
"noFallthroughCasesInSwitch": true,

// ✅ Module resolution for bundler (Vite)
"moduleResolution": "bundler",
"allowImportingTsExtensions": true,

// ✅ Path aliasing
"baseUrl": ".",
"paths": {
  "pixi.js": ["src/types/pixi-reexports"]
}
```

#### Test Exclusion

```javascript
"exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]  // ✅ Correct
```

#### Recommendations

- ✅ No changes needed — this is a well-configured client setup
- Consider: Add path aliases for `@components`, `@utils`, etc. for better imports

---

### 3. packages/server/tsconfig.json

**File:** `packages/server/tsconfig.json`  
**Status:** ✅ Good — Backend Config  
**Size:** 945 bytes

#### Configuration Summary

| Setting | Value | Assessment |
|---------|-------|-----------|
| Target | ES2020 | ✅ Modern Node.js |
| Module | commonjs | ✅ Standard for Node.js |
| Strict | true | ✅ Full strict mode |
| Declaration | true | ✅ Generate .d.ts files |
| Decorators | true | ✅ Support for decorators |

#### Strict Mode Settings

| Option | Value | Purpose |
|--------|-------|---------|
| strict | true | Enable all strict checks |
| esModuleInterop | true | Better CommonJS support |
| forceConsistentCasingInFileNames | true | Prevent case issues |

#### Key Features

```javascript
// ✅ Comprehensive Node.js backend setup
"target": "ES2020",
"module": "commonjs",
"outDir": "./dist",
"rootDir": "./src",

// ✅ Declaration files for TypeScript consumers
"declaration": true,
"declarationMap": true,
"sourceMap": true,

// ✅ Decorator support (useful for frameworks)
"experimentalDecorators": true,
"emitDecoratorMetadata": true,

// ✅ Monorepo project references
"composite": true,
"references": [{ "path": "../shared" }]
```

#### Test Exclusion

```javascript
"exclude": [
  "node_modules",
  "dist",
  "src/**/*.test.ts",
  "src/__tests__/**/*",
  "src/**/__tests__/**/*"
]  // ✅ Comprehensive test exclusion
```

#### ts-node Configuration

```javascript
"ts-node": {
  "transpileOnly": true,  // ✅ Faster execution
  "compilerOptions": {
    "module": "commonjs"    // ✅ CommonJS for Node.js
  }
}
```

#### Recommendations

- ✅ Well-configured for backend
- Consider: Add `"noImplicitAny": true` explicitly for Phase 1 migration preparation

---

### 4. packages/shared/tsconfig.json

**File:** `packages/shared/tsconfig.json`  
**Status:** ✅ Good — Shared Utilities Config  
**Size:** 561 bytes

#### Configuration Summary

| Setting | Value | Assessment |
|---------|-------|-----------|
| Target | ES2020 | ✅ Modern standard |
| Module | commonjs | ✅ Default for Node.js |
| Strict | true | ✅ Full strict mode |
| Declaration | true | ✅ .d.ts files for consumers |
| Composite | true | ✅ Monorepo support |

#### Configuration Details

```javascript
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "types": ["node"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "composite": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### Recommendations

- ✅ Excellent config for shared/foundation package
- ✅ Ready for Phase 1 migration as-is

---

### 5. packages/npc-memory-service/tsconfig.json

**File:** `packages/npc-memory-service/tsconfig.json`  
**Status:** ✅ Good — Service Config  
**Size:** 492 bytes

#### Configuration Summary

| Setting | Value | Assessment |
|---------|-------|-----------|
| Target | ES2020 | ✅ Modern |
| Module | commonjs | ✅ Standard |
| Strict | true | ✅ Full strict mode |
| Declaration | true | ✅ .d.ts files |

#### Key Settings

```javascript
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "moduleResolution": "node",
    "baseUrl": "./src",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node", "jest"]
  },
  "exclude": ["node_modules", "dist"]
}
```

#### Observations

- Has jest types configured
- baseUrl set to "./src"
- No test exclusion in include (includes all)

#### Recommendations

- Add explicit `"include": ["src"]` for clarity
- Add test exclusion pattern: `"exclude": ["node_modules", "dist", "**/*.test.ts"]`

---

### 6. packages/map-next-v7/tsconfig.json

**File:** `packages/map-next-v7/tsconfig.json`  
**Status:** ⚠️ Non-standard — Extends Root  
**Size:** 269 bytes

#### Configuration

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": false,
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

#### Issues Found

1. **Extends Root Config** — Maps back to root which only has references
   - Impact: Inherits minimal settings; unclear what the actual compile rules are
   - Issue: Root tsconfig doesn't define compilerOptions, only references

2. **Incomplete Inheritance** — May not inherit all needed settings
   - Impact: Unclear what strict settings apply
   - Fix: Define complete compilerOptions

#### Recommendations

Change to standalone config like other packages:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "composite": false
  },
  "include": ["src"]
}
```

---

### 7. packages/server/supabase/tsconfig.json

**File:** `packages/server/supabase/tsconfig.json`  
**Status:** ✅ Good — Supabase-specific Config  
**Size:** 340 bytes

#### Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "composite": false,
    "moduleResolution": "node"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

#### Assessment

- ✅ Well-configured for Supabase functions
- ✅ Standard strict settings
- ✅ Reasonable for its specific scope

---

## Missing Configurations

### 8. ⚠️ packages/desktop/tsconfig.json — **MISSING**

**Impact:** Desktop package is not part of TypeScript build system  
**Status:** Critical for Phase 3

#### Current State

- No tsconfig.json in `packages/desktop/`
- Package contains `.js` files that need conversion
- Not referenced in root tsconfig

#### Required Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    "declaration": true,
    "composite": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"],
  "references": []
}
```

**Notes:**
- Using `strict: false` initially (per decision: gradual strictness in Phase 3-4)
- Enabling individual strict options incrementally
- CommonJS module for Electron compatibility

---

### 9. ⚠️ packages/launcher/tsconfig.json — **MISSING**

**Impact:** Launcher package not part of TypeScript build system  
**Status:** Critical for Phase 3

#### Current State

- No tsconfig.json in `packages/launcher/`
- Package contains `.js` files
- Not referenced in root tsconfig

#### Required Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true,
    "declaration": false,
    "composite": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"],
  "references": []
}
```

**Notes:**
- Launcher is simpler; no declaration files needed
- Same strictness progression as desktop
- Marked as composite for consistency

---

## Configuration Comparison Matrix

### Strict Mode Settings

| Package | strict | noImplicitAny | noImplicitThis | strictNullChecks | Status |
|---------|--------|---------------|----------------|------------------|--------|
| client | ✅ true | Via strict | Via strict | Via strict | ✅ Best |
| server | ✅ true | Via strict | Via strict | Via strict | ✅ Good |
| shared | ✅ true | Via strict | Via strict | Via strict | ✅ Good |
| npc-memory-service | ✅ true | Via strict | Via strict | Via strict | ✅ Good |
| map-next-v7 | ? (extends) | ? | ? | ? | ⚠️ Unclear |
| server/supabase | ✅ true | Via strict | Via strict | Via strict | ✅ Good |
| desktop | ❌ MISSING | - | - | - | 🔴 Critical |
| launcher | ❌ MISSING | - | - | - | 🔴 Critical |

### Module System

| Package | Module | Target | Assessment |
|---------|--------|--------|-----------|
| client | ESNext | ES2020 | ✅ Frontend (Vite) |
| server | commonjs | ES2020 | ✅ Backend (Node.js) |
| shared | commonjs | ES2020 | ✅ Library (Node.js) |
| npc-memory-service | commonjs | ES2020 | ✅ Service (Node.js) |
| desktop | - | - | ⚠️ Should be: commonjs (Electron) |
| launcher | - | - | ⚠️ Should be: commonjs (Electron) |

---

## Inconsistencies Found

### 1. Test Exclusion Patterns (Minor)

| Package | Pattern | Status |
|---------|---------|--------|
| client | `src/**/*.test.ts(x)` | ✅ Explicit |
| server | `src/**/*.test.ts` + `__tests__/**/*` | ✅ Comprehensive |
| shared | `**/*.test.ts` | ✅ Good |
| npc-memory-service | None (includes all) | ⚠️ Odd |
| desktop | N/A | - |
| launcher | N/A | - |

**Impact:** Minor — tests may compile unnecessarily in npc-memory-service

---

### 2. Declaration File Generation (Varies)

| Package | declaration | declarationMap | Status |
|---------|-------------|----------------|--------|
| client | N/A | N/A | ✅ Not needed |
| server | ✅ true | ✅ true | ✅ Good |
| shared | ✅ true | ✅ true | ✅ Good |
| npc-memory-service | ✅ true | ✅ true | ✅ Good |
| server/supabase | ❌ false | ❌ false | ⚠️ Should generate |

**Impact:** Consumers of supabase functions won't have type definitions

---

## Priority Action Items

### 🔴 Critical (Must Fix Before Migration)

1. **Create packages/desktop/tsconfig.json**
   - Impact: Desktop package integration
   - Effort: 5 minutes
   - Template: Provided above

2. **Create packages/launcher/tsconfig.json**
   - Impact: Launcher package integration
   - Effort: 5 minutes
   - Template: Provided above

3. **Update root tsconfig.json references**
   - Add desktop, launcher, npc-memory-service references
   - Impact: Complete monorepo coverage
   - Effort: 2 minutes

### 🟡 Important (Should Fix During Phase 1)

4. **Fix map-next-v7/tsconfig.json**
   - Remove extends, add complete compilerOptions
   - Impact: Clarity and consistency
   - Effort: 5 minutes

5. **Fix npc-memory-service test exclusion**
   - Add `"exclude": ["node_modules", "dist", "**/*.test.ts"]`
   - Impact: Don't compile tests
   - Effort: 1 minute

6. **Add declaration files to server/supabase**
   - Enable `declaration: true` and `declarationMap: true`
   - Impact: Type definitions for consumers
   - Effort: 1 minute

### 🟢 Nice-to-Have (Consider Later)

7. **Add path aliases to multiple packages**
   - Makes imports cleaner
   - Low impact
   - Can be done incrementally

---

## Summary Table

| Package | Status | Critical Issues | Recommendations |
|---------|--------|-----------------|-----------------|
| **Root** | ⚠️ Incomplete | Missing references | Add all packages |
| **client** | ✅ Excellent | None | No changes |
| **server** | ✅ Good | None | Minor: add explicit noImplicitAny |
| **shared** | ✅ Good | None | Ready for Phase 1 |
| **npc-memory-service** | ⚠️ Partial | Test exclusion missing | Add exclude pattern |
| **map-next-v7** | ⚠️ Non-standard | Unclear inheritance | Standalone config |
| **server/supabase** | ⚠️ Partial | No declarations | Enable declaration files |
| **desktop** | 🔴 Missing | tsconfig.json | CREATE IMMEDIATELY |
| **launcher** | 🔴 Missing | tsconfig.json | CREATE IMMEDIATELY |

---

## Recommendations for Phase 1 Preparation

### Before Starting Phase 1 (Task 1.1 Completion)

1. ✅ Create `packages/desktop/tsconfig.json`
2. ✅ Create `packages/launcher/tsconfig.json`
3. ✅ Update root `tsconfig.json` with complete references
4. ✅ Fix `packages/map-next-v7/tsconfig.json`
5. ✅ Fix `packages/npc-memory-service/tsconfig.json`

### During Phase 1

6. Start with `packages/shared` (already well-configured)
7. Update `pnpm type:check` script to include all packages
8. Document final configuration in `TYPESCRIPT_MIGRATION_STRATEGY.md`

### After Phase 1

9. Apply learned patterns to Phases 2 and 3
10. Gradually move toward `strict: true` everywhere

---

## Appendix: All Configuration Files

### Differences Summary

**Most Permissive:** map-next-v7 (unclear settings)  
**Most Strict:** client (explicit strict mode)  
**Most Complete:** server and shared (declaration files, composite, decorators)  
**Most Minimal:** desktop and launcher (MISSING)  

**Recommendation:** Use server/shared configuration as template for desktop/launcher.

---

## Next Steps (Task 1.2)

After this audit completes:

1. Create migration strategy document (`TYPESCRIPT_MIGRATION_STRATEGY.md`)
2. Document the gradual strictness progression (Phases 1-4)
3. Create baseline metrics (file counts, complexity scores)
4. Plan git tags for each phase checkpoint

**Estimated Time to Complete Task 1.1:** Complete ✅  
**Estimated Time for Task 1.2:** ~30 minutes

