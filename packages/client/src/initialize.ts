import { 
  initializeEnhancedAppStore, 
  cleanupEnhancedAppStore,
  useEnhancedAppStore,
} from './stores/enhancedAppStore';
import { 
  initializeServiceIntegration, 
  cleanupServiceIntegration,
} from './services/integration';

/**
 * Complete application initialization that sets up the integrated service-store system
 */
export class AppInitializer {
  private static instance: AppInitializer | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): AppInitializer {
    if (!AppInitializer.instance) {
      AppInitializer.instance = new AppInitializer();
    }
    return AppInitializer.instance;
  }

  /**
   * Initialize the complete application system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🚀 AppInitializer: Already initialized');
      return;
    }

    console.log('🚀 AppInitializer: Starting application initialization...');

    try {
      // Step 1: Initialize the enhanced store with service integration
      console.log('📦 Step 1: Initializing enhanced store...');
      await initializeEnhancedAppStore();

      // Step 2: Set up service-store integration
      console.log('🔗 Step 2: Setting up service integration...');
      await initializeServiceIntegration();

      // Step 3: Verify everything is working
      console.log('✅ Step 3: Verifying system health...');
      const healthCheck = this.performHealthCheck();
      if (!healthCheck.healthy) {
        throw new Error(`System health check failed: ${JSON.stringify(healthCheck.issues)}`);
      }

      this.initialized = true;
      console.log('🎉 AppInitializer: Application initialized successfully!');

      // Log system status
      console.log('📊 System Status:', this.getSystemStatus());
    } catch (error) {
      console.error('❌ AppInitializer: Initialization failed:', error);
      
      // Attempt cleanup on failure
      await this.cleanup().catch(console.error);
      
      throw error;
    }
  }

  /**
   * Clean up the complete application system
   */
  async cleanup(): Promise<void> {
    console.log('🧹 AppInitializer: Starting cleanup...');

    try {
      // Step 1: Cleanup service integration
      await cleanupServiceIntegration();

      // Step 2: Cleanup enhanced store
      await cleanupEnhancedAppStore();

      this.initialized = false;
      AppInitializer.instance = null;

      console.log('✅ AppInitializer: Cleanup completed');
    } catch (error) {
      console.error('❌ AppInitializer: Cleanup failed:', error);
      // Don't throw on cleanup errors
    }
  }

  /**
   * Perform system health check
   */
  performHealthCheck(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];

    try {
      const store = useEnhancedAppStore.getState();
      
      // Check service layer health
      if (!store.services.initialized) {
        issues.push('Services not initialized');
      }
      
      if (!store.services.isReady) {
        issues.push('Services not ready');
      }

      // Check service connections
      const connections = store.services.connections;
      if (!connections.auth) {
        issues.push('Auth service not connected');
      }
      if (!connections.network) {
        issues.push('Network service not connected');
      }
      
      // Socket and sync are optional, so just warn
      if (!connections.socket) {
        console.warn('⚠️ Socket service not connected (this may be expected)');
      }
      if (!connections.sync) {
        console.warn('⚠️ Sync service not connected (this may be expected)');
      }

      // Check store state
      if (store.services.error) {
        issues.push(`Service error: ${store.services.error}`);
      }

    } catch (error) {
      issues.push(`Health check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  /**
   * Get complete system status
   */
  getSystemStatus() {
    if (!this.initialized) {
      return { initialized: false };
    }

    try {
      const store = useEnhancedAppStore.getState();
      const healthCheck = this.performHealthCheck();

      return {
        initialized: this.initialized,
        health: healthCheck,
        services: {
          initialized: store.services.initialized,
          ready: store.services.isReady,
          error: store.services.error,
          connections: store.services.connections,
          initializationAttempts: store.services.initializationAttempts,
          lastInitAt: store.services.lastInitAt,
        },
        auth: {
          isAuthenticated: store.auth.isAuthenticated,
          serviceConnected: store.auth.serviceConnected,
          hasUser: !!store.auth.user,
          hasEmpire: !!store.auth.empire,
          error: store.auth.error,
        },
        network: {
          isOnline: store.network.status.isOnline,
          isApiReachable: store.network.status.isApiReachable,
          isFullyConnected: store.network.isFullyConnected,
          serviceConnected: store.network.serviceConnected,
          lastChecked: store.network.status.lastChecked,
          latencyMs: store.network.status.latencyMs,
        },
        sync: {
          state: store.sync.status.state,
          queuedCount: store.sync.status.queuedCount,
          serviceConnected: store.sync.serviceConnected,
          autoSyncEnabled: store.sync.autoSyncEnabled,
          lastRunAt: store.sync.status.lastRunAt,
        },
      };
    } catch (error) {
      return {
        initialized: this.initialized,
        error: error instanceof Error ? error.message : 'Status check failed',
      };
    }
  }

  /**
   * Check if the system is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export convenience functions
export const initializeApp = () => {
  return AppInitializer.getInstance().initialize();
};

export const cleanupApp = () => {
  return AppInitializer.getInstance().cleanup();
};

export const getAppStatus = () => {
  return AppInitializer.getInstance().getSystemStatus();
};

export const performAppHealthCheck = () => {
  return AppInitializer.getInstance().performHealthCheck();
};

// Default export for easy importing
export default AppInitializer;