import { useCallback, useEffect, useState } from 'react';
import { 
  useEnhancedAuth, 
  useEnhancedAuthActions,
  useEnhancedNetwork,
  useEnhancedNetworkActions,
  useEnhancedSync,
  useEnhancedSyncActions,
  useServiceState,
  useServiceActions,
  useUIActions,
  useConnectionStatus
} from '../stores/enhancedAppStore';

/**
 * Hook for service-aware authentication
 * Provides enhanced auth state and actions integrated with the service layer
 */
export const useServiceAuth = () => {
  const auth = useEnhancedAuth();
  const actions = useEnhancedAuthActions();
  
  return {
    // State
    user: auth.user,
    empire: auth.empire,
    token: auth.token,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    serviceConnected: auth.serviceConnected,
    lastSyncAt: auth.lastSyncAt,
    
    // Actions
    login: actions.loginWithService,
    logout: actions.logoutWithService,
    refreshAuthStatus: actions.refreshAuthStatus,
    clearError: actions.clearError,
    setError: actions.setError,
    setLoading: actions.setAuthLoading,
  };
};

/**
 * Hook for service-aware network status
 * Provides enhanced network state and actions integrated with the service layer
 */
export const useServiceNetwork = () => {
  const network = useEnhancedNetwork();
  const actions = useEnhancedNetworkActions();
  
  return {
    // State
    status: network.status,
    isOnline: network.status.isOnline,
    isApiReachable: network.status.isApiReachable,
    isFullyConnected: network.isFullyConnected,
    latencyMs: network.status.latencyMs,
    lastChecked: network.status.lastChecked,
    error: network.status.error,
    serviceConnected: network.serviceConnected,
    
    // Actions
    checkConnectivity: actions.checkConnectivity,
    forceConnectivityCheck: actions.forceConnectivityCheck,
  };
};

/**
 * Hook for service-aware sync status  
 * Provides enhanced sync state and actions integrated with the service layer
 */
export const useServiceSync = () => {
  const sync = useEnhancedSync();
  const actions = useEnhancedSyncActions();
  
  return {
    // State
    status: sync.status,
    state: sync.status.state,
    queuedCount: sync.status.queuedCount,
    lastRunAt: sync.status.lastRunAt,
    lastError: sync.status.lastError,
    serviceConnected: sync.serviceConnected,
    autoSyncEnabled: sync.autoSyncEnabled,
    
    // Actions
    startSync: actions.startSyncWithService,
    flushQueue: actions.flushQueueWithService,
    getQueueCount: actions.getQueueCountFromService,
    toggleAutoSync: actions.toggleAutoSync,
  };
};

/**
 * Hook for overall service health and status
 * Provides comprehensive service layer monitoring
 */
export const useServiceHealth = () => {
  const services = useServiceState();
  const actions = useServiceActions();
  const connectionStatus = useConnectionStatus();
  
  const health = actions.getServiceHealth();
  
  return {
    // Overall status
    initialized: services?.initialized || false,
    ready: services?.isReady || false,
    healthy: health?.overall === 'healthy',
    status: health?.overall || 'offline',
    
    // Service connections
    connections: services?.connections || {
      auth: false,
      network: false,
      socket: false,
      sync: false,
    },
    
    // Connection summary
    connectionStatus,
    
    // Actions
    reconnectServices: actions.reconnectServices,
    
    // Detailed health info
    details: health?.details || {},
  };
};

/**
 * Hook for service lifecycle management
 * Provides initialization and cleanup capabilities
 */
export const useServiceLifecycle = () => {
  const actions = useServiceActions();
  const [initializationState, setInitializationState] = useState<{
    isInitializing: boolean;
    error: string | null;
  }>({
    isInitializing: false,
    error: null,
  });

  const initialize = useCallback(async () => {
    if (initializationState.isInitializing) {
      console.log('⏸️ Service initialization already in progress, skipping');
      return;
    }

    console.log('🚀 Starting service initialization...');
    setInitializationState({ isInitializing: true, error: null });
    
    try {
      // Add timeout to prevent hanging
      const initPromise = actions.initializeServicesInStore();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Service initialization timeout after 30 seconds')), 30000)
      );
      
      console.log('⏳ Waiting for service initialization (30 second timeout)...');
      await Promise.race([initPromise, timeoutPromise]);
      console.log('✅ Service initialization completed successfully');
      setInitializationState({ isInitializing: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Initialization failed';
      console.error('❌ Service initialization failed:', error);
      console.warn('Service initialization failed, continuing in degraded mode:', message);
      setInitializationState({ isInitializing: false, error: message });
      // Don't throw - allow app to continue in degraded mode
      // throw error;
    }
  }, [actions.initializeServicesInStore]);

  const cleanup = useCallback(async () => {
    try {
      await actions.cleanupServicesInStore();
    } catch (error) {
      console.error('Service cleanup failed:', error);
    }
  }, [actions.cleanupServicesInStore]);

  return {
    initialize,
    cleanup,
    isInitializing: initializationState.isInitializing,
    error: initializationState.error,
  };
};

/**
 * Hook for service-aware toast notifications
 * Integrates with the unified store's toast system
 */
export const useServiceToasts = () => {
  // Safe access to UI actions with fallback
  let uiActions;
  try {
    uiActions = useUIActions();
  } catch (error) {
    // Provide fallback functions if store is not ready
    uiActions = {
      addToast: () => '',
      removeToast: () => {},
      clearToasts: () => {},
    };
  }
  
  const { addToast, removeToast, clearToasts } = uiActions;
  
  const addServiceToast = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    options: {
      title?: string;
      duration?: number;
      action?: { label: string; onClick: () => void };
    } = {}
  ) => {
    try {
      addToast({
        type,
        message: options.title ? `${options.title}: ${message}` : message,
        duration: options.duration || (type === 'error' ? 5000 : 3000),
      });
    } catch (error) {
      // Fallback to console if store is not ready
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }, [addToast]);

  return {
    addToast: addServiceToast,
    removeToast,
    clearToasts,
  };
};

/**
 * Hook that monitors service state changes and provides notifications
 * Automatically handles service errors and status changes with user feedback
 */
export const useServiceMonitoring = () => {
  const serviceHealth = useServiceHealth();
  const { addToast } = useServiceToasts();
  
  // Track previous states to detect transitions
  const [previousState, setPreviousState] = useState({
    ready: serviceHealth?.ready || false,
    status: serviceHealth?.status || 'offline',
    authConnected: serviceHealth?.connections?.auth || false,
    networkConnected: serviceHealth?.connections?.network || false,
  });

  useEffect(() => {
    const current = {
      ready: serviceHealth?.ready || false,
      status: serviceHealth?.status || 'offline',
      authConnected: serviceHealth?.connections?.auth || false,
      networkConnected: serviceHealth?.connections?.network || false,
    };

    // Service became ready
    if (!previousState.ready && current.ready) {
      addToast('success', 'Services initialized successfully');
    }

    // Service status degraded
    if (previousState.status === 'healthy' && current.status === 'degraded') {
      addToast('warning', 'Some services are experiencing issues');
    }

    // Service went offline  
    if (previousState.status !== 'offline' && current.status === 'offline') {
      addToast('error', 'Services are currently offline', { duration: 0 }); // Persistent until resolved
    }

    // Service recovered
    if (previousState.status === 'offline' && current.status !== 'offline') {
      addToast('success', 'Services restored');
    }

    // Auth connection lost
    if (previousState.authConnected && !current.authConnected) {
      addToast('warning', 'Authentication service disconnected');
    }

    // Network connection lost
    if (previousState.networkConnected && !current.networkConnected) {
      addToast('warning', 'Network monitoring disconnected');
    }

    setPreviousState(current);
  }, [serviceHealth, previousState, addToast]);

  return {
    isMonitoring: serviceHealth?.initialized || false,
  };
};

/**
 * Hook that provides backward compatibility with the old store hooks
 * This allows gradual migration by providing the same API surface
 */
export const useCompatibilityLayer = () => {
  const auth = useServiceAuth();
  const network = useServiceNetwork();  
  const sync = useServiceSync();
  
  return {
    // Legacy auth interface
    useAuth: () => ({
      user: auth.user,
      empire: auth.empire,
      token: auth.token,
      isLoading: auth.isLoading,
      error: auth.error,
      isAuthenticated: auth.isAuthenticated,
    }),
    
    // Legacy network interface
    useNetwork: () => ({
      status: network.status,
      isFullyConnected: network.isFullyConnected,
    }),
    
    // Legacy sync interface
    useSync: () => ({
      status: sync.status,
    }),
  };
};

/**
 * Main hook that provides the complete service integration layer
 * This is the primary hook components should use for full service access
 */
export const useServices = () => {
  const auth = useServiceAuth();
  const network = useServiceNetwork();
  const sync = useServiceSync();
  const health = useServiceHealth();
  const lifecycle = useServiceLifecycle();
  const toasts = useServiceToasts();
  
  return {
    auth,
    network, 
    sync,
    health,
    lifecycle,
    toasts,
    
    // Quick status checks
    isReady: health.ready,
    isHealthy: health.healthy,
    connectionStatus: health.connectionStatus,
  };
};
