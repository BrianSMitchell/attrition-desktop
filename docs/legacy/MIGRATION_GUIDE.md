# Service Integration Migration Guide

This guide provides a comprehensive approach to migrating your existing React components from the old context-based architecture to the new service-integrated store system.

## Overview

The migration strategy allows for gradual, safe transition from old context/service patterns to the new unified store with service integration. The approach maintains backward compatibility while progressively introducing enhanced capabilities.

## Migration Components

### Core Files Created

1. **`hooks/useServiceIntegration.ts`** - Service-aware React hooks
2. **`components/ServiceMigrationWrapper.tsx`** - Migration utilities and HOCs
3. **`components/auth/MigratedAuth.tsx`** - Migrated auth components
4. **`components/network/MigratedNetwork.tsx`** - Migrated network components  
5. **`components/sync/MigratedSync.tsx`** - Migrated sync components

## Migration Strategy

### Phase 1: Setup Service Infrastructure

#### 1.1 Wrap Your App with ServiceProvider

```typescript
// In your main App.tsx or root component
import React from 'react';
import { ServiceProvider, MigrationDebugPanel } from './components/ServiceMigrationWrapper';

function App() {
  return (
    <ServiceProvider 
      enableMonitoring={true}
      fallback={<div>Loading services...</div>}
    >
      <YourExistingApp />
      {/* Enable during development */}
      {process.env.NODE_ENV === 'development' && (
        <MigrationDebugPanel expanded />
      )}
    </ServiceProvider>
  );
}
```

#### 1.2 Initialize Services Early

```typescript
// In your application initialization
import { useServiceLifecycle } from './hooks/useServiceIntegration';

function AppInitializer() {
  const { initialize, isInitializing, error } = useServiceLifecycle();

  useEffect(() => {
    initialize().catch(console.error);
  }, []);

  if (isInitializing) return <div>Initializing...</div>;
  if (error) return <div>Initialization failed: {error}</div>;

  return <MainApp />;
}
```

### Phase 2: Migrate Core Components

#### 2.1 Authentication Components

**Before (Old Context Pattern):**
```typescript
// Old approach
import { useAuth } from '../contexts/AuthContext';

function LoginComponent() {
  const { user, login, isLoading, error } = useAuth();
  // ... component logic
}
```

**After (Service-Integrated):**
```typescript
// New approach
import { useServiceAuth } from '../hooks/useServiceIntegration';

function LoginComponent() {
  const auth = useServiceAuth();
  // Enhanced capabilities: service connection status, sync integration, etc.
}
```

**Migration Helper:**
```typescript
// Gradual migration using HOC
import { withAuthMigration } from '../components/ServiceMigrationWrapper';

const MigratedLoginComponent = withAuthMigration(LoginComponent);
```

#### 2.2 Network Status Components

**Replace existing network contexts:**
```typescript
// Old
import { useNetwork } from '../contexts/NetworkContext';

// New
import { useServiceNetwork } from '../hooks/useServiceIntegration';
import { MigratedNetworkStatusIndicator } from '../components/network/MigratedNetwork';

function MyComponent() {
  const network = useServiceNetwork();
  
  return (
    <div>
      <MigratedNetworkStatusIndicator showDetails />
      {network.isFullyConnected ? (
        <OnlineContent />
      ) : (
        <OfflineContent />
      )}
    </div>
  );
}
```

#### 2.3 Sync Status Components

**Enhanced sync management:**
```typescript
// Old approach - basic sync status
import { useSyncState } from '../contexts/SyncContext';

// New approach - comprehensive sync control
import { useServiceSync } from '../hooks/useServiceIntegration';
import { MigratedSyncControlPanel } from '../components/sync/MigratedSync';

function SyncManager() {
  const sync = useServiceSync();
  
  return (
    <div>
      <MigratedSyncControlPanel showAdvanced />
      {sync.queuedCount > 0 && (
        <div>Pending: {sync.queuedCount} items</div>
      )}
    </div>
  );
}
```

### Phase 3: Component-by-Component Migration

#### 3.1 Identify Components for Migration

Based on the audit, these components should be prioritized:

1. **Authentication-related:**
   - `Login.tsx`
   - `AuthGuard.tsx` 
   - `UserProfile.tsx`
   - `Layout.tsx` (auth portions)

2. **Network-aware:**
   - `NetworkStatus.tsx`
   - `ConnectionIndicator.tsx`
   - `Layout.tsx` (network portions)

3. **Sync-related:**
   - `SyncFeedback.tsx`
   - `SyncButton.tsx`
   - `DataSyncManager.tsx`

#### 3.2 Migration Pattern for Each Component

**Step 1: Create migration wrapper**
```typescript
// components/migrated/MigratedLogin.tsx
import React from 'react';
import { useServiceAuth, useServiceToasts } from '../../hooks/useServiceIntegration';
import { withAuthMigration } from '../ServiceMigrationWrapper';

const LoginComponent: React.FC<Props> = (props) => {
  const auth = useServiceAuth();
  const { addToast } = useServiceToasts();
  
  // Use enhanced service capabilities
  const handleLogin = async (credentials) => {
    const result = await auth.login(credentials);
    if (result.success) {
      addToast('success', 'Login successful!');
    }
  };

  // Component logic with service integration
  return (
    // JSX with enhanced capabilities
  );
};

export const MigratedLogin = withAuthMigration(LoginComponent);
```

**Step 2: Update imports in consuming components**
```typescript
// Update from:
import { Login } from './components/Login';

// To:
import { MigratedLogin as Login } from './components/migrated/MigratedLogin';
```

**Step 3: Test and validate**
- Ensure feature parity with old component
- Test service connection scenarios
- Verify error handling and loading states

### Phase 4: Advanced Service Features

#### 4.1 Service Health Monitoring

```typescript
import { useServiceHealth, useServiceMonitoring } from '../hooks/useServiceIntegration';

function ServiceMonitor() {
  const health = useServiceHealth();
  useServiceMonitoring(); // Auto-handles notifications
  
  return (
    <div className={`service-status ${health.status}`}>
      <span>{health.status}</span>
      <button onClick={health.reconnectServices}>
        Reconnect
      </button>
    </div>
  );
}
```

#### 4.2 Conditional Service Rendering

```typescript
import { ConditionalServiceRender } from '../components/ServiceMigrationWrapper';

function FeatureComponent() {
  return (
    <ConditionalServiceRender 
      requireService="network"
      fallback={<OfflineMessage />}
    >
      <OnlineFeature />
    </ConditionalServiceRender>
  );
}
```

#### 4.3 Service Lifecycle Management

```typescript
import { useServiceLifecycle } from '../hooks/useServiceIntegration';

function AdminPanel() {
  const { initialize, cleanup } = useServiceLifecycle();
  
  return (
    <div>
      <button onClick={initialize}>Restart Services</button>
      <button onClick={cleanup}>Shutdown Services</button>
    </div>
  );
}
```

### Phase 5: Legacy Cleanup

#### 5.1 Remove Old Contexts Gradually

**After all components are migrated:**
1. Remove old context providers from app root
2. Delete context files
3. Clean up old hook imports

#### 5.2 Update Dependency Imports

```typescript
// Find and replace across codebase
// From: import { useAuth } from '../contexts/AuthContext';
// To: import { useServiceAuth } from '../hooks/useServiceIntegration';

// From: import { useNetwork } from '../contexts/NetworkContext';  
// To: import { useServiceNetwork } from '../hooks/useServiceIntegration';

// From: import { useSync } from '../contexts/SyncContext';
// To: import { useServiceSync } from '../hooks/useServiceIntegration';
```

## Migration Checklist

### Pre-Migration
- [ ] Service architecture is implemented and tested
- [ ] Enhanced store with service integration is complete
- [ ] Migration components and hooks are created
- [ ] ServiceProvider is added to app root

### During Migration
- [ ] Components wrapped with ServiceProvider
- [ ] Service monitoring is enabled in development
- [ ] Migration debug panel shows service health
- [ ] Individual components are wrapped with migration HOCs
- [ ] Feature parity is maintained during transition

### Post-Migration  
- [ ] All components use service-integrated hooks
- [ ] Old contexts are removed
- [ ] Legacy imports are cleaned up
- [ ] Service health monitoring is working
- [ ] Error handling and recovery is robust

## Troubleshooting

### Common Issues

#### Services Not Initializing
```typescript
// Check service provider setup
<ServiceProvider enableMonitoring fallback={<Loading />}>
  <App />
</ServiceProvider>

// Verify initialization
const { error } = useServiceLifecycle();
if (error) console.error('Service init failed:', error);
```

#### Component Migration Issues
```typescript
// Use compatibility layer during transition
import { useCompatibilityLayer } from '../hooks/useServiceIntegration';

function TransitionComponent() {
  const compat = useCompatibilityLayer();
  
  // Use compat.useAuth(), compat.useNetwork(), etc.
  // for gradual transition
}
```

#### Service Connection Problems
```typescript
// Monitor service health
const health = useServiceHealth();
console.log('Service status:', health.status);
console.log('Connections:', health.connections);

// Force reconnection
if (!health.healthy) {
  health.reconnectServices();
}
```

### Testing Migration

#### Unit Tests
```typescript
// Mock service hooks in tests
jest.mock('../hooks/useServiceIntegration', () => ({
  useServiceAuth: () => mockAuthService,
  useServiceNetwork: () => mockNetworkService,
  useServiceSync: () => mockSyncService,
}));
```

#### Integration Tests
```typescript
// Test with ServiceProvider wrapper
import { ServiceProvider } from '../components/ServiceMigrationWrapper';

function renderWithServices(component) {
  return render(
    <ServiceProvider>
      {component}
    </ServiceProvider>
  );
}
```

## Best Practices

### 1. Gradual Migration
- Migrate one component at a time
- Keep old and new versions working simultaneously
- Use feature flags if needed for controlled rollout

### 2. Service Reliability
- Always check service connection status
- Provide fallbacks for service failures
- Handle graceful degradation

### 3. Error Handling
- Use service-aware error boundaries
- Implement retry mechanisms
- Provide user feedback for service issues

### 4. Performance
- Monitor service initialization time
- Use service health checks efficiently  
- Avoid unnecessary service calls

### 5. Development Experience
- Use migration debug panel during development
- Set up proper TypeScript types
- Document service integration patterns

## Conclusion

This migration approach allows for a safe, incremental transition to the service-integrated architecture while maintaining application stability. The service integration provides enhanced capabilities including better error handling, service monitoring, and unified state management across authentication, network, and sync concerns.

Key benefits of the migrated architecture:
- **Unified State Management:** All services coordinate through the enhanced store
- **Better Error Recovery:** Service-aware error handling and reconnection
- **Enhanced Monitoring:** Real-time service health and connection status
- **Improved User Experience:** Better loading states, error messages, and service feedback
- **Scalable Architecture:** Clean separation of concerns with service abstraction