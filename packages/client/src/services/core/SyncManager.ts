import { TIMEOUTS, STATUS_CODES } from '@game/shared';
import { 
  ISyncManager, 
  SyncState, 
  ServiceOptions, 
  ConnectionEventCallback 
} from './types';
import { AsyncMutex } from './AsyncMutex';

// Simple CircuitBreaker implementation
class CircuitBreaker {
  private failureCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private lastFailureTime = 0;

  constructor(private options: {
    failureThreshold: number;
    resetTimeout: number;
    monitoringPeriod: number;
  }) {}

  canExecute(): boolean {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.options.resetTimeout) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true; // HALF_OPEN
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return { state: this.state, failureCount: this.failureCount };
  }
}

/**
 * SyncManager handles offline sync queue management and processing.
 * It coordinates with the ConnectionManager to sync when appropriate.
 */
export class SyncManager implements ISyncManager {
  private state: SyncState = {
    queuedCount: 0,
    isActive: false,
  };

  private stateChangeCallbacks = new Set<ConnectionEventCallback<SyncState>>();
  private circuitBreaker: CircuitBreaker;
  private syncMutex: AsyncMutex;

  private syncTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private isDestroyed = false;

  constructor(private _options: ServiceOptions = {}) {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
    });

    this.syncMutex = new AsyncMutex({
      timeout: TIMEOUTS.THIRTY_SECONDS, // 30 second timeout for sync operations
      debug: this._options.enableLogging,
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔄 SyncManager: Initializing...');
    
    // Initialize queue count from desktop storage if available
    await this.updateQueueCount();
    
    this.isInitialized = true;
    console.log('🔄 SyncManager: Initialized successfully');
  }

  cleanup(): void {
    console.log('🔄 SyncManager: Cleaning up...');
    
    this.isDestroyed = true;
    
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }

    this.stateChangeCallbacks.clear();
    
    this.updateState({
      queuedCount: 0,
      isActive: false,
      lastSyncAt: undefined,
      lastError: undefined,
    });
  }

  isReady(): boolean {
    return this.isInitialized && !this.isDestroyed;
  }

  getState(): SyncState {
    return { ...this.state };
  }

  async startSync(): Promise<void> {
    if (!this.isReady()) {
      throw new Error('SyncManager not initialized or destroyed');
    }

    if (this.state.isActive) {
      console.log('🔄 SyncManager: Sync already active, skipping');
      return;
    }

    // Use mutex to prevent concurrent sync operations
    return this.syncMutex.execute(async () => {
      // Check circuit breaker
      if (!this.circuitBreaker.canExecute()) {
        const state = this.circuitBreaker.getState();
        throw new Error(`Sync circuit breaker is ${state.state}`);
      }

      try {
        console.log('🔄 SyncManager: Starting sync...');
        this.updateState({ isActive: true, lastError: undefined });

        await this.performSync();
        
        this.circuitBreaker.recordSuccess();
        console.log('🔄 SyncManager: Sync completed successfully');
      } catch (error) {
        this.circuitBreaker.recordFailure();
        const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
        
        console.error('🔄 SyncManager: Sync failed:', errorMessage);
        this.updateState({ lastError: errorMessage });
        throw error;
      } finally {
        this.updateState({ 
          isActive: false,
          lastSyncAt: Date.now()
        });
      }
    });
  }

  async flushQueue(): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      // Update queue count first to see if there's anything to sync
      await this.updateQueueCount();
      
      if (this.state.queuedCount > 0) {
        await this.startSync();
      }
    } catch (error) {
      console.error('🔄 SyncManager: Queue flush failed:', error);
      throw error;
    }
  }

  async getQueueCount(): Promise<number> {
    if (!this.isReady()) {
      return STATUS_CODES.SUCCESS;
    }

    await this.updateQueueCount();
    return this.state.queuedCount;
  }

  onStateChange(callback: ConnectionEventCallback<SyncState>): () => void {
    this.stateChangeCallbacks.add(callback);
    
    // Immediately notify with current state
    callback(this.getState());
    
    return () => {
      this.stateChangeCallbacks.delete(callback);
    };
  }

  private async performSync(): Promise<void> {
    const isDesktop = this.getIsDesktop();
    
    if (!isDesktop) {
      // For web, we might have a different sync mechanism
      // For now, we'll just simulate the operation
      console.log('🔄 SyncManager: Web sync not implemented, simulating...');
      await new Promise(resolve => setTimeout(resolve, TIMEOUTS.ONE_SECOND));
      this.updateState({ queuedCount: 0 });
      return;
    }

    // Desktop sync through IPC
    try {
      const startTime = Date.now();
      
      // Trigger desktop sync flush
      const result = await (window as any).desktop?.db?.events?.flushQueue?.();
      
      if (result && result.success) {
        const duration = Date.now() - startTime;
        console.log(`🔄 SyncManager: Desktop sync completed in ${duration}ms, processed: ${result.processed || 0} items`);
        
        // Update queue count after successful sync
        await this.updateQueueCount();
      } else {
        throw new Error(result?.error || 'Desktop sync failed');
      }
    } catch (error) {
      console.error('🔄 SyncManager: Desktop sync error:', error);
      throw error;
    }
  }

  private async updateQueueCount(): Promise<void> {
    try {
      const isDesktop = this.getIsDesktop();
      let queuedCount = 0;

      if (isDesktop) {
        // Get queue count from desktop IPC
        const result = await (window as any).desktop?.db?.events?.getPendingCount?.(null);
        if (result && result.success && typeof result.count === 'number') {
          queuedCount = result.count;
        }
      } else {
        // For web, we might check IndexedDB or other storage
        // For now, assume 0
        queuedCount = 0;
      }

      if (queuedCount !== this.state.queuedCount) {
        this.updateState({ queuedCount });
      }
    } catch (error) {
      console.error('🔄 SyncManager: Error updating queue count:', error);
      // Don't throw - failing to get queue count shouldn't break the service
    }
  }

  private updateState(updates: Partial<SyncState>): void {
    this.state = { ...this.state, ...updates };
    
    // Notify all state change callbacks
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(this.getState());
      } catch (error) {
        console.error('🔄 SyncManager: Error in state change callback:', error);
      }
    });
  }

  private getIsDesktop(): boolean {
    return typeof window !== 'undefined' && !!(window as any).desktop;
  }

  /**
   * Schedule periodic queue monitoring
   */
  startPeriodicSync(intervalMs: number = 300000): void { // 5 minutes default
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    const periodicCheck = async () => {
      if (this.isDestroyed) return;

      try {
        await this.updateQueueCount();
        
        // If there are queued items and we're not currently syncing, try to flush
        if (this.state.queuedCount > 0 && !this.state.isActive) {
          console.log(`🔄 SyncManager: Periodic check found ${this.state.queuedCount} queued items`);
          // Note: We don't automatically start sync here - let ConnectionManager decide
          // based on network/auth state
        }
      } catch (error) {
        console.error('🔄 SyncManager: Periodic check error:', error);
      }

      if (!this.isDestroyed) {
        this.syncTimer = setTimeout(periodicCheck, intervalMs);
      }
    };

    this.syncTimer = setTimeout(periodicCheck, intervalMs);
  }

  stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
  }
}