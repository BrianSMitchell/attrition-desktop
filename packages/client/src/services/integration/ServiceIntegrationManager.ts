import { getServices } from '../core';
import { useEnhancedAppStore } from '../../stores/enhancedAppStore';

/**
 * ServiceIntegrationManager coordinates between the service layer and the Zustand store system.
 * It ensures data flows correctly between services and UI state management.
 */
export class ServiceIntegrationManager {
  private static instance: ServiceIntegrationManager | null = null;
  private cleanupFunctions: (() => void)[] = [];
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ServiceIntegrationManager {
    if (!ServiceIntegrationManager.instance) {
      ServiceIntegrationManager.instance = new ServiceIntegrationManager();
    }
    return ServiceIntegrationManager.instance;
  }

  /**
   * Initialize the integration between services and store
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔗 ServiceIntegrationManager: Already initialized');
      return;
    }

    console.log('🔗 ServiceIntegrationManager: Initializing...');

    try {
      // Wait for services to be ready
      const services = getServices();
      if (!services.isReady()) {
        throw new Error('Services not ready for integration');
      }

      // Set up bidirectional integration
      this.setupAuthIntegration();
      this.setupNetworkIntegration();
      this.setupSyncIntegration();
      this.setupConnectionMonitoring();

      this.isInitialized = true;
      console.log('✅ ServiceIntegrationManager: Integration established');
    } catch (error) {
      console.error('❌ ServiceIntegrationManager: Integration failed:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Clean up all integrations
   */
  async cleanup(): Promise<void> {
    console.log('🔗 ServiceIntegrationManager: Cleaning up...');

    // Run all cleanup functions
    this.cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('🔗 ServiceIntegrationManager: Cleanup error:', error);
      }
    });
    this.cleanupFunctions = [];

    this.isInitialized = false;
    ServiceIntegrationManager.instance = null;

    console.log('✅ ServiceIntegrationManager: Cleanup completed');
  }

  /**
   * Set up auth service integration with store
   */
  private setupAuthIntegration(): void {
    const services = getServices();
    const authManager = services.getAuthManager();
    const store = useEnhancedAppStore.getState();

    // Subscribe to auth service state changes and sync to store
    const cleanup = authManager.onStateChange((authState) => {
      store.syncAuthWithService(authState);
    });
    this.cleanupFunctions.push(cleanup);

    // Initial sync
    const initialState = authManager.getState();
    store.syncAuthWithService(initialState);

    console.log('🔗 Auth integration established');
  }

  /**
   * Set up network service integration with store
   */
  private setupNetworkIntegration(): void {
    const services = getServices();
    const networkManager = services.getNetworkManager();
    const store = useEnhancedAppStore.getState();

    // Subscribe to network service state changes and sync to store
    const cleanup = networkManager.onStateChange((networkState) => {
      store.syncNetworkWithService(networkState);
    });
    this.cleanupFunctions.push(cleanup);

    // Initial sync
    const initialState = networkManager.getState();
    store.syncNetworkWithService(initialState);

    console.log('🔗 Network integration established');
  }

  /**
   * Set up sync service integration with store
   */
  private setupSyncIntegration(): void {
    const services = getServices();
    const syncManager = services.getSyncManager();
    const store = useEnhancedAppStore.getState();

    if (!syncManager) {
      console.warn('🔗 Sync manager not available, skipping sync integration');
      return;
    }

    // Subscribe to sync service state changes and sync to store
    const cleanup = syncManager.onStateChange((syncState) => {
      store.syncSyncWithService(syncState);
    });
    this.cleanupFunctions.push(cleanup);

    // Initial sync
    const initialState = syncManager.getState();
    store.syncSyncWithService(initialState);

    console.log('🔗 Sync integration established');
  }

  /**
   * Set up connection event monitoring
   */
  private setupConnectionMonitoring(): void {
    const services = getServices();
    const connectionManager = services.getConnectionManager();
    const store = useEnhancedAppStore.getState();

    // Monitor connection events and update service connection status
    const authCleanup = connectionManager.on('auth-change', (authState) => {
      store.setServiceConnection('auth', authState.isAuthenticated);
    });

    const networkCleanup = connectionManager.on('network-change', (networkState) => {
      store.setServiceConnection('network', networkState.isOnline && networkState.isApiReachable);
    });

    const socketConnectCleanup = connectionManager.on('socket-connect', () => {
      store.setServiceConnection('socket', true);
    });

    const socketDisconnectCleanup = connectionManager.on('socket-disconnect', () => {
      store.setServiceConnection('socket', false);
    });

    const syncStartCleanup = connectionManager.on('sync-start', () => {
      store.setServiceConnection('sync', true);
    });

    const syncCompleteCleanup = connectionManager.on('sync-complete', () => {
      // Keep sync connection as true even after completion
      // Only mark as false if there's an error or service is unavailable
    });

    const syncErrorCleanup = connectionManager.on('sync-error', () => {
      // Don't immediately mark as disconnected on sync errors
      // Let the sync manager handle error states
    });

    // Store cleanup functions
    this.cleanupFunctions.push(
      authCleanup,
      networkCleanup,
      socketConnectCleanup,
      socketDisconnectCleanup,
      syncStartCleanup,
      syncCompleteCleanup,
      syncErrorCleanup
    );

    console.log('🔗 Connection monitoring established');
  }

  /**
   * Force sync all service states to store
   */
  forceSyncToStore(): void {
    if (!this.isInitialized) {
      console.warn('🔗 ServiceIntegrationManager: Not initialized, cannot sync');
      return;
    }

    try {
      const services = getServices();
      const store = useEnhancedAppStore.getState();

      // Sync all service states
      store.syncAuthWithService(services.getAuthManager().getState());
      store.syncNetworkWithService(services.getNetworkManager().getState());
      
      const syncManager = services.getSyncManager();
      if (syncManager) {
        store.syncSyncWithService(syncManager.getState());
      }

      console.log('🔗 ServiceIntegrationManager: Force sync completed');
    } catch (error) {
      console.error('🔗 ServiceIntegrationManager: Force sync failed:', error);
    }
  }

  /**
   * Check if integration is healthy
   */
  isHealthy(): boolean {
    if (!this.isInitialized) return false;

    try {
      const services = getServices();
      const store = useEnhancedAppStore.getState();
      
      return (
        services.isReady() &&
        store.services.initialized &&
        store.services.isReady
      );
    } catch {
      return false;
    }
  }

  /**
   * Get integration status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      healthy: this.isHealthy(),
      cleanupFunctionsCount: this.cleanupFunctions.length,
    };
  }
}

// Export convenience functions
export const initializeServiceIntegration = () => {
  return ServiceIntegrationManager.getInstance().initialize();
};

export const cleanupServiceIntegration = () => {
  return ServiceIntegrationManager.getInstance().cleanup();
};

export const getServiceIntegration = () => {
  return ServiceIntegrationManager.getInstance();
};