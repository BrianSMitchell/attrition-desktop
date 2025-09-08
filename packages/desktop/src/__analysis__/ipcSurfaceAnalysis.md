# IPC Surface Analysis - Attack Surface Minimization

**Date:** 2025-09-06  
**Phase:** 5 - Performance and Security Hardening  
**Task:** 1.2.3 - Minimize IPC attack surface  

## Current IPC Handler Inventory

### App Utilities (2 handlers)
- ✅ **Keep** `app:getVersion` - Essential for version display
- ✅ **Keep** `app:openExternal` - Secure URL opening with validation

### Authentication (3 handlers) 
- ✅ **Keep** `auth:login` - Core authentication functionality
- ✅ **Keep** `auth:register` - User registration
- ✅ **Keep** `auth:refresh` - Token refresh mechanism

### Token Management (3 handlers)
- ✅ **Keep** `tokens:saveRefresh` - Secure token storage
- ✅ **Keep** `tokens:deleteRefresh` - Token cleanup
- ✅ **Keep** `tokens:hasRefresh` - Token existence check

### Database Operations (11 handlers)
#### Key-Value Store (3 handlers)
- ✅ **Keep** `db:kv:set` - Essential for local storage
- ✅ **Keep** `db:kv:get` - Essential for reading settings
- ✅ **Keep** `db:kv:delete` - Cleanup functionality

#### Catalogs (3 handlers)  
- ✅ **Keep** `db:catalogs:set` - Game data caching
- ✅ **Keep** `db:catalogs:get` - Game data retrieval
- 🔄 **Evaluate** `db:catalogs:getAll` - May be redundant, check usage

#### Profile Management (2 handlers)
- ✅ **Keep** `db:profile:set` - User profile caching
- ✅ **Keep** `db:profile:get` - Profile retrieval

#### Sync State (2 handlers)
- ✅ **Keep** `db:sync:set` - Sync state management
- ✅ **Keep** `db:sync:get` - Sync state retrieval

#### Bootstrap & Health (2 handlers)
- ✅ **Keep** `db:bootstrap:fetchAndCache` - Core data synchronization
- ✅ **Keep** `db:health` - Database diagnostics

### Event Queue (7 handlers)
#### Low-level Database Events (6 handlers)
- 🔄 **Combine** `db:events:enqueue` + `eventQueue:enqueue` - Redundant functionality
- ❌ **Remove** `db:events:dequeueForFlush` - Internal operation, not needed in renderer
- ❌ **Remove** `db:events:markSent` - Should be internal to main process
- ❌ **Remove** `db:events:markFailed` - Should be internal to main process
- 🔄 **Evaluate** `db:events:cleanup` - Could be automatic/internal
- 🔄 **Evaluate** `db:events:getPendingCount` - May be redundant with queue status

#### High-level Event Queue (1 handler)
- ✅ **Keep** `eventQueue:enqueue` - Primary interface for renderer

### Error Logging (5 handlers)
- ✅ **Keep** `error:log` - Essential for error reporting
- ✅ **Keep** `error:getRecent` - Debugging and diagnostics
- 🔄 **Evaluate** `error:clear` - Could be admin-only or automatic
- 🔄 **Evaluate** `error:export` - Development/debugging feature
- ✅ **Keep** `error:getStats` - Health monitoring

### Performance Monitoring (7 handlers)
- ✅ **Keep** `perf:getMetrics` - Performance monitoring
- ✅ **Keep** `perf:getStats` - Performance statistics
- 🔄 **Evaluate** `perf:export` - Development feature, could be admin-only
- 🔄 **Evaluate** `perf:clear` - Could be automatic or admin-only
- ✅ **Keep** `perf:getThresholds` - Threshold management
- ✅ **Keep** `perf:setThresholds` - Threshold configuration
- ✅ **Keep** `perf:getThresholdBreaches` - Alert monitoring

### Network Status (2 handlers)
- ❌ **Remove** `network:getStatus` - Not exposed in preload, likely unused
- ❌ **Remove** `network:isFullyConnected` - Not exposed in preload, likely unused

### Security Audit (2 handlers) 
- 🔄 **Admin Only** `security:getAuditLog` - Should require admin permissions
- ✅ **Keep** `security:getStats` - General security metrics

## Minimization Recommendations

### Phase 1: Remove Unused Handlers (4 handlers)
1. ❌ `network:getStatus` - Not exposed in preload bridge
2. ❌ `network:isFullyConnected` - Not exposed in preload bridge  
3. ❌ `db:events:dequeueForFlush` - Internal operation only
4. ❌ `db:events:markSent` - Internal operation only
5. ❌ `db:events:markFailed` - Internal operation only

### Phase 2: Combine Redundant Handlers (2 → 1)
1. 🔄 Merge `db:events:enqueue` into `eventQueue:enqueue` - Single event interface

### Phase 3: Add Permission Controls (3 handlers)
1. 🔒 `security:getAuditLog` - Require admin/debug mode
2. 🔒 `error:export` - Require admin/debug mode  
3. 🔒 `perf:export` - Require admin/debug mode

### Phase 4: Evaluate Optional Handlers (4 handlers)
1. 🔄 `db:catalogs:getAll` - Check if `db:catalogs:get` can handle this
2. 🔄 `db:events:cleanup` - Consider automatic cleanup
3. 🔄 `error:clear` - Consider automatic cleanup  
4. 🔄 `perf:clear` - Consider automatic cleanup

## Security Impact Analysis

### Current Attack Surface: 42 handlers
### Proposed Minimized Surface: 33-35 handlers (-17% to -21%)

### Risk Reduction Benefits:
- **Removed Internal Operations:** 5 handlers that shouldn't be renderer-accessible
- **Combined Redundant Functions:** Reduces confusion and potential misuse
- **Permission-Controlled Access:** Sensitive operations require authorization
- **Simplified Interface:** Cleaner, more predictable API surface

## Implementation Priority

### High Priority (Immediate):
1. Remove unused network status handlers
2. Remove internal event queue operations
3. Add permission controls for admin functions

### Medium Priority (Phase 5 completion):
1. Combine redundant event queue handlers
2. Evaluate optional cleanup operations

### Low Priority (Future):
1. Consider auto-cleanup for maintenance operations
2. Add role-based access control for advanced features

## Validation Strategy

### Testing Approach:
1. **Functionality Testing:** Ensure removed handlers don't break existing features
2. **Security Testing:** Verify permission controls work correctly
3. **Performance Testing:** Measure impact of handler reduction
4. **Integration Testing:** Test combined handlers work seamlessly

### Rollback Plan:
1. Keep removed handler code commented for quick restoration
2. Feature flags for permission-controlled handlers
3. Monitoring for any missing functionality reports

## Expected Outcomes

### Security Benefits:
- Reduced attack surface by ~20%
- Better access control for sensitive operations
- Cleaner separation of concerns
- Reduced complexity for security audits

### Performance Benefits:
- Fewer IPC handlers to validate
- Reduced memory footprint
- Simplified routing logic
- Better cache locality

### Maintenance Benefits:
- Clearer API boundaries
- Easier to reason about functionality
- Reduced test complexity
- Better documentation alignment
