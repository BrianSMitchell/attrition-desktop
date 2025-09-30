import React, { Component, ComponentType, ReactNode, useEffect, useState } from 'react';
import { 
  useServiceHealth,
  useCompatibilityLayer 
} from '../hooks/useServiceIntegration';
import { initializeEnhancedAppStore, cleanupEnhancedAppStore } from '../stores/enhancedAppStore';

interface ServiceProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
  enableMonitoring?: boolean;
}

interface ServiceProviderState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for service-related errors during migration
 */
class ServiceErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ServiceProviderState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ServiceProviderState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Service migration error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="service-error-fallback">
          <h3>Service Error</h3>
          <p>There was an error initializing services. Please refresh the page.</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Service initialization wrapper that handles service lifecycle
 */
const ServiceInitializer: React.FC<ServiceProviderProps> = ({ 
  children, 
  fallback
}) => {
  const health = useServiceHealth();
  const [initState, setInitState] = useState<{
    isInitializing: boolean;
    error: string | null;
  }>({ isInitializing: true, error: null });

  // Initialize enhanced app store on mount
  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      try {
        await initializeEnhancedAppStore();
        if (isMounted) {
          setInitState({ isInitializing: false, error: null });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Initialization failed';
        console.warn('Service initialization failed, continuing in degraded mode:', message);
        if (isMounted) {
          setInitState({ isInitializing: false, error: message });
        }
      }
    };
    
    initialize();
    
    // Cleanup on unmount
    return () => {
      isMounted = false;
      cleanupEnhancedAppStore().catch(console.error);
    };
  }, []);

  // Disable monitoring temporarily to prevent re-render loops
  // TODO: Re-enable when service initialization is stable
  // if (enableMonitoring) {
  //   // eslint-disable-next-line react-hooks/rules-of-hooks
  //   useServiceMonitoring();
  // }

  // Show loading state during initialization
  if (initState.isInitializing) {
    return fallback || (
      <div className="service-initializing">
        <div className="loading-spinner" />
        <p>Initializing services...</p>
      </div>
    );
  }

  // Show error state if initialization failed
  if (initState.error) {
    return (
      <div className="service-init-error">
        <h3>Service Initialization Failed</h3>
        <p>{initState.error}</p>
        <p className="text-sm text-gray-600 mt-2">App will continue in degraded mode</p>
      </div>
    );
  }

  // Show degraded state warning
  if (!health.healthy && health.initialized) {
    console.warn('Services are in degraded state:', health.status);
  }

  return <>{children}</>;
};

/**
 * Complete service provider that wraps the application
 * Provides error boundaries, initialization, and monitoring
 */
export const ServiceProvider: React.FC<ServiceProviderProps> = (props) => {
  return (
    <ServiceErrorBoundary fallback={props.fallback}>
      <ServiceInitializer {...props} />
    </ServiceErrorBoundary>
  );
};

/**
 * Higher-order component for gradual migration of individual components
 * Provides both old and new service interfaces for backward compatibility
 */
export const withServiceMigration = <P extends object>(
  WrappedComponent: ComponentType<P>,
  options: {
    enableLegacyMode?: boolean;
    requireServices?: boolean;
  } = {}
) => {
  const { enableLegacyMode = true, requireServices = false } = options;

  const WithServiceMigration = (props: P) => {
    const compatibility = useCompatibilityLayer();
    const health = useServiceHealth();

    // If services are required but not ready, show loading
    if (requireServices && !health.ready) {
      return (
        <div className="service-loading">
          <div className="loading-spinner" />
          <p>Waiting for services...</p>
        </div>
      );
    }

    // Provide legacy interfaces if enabled
    const enhancedProps = enableLegacyMode
      ? {
          ...props,
          // Legacy hooks can be accessed via props for gradual migration
          legacyHooks: compatibility,
          serviceHealth: health,
        }
      : props;

    return <WrappedComponent {...enhancedProps} />;
  };

  WithServiceMigration.displayName = `withServiceMigration(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithServiceMigration;
};

/**
 * HOC specifically for auth-related components during migration
 */
export const withAuthMigration = <P extends object>(
  WrappedComponent: ComponentType<P & { authMigrationMode?: boolean }>
) => {
  return withServiceMigration(WrappedComponent, { 
    requireServices: true 
  });
};

/**
 * HOC for network-aware components during migration
 */
export const withNetworkMigration = <P extends object>(
  WrappedComponent: ComponentType<P & { networkMigrationMode?: boolean }>
) => {
  return withServiceMigration(WrappedComponent, { 
    enableLegacyMode: true 
  });
};

/**
 * Migration status hook that helps track the migration process
 */
export const useMigrationStatus = () => {
  const health = useServiceHealth();
  
  return {
    // Migration readiness
    servicesReady: health.ready,
    servicesHealthy: health.healthy,
    
    // Legacy compatibility
    canUseLegacyMode: true, // Always available during migration
    shouldUseLegacyMode: !health.ready, // Fallback to legacy if services not ready
    
    // Migration progress indicators
    authServiceConnected: health.connections.auth,
    networkServiceConnected: health.connections.network,
    syncServiceConnected: health.connections.sync,
    
    // Overall migration status
    migrationComplete: health.ready && health.healthy,
    migrationProgress: health.ready ? (health.healthy ? 1.0 : 0.7) : 0.3,
  };
};

/**
 * Component wrapper for conditionally rendering based on migration status
 */
interface ConditionalServiceRenderProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireService?: 'auth' | 'network' | 'sync' | 'all';
  gracefulDegradation?: boolean;
}

export const ConditionalServiceRender: React.FC<ConditionalServiceRenderProps> = ({
  children,
  fallback,
  requireService,
  gracefulDegradation = true,
}) => {
  const health = useServiceHealth();
  const migrationStatus = useMigrationStatus();

  // Check specific service requirements
  const isServiceReady = () => {
    if (!requireService || requireService === 'all') {
      return health.ready;
    }
    
    return health.connections[requireService] && health.initialized;
  };

  // If service is ready, render children
  if (isServiceReady()) {
    return <>{children}</>;
  }

  // If graceful degradation is enabled and we're in migration, show fallback
  if (gracefulDegradation && migrationStatus.canUseLegacyMode) {
    return fallback || null;
  }

  // Show loading state
  return (
    <div className="service-conditional-loading">
      <div className="loading-spinner" />
      <p>Loading {requireService || 'services'}...</p>
    </div>
  );
};

/**
 * Debug component for monitoring migration status during development
 */
export const MigrationDebugPanel: React.FC<{ expanded?: boolean }> = ({ 
  expanded = false 
}) => {
  const migrationStatus = useMigrationStatus();
  const health = useServiceHealth();

  if (!expanded && process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="migration-debug-panel" style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px',
    }}>
      <h4>Migration Status</h4>
      <div>Progress: {Math.round(migrationStatus.migrationProgress * 100)}%</div>
      <div>Services Ready: {migrationStatus.servicesReady ? '✓' : '✗'}</div>
      <div>Services Healthy: {migrationStatus.servicesHealthy ? '✓' : '✗'}</div>
      <div>Auth Connected: {migrationStatus.authServiceConnected ? '✓' : '✗'}</div>
      <div>Network Connected: {migrationStatus.networkServiceConnected ? '✓' : '✗'}</div>
      <div>Sync Connected: {migrationStatus.syncServiceConnected ? '✓' : '✗'}</div>
      <div>Legacy Mode: {migrationStatus.shouldUseLegacyMode ? 'ON' : 'OFF'}</div>
      <div>Status: {health.status}</div>
    </div>
  );
};