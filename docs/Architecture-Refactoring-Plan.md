# Attrition Architecture Refactoring Plan

## Project Overview

**Objective:** Refactor the Attrition React/Electron game client to eliminate tight coupling, reduce race conditions, and improve maintainability while preserving all existing functionality.

**Duration:** 4-6 weeks (estimated)  
**Priority:** High - Technical debt is impacting development velocity and stability  
**Risk Level:** Medium-High - Core architecture changes with extensive testing required

---

## Current Issues Summary

### Critical Problems
1. **State Management Fragmentation**
   - Multiple overlapping systems (React Context + Zustand stores)
   - 5-level context provider nesting causing performance issues
   - Inconsistent state synchronization patterns

2. **Service Layer Coupling**
   - Circular dependencies between auth, socket, and network services
   - Race conditions in token refresh and connection management
   - Scattered desktop IPC calls throughout components

3. **Component Responsibility Overload**
   - Layout component managing 6+ different concerns
   - Direct service calls from UI components
   - Mixed platform-specific logic in shared components

4. **Real-Time Sync Complexity**
   - Polling-based sync context with desktop IPC calls
   - Socket reconnection logic intertwined with auth refresh
   - Offline queue management with potential data corruption risks

---

## Refactoring Phases

### Phase 1: State Management Consolidation
**Duration:** 1-2 weeks  
**Risk:** Medium  
**Impact:** High stability improvement

#### Goals
- Eliminate React Context providers for application state
- Consolidate all state into organized Zustand stores
- Remove context nesting and improve render performance

#### Tasks

##### 1.1 Create Unified App Store Structure
**Files to Create:**
- `packages/client/src/stores/appStore.ts` - Main application store
- `packages/client/src/stores/slices/` - Individual domain slices
  - `authSlice.ts`
  - `networkSlice.ts` 
  - `syncSlice.ts`
  - `uiSlice.ts`
  - `gameSlice.ts`

**Implementation:**
```typescript
// appStore.ts structure
interface AppState {
  auth: AuthState;
  network: NetworkState;
  sync: SyncState;
  ui: UIState;
  game: GameState;
}

const useAppStore = create<AppState>()(
  subscribeWithSelector(
    devtools(
      immer((set, get) => ({
        // Combine all slices
        ...createAuthSlice(set, get),
        ...createNetworkSlice(set, get),
        ...createSyncSlice(set, get),
        ...createUISlice(set, get),
        ...createGameSlice(set, get),
      }))
    )
  )
);
```

##### 1.2 Migrate Context Providers
**Files to Modify:**
- `packages/client/src/contexts/NetworkContext.tsx` → Delete
- `packages/client/src/contexts/SyncContext.tsx` → Delete
- `packages/client/src/contexts/ToastContext.tsx` → Migrate to UI slice
- `packages/client/src/App.tsx` - Remove provider nesting

**Migration Steps:**
1. Move NetworkContext logic to `networkSlice.ts`
2. Move SyncContext polling to service layer
3. Update all `useNetwork()` calls to `useAppStore(s => s.network)`
4. Update all `useSync()` calls to `useAppStore(s => s.sync)`

##### 1.3 Store Integration Testing
**Test Files to Create:**
- `packages/client/src/stores/__tests__/appStore.test.ts`
- `packages/client/src/stores/__tests__/integration.test.ts`

**Success Criteria:**
- [ ] All context providers removed from App.tsx
- [ ] Components using stores show no performance regression
- [ ] All existing functionality preserved
- [ ] Store subscriptions working correctly

---

### Phase 2: Service Layer Decoupling
**Duration:** 2 weeks  
**Risk:** High  
**Impact:** Eliminates race conditions and improves reliability

#### Goals
- Create centralized connection management
- Eliminate circular service dependencies
- Implement proper error boundaries and retry logic

#### Tasks

##### 2.1 Create Connection Manager Service
**Files to Create:**
- `packages/client/src/services/connectionManager.ts` - Central coordinator
- `packages/client/src/services/core/` - Core service abstractions
  - `AuthManager.ts`
  - `NetworkManager.ts`
  - `SocketManager.ts`
  - `SyncManager.ts`

**Architecture:**
```typescript
// connectionManager.ts
class ConnectionManager extends EventEmitter {
  private auth: AuthManager;
  private network: NetworkManager;
  private socket: SocketManager;
  private sync: SyncManager;

  // Coordinate all connection state
  async initialize(): Promise<void>
  async handleNetworkChange(): Promise<void>
  async handleAuthRefresh(): Promise<void>
  async handleSocketReconnect(): Promise<void>
  
  // Event-driven updates
  onNetworkStateChange(callback: (state: NetworkState) => void)
  onAuthStateChange(callback: (state: AuthState) => void)
  onSyncStateChange(callback: (state: SyncState) => void)
}
```

##### 2.2 Eliminate Service Circular Dependencies
**Files to Refactor:**
- `packages/client/src/services/authService.ts` - Remove socket dependencies
- `packages/client/src/services/socket.ts` - Remove auth refresh logic
- `packages/client/src/services/networkService.ts` - Remove direct store updates

**Refactoring Strategy:**
1. Extract auth logic from socket service
2. Move socket connection logic to SocketManager
3. Use ConnectionManager as single source of truth
4. Implement proper dependency injection

##### 2.3 Implement Race Condition Guards
**Patterns to Implement:**
```typescript
// Mutex pattern for critical sections
class AsyncMutex {
  private locks = new Map<string, Promise<void>>();
  
  async acquire<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Prevent concurrent execution of same operation
  }
}

// Circuit breaker for service failures
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private readonly threshold = 3;
  private readonly resetTime = 30000;
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Prevent cascading failures
  }
}
```

**Success Criteria:**
- [ ] No circular dependencies between services
- [ ] All race condition scenarios tested and protected
- [ ] ConnectionManager coordinates all connection state
- [ ] Services can be unit tested in isolation

---

### Phase 3: Component Architecture Redesign
**Duration:** 1-2 weeks  
**Risk:** Medium  
**Impact:** Improved maintainability and testability

#### Goals
- Split monolithic components into focused, single-responsibility components
- Implement dependency injection for services
- Create reusable UI components with clear interfaces

#### Tasks

##### 3.1 Layout Component Decomposition
**Current File:** `packages/client/src/components/layout/Layout.tsx`

**New Component Structure:**
```
packages/client/src/components/layout/
├── Layout.tsx              # Main layout coordinator (simplified)
├── AppHeader/
│   ├── AppHeader.tsx       # User info, resources, messages
│   ├── ConnectionStatus.tsx # Network/sync indicators
│   └── UserMenu.tsx        # Logout, profile actions
├── NavigationSidebar/
│   ├── NavigationSidebar.tsx # Main navigation
│   ├── ServerStatus.tsx     # Server info display
│   └── NavigationItem.tsx   # Reusable nav item
└── StatusBar/
    ├── StatusBar.tsx       # Bottom status bar
    ├── NetworkIndicator.tsx # Network status
    └── SyncIndicator.tsx   # Sync status
```

**Implementation Strategy:**
1. Extract each major section into its own component
2. Pass only required props (no direct store access in leaf components)
3. Use composition pattern for flexible layout
4. Implement proper TypeScript interfaces for all props

##### 3.2 Service Integration Layer
**Files to Create:**
- `packages/client/src/hooks/useServices.ts` - Service injection hook
- `packages/client/src/providers/ServiceProvider.tsx` - Service context
- `packages/client/src/services/types.ts` - Service interfaces

**Pattern:**
```typescript
// Service dependency injection
interface Services {
  connectionManager: ConnectionManager;
  messageService: MessageService;
  gameService: GameService;
}

const ServiceContext = createContext<Services | null>(null);

export const useServices = () => {
  const services = useContext(ServiceContext);
  if (!services) throw new Error('useServices must be within ServiceProvider');
  return services;
};
```

##### 3.3 Create Reusable UI Components
**Files to Create:**
- `packages/client/src/components/ui/indicators/` - Status indicators
- `packages/client/src/components/ui/navigation/` - Navigation components  
- `packages/client/src/components/ui/data-display/` - Data display components

**Success Criteria:**
- [ ] Layout component <200 lines of code
- [ ] No component directly imports more than 2 services
- [ ] All UI components are reusable with clear props interfaces
- [ ] Components can be tested in isolation with mocked services

---

### Phase 4: Real-Time Features Optimization
**Duration:** 1-2 weeks  
**Risk:** Medium  
**Impact:** Improved performance and reliability

#### Goals
- Replace polling with event-driven updates
- Implement robust offline/online sync
- Optimize real-time update performance

#### Tasks

