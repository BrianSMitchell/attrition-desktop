import { StateCreator } from 'zustand';
import { getServices } from '../../services/core';
import { SyncState as ServiceSyncState } from '../../services/core/types';

import { STATUS_CODES } from '@game/shared';
export type SyncState = 'idle' | 'syncing' | 'error';

export interface SyncStatus {
  state: SyncState;
  queuedCount: number;
  lastRunAt?: number;
  lastDurationMs?: number;
  lastError?: string;
}

interface SyncSliceState {
  status: SyncStatus;
  // Service integration state
  serviceConnected: boolean;
  lastSyncAt?: number;
  autoSyncEnabled: boolean;
}

export interface EnhancedSyncSlice {
  sync: SyncSliceState;
  
  // Actions
  setSyncStatus: (status: SyncStatus) => void;
  computeSyncState: (params: {
    queuedCount: number;
    isFullyConnected: boolean;
    recentError?: string;
  }) => SyncState;
  
  // Enhanced service-integrated actions
  syncSyncWithService: (serviceState: ServiceSyncState) => void;
  initializeSyncService: () => void;
  cleanupSyncService: () => void;
  startSyncWithService: () => Promise<void>;
  flushQueueWithService: () => Promise<void>;
  getQueueCountFromService: () => Promise<number>;
  toggleAutoSync: (enabled: boolean) => void;
}

/**
 * Determine sync state from queued items, network state, and recent errors.
 * Priority: error > syncing > idle
 */
function computeState(params: {
  queuedCount: number;
  isFullyConnected: boolean;
  recentError?: string | undefined;
}): SyncState {
  if (params.recentError) return 'error';
  if (params.queuedCount > 0 && params.isFullyConnected) return 'syncing';
  return 'idle';
}

const createEnhancedSyncSlice: StateCreator<
  EnhancedSyncSlice,
  [],
  [],
  EnhancedSyncSlice
> = (set, get) => {
  let syncServiceCleanup: (() => void) | null = null;

  return {
    sync: {
      status: {
        state: 'idle',
        queuedCount: 0,
      },
      serviceConnected: false,
      autoSyncEnabled: true,
    },

    setSyncStatus: (status: SyncStatus) => {
      set((state) => ({
        sync: {
          ...state.sync,
          status,
        },
      }));
    },

    computeSyncState: (params) => {
      return computeState(params);
    },

    syncSyncWithService: (serviceState: ServiceSyncState): void => {
      const { setSyncStatus } = get();
      
      // Map service sync state to store sync state
      const storeState: SyncState = serviceState.isActive ? 'syncing' : 
                                   serviceState.lastError ? 'error' : 'idle';
      
      setSyncStatus({
        state: storeState,
        queuedCount: serviceState.queuedCount,
        lastRunAt: serviceState.lastSyncAt,
        lastError: serviceState.lastError,
      });

      // Update service connection state
      set((state) => ({
        sync: {
          ...state.sync,
          serviceConnected: true,
          lastSyncAt: Date.now(),
        },
      }));

      console.log('🔄 Sync: Store synced with service state:', {
        isActive: serviceState.isActive,
        queuedCount: serviceState.queuedCount,
        hasError: !!serviceState.lastError,
      });
    },

    startSyncWithService: async (): Promise<void> => {
      try {
        const services = getServices();
        if (!services.isReady()) {
          throw new Error('Services not initialized');
        }

        const syncManager = services.getSyncManager();
        if (!syncManager) {
          throw new Error('Sync manager not available');
        }

        console.log('🔄 Sync: Starting sync via service...');
        await syncManager.startSync();
        
        // State will be updated via service subscription
      } catch (error) {
        console.error('❌ Sync: Start sync failed:', error);
        throw error;
      }
    },

    flushQueueWithService: async (): Promise<void> => {
      try {
        const services = getServices();
        if (!services.isReady()) {
          throw new Error('Services not initialized');
        }

        const syncManager = services.getSyncManager();
        if (!syncManager) {
          throw new Error('Sync manager not available');
        }

        console.log('🔄 Sync: Flushing queue via service...');
        await syncManager.flushQueue();
        
        // State will be updated via service subscription
      } catch (error) {
        console.error('❌ Sync: Flush queue failed:', error);
        throw error;
      }
    },

    getQueueCountFromService: async (): Promise<number> => {
      try {
        const services = getServices();
        if (!services.isReady()) {
          return STATUS_CODES.SUCCESS;
        }

        const syncManager = services.getSyncManager();
        if (!syncManager) {
          return STATUS_CODES.SUCCESS;
        }

        const count = await syncManager.getQueueCount();
        console.log('📊 Sync: Queue count from service:', count);
        return count;
      } catch (error) {
        console.error('❌ Sync: Get queue count failed:', error);
        return STATUS_CODES.SUCCESS;
      }
    },

    toggleAutoSync: (enabled: boolean): void => {
      set((state) => ({
        sync: {
          ...state.sync,
          autoSyncEnabled: enabled,
        },
      }));

      console.log(`🔄 Sync: Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
    },

    initializeSyncService: (): void => {
      try {
        const services = getServices();
        if (!services.isReady()) {
          console.warn('⚠️ Sync: Services not ready for initialization');
          return;
        }

        const syncManager = services.getSyncManager();
        if (!syncManager) {
          console.warn('⚠️ Sync: Sync manager not available');
          return;
        }

        // Subscribe to sync service state changes
        syncServiceCleanup = syncManager.onStateChange((serviceState) => {
          const { syncSyncWithService } = get();
          syncSyncWithService(serviceState);
        });

        // Initial sync with service state
        const serviceState = syncManager.getState();
        get().syncSyncWithService(serviceState);

        console.log('✅ Sync: Service integration initialized');
      } catch (error) {
        console.error('❌ Sync: Service initialization failed:', error);
        
        // Set service disconnected state
        set((state) => ({
          sync: {
            ...state.sync,
            serviceConnected: false,
          },
        }));
      }
    },

    cleanupSyncService: (): void => {
      if (syncServiceCleanup) {
        syncServiceCleanup();
        syncServiceCleanup = null;
      }

      set((state) => ({
        sync: {
          ...state.sync,
          serviceConnected: false,
        },
      }));

      console.log('✅ Sync: Service integration cleaned up');
    },
  };
};

export default createEnhancedSyncSlice;