import { 
  ConnectionEvent, 
  ConnectionEventCallback, 
  ConnectionManagerConfig, 
  ServiceOptions,
  INetworkManager,
  IAuthManager,
  ISocketManager,
  ISyncManager,
  NetworkState,
  AuthState,
  SocketState,
  SyncState
} from './types';

import { NetworkManager } from './NetworkManager';
import { AuthManager } from './AuthManager';

/**
 * ConnectionManager is the central coordinator for all connection-related services.
 * It eliminates circular dependencies by being the single source of truth for
 * connection state coordination and service lifecycle management.
 */
export class ConnectionManager {
  private networkManager: INetworkManager;
  private authManager: IAuthManager;
  private socketManager: ISocketManager | null = null;
  private syncManager: ISyncManager | null = null;

  private eventListeners = new Map<ConnectionEvent, Set<ConnectionEventCallback>>();
  private isInitialized = false;
  private cleanupFunctions: (() => void)[] = [];

  constructor(
    private config: ConnectionManagerConfig = {},
    private _options: ServiceOptions = {}
  ) {
    // Initialize core managers (socket and sync managers are optional and can be injected)
    this.networkManager = new NetworkManager(this._options);
    this.authManager = new AuthManager(this._options);
  }

  /**
   * Sets the socket manager (dependency injection)
   */
  setSocketManager(socketManager: ISocketManager): void {
    if (this.isInitialized) {
      throw new Error('Cannot set socket manager after initialization');
    }
    this.socketManager = socketManager;
  }

  /**
   * Sets the sync manager (dependency injection)  
   */
  setSyncManager(syncManager: ISyncManager): void {
    if (this.isInitialized) {
      throw new Error('Cannot set sync manager after initialization');
    }
    this.syncManager = syncManager;
  }

  /**
   * Initializes all services and sets up coordination logic
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔌 ConnectionManager: Initializing...');

    // Initialize all managers
    await this.networkManager.initialize();
    await this.authManager.initialize();
    
    if (this.socketManager) {
      await this.socketManager.initialize();
    }
    
    if (this.syncManager) {
      await this.syncManager.initialize();
    }

    // Set up coordination logic
    this.setupServiceCoordination();

    // Start monitoring
    this.startMonitoring();

    this.isInitialized = true;
    console.log('🔌 ConnectionManager: Initialized successfully');
  }

  /**
   * Cleans up all services and event listeners
   */
  async cleanup(): Promise<void> {
    console.log('🔌 ConnectionManager: Cleaning up...');

    // Run all cleanup functions
    this.cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('🔌 ConnectionManager: Error during cleanup:', error);
      }
    });
    this.cleanupFunctions = [];

    // Cleanup all managers
    this.syncManager?.cleanup();
    this.socketManager?.cleanup();
    this.authManager.cleanup();
    this.networkManager.cleanup();

    // Clear event listeners
    this.eventListeners.clear();

    this.isInitialized = false;
  }

  /**
   * Gets the current state of all services
   */
  getState() {
    return {
      network: this.networkManager.getState(),
      auth: this.authManager.getState(),
      socket: this.socketManager?.getState() || null,
      sync: this.syncManager?.getState() || null,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Handles network state changes and coordinates dependent services
   */
  async handleNetworkChange(networkState: NetworkState): Promise<void> {
    console.log(`🔌 ConnectionManager: Network state changed - Online: ${networkState.isOnline}, API: ${networkState.isApiReachable}`);

    this.emit('network-change', networkState);

    // If we came online and are authenticated, ensure socket is connected
    if (networkState.isOnline && networkState.isApiReachable && this.authManager.getState().isAuthenticated) {
      if (this.socketManager && !this.socketManager.isConnected()) {
        try {
          await this.socketManager.connect();
        } catch (error) {
          console.error('🔌 ConnectionManager: Failed to connect socket after network recovery:', error);
        }
      }
    }

    // If we went offline, ensure socket is disconnected
    if (!networkState.isOnline || !networkState.isApiReachable) {
      if (this.socketManager && this.socketManager.isConnected()) {
        try {
          await this.socketManager.disconnect();
        } catch (error) {
          console.error('🔌 ConnectionManager: Failed to disconnect socket after network loss:', error);
        }
      }
    }

    // Trigger sync if we came online and have queued items
    if (networkState.isOnline && networkState.isApiReachable && this.syncManager) {
      const syncState = this.syncManager.getState();
      if (syncState.queuedCount > 0 && !syncState.isActive) {
        try {
          await this.syncManager.startSync();
        } catch (error) {
          console.error('🔌 ConnectionManager: Failed to start sync after network recovery:', error);
        }
      }
    }
  }

  /**
   * Handles authentication state changes and coordinates dependent services
   */
  async handleAuthChange(authState: AuthState): Promise<void> {
    console.log(`🔌 ConnectionManager: Auth state changed - Authenticated: ${authState.isAuthenticated}`);

    this.emit('auth-change', authState);

    // If user logged in and network is available, connect socket
    if (authState.isAuthenticated && this.isNetworkAvailable() && this.socketManager) {
      try {
        await this.socketManager.connect();
      } catch (error) {
        console.error('🔌 ConnectionManager: Failed to connect socket after authentication:', error);
      }
    }

    // If user logged out, disconnect socket and clear any syncs
    if (!authState.isAuthenticated) {
      if (this.socketManager && this.socketManager.isConnected()) {
        try {
          await this.socketManager.disconnect();
        } catch (error) {
          console.error('🔌 ConnectionManager: Failed to disconnect socket after logout:', error);
        }
      }
    }
  }

  /**
   * Handles socket connection/disconnection and coordinates dependent services
   */
  async handleSocketStateChange(socketState: SocketState): Promise<void> {
    console.log(`🔌 ConnectionManager: Socket state changed - Connected: ${socketState.isConnected}`);

    if (socketState.isConnected) {
      this.emit('socket-connect', socketState);
    } else {
      this.emit('socket-disconnect', socketState);
    }

    // If socket disconnected unexpectedly and we should be connected, try to reconnect
    if (!socketState.isConnected && this.shouldSocketBeConnected()) {
      const delay = this.config.socketReconnectDelay || 5000;
      setTimeout(async () => {
        if (this.shouldSocketBeConnected() && this.socketManager) {
          try {
            await this.socketManager.connect();
          } catch (error) {
            console.error('🔌 ConnectionManager: Socket reconnection failed:', error);
          }
        }
      }, delay);
    }
  }

  /**
   * Handles sync state changes
   */
  async handleSyncStateChange(syncState: SyncState): Promise<void> {
    console.log(`🔌 ConnectionManager: Sync state changed - Active: ${syncState.isActive}, Queue: ${syncState.queuedCount}`);

    if (syncState.isActive) {
      this.emit('sync-start', syncState);
    } else {
      this.emit('sync-complete', syncState);
    }

    if (syncState.lastError) {
      this.emit('sync-error', { error: syncState.lastError, state: syncState });
    }
  }

  /**
   * Subscribes to a connection event
   */
  on(event: ConnectionEvent, callback: ConnectionEventCallback): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)!.add(callback);
    
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emits a connection event to all subscribers
   */
  private emit(event: ConnectionEvent, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`🔌 ConnectionManager: Error in ${event} callback:`, error);
        }
      });
    }
  }

  private setupServiceCoordination(): void {
    // Network state changes
    const networkCleanup = this.networkManager.onStateChange((state) => {
      this.handleNetworkChange(state);
    });
    this.cleanupFunctions.push(networkCleanup);

    // Auth state changes
    const authCleanup = this.authManager.onStateChange((state) => {
      this.handleAuthChange(state);
    });
    this.cleanupFunctions.push(authCleanup);

    // Socket state changes (if available)
    if (this.socketManager) {
      const socketCleanup = this.socketManager.onStateChange((state) => {
        this.handleSocketStateChange(state);
      });
      this.cleanupFunctions.push(socketCleanup);
    }

    // Sync state changes (if available)
    if (this.syncManager) {
      const syncCleanup = this.syncManager.onStateChange((state) => {
        this.handleSyncStateChange(state);
      });
      this.cleanupFunctions.push(syncCleanup);
    }
  }

  private startMonitoring(): void {
    // Start network monitoring with configured interval (default 30s)
    const interval = this.config.networkCheckInterval ?? 30000;
    this.networkManager.startMonitoring(interval);

    // Schedule periodic sync flushes if sync manager is available
    if (this.syncManager) {
      const flushInterval = this.config.syncFlushInterval || 300000; // 5 minutes
      const flushTimer = setInterval(async () => {
        if (this.isNetworkAvailable() && this.authManager.getState().isAuthenticated) {
          try {
            await this.syncManager!.flushQueue();
          } catch (error) {
            console.error('🔌 ConnectionManager: Periodic sync flush failed:', error);
          }
        }
      }, flushInterval);

      this.cleanupFunctions.push(() => clearInterval(flushTimer));
    }
  }

  private isNetworkAvailable(): boolean {
    const networkState = this.networkManager.getState();
    return networkState.isOnline && networkState.isApiReachable;
  }

  private shouldSocketBeConnected(): boolean {
    return (
      this.isNetworkAvailable() && 
      this.authManager.getState().isAuthenticated
    );
  }

  // Public API for service access
  get network(): INetworkManager {
    return this.networkManager;
  }

  get auth(): IAuthManager {
    return this.authManager;
  }

  get socket(): ISocketManager | null {
    return this.socketManager;
  }

  get sync(): ISyncManager | null {
    return this.syncManager;
  }
}