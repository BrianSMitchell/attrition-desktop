/**
 * Legacy networkService API - now acts as a compatibility layer that delegates to NetworkManager.
 * This maintains existing API contracts while using the new architecture.
 * 
 * IMPORTANT: This service no longer contains direct API calls or connectivity monitoring.
 * All coordination is handled by the NetworkManager and ConnectionManager.
 */

import { NetworkManager } from './core/NetworkManager';
import type { NetworkState } from './core/types';

// Legacy interface for backward compatibility
export interface NetworkStatus {
  isOnline: boolean;
  isApiReachable: boolean;
  lastChecked: number;
  latencyMs?: number;
  error?: string;
}

// Singleton NetworkManager instance
let networkManager: NetworkManager | null = null;

// Get or create NetworkManager instance
const getNetworkManager = (): NetworkManager => {
  if (!networkManager) {
    networkManager = new NetworkManager({ enableLogging: process.env.NODE_ENV === 'development' });
  }
  return networkManager;
};

/**
 * Initialize the NetworkManager if not already initialized.
 * This should be called by the ConnectionManager during app startup.
 */
const ensureInitialized = async (): Promise<void> => {
  const manager = getNetworkManager();
  if (!manager.isReady()) {
    await manager.initialize();
  }
};

/**
 * Convert NetworkState to legacy NetworkStatus format
 */
const convertToLegacyStatus = (state: NetworkState): NetworkStatus => {
  return {
    isOnline: state.isOnline,
    isApiReachable: state.isApiReachable,
    lastChecked: state.lastChecked,
    latencyMs: state.latencyMs,
    error: state.error,
  };
};

class NetworkService {
  private manager: NetworkManager;

  constructor() {
    this.manager = getNetworkManager();
    
    // Initialize if not already done (should normally be done by ConnectionManager)
    if (!this.manager.isReady()) {
      console.warn('[NETWORK-SERVICE] NetworkManager not initialized, initializing now');
      this.manager.initialize().catch(console.error);
    }
  }

  /**
   * Subscribe to network status changes - now delegates to NetworkManager
   */
  public subscribe(listener: (status: NetworkStatus) => void): () => void {
    console.log('[NETWORK-SERVICE] subscribe called (now delegating to NetworkManager)');
    
    // Convert NetworkManager state changes to legacy format
    const unsubscribe = this.manager.onStateChange((state: NetworkState) => {
      const legacyStatus = convertToLegacyStatus(state);
      try {
        listener(legacyStatus);
      } catch (error) {
        console.error('[NETWORK-SERVICE] Error notifying listener:', error);
      }
    });
    
    return unsubscribe;
  }

  /**
   * Get current network status - now delegates to NetworkManager
   */
  public getCurrentStatus(): NetworkStatus {
    const state = this.manager.getState();
    return convertToLegacyStatus(state);
  }

  /**
   * Check if fully connected - now delegates to NetworkManager
   */
  public isFullyConnected(): boolean {
    const state = this.manager.getState();
    return state.isOnline && state.isApiReachable;
  }

  /**
   * Destroy/cleanup - now delegates to NetworkManager cleanup
   */
  public destroy() {
    console.log('[NETWORK-SERVICE] destroy called (now delegating to NetworkManager)');
    // Note: We don't call manager.cleanup() here as it should be managed by ConnectionManager
    // This method is maintained for backward compatibility
  }
}

// Export singleton instance
const networkService = new NetworkService();

// Additional exports for ConnectionManager integration
export { getNetworkManager, ensureInitialized };

// Legacy default export
export default networkService;
