import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { ENV_VALUES } from '@game/shared';

import createEnhancedAuthSlice, { type EnhancedAuthSlice } from './slices/enhancedAuthSlice';
import createEnhancedNetworkSlice, { type EnhancedNetworkSlice } from './slices/enhancedNetworkSlice';
import createEnhancedSyncSlice, { type EnhancedSyncSlice } from './slices/enhancedSyncSlice';
import createServiceSlice, { type ServiceSlice } from './slices/serviceSlice';
import createUISlice, { type UISlice } from './slices/uiSlice';
import createGameSlice, { type GameSlice } from './slices/gameSlice';
import { ENV_VARS } from '@game/shared';


// Combined enhanced app state interface
export interface EnhancedAppState 
  extends EnhancedAuthSlice, 
         EnhancedNetworkSlice, 
         EnhancedSyncSlice, 
         ServiceSlice,
         UISlice, 
         GameSlice {}

// Create the enhanced unified store with all middleware
export const useEnhancedAppStore = create<EnhancedAppState>()( 
  devtools(
    persist(
      subscribeWithSelector(
        immer<EnhancedAppState>((set, get, api) => ({
          // Combine all enhanced slices
          ...createEnhancedAuthSlice(set, get, api),
          ...createEnhancedNetworkSlice(set, get, api),
          ...createEnhancedSyncSlice(set, get, api),
          ...createServiceSlice(set, get, api),
          ...createUISlice(set, get, api),
          ...createGameSlice(set, get, api),
        }))
      ),
      {
        name: 'enhanced-app-store',
        // Only persist specific slices that should survive page reload
        partialize: (state) => ({
          auth: {
            user: state.auth?.user,
            empire: state.auth?.empire,
            // Note: token is not persisted for security, services handle token persistence
          },
          game: {
            selectedBaseId: state.game?.selectedBaseId,
          },
          ui: {
            // Don't persist toasts or loading state - safely access modals
            modals: state.ui?.modals || {},
          },
          sync: {
            autoSyncEnabled: state.sync?.autoSyncEnabled,
          },
        }),
        onRehydrateStorage: () => (state) => {
          // Ensure UI slice has proper defaults after rehydration
          if (state && state.ui) {
            if (!state.ui.toasts) state.ui.toasts = [];
            if (!state.ui.loading) state.ui.loading = { global: false };
            if (!state.ui.modals) state.ui.modals = {};
          }
        },
      }
    ),
    {
      name: 'attrition-enhanced-app-store',
      // Development only devtools
      enabled: process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.DEVELOPMENT,
    }
  )
);

// Enhanced convenience hooks for accessing specific slices
export const useEnhancedAuth = () => useEnhancedAppStore((state) => state.auth);
export const useEnhancedNetwork = () => useEnhancedAppStore((state) => state.network);
export const useEnhancedSync = () => useEnhancedAppStore((state) => state.sync);
export const useServiceState = () => useEnhancedAppStore((state) => state.services);
export const useUI = () => useEnhancedAppStore((state) => state.ui || {
  toasts: [],
  loading: { global: false },
  modals: {},
});
export const useGame = () => useEnhancedAppStore((state) => state.game);

// Enhanced action hooks for better ergonomics
export const useEnhancedAuthActions = () => useEnhancedAppStore((state) => ({
  // Original actions
  setAuthState: state.setAuthState,
  setAuthLoading: state.setAuthLoading,
  setError: state.setError,
  clearError: state.clearError,
  setUser: state.setUser,
  setEmpire: state.setEmpire,
  setToken: state.setToken,
  clearAuth: state.clearAuth,
  getIsAuthed: state.getIsAuthed,
  // Enhanced service-integrated actions
  loginWithService: state.loginWithService,
  registerWithService: state.registerWithService,
  logoutWithService: state.logoutWithService,
  refreshAuthStatus: state.refreshAuthStatus,
  syncAuthWithService: state.syncAuthWithService,
  initializeAuthService: state.initializeAuthService,
  cleanupAuthService: state.cleanupAuthService,
}));

export const useEnhancedNetworkActions = () => useEnhancedAppStore((state) => ({
  setNetworkStatus: state.setNetworkStatus,
  checkConnectivity: state.checkConnectivity,
  syncNetworkWithService: state.syncNetworkWithService,
  initializeNetworkService: state.initializeNetworkService,
  cleanupNetworkService: state.cleanupNetworkService,
  forceConnectivityCheck: state.forceConnectivityCheck,
}));

export const useEnhancedSyncActions = () => useEnhancedAppStore((state) => ({
  setSyncStatus: state.setSyncStatus,
  computeSyncState: state.computeSyncState,
  syncSyncWithService: state.syncSyncWithService,
  initializeSyncService: state.initializeSyncService,
  cleanupSyncService: state.cleanupSyncService,
  startSyncWithService: state.startSyncWithService,
  flushQueueWithService: state.flushQueueWithService,
  getQueueCountFromService: state.getQueueCountFromService,
  toggleAutoSync: state.toggleAutoSync,
}));

export const useServiceActions = () => useEnhancedAppStore((state) => ({
  setServiceState: state.setServiceState,
  setServiceError: state.setServiceError,
  setServiceConnection: state.setServiceConnection,
  initializeServicesInStore: state.initializeServicesInStore,
  cleanupServicesInStore: state.cleanupServicesInStore,
  reconnectServices: state.reconnectServices,
  getServiceHealth: state.getServiceHealth,
}));

export const useUIActions = () => useEnhancedAppStore((state) => ({
  addToast: state.addToast,
  removeToast: state.removeToast,
  clearToasts: state.clearToasts,
  setGlobalLoading: state.setGlobalLoading,
  setLoading: state.setLoading,
  isLoading: state.isLoading,
  openModal: state.openModal,
  closeModal: state.closeModal,
  toggleModal: state.toggleModal,
  isModalOpen: state.isModalOpen,
}));

export const useGameActions = () => useEnhancedAppStore((state) => ({
  setSelectedBase: state.setSelectedBase,
  setBases: state.setBases,
  updateBase: state.updateBase,
  addBase: state.addBase,
  removeBase: state.removeBase,
  setGameLoading: state.setGameLoading,
  setGameError: state.setGameError,
  getSelectedBase: state.getSelectedBase,
  getBaseById: state.getBaseById,
  getTotalBases: state.getTotalBases,
  getDashboardData: state.getDashboardData,
  getEmpire: state.getEmpire,
  // Research actions
  setResearchData: state.setResearchData,
  loadResearchData: state.loadResearchData,
  loadResearchQueue: state.loadResearchQueue,
  // Defense actions
  setDefenseData: state.setDefenseData,
  loadDefenseData: state.loadDefenseData,
  // Structures actions
  setStructuresData: state.setStructuresData,
  loadStructuresData: state.loadStructuresData,
  // Base stats actions
  setBaseStats: state.setBaseStats,
  loadBaseStats: state.loadBaseStats,
  // Dashboard actions
  setDashboardData: state.setDashboardData,
  loadDashboard: state.loadDashboard,
  // Fleets actions
  loadFleetsForBase: state.loadFleetsForBase,
  getFleetsForBase: state.getFleetsForBase,
  getFleetsError: state.getFleetsError,
  isFleetsLoading: state.isFleetsLoading,
  // Empire actions
  setEmpireData: state.setEmpireData,
  loadEmpire: state.loadEmpire,
  createEmpire: state.createEmpire,
  updateEmpireResources: state.updateEmpireResources,
  // Units actions
  setUnitsData: state.setUnitsData,
  loadUnitsData: state.loadUnitsData,
  loadUnitsQueue: state.loadUnitsQueue,
}));

// Game API hook for direct service access
export const useGameApi = () => {
  // Use dynamic import to avoid circular dependencies and support ESM builds
  const services = useServiceState();
  return services?.gameApi;
};

// Singleton initialization guard to prevent multiple concurrent initializations
let initializationPromise: Promise<void> | null = null;
let isInitialized = false;

// Enhanced store initialization and cleanup
export const initializeEnhancedAppStore = async () => {
  // If already initialized, return immediately
  if (isInitialized) {
    console.log('🏦 EnhancedAppStore: Already initialized, skipping');
    return;
  }
  
  // If initialization is in progress, wait for it to complete
  if (initializationPromise) {
    console.log('🏦 EnhancedAppStore: Initialization in progress, waiting...');
    return initializationPromise;
  }
  
  // Start new initialization
  initializationPromise = (async () => {
    const store = useEnhancedAppStore.getState();
    
    console.log('🏦 EnhancedAppStore: Initializing...');

    try {
      // Initialize the service layer first
      await store.initializeServicesInStore();
      
      // Initialize individual service integrations
      store.initializeAuthService();
      store.initializeNetworkService();
      store.initializeSyncService();
      
      isInitialized = true;
      console.log('✅ EnhancedAppStore: Initialized successfully with service integration');
    } catch (error) {
      console.warn('⚠️ EnhancedAppStore: Initialization failed, continuing in basic mode:', error);
      
      // Try to add error toast if store is working
      try {
        store.addToast({
          type: 'warning',
          message: 'Service initialization failed - some features may be limited.',
          duration: 8000,
        });
      } catch (toastError) {
        console.warn('Toast system also not available');
      }
      
      // Don't throw - allow app to continue in basic mode
      // throw error;
    } finally {
      // Clear the promise reference
      initializationPromise = null;
    }
  })();
  
  return initializationPromise;
};

export const cleanupEnhancedAppStore = async () => {
  const store = useEnhancedAppStore.getState();
  
  console.log('🏪 EnhancedAppStore: Cleaning up...');
  
  try {
    // Cleanup individual service integrations
    store.cleanupAuthService();
    store.cleanupNetworkService();
    store.cleanupSyncService();
    
    // Cleanup the service layer
    await store.cleanupServicesInStore();
    
    // IMPORTANT: allow future re-initialization after cleanup/errors
    isInitialized = false;
    initializationPromise = null;
    
    console.log('✅ EnhancedAppStore: Cleanup completed');
  } catch (error) {
    console.error('❌ EnhancedAppStore: Cleanup failed:', error);
    // Don't throw on cleanup errors
    // Still clear flags so the app can attempt a fresh init on next mount
    isInitialized = false;
    initializationPromise = null;
  }
};

// Utility hook for service health monitoring
export const useServiceHealth = () => {
  const services = useServiceState();
  const getServiceHealth = useEnhancedAppStore((state) => state.getServiceHealth);
  
  const health = getServiceHealth();
  
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
    
    // Detailed health info
    details: health?.details || {},
  };
};

// Utility hook for connection status
export const useConnectionStatus = () => {
  const network = useEnhancedNetwork();
  const auth = useEnhancedAuth();
  const sync = useEnhancedSync();
  const services = useServiceState();
  
  return {
    isOnline: network?.status?.isOnline || false,
    isApiReachable: network?.status?.isApiReachable || false,
    isFullyConnected: network?.isFullyConnected || false,
    isAuthenticated: auth?.isAuthenticated || false,
    isSyncing: sync?.status?.state === 'syncing',
    servicesReady: services?.isReady || false,
    allServicesConnected: services?.connections ? Object.values(services.connections).every(Boolean) : false,
  };
};

// =====================================================
// BACKWARDS COMPATIBILITY EXPORTS FOR MIGRATION
// These exports provide the same API as the old appStore
// so existing components can be migrated gradually
// =====================================================

// Re-export enhanced hooks with old names for backward compatibility
export const useAuth = useEnhancedAuth;
// Removed useNetwork export - use useEnhancedNetwork instead
export const useSync = useEnhancedSync;

// Enhanced action hooks that match old API
export const useAuthActions = () => {
  const enhancedActions = useEnhancedAuthActions();
  
  // Map enhanced actions to old API names
  return {
    setAuthState: enhancedActions.setAuthState,
    setLoading: enhancedActions.setAuthLoading, // map to enhanced version
    setError: enhancedActions.setError,
    clearError: enhancedActions.clearError,
    setUser: enhancedActions.setUser,
    setEmpire: enhancedActions.setEmpire,
    setToken: enhancedActions.setToken,
    clearAuth: enhancedActions.clearAuth,
    getIsAuthed: enhancedActions.getIsAuthed,
  };
};

export const useNetworkActions = () => {
  const enhancedActions = useEnhancedNetworkActions();
  
  // Map enhanced actions to old API names
  return {
    setNetworkStatus: enhancedActions.setNetworkStatus,
    checkConnectivity: enhancedActions.checkConnectivity,
    // Legacy methods that existed in old store - provide fallbacks
    initializeNetworkMonitoring: () => {
      console.warn('initializeNetworkMonitoring is deprecated - network monitoring is now automatic via services');
    },
    cleanupNetworkMonitoring: () => {
      console.warn('cleanupNetworkMonitoring is deprecated - cleanup is now automatic via services');
    },
  };
};

export const useSyncActions = () => {
  const enhancedActions = useEnhancedSyncActions();
  
  // Map enhanced actions to old API names
  return {
    setSyncStatus: enhancedActions.setSyncStatus,
    computeSyncState: enhancedActions.computeSyncState,
    // Legacy methods that existed in old store - provide fallbacks
    initializeEventDrivenSync: () => {
      console.warn('initializeEventDrivenSync is deprecated - sync is now automatic via services');
      return Promise.resolve();
    },
    cleanupSync: () => {
      console.warn('cleanupSync is deprecated - cleanup is now automatic via services');
    },
    queueUserAction: (_action: any) => {
      console.warn('queueUserAction is deprecated - use service-integrated sync methods');
    },
  };
};

// Enhanced store initialization that replaces old appStore initialization
export const initializeAppStore = initializeEnhancedAppStore;
export const cleanupAppStore = cleanupEnhancedAppStore;