##### 4.1 Event-Driven Sync System
**Files to Create:**
- `packages/client/src/services/sync/SyncEngine.ts` - Event-driven sync
- `packages/client/src/services/sync/EventQueue.ts` - Action queue management
- `packages/client/src/services/sync/SyncStateManager.ts` - State coordination

**Architecture:**
```typescript
// Event-driven sync replacing polling
class SyncEngine extends EventEmitter {
  private queue: EventQueue;
  private stateManager: SyncStateManager;
  
  // Events instead of polling
  onNetworkOnline() { this.emit('sync-required'); }
  onUserAction() { this.emit('action-queued'); }
  onServerResponse() { this.emit('sync-complete'); }
  
  // Smart batching
  private batchActions(actions: Action[]): BatchRequest { }
  private optimisticUpdate(action: Action): void { }
  private revertOptimisticUpdate(action: Action): void { }
}
```

##### 4.2 Desktop Integration Cleanup
**Files to Create:**
- `packages/client/src/services/platform/DesktopBridge.ts` - IPC abstraction
- `packages/client/src/services/platform/PlatformAdapter.ts` - Platform interface
- `packages/client/src/services/platform/WebAdapter.ts` - Web implementation

**Abstraction Pattern:**
```typescript
// Platform abstraction
interface PlatformAdapter {
  isDesktop(): boolean;
  getVersion(): Promise<string>;
  saveRefreshToken(token: string): Promise<void>;
  getQueueMetrics(): Promise<QueueMetrics>;
  flushEventQueue(): Promise<FlushResult>;
}

class DesktopAdapter implements PlatformAdapter {
  // Desktop-specific implementations using IPC
}

class WebAdapter implements PlatformAdapter {
  // Web fallback implementations
}
```

##### 4.3 WebSocket Connection Optimization
**Files to Refactor:**
- `packages/client/src/services/socket.ts` - Simplify connection logic
- Create `packages/client/src/services/realtime/` - Real-time message handling

**Improvements:**
- Remove auth refresh logic from socket service
- Implement proper reconnection backoff
- Add connection health monitoring
- Separate message routing from connection management

**Success Criteria:**
- [ ] No polling-based state updates (except user-initiated)
- [ ] Desktop IPC calls centralized in platform adapters
- [ ] Socket connections stable with proper error handling
- [ ] Real-time updates perform <100ms end-to-end

---

### Phase 5: Testing and Performance Validation
**Duration:** 1 week  
**Risk:** Low  
**Impact:** Ensures stability and performance improvements

#### Goals
- Comprehensive test coverage for refactored code
- Performance benchmarking and optimization
- Integration testing for all sync scenarios

#### Tasks

##### 5.1 Test Suite Development
**Test Categories:**
- Unit tests for all new services and stores
- Integration tests for sync scenarios
- Component tests with service mocking
- Performance regression tests

**Files to Create:**
```
packages/client/src/__tests__/
├── integration/
│   ├── sync-scenarios.test.ts
│   ├── auth-flow.test.ts
│   └── offline-online.test.ts
├── performance/
│   ├── render-performance.test.ts
│   ├── memory-usage.test.ts
│   └── sync-performance.test.ts
└── e2e/
    ├── desktop-sync.test.ts
    └── real-time-updates.test.ts
```

##### 5.2 Performance Benchmarking
**Metrics to Track:**
- Component render times
- Store update performance  
- Memory usage patterns
- Network request batching efficiency
- Real-time update latency

**Benchmarking Tools:**
- React DevTools Profiler
- Chrome DevTools Performance
- Custom performance monitoring hooks

##### 5.3 Load Testing
**Scenarios to Test:**
- Offline queue with 100+ actions
- Concurrent sync operations
- Network instability simulation
- High-frequency real-time updates

**Success Criteria:**
- [ ] >90% test coverage for refactored code
- [ ] No performance regressions vs current implementation
- [ ] All race condition scenarios tested and protected
- [ ] Load testing passes with realistic user scenarios

---

## Implementation Strategy

### Development Approach
1. **Feature Flags:** Use feature flags to enable gradual rollout
2. **Parallel Development:** New architecture alongside existing code
3. **Incremental Migration:** Migrate components one at a time
4. **Backward Compatibility:** Ensure existing functionality preserved

### Branch Strategy
```
main
├── feature/phase-1-state-management
├── feature/phase-2-service-layer  
├── feature/phase-3-component-arch
├── feature/phase-4-realtime-sync
└── feature/phase-5-testing
```

### Risk Mitigation
- **Daily Builds:** Ensure changes don't break builds
- **Automated Testing:** Run full test suite on every commit
- **Performance Monitoring:** Track metrics throughout development
- **Rollback Plan:** Feature flags allow instant rollback

### Quality Gates
Each phase must pass:
- [ ] All existing tests pass
- [ ] New functionality tests pass  
- [ ] Performance benchmarks met
- [ ] Code review approved
- [ ] Manual testing completed

---

## Success Metrics

### Technical Metrics
- **Bundle Size:** <10% increase
- **Memory Usage:** <20% increase at peak
- **Render Performance:** <50ms for any component update
- **Network Requests:** >30% reduction through batching
- **Test Coverage:** >90% for new code

### Architecture Metrics
- **Cyclomatic Complexity:** Average <10 per function
- **Service Dependencies:** No circular dependencies
- **Component Size:** No component >300 lines
- **Store Size:** No store slice >500 lines

### User Experience Metrics  
- **App Startup Time:** <3s on desktop
- **Real-time Update Latency:** <500ms end-to-end
- **Offline Sync Recovery:** <5s after reconnection
- **UI Responsiveness:** No blocking operations >100ms

---

## Rollback Plan

### Phase-by-Phase Rollback
Each phase is designed to be independently revertible:

1. **Phase 1 Rollback:** Feature flag to use old context providers
2. **Phase 2 Rollback:** Service factory to return old implementations  
3. **Phase 3 Rollback:** Component router to render old Layout
4. **Phase 4 Rollback:** Sync engine toggle back to polling
5. **Emergency Rollback:** Complete branch revert within 1 hour

### Monitoring and Alerts
- **Error Rate Monitoring:** Alert if error rate >5% above baseline
- **Performance Monitoring:** Alert if key metrics degrade >20%
- **User Experience Monitoring:** Track user actions completion rates

---

## Timeline and Milestones

### Week 1-2: Phase 1 (State Management)
- [ ] Day 1-3: Create unified store structure
- [ ] Day 4-7: Migrate context providers  
- [ ] Day 8-10: Update all component hooks
- [ ] Day 11-14: Integration testing and fixes

### Week 3-4: Phase 2 (Service Layer)  
- [ ] Day 15-18: Create ConnectionManager
- [ ] Day 19-22: Refactor service dependencies
- [ ] Day 23-26: Implement race condition guards
- [ ] Day 27-28: Service integration testing

### Week 5: Phase 3 (Component Architecture)
- [ ] Day 29-31: Split Layout component
- [ ] Day 32-33: Create reusable UI components
- [ ] Day 34-35: Component integration testing

### Week 6: Phase 4 & 5 (Real-time + Testing)
- [ ] Day 36-38: Implement event-driven sync
- [ ] Day 39-40: Desktop integration cleanup
- [ ] Day 41-42: Comprehensive testing and benchmarking

---

## Team Responsibilities

### Lead Developer
- Architecture decisions and code reviews
- Phase coordination and timeline management
- Risk assessment and mitigation strategies

### Frontend Developer(s)  
- Component refactoring and UI development
- Store implementation and testing
- Performance optimization

### Backend Developer (if needed)
- Server-side sync endpoint optimization
- Real-time messaging improvements
- Desktop IPC interface updates

### QA Engineer
- Test plan development and execution
- Performance and load testing
- User acceptance testing coordination

---

## Documentation Updates

### Technical Documentation
- [ ] Update API documentation for new service interfaces
- [ ] Create architecture decision records (ADRs) for major changes
- [ ] Update development setup guides
- [ ] Create troubleshooting guides for new architecture

### Code Documentation  
- [ ] TSDoc comments for all new service interfaces
- [ ] README updates for new folder structure
- [ ] Code examples for common patterns
- [ ] Migration guides for future developers

---

## Post-Refactoring Maintenance

### Code Quality Maintenance
- ESLint rules to prevent architectural violations
- Automated dependency analysis to prevent circular deps
- Performance regression testing in CI/CD
- Regular architecture reviews

### Knowledge Transfer
- Team training sessions on new architecture
- Pair programming for complex areas
- Documentation review and updates
- Best practices documentation

---

This refactoring plan provides a structured approach to addressing the modularization issues while minimizing risk and ensuring continued functionality throughout the process. Each phase builds on the previous one, allowing for incremental validation and rollback if issues arise.