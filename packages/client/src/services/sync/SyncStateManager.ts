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
import { SyncAction } from './SyncEngine';

export interface SyncStateManagerOptions {
  enableLogging?: boolean;
  maxOptimisticUpdates?: number;
}

export interface OptimisticUpdate {
  actionId: string;
  type: string;
  payload: any;
  timestamp: number;
  revertData?: any;
}

export interface SyncStateSnapshot {
  lastSyncTime?: number;
  lastSyncError?: string;
  optimisticUpdates: Map<string, OptimisticUpdate>;
  isProcessing: boolean;
}

/**
 * SyncStateManager coordinates optimistic updates and maintains sync state.
 * It tracks pending optimistic updates and can revert them if sync fails.
 */
export class SyncStateManager extends EventEmitter {
  private lastSyncTime?: number;
  private lastSyncError?: string;
  private isProcessing = false;
  
  private optimisticUpdates = new Map<string, OptimisticUpdate>();
  private readonly options: Required<SyncStateManagerOptions>;
  private isDestroyed = false;

  constructor(options: SyncStateManagerOptions = {}) {
    super();
    
    this.options = {
      enableLogging: false,
      maxOptimisticUpdates: 100,
      ...options,
    };
  }

  /**
   * Initialize the state manager
   */
  async initialize(): Promise<void> {
    this.log('🎯 SyncStateManager: Initializing...');
    this.log('🎯 SyncStateManager: Initialized successfully');
  }

  /**
   * Destroy and clean up the state manager
   */
  destroy(): void {
    this.log('🎯 SyncStateManager: Destroying...');
    
    this.isDestroyed = true;
    this.optimisticUpdates.clear();
    this.removeAllListeners();
  }

  /**
   * Apply an optimistic update
   */
  applyOptimisticUpdate(action: SyncAction): void {
    if (this.isDestroyed) {
      return;
    }

    // Check if we're at the limit for optimistic updates
    if (this.optimisticUpdates.size >= this.options.maxOptimisticUpdates) {
      this.log('⚠️ At optimistic update limit, removing oldest');
      const oldest = this.getOldestOptimisticUpdate();
      if (oldest) {
        this.optimisticUpdates.delete(oldest.actionId);
      }
    }

    // Capture current state for potential revert
    const revertData = this.captureRevertData(action);
    
    const update: OptimisticUpdate = {
      actionId: action.id,
      type: action.type,
      payload: action.payload,
      timestamp: action.timestamp,
      revertData,
    };

    this.optimisticUpdates.set(action.id, update);
    
    this.log('⚡ Applied optimistic update:', action.id, 'Total pending:', this.optimisticUpdates.size);
    
    // Apply the actual update to the application state
    this.performOptimisticUpdate(action);
    
    this.emit('optimistic-update-applied', update);
  }

  /**
   * Revert an optimistic update
   */
  revertOptimisticUpdate(action: SyncAction): void {
    if (this.isDestroyed) {
      return;
    }

    const update = this.optimisticUpdates.get(action.id);
    if (!update) {
      this.log('⚠️ Cannot revert - optimistic update not found:', action.id);
      return;
    }

    this.optimisticUpdates.delete(action.id);
    
    this.log('↩️ Reverted optimistic update:', action.id, 'Remaining:', this.optimisticUpdates.size);
    
    // Revert the actual application state
    this.performOptimisticRevert(update);
    
    this.emit('optimistic-update-reverted', update);
  }

  /**
   * Confirm an optimistic update (remove from pending)
   */
  confirmOptimisticUpdate(actionId: string): void {
    const update = this.optimisticUpdates.get(actionId);
    if (update) {
      this.optimisticUpdates.delete(actionId);
      this.log('✅ Confirmed optimistic update:', actionId, 'Remaining:', this.optimisticUpdates.size);
      this.emit('optimistic-update-confirmed', update);
    }
  }

  /**
   * Get all pending optimistic updates
   */
  getPendingOptimisticUpdates(): OptimisticUpdate[] {
    return Array.from(this.optimisticUpdates.values());
  }

  /**
   * Clear all pending optimistic updates
   */
  clearOptimisticUpdates(): void {
    const count = this.optimisticUpdates.size;
    this.optimisticUpdates.clear();
    
    this.log('🧹 Cleared all optimistic updates:', count);
    this.emit('optimistic-updates-cleared', { count });
  }

  /**
   * Record successful sync
   */
  recordSyncSuccess(timestamp: number): void {
    this.lastSyncTime = timestamp;
    this.lastSyncError = undefined;
    this.isProcessing = false;
    
    this.log('✅ Recorded sync success at:', new Date(timestamp).toISOString());
    this.emit('sync-success', { timestamp });
  }

  /**
   * Record sync error
   */
  recordSyncError(error: string): void {
    this.lastSyncError = error;
    this.isProcessing = false;
    
    this.log('❌ Recorded sync error:', error);
    this.emit('sync-error', { error });
  }

  /**
   * Set processing state
   */
  setProcessing(processing: boolean): void {
    this.isProcessing = processing;
    this.emit('processing-changed', { isProcessing: processing });
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): number | undefined {
    return this.lastSyncTime;
  }

  /**
   * Get last sync error
   */
  getLastSyncError(): string | undefined {
    return this.lastSyncError;
  }

  /**
   * Check if currently processing
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Get current state snapshot
   */
  getStateSnapshot(): SyncStateSnapshot {
    return {
      lastSyncTime: this.lastSyncTime,
      lastSyncError: this.lastSyncError,
      optimisticUpdates: new Map(this.optimisticUpdates),
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Get optimistic updates older than specified age
   */
  getOldOptimisticUpdates(maxAge: number): OptimisticUpdate[] {
    const cutoff = Date.now() - maxAge;
    return Array.from(this.optimisticUpdates.values())
      .filter(update => update.timestamp < cutoff);
  }

  /**
   * Clean up old optimistic updates
   */
  cleanupOldOptimisticUpdates(maxAge: number): number {
    const oldUpdates = this.getOldOptimisticUpdates(maxAge);
    
    for (const update of oldUpdates) {
      this.optimisticUpdates.delete(update.actionId);
    }

    if (oldUpdates.length > 0) {
      this.log('🧹 Cleaned up', oldUpdates.length, 'old optimistic updates');
      this.emit('old-optimistic-updates-cleaned', { count: oldUpdates.length });
    }

    return oldUpdates.length;
  }

  private getOldestOptimisticUpdate(): OptimisticUpdate | undefined {
    let oldest: OptimisticUpdate | undefined;
    
    for (const update of this.optimisticUpdates.values()) {
      if (!oldest || update.timestamp < oldest.timestamp) {
        oldest = update;
      }
    }
    
    return oldest;
  }

  private captureRevertData(action: SyncAction): any {
    // This would capture the current state needed to revert the optimistic update
    // The implementation depends on how your application state is structured
    // For now, we'll return a placeholder
    
    try {
      // Example: capture relevant state based on action type
      switch (action.type) {
        case 'UPDATE_RESOURCE':
          // Capture current resource state
          return this.captureResourceState(action.payload.resourceId);
          
        case 'CREATE_ITEM':
          // For create actions, we just need to know to remove the item
          return { actionType: 'remove', itemId: action.payload.tempId };
          
        case 'DELETE_ITEM':
          // For delete actions, we need to restore the item
          return this.captureItemState(action.payload.itemId);
          
        default:
          return null;
      }
    } catch (error) {
      this.log('Error capturing revert data:', error);
      return null;
    }
  }

  private performOptimisticUpdate(action: SyncAction): void {
    // This would apply the optimistic update to your application state
    // The implementation depends on your state management system (Zustand stores, etc.)
    
    try {
      this.log('🔄 Performing optimistic update for action type:', action.type);
      
      // Example implementation - replace with your actual state updates
      switch (action.type) {
        case 'UPDATE_RESOURCE':
          this.updateResourceOptimistically(action.payload);
          break;
          
        case 'CREATE_ITEM':
          this.createItemOptimistically(action.payload);
          break;
          
        case 'DELETE_ITEM':
          this.deleteItemOptimistically(action.payload);
          break;
          
        default:
          this.log('Unknown action type for optimistic update:', action.type);
      }
    } catch (error) {
      this.log('Error performing optimistic update:', error);
    }
  }

  private performOptimisticRevert(update: OptimisticUpdate): void {
    // This would revert the optimistic update in your application state
    
    try {
      this.log('🔄 Reverting optimistic update for action type:', update.type);
      
      if (!update.revertData) {
        this.log('No revert data available for:', update.actionId);
        return;
      }
      
      // Example implementation - replace with your actual state reverts
      switch (update.type) {
        case 'UPDATE_RESOURCE':
          this.revertResourceUpdate(update.revertData);
          break;
          
        case 'CREATE_ITEM':
          this.revertItemCreation(update.revertData);
          break;
          
        case 'DELETE_ITEM':
          this.revertItemDeletion(update.revertData);
          break;
          
        default:
          this.log('Unknown action type for optimistic revert:', update.type);
      }
    } catch (error) {
      this.log('Error reverting optimistic update:', error);
    }
  }

  // Placeholder methods for state capture and manipulation
  // These should be replaced with your actual state management implementation
  
  private captureResourceState(resourceId: string): any {
    // Capture current resource state from your store
    this.log('Capturing resource state for:', resourceId);
    return { resourceId, captured: true };
  }

  private captureItemState(itemId: string): any {
    // Capture current item state from your store
    this.log('Capturing item state for:', itemId);
    return { itemId, captured: true };
  }

  private updateResourceOptimistically(payload: any): void {
    // Apply optimistic resource update to your store
    this.log('Updating resource optimistically:', payload);
  }

  private createItemOptimistically(payload: any): void {
    // Apply optimistic item creation to your store
    this.log('Creating item optimistically:', payload);
  }

  private deleteItemOptimistically(payload: any): void {
    // Apply optimistic item deletion to your store
    this.log('Deleting item optimistically:', payload);
  }

  private revertResourceUpdate(revertData: any): void {
    // Revert resource update in your store
    this.log('Reverting resource update:', revertData);
  }

  private revertItemCreation(revertData: any): void {
    // Revert item creation in your store
    this.log('Reverting item creation:', revertData);
  }

  private revertItemDeletion(revertData: any): void {
    // Revert item deletion in your store
    this.log('Reverting item deletion:', revertData);
  }

  private log(...args: any[]): void {
    if (this.options.enableLogging) {
      console.log('[SyncStateManager]', ...args);
    }
  }
}