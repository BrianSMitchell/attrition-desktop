// Simple browser-compatible EventEmitter implementation
class EventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners[event] || [];
    eventListeners.forEach(callback => callback(...args));
  }

  off(event: string, callback: Function): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}
import { EventQueue } from './EventQueue';
import { SyncStateManager } from './SyncStateManager';
import { AsyncMutex } from '../utils/AsyncMutex';
import { CircuitBreaker } from '../utils/CircuitBreaker';

export interface SyncAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount?: number;
  optimistic?: boolean;
}

export interface BatchRequest {
  actions: SyncAction[];
  batchId: string;
  timestamp: number;
}

export interface SyncEngineOptions {
  batchSize?: number;
  batchTimeoutMs?: number;
  maxRetries?: number;
  enableOptimistic?: boolean;
  enableLogging?: boolean;
}

/**
 * Event-driven sync engine that replaces polling with reactive updates.
 * Handles action queuing, batching, optimistic updates, and recovery.
 */
export class SyncEngine extends EventEmitter {
  private queue: EventQueue;
  private stateManager: SyncStateManager;
  private syncMutex: AsyncMutex;
  private circuitBreaker: CircuitBreaker;
  
  private batchTimer: NodeJS.Timeout | null = null;
  private isActive = false;
  private isDestroyed = false;

  private readonly options: Required<SyncEngineOptions>;
  
  constructor(options: SyncEngineOptions = {}) {
    super();
    
    this.options = {
      batchSize: 10,
      batchTimeoutMs: 2000,
      maxRetries: 3,
      enableOptimistic: true,
      enableLogging: false,
      ...options,
    };
    
    this.queue = new EventQueue({
      maxSize: 1000,
      enableLogging: this.options.enableLogging,
    });
    
    this.stateManager = new SyncStateManager({
      enableLogging: this.options.enableLogging,
    });
    
    this.syncMutex = new AsyncMutex();
    
    this.circuitBreaker = new CircuitBreaker(
      5, // failureThreshold
      60000, // resetTimeout
      'SyncEngine' // name
    );
    
    this.setupEventHandlers();
  }

  /**
   * Initialize the sync engine
   */
  async initialize(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Cannot initialize destroyed SyncEngine');
    }

    this.log('🚀 SyncEngine: Initializing...');
    
    await this.queue.initialize();
    await this.stateManager.initialize();
    
    this.isActive = true;
    this.emit('initialized');
    
    this.log('🚀 SyncEngine: Initialized successfully');
  }

  /**
   * Cleanup and destroy the sync engine
   */
  destroy(): void {
    this.log('🚀 SyncEngine: Destroying...');
    
    this.isDestroyed = true;
    this.isActive = false;
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    this.queue.destroy();
    this.stateManager.destroy();
    this.removeAllListeners();
    
    this.log('🚀 SyncEngine: Destroyed');
  }

  /**
   * Queue an action for sync
   */
  async queueAction(type: string, payload: any, options: { optimistic?: boolean } = {}): Promise<string> {
    if (!this.isActive) {
      throw new Error('SyncEngine not active');
    }

    const action: SyncAction = {
      id: this.generateActionId(),
      type,
      payload,
      timestamp: Date.now(),
      optimistic: options.optimistic && this.options.enableOptimistic,
    };

    this.log('📝 Queueing action:', { type, id: action.id, optimistic: action.optimistic });

    await this.queue.enqueue(action);
    
    // Apply optimistic update if enabled
    if (action.optimistic) {
      this.optimisticUpdate(action);
    }
    
    this.emit('action-queued', action);
    this.scheduleBatchProcess();
    
    return action.id;
  }

  /**
   * Process queue immediately (force flush)
   */
  async processQueue(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    return this.syncMutex.acquire('process-queue', async () => {
      const actions = await this.queue.dequeueMany(this.options.batchSize);
      
      if (actions.length === 0) {
        return;
      }

      const batch = this.createBatch(actions);
      await this.processBatch(batch);
    });
  }

  /**
   * Get current queue status
   */
  async getStatus() {
    const queueSize = await this.queue.size();
    const lastSync = this.stateManager.getLastSyncTime();
    const failedActions = await this.queue.getFailedActions();
    
    return {
      queueSize,
      lastSync,
      failedCount: failedActions.length,
      isActive: this.isActive,
      circuitBreakerState: this.circuitBreaker.getState(),
    };
  }

  /**
   * Handle network connectivity changes
   */
  onNetworkOnline(): void {
    this.log('🌐 Network came online');
    this.emit('sync-required');
    this.scheduleBatchProcess();
  }

  /**
   * Handle network connectivity loss
   */
  onNetworkOffline(): void {
    this.log('🌐 Network went offline');
    this.emit('sync-paused');
  }

  /**
   * Handle user actions that should trigger sync
   */
  onUserAction(type: string, payload: any): void {
    this.queueAction(type, payload, { optimistic: true })
      .catch(error => {
        this.log('Error queuing user action:', error);
      });
  }

  /**
   * Handle successful server responses
   */
  onServerResponse(batchId: string, results: any[]): void {
    this.log('📨 Server response received for batch:', batchId);
    this.stateManager.recordSyncSuccess(Date.now());
    // Circuit breaker success is handled automatically in execute()
    this.emit('sync-complete', { batchId, results });
  }

  /**
   * Handle server errors
   */
  onServerError(batchId: string, error: Error): void {
    this.log('❌ Server error for batch:', batchId, error);
    this.stateManager.recordSyncError(error.message);
    // Circuit breaker failure is handled automatically in execute()
    this.emit('sync-error', { batchId, error });
  }

  private setupEventHandlers(): void {
    this.on('sync-required', () => {
      this.scheduleBatchProcess();
    });
    
    this.queue.on('action-failed', (action: SyncAction, error: Error) => {
      this.revertOptimisticUpdate(action);
      this.emit('action-failed', { action, error });
    });
  }

  private scheduleBatchProcess(): void {
    if (!this.isActive || this.batchTimer) {
      return;
    }

    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.processQueue().catch(error => {
        this.log('Batch processing error:', error);
      });
    }, this.options.batchTimeoutMs);
  }

  private createBatch(actions: SyncAction[]): BatchRequest {
    return {
      actions,
      batchId: this.generateBatchId(),
      timestamp: Date.now(),
    };
  }

  private async processBatch(batch: BatchRequest): Promise<void> {
    this.log('🔄 Processing batch:', batch.batchId, 'with', batch.actions.length, 'actions');
    
    if (this.circuitBreaker.isOpen()) {
      const state = this.circuitBreaker.getState();
      throw new Error(`Sync circuit breaker is ${state.state}`);
    }

    try {
      this.emit('batch-started', batch);
      
      // Simulate server sync (replace with actual implementation)
      const results = await this.performServerSync(batch);
      
      this.onServerResponse(batch.batchId, results);
      this.emit('batch-completed', { batch, results });
      
    } catch (error) {
      this.log('Batch processing failed:', error);
      
      // Requeue failed actions for retry
      for (const action of batch.actions) {
        action.retryCount = (action.retryCount || 0) + 1;
        
        if (action.retryCount <= this.options.maxRetries) {
          await this.queue.enqueue(action);
        } else {
          this.queue.markAsFailed(action, error as Error);
        }
      }
      
      this.onServerError(batch.batchId, error as Error);
      throw error;
    }
  }

  private async performServerSync(batch: BatchRequest): Promise<any[]> {
    // This would be replaced with actual server communication
    // For desktop, this would use IPC to trigger sync
    // For web, this would make HTTP requests
    
    const isDesktop = this.isDesktop();
    
    if (isDesktop) {
      return this.performDesktopSync(batch);
    } else {
      return this.performWebSync(batch);
    }
  }

  private async performDesktopSync(batch: BatchRequest): Promise<any[]> {
    try {
      const result = await (window as any).desktop?.db?.events?.syncBatch?.(batch);
      
      if (result && result.success) {
        return result.results || [];
      } else {
        throw new Error(result?.error || 'Desktop sync failed');
      }
    } catch (error) {
      this.log('Desktop sync error:', error);
      throw error;
    }
  }

  private async performWebSync(batch: BatchRequest): Promise<any[]> {
    // Placeholder for web-based sync implementation
    // This would make HTTP requests to sync endpoints
    this.log('Web sync not fully implemented, simulating...');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock results
    return batch.actions.map(action => ({
      actionId: action.id,
      success: true,
    }));
  }

  private optimisticUpdate(action: SyncAction): void {
    this.log('⚡ Applying optimistic update:', action.id);
    this.stateManager.applyOptimisticUpdate(action);
    this.emit('optimistic-update-applied', action);
  }

  private revertOptimisticUpdate(action: SyncAction): void {
    this.log('↩️ Reverting optimistic update:', action.id);
    this.stateManager.revertOptimisticUpdate(action);
    this.emit('optimistic-update-reverted', action);
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isDesktop(): boolean {
    return typeof window !== 'undefined' && !!(window as any).desktop;
  }

  private log(...args: any[]): void {
    if (this.options.enableLogging) {
      console.log('[SyncEngine]', ...args);
    }
  }
}