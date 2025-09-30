import { StateCreator } from 'zustand';
import { getServices } from '../../services/core';
import { NetworkState as ServiceNetworkState } from '../../services/core/types';

export interface NetworkStatus {
  isOnline: boolean;
  isApiReachable: boolean;
  lastChecked: number;
  latencyMs?: number;
  error?: string;
}

interface NetworkState {
  status: NetworkStatus;
  isFullyConnected: boolean;
  // Service integration state
  serviceConnected: boolean;
  lastSyncAt?: number;
}

export interface EnhancedNetworkSlice {
  network: NetworkState;
  
  // Actions
  setNetworkStatus: (status: NetworkStatus) => void;
  checkConnectivity: () => Promise<void>;
  
  // Enhanced service-integrated actions
  syncNetworkWithService: (serviceState: ServiceNetworkState) => void;
  initializeNetworkService: () => void;
  cleanupNetworkService: () => void;
  forceConnectivityCheck: () => Promise<void>;
}

const createEnhancedNetworkSlice: StateCreator<
  EnhancedNetworkSlice,
  [],
  [],
  EnhancedNetworkSlice
> = (set, get) => {
  let networkServiceCleanup: (() => void) | null = null;

  return {
    network: {
      status: {
        isOnline: navigator.onLine,
        isApiReachable: true,
        lastChecked: Date.now(),
      },
      isFullyConnected: navigator.onLine,
      serviceConnected: false,
    },

    setNetworkStatus: (status: NetworkStatus) => {
      set((state) => ({
        network: {
          ...state.network,
          status,
          isFullyConnected: status.isOnline && status.isApiReachable,
        },
      }));
    },

    checkConnectivity: async () => {
      try {
        let services;
        try {
          services = getServices();
        } catch (error) {
          console.warn('⚠️ Network: Services not available for connectivity check');
          return;
        }
        
        if (!services.isReady()) {
          console.warn('⚠️ Network: Services not ready for connectivity check');
          return;
        }

        await services.getNetworkManager().checkConnectivity();
        // State will be updated via service subscription
      } catch (error) {
        console.error('❌ Network: Connectivity check failed:', error);
      }
    },

    syncNetworkWithService: (serviceState: ServiceNetworkState): void => {
      const { setNetworkStatus } = get();
      
      setNetworkStatus({
        isOnline: serviceState.isOnline,
        isApiReachable: serviceState.isApiReachable,
        lastChecked: serviceState.lastChecked,
        latencyMs: serviceState.latencyMs,
        error: serviceState.error,
      });

      // Update service connection state
      set((state) => ({
        network: {
          ...state.network,
          serviceConnected: true,
          lastSyncAt: Date.now(),
        },
      }));

      console.log('🔄 Network: Store synced with service state:', {
        isOnline: serviceState.isOnline,
        isApiReachable: serviceState.isApiReachable,
        latencyMs: serviceState.latencyMs,
      });
    },

    forceConnectivityCheck: async (): Promise<void> => {
      try {
        const services = getServices();
        if (!services.isReady()) {
          throw new Error('Services not initialized');
        }

        console.log('🔍 Network: Forcing connectivity check...');
        await services.getNetworkManager().checkConnectivity();
      } catch (error) {
        console.error('❌ Network: Force check failed:', error);
      }
    },

    initializeNetworkService: (): void => {
      try {
        let services;
        try {
          services = getServices();
        } catch (error) {
          console.warn('⚠️ Network: Services not available for initialization');
          return;
        }
        
        if (!services.isReady()) {
          console.warn('⚠️ Network: Services not ready for initialization');
          return;
        }

        // Subscribe to network service state changes
        networkServiceCleanup = services.getNetworkManager().onStateChange((serviceState) => {
          const { syncNetworkWithService } = get();
          syncNetworkWithService(serviceState);
        });

        // Initial sync with service state
        const serviceState = services.getNetworkManager().getState();
        get().syncNetworkWithService(serviceState);

        // Start monitoring
        services.getNetworkManager().startMonitoring();

        console.log('✅ Network: Service integration initialized');
      } catch (error) {
        console.error('❌ Network: Service initialization failed:', error);
        
        // Set service disconnected state
        set((state) => ({
          network: {
            ...state.network,
            serviceConnected: false,
          },
        }));
      }
    },

    cleanupNetworkService: (): void => {
      try {
        const services = getServices();
        if (services.isReady()) {
          services.getNetworkManager().stopMonitoring();
        }
      } catch (error) {
        console.error('❌ Network: Service cleanup error:', error);
      }

      if (networkServiceCleanup) {
        networkServiceCleanup();
        networkServiceCleanup = null;
      }

      set((state) => ({
        network: {
          ...state.network,
          serviceConnected: false,
        },
      }));

      console.log('✅ Network: Service integration cleaned up');
    },
  };
};

export default createEnhancedNetworkSlice;