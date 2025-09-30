# Legacy Service System Migration Audit

Generated: 2025-09-16T15:10:25Z

## Overview
This document lists all files that still use the legacy service system and need to be migrated to the new enhanced store architecture.

## Migration Status Summary
- ✅ **COMPLETED**: Core service architecture, App.tsx, ServiceMigrationWrapper, ToastContainer, Layout components, **Phase 1 Critical Components**
- 🔄 **IN PROGRESS**: Phase 2 service integrations 
- ❌ **REMAINING**: Files listed below

**🎉 PHASE 1 COMPLETE**: All critical game components now use enhanced store!

---

## 🚨 HIGH PRIORITY - Active Components Using Legacy Services

### Auth Store Dependencies (useAuthStore)
These components still import from `../../stores/authStore` and need to use the enhanced store:

| File | Status | Lines | Migration Required |
|------|--------|-------|-------------------|
| `components/game/FleetPage.tsx` | ✅ | 6, 12 | **FIXED** - Now uses `useAuth` from enhancedAppStore |
| `components/game/GalaxyPage.tsx` | ✅ | 2, 35 | **FIXED** - Now uses `useAuth` from enhancedAppStore |
| `components/game/ResearchBuildTable.tsx` | ✅ | 4, 45 | **FIXED** - Now uses `useAuth` from enhancedAppStore |
| `components/game/BasePage.tsx` | ✅ | 3, 58 | **FIXED** - Now uses `useAuth` from enhancedAppStore |
| `components/auth/Register.tsx` | ✅ | 3, 10 | **FIXED** - Now uses `useAuth` (with TODO for full implementation) |
| `components/game/Dashboard.tsx` | ✅ | 2, 27 | **FIXED** - Now uses `useAuth` from enhancedAppStore |
| `components/game/BaseDetail/RefactoredBaseDetail.tsx` | ✅ | 27, 126 | **FIXED** - Now uses `useAuth` from enhancedAppStore |
| `components/game/DefensesBuildTable.tsx` | ✅ | 4, 146 | **FIXED** - Now uses `useAuth` from enhancedAppStore |

### Old Service Provider Dependencies (useServices from context)
These components still reference the old context-based service system:

| File | Status | Lines | Migration Required |
|------|--------|-------|-------------------|
| `components/layout/AppHeader/AppHeader.tsx` | ⚠️ | 19 | **PARTIALLY FIXED** - Has TODO comments, needs full implementation |
| `components/layout/NavigationSidebar/ServerStatus.tsx` | ⚠️ | 15 | **PARTIALLY FIXED** - Has TODO comments, needs full implementation |
| `components/layout/NavigationSidebar/NavigationSidebar.tsx` | ⚠️ | 11 | **PARTIALLY FIXED** - Has TODO comments, needs full implementation |
| `hooks/useMessageInit.ts` | ⚠️ | 15 | **PARTIALLY FIXED** - Has TODO comments, needs full implementation |

---

## 🔧 MEDIUM PRIORITY - Legacy Files to Remove/Update

### Old Service Infrastructure
| File | Status | Action Required |
|------|--------|----------------|
| `stores/authStore.ts` | ❌ | **DELETE** - Replace with enhanced store |
| `hooks/useServices.ts` | ❌ | **DELETE** - Replace with enhanced store hooks |
| `providers/ServiceProvider.tsx` | ❌ | **DELETE** - Replaced by ServiceMigrationWrapper |

### Old/Duplicate Components
| File | Status | Action Required |
|------|--------|----------------|
| `components/game/BaseDetail_ORIGINAL.tsx` | ❌ | **DELETE** - Original version, not used |

---

## 📋 SYSTEMATIC MIGRATION PLAN

### ✅ Phase 1: Critical Component Fixes (COMPLETED 2025-09-16)
**All critical user-facing components migrated successfully:**

1. ✅ **FleetPage.tsx** - Migrated to enhanced store
2. ✅ **GalaxyPage.tsx** - Migrated to enhanced store
3. ✅ **BasePage.tsx** - Migrated to enhanced store
4. ✅ **Dashboard.tsx** - Migrated to enhanced store
5. ✅ **ResearchBuildTable.tsx** - Migrated to enhanced store
6. ✅ **DefensesBuildTable.tsx** - Migrated to enhanced store
7. ✅ **RefactoredBaseDetail.tsx** - Migrated to enhanced store
8. ✅ **Register.tsx** - Migrated to enhanced store (partial, needs full implementation)
9. ✅ **BasesPage.tsx** - Already fixed in previous session

**Migration Pattern Applied:**
```typescript
// FROM:
import { useAuthStore } from '../../stores/authStore';
const { empire, isLoading } = useAuthStore();

// TO:
import { useAuth } from '../../stores/enhancedAppStore';
const auth = useAuth();
const { empire, isLoading } = auth;
```

### Phase 2: Enhanced Service Integration (LATER)
**Complete the TODO items in partially fixed components:**

1. **AppHeader.tsx** - Implement platform/message service integration
2. **ServerStatus.tsx** - Implement status service integration  
3. **NavigationSidebar.tsx** - Implement message service integration
4. **useMessageInit.ts** - Implement message service integration

### Phase 3: Cleanup (FINAL)
**Remove old infrastructure:**

1. Delete `stores/authStore.ts`
2. Delete `hooks/useServices.ts` 
3. Delete `providers/ServiceProvider.tsx`
4. Delete `components/game/BaseDetail_ORIGINAL.tsx`

---

## 🤖 AUTOMATED MIGRATION SCRIPT APPROACH

### Step 1: Batch Replace Auth Store Imports
```bash
# Find all files using old authStore
find packages/client/src -name "*.tsx" -o -name "*.ts" | xargs grep -l "useAuthStore\|authStore"

# Replace imports (manual verification recommended)
```

### Step 2: Pattern-Based Replacements
For each file, apply these transformations:

**Import Replacement:**
```typescript
// Find: import { useAuthStore } from '../../stores/authStore';
// Replace: import { useAuth } from '../../stores/enhancedAppStore';
```

**Hook Usage Replacement:**
```typescript
// Find: const { empire, isLoading, user, isAuthenticated, error } = useAuthStore();
// Replace: const auth = useAuth(); const { empire, isLoading, user, isAuthenticated, error } = auth;
```

---

## ⚡ QUICK WIN COMMANDS

### Build and Test After Each Fix
```bash
pnpm --filter @game/client build
pnpm dev
```

### Verify Migration Success
```bash
# Should return no results after migration:
grep -r "useAuthStore" packages/client/src/components/
grep -r "from.*authStore" packages/client/src/components/
```

---

## 🎯 EXPECTED OUTCOMES

~~After completing Phase 1:~~
**✅ PHASE 1 COMPLETED (2025-09-16):**
- ✅ All game pages (Fleet, Galaxy, Bases, Dashboard, Research, Defenses) now work
- ✅ Authentication flows work consistently  
- ✅ No more "cannot read properties" errors from old store
- ✅ Build completes successfully with no TypeScript errors
- ⚠️ Registration process has placeholder (needs full implementation)

After completing all phases:
- ✅ Completely unified service architecture
- ✅ No duplicate service systems
- ✅ Clean codebase with no legacy service references
- ✅ All TODO comments resolved with proper implementations

---

## 📝 NOTES

- **BasesPage.tsx** was already fixed in previous session
- Files marked as ⚠️ are partially fixed with TODO comments but functional
- Files marked as ❌ will cause runtime errors when accessed
- Priority should be given to components users interact with most
