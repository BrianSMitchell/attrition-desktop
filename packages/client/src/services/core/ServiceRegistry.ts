import { ConnectionManager } from './ConnectionManager';
import { SocketManager } from './SocketManager';
import { SyncManager } from './SyncManager';
import { ServiceOptions } from './types';

/**
 * ServiceRegistry manages the lifecycle and coordination of all core services.
 * It provides a single entry point for initializing and accessing services.
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry | null = null;
  
  private connectionManager: ConnectionManager | null = null;
  private isInitialized = false;
  private isDestroyed = false;

  private constructor(private options: ServiceOptions = {}) {}

  /**
   * Gets the singleton instance
   */
  static getInstance(options?: ServiceOptions): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry(options);
    }
    return ServiceRegistry.instance;
  }

  /**
   * Initializes all services in the correct order
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🏢 ServiceRegistry: Already initialized');
      return;
    }

    if (this.isDestroyed) {
      throw new Error('ServiceRegistry has been destroyed and cannot be reinitialized');
    }

    console.log('🏢 ServiceRegistry: Initializing services...');

    try {
      console.log('🏢 ServiceRegistry: Creating connection manager...');
      // Create the connection manager with configuration
      this.connectionManager = new ConnectionManager(
        {
          socketReconnectDelay: 5000,
          syncFlushInterval: 300000, // 5 minutes
          networkCheckInterval: 30000, // 30 seconds
        },
        this.options
      );
      console.log('✅ ServiceRegistry: Connection manager created');

      console.log('🏢 ServiceRegistry: Creating optional services...');
      // Create and inject optional services
      const socketManager = new SocketManager(this.options);
      const syncManager = new SyncManager(this.options);
      console.log('✅ ServiceRegistry: Optional services created');

      console.log('🏢 ServiceRegistry: Injecting dependencies...');
      // Inject dependencies
      this.connectionManager.setSocketManager(socketManager);
      this.connectionManager.setSyncManager(syncManager);
      console.log('✅ ServiceRegistry: Dependencies injected');

      // Initialize the connection manager (which will initialize all sub-services)
      console.log('🏢 ServiceRegistry: Initializing connection manager...');
      await this.connectionManager.initialize();
      console.log('✅ ServiceRegistry: Connection manager initialized');

      this.isInitialized = true;
      console.log('🏢 ServiceRegistry: All services initialized successfully');
    } catch (error) {
      console.error('🏢 ServiceRegistry: Initialization failed:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Cleans up all services
   */
  async cleanup(): Promise<void> {
    console.log('🏢 ServiceRegistry: Cleaning up services...');

    this.isDestroyed = true;

    if (this.connectionManager) {
      try {
        await this.connectionManager.cleanup();
      } catch (error) {
        console.error('🏢 ServiceRegistry: Error during cleanup:', error);
      }
      this.connectionManager = null;
    }

    this.isInitialized = false;
    ServiceRegistry.instance = null;

    console.log('🏢 ServiceRegistry: Cleanup completed');
  }

  /**
   * Gets the connection manager instance
   */
  getConnectionManager(): ConnectionManager {
    if (!this.connectionManager) {
      throw new Error('ServiceRegistry not initialized or destroyed');
    }
    return this.connectionManager;
  }

  /**
   * Convenience method to get network manager
   */
  getNetworkManager() {
    return this.getConnectionManager().network;
  }

  /**
   * Convenience method to get auth manager
   */
  getAuthManager() {
    return this.getConnectionManager().auth;
  }

  /**
   * Convenience method to get socket manager
   */
  getSocketManager() {
    return this.getConnectionManager().socket;
  }

  /**
   * Convenience method to get sync manager
   */
  getSyncManager() {
    return this.getConnectionManager().sync;
  }

  /**
   * Gets the current state of all services
   */
  getState() {
    if (!this.connectionManager) {
      return {
        initialized: this.isInitialized,
        destroyed: this.isDestroyed,
        services: null,
      };
    }

    return {
      initialized: this.isInitialized,
      destroyed: this.isDestroyed,
      services: this.connectionManager.getState(),
    };
  }

  /**
   * Checks if the registry is ready to use
   */
  isReady(): boolean {
    return this.isInitialized && !this.isDestroyed && this.connectionManager !== null;
  }
}

// Export convenience functions for easy access
export const initializeServices = (options?: ServiceOptions) => {
  return ServiceRegistry.getInstance(options).initialize();
};

export const getServices = () => {
  return ServiceRegistry.getInstance();
};

export const cleanupServices = () => {
  return ServiceRegistry.getInstance().cleanup();
};
