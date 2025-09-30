import { StateCreator } from 'zustand';
import { initializeServices, getServices, cleanupServices } from '../../services/core';
import { gameApi } from '../services/gameApi';

// Singleton guard for service initialization
let serviceInitializationPromise: Promise<void> | null = null;
let servicesInitialized = false;

interface ServiceState {
  initialized: boolean;
  isReady: boolean;
  error: string | null;
  lastInitAt?: number;
  initializationAttempts: number;
  
  // Individual service states
  connections: {
    auth: boolean;
    network: boolean;
    socket: boolean;
    sync: boolean;
  };
  
  // Game API access
  gameApi?: any;
}

export interface ServiceSlice {
  services: ServiceState;
  
  // Actions
  setServiceState: (state: Partial<ServiceState>) => void;
  setServiceError: (error: string | null) => void;
  setServiceConnection: (service: keyof ServiceState['connections'], connected: boolean) => void;
  
  // Service lifecycle actions
  initializeServicesInStore: () => Promise<void>;
  cleanupServicesInStore: () => Promise<void>;
  reconnectServices: () => Promise<void>;
  getServiceHealth: () => {
    overall: 'healthy' | 'degraded' | 'offline';
    details: Record<string, boolean>;
  };
}

const createServiceSlice: StateCreator<
  ServiceSlice,
  [],
  [],
  ServiceSlice
> = (set, get) => {
  return {
    services: {
      initialized: false,
      isReady: false,
      error: null,
      initializationAttempts: 0,
      connections: {
        auth: false,
        network: false,
        socket: false,
        sync: false,
      },
      gameApi: gameApi,
    },

    setServiceState: (newState: Partial<ServiceState>) => {
      set((state) => ({
        services: {
          ...state.services,
          ...newState,
        },
      }));
    },

    setServiceError: (error: string | null) => {
      set((state) => ({
        services: {
          ...state.services,
          error,
        },
      }));
    },

    setServiceConnection: (service: keyof ServiceState['connections'], connected: boolean) => {
      set((state) => ({
        services: {
          ...state.services,
          connections: {
            ...state.services.connections,
            [service]: connected,
          },
        },
      }));
    },

    initializeServicesInStore: async (): Promise<void> => {
      // Check singleton guard
      if (servicesInitialized) {
        console.log('🏪PI Store: Services already initialized, skipping');
        return Promise.resolve();
      }
      
      if (serviceInitializationPromise) {
        console.log('🏪PI Store: Service initialization in progress, waiting...');
        return serviceInitializationPromise;
      }
      
      console.log('🏪PI Store: Starting new service initialization...');
      
      // Start new initialization with singleton guard
      serviceInitializationPromise = new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          const error = new Error('Service initialization timeout after 30 seconds');
          console.error('❌ Store: Service initialization timeout:', error.message);
          reject(error);
        }, 30000); // 30 seconds timeout instead of 300ms

        (async () => {
          try {
            const { setServiceState, setServiceError } = get();
            
            setServiceState({
              initializationAttempts: get().services.initializationAttempts + 1,
            });
            setServiceError(null);

            console.log('🏪PO Store: Initializing services...');

            console.log('🏪PO Store: Calling initializeServices...');
            const initResult = await initializeServices({
              enableLogging: process.env.NODE_ENV === 'development',
              enableMetrics: true,
              maxRetries: 1, // Reduced retries to fail faster
              retryDelay: 500, // Shorter delay
            });
            console.log('✅ Store: initializeServices completed', initResult);

            const services = getServices();
            console.log('🏪PO Store: Getting services instance...', services);
            const isReady = services.isReady();
            console.log('🏪PO Store: Services ready check:', isReady);
            console.log('🏪PO Store: Current service instance:', services);

            // Verify we have all required service components
            const hasAuthManager = !!services?.getAuthManager();
            const hasConnectionManager = !!services?.getConnectionManager();
            const hasSyncManager = !!services?.getSyncManager();
            
            console.log('🏪PO Store: Service component check:', {
              hasAuthManager,
              hasConnectionManager,
              hasSyncManager
            });

            // Check all required service components and their states
            const servicesReady = isReady && 
              hasAuthManager && 
              hasConnectionManager && 
              hasSyncManager;

            // Check required service states
            const authState = services?.getAuthManager()?.getState();
            const networkState = services?.getConnectionManager()?.getState();
            const socketState = services?.getSocketManager()?.getState();

            const serviceStatesValid = 
              authState !== undefined &&
              networkState !== undefined &&
              socketState !== undefined;

            console.log('🏪PO Store: Service states:', {
              authState,
              networkState,
              socketState
            });

            const allReady = servicesReady && serviceStatesValid;

            setServiceState({
              initialized: true,
              isReady: allReady,
              lastInitAt: Date.now(),
              connections: {
                auth: !!authState,
                network: !!networkState,
                socket: !!socketState,
                sync: !!services?.getSyncManager()?.getState()
              }
            });

            if (!servicesReady) {
              console.warn('⚠️ Store: Services not ready after getServices() call', {
                services,
                isReady,
                hasAuthManager,
                hasConnectionManager,
                hasSyncManager,
                connections: services?.getConnectionManager()?.getState()
              });
              
              console.error('❌ Store: Services not ready after initialization');
              const error = new Error('Services not ready after initialization');
              setServiceError(error.message);
              setServiceState({
                initialized: false,
                isReady: false,
              });
              clearTimeout(timeoutId);
              reject(error);
              return;
            }

            // Only proceed with event listeners if services are fully ready
            console.log('🏪PO Store: Services are ready, setting up event listeners...');
            // Subscribe to connection events to update service connection states
            const connectionManager = services.getConnectionManager();
            console.log('🏪PO Store: Got connection manager:', !!connectionManager);
            
            connectionManager.on('auth-change', () => {
              console.log('🏪PO Store: Auth change event received');
              get().setServiceConnection('auth', true);
            });
            
            connectionManager.on('network-change', () => {
              console.log('🏪PO Store: Network change event received');
              get().setServiceConnection('network', true);
            });
            
            connectionManager.on('socket-connect', () => {
              console.log('🏪PO Store: Socket connect event received');
              get().setServiceConnection('socket', true);
            });
            
            connectionManager.on('socket-disconnect', () => {
              console.log('🏪PO Store: Socket disconnect event received');
              get().setServiceConnection('socket', false);
            });

            connectionManager.on('sync-start', () => {
              console.log('🏪PO Store: Sync start event received');
              get().setServiceConnection('sync', true);
            });

            servicesInitialized = true;
            console.log('✅ Store: Services initialized successfully');
            clearTimeout(timeoutId);
            resolve();
          } catch (error) {
            clearTimeout(timeoutId);
            const message = error instanceof Error ? error.message : 'Service initialization failed';
            console.error('❌ Store: Service initialization failed:', error);
            
            const { setServiceError, setServiceState } = get();
            setServiceError(message);
            setServiceState({
              initialized: false,
              isReady: false,
            });
            
            reject(error);
          } finally {
            // Clear the promise reference
            serviceInitializationPromise = null;
          }
        })().catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
      });

      console.log('🏪PI Store: Service initialization promise created, awaiting...');
      return serviceInitializationPromise;
    },

    cleanupServicesInStore: async (): Promise<void> => {
      const { setServiceState } = get();
      
      console.log('🏪PI Store: Cleaning up services...');

      try {
        await cleanupServices();
        
        setServiceState({
          initialized: false,
          isReady: false,
          error: null,
          connections: {
            auth: false,
            network: false,
            socket: false,
            sync: false,
          },
        });

        // Reset singleton guard
        servicesInitialized = false;
        serviceInitializationPromise = null;

        console.log('✅ Store: Services cleaned up successfully');
      } catch (error) {
        console.error('❌ Store: Service cleanup failed:', error);
        // Still mark as cleaned up even if there were errors
        setServiceState({
          initialized: false,
          isReady: false,
        });
        
        // Reset singleton guard even on error
        servicesInitialized = false;
        serviceInitializationPromise = null;
      }
    },

    reconnectServices: async (): Promise<void> => {
      const { cleanupServicesInStore, initializeServicesInStore } = get();
      
      console.log('🔄 Store: Reconnecting services...');
      
      try {
        await cleanupServicesInStore();
        await initializeServicesInStore();
        console.log('✅ Store: Services reconnected successfully');
      } catch (error) {
        console.error('❌ Store: Service reconnection failed:', error);
        throw error;
      }
    },

    getServiceHealth: () => {
      const { services } = get();
      const { connections } = services;
      
      const connectedCount = Object.values(connections).filter(Boolean).length;
      const totalServices = Object.keys(connections).length;
      
      let overall: 'healthy' | 'degraded' | 'offline';
      
      if (!services.initialized || !services.isReady) {
        overall = 'offline';
      } else if (connectedCount === totalServices) {
        overall = 'healthy';
      } else if (connectedCount > 0) {
        overall = 'degraded';
      } else {
        overall = 'offline';
      }
      
      return {
        overall,
        details: {
          initialized: services.initialized,
          ready: services.isReady,
          auth: connections.auth,
          network: connections.network,
          socket: connections.socket,
          sync: connections.sync,
        },
      };
    },
  };
};

export default createServiceSlice;
