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

export interface EventQueueOptions {
  maxSize?: number;
  enableLogging?: boolean;
  storageKey?: string;
}

export interface QueueMetrics {
  totalEnqueued: number;
  totalProcessed: number;
  totalFailed: number;
  currentSize: number;
  oldestTimestamp?: number;
}

/**
 * EventQueue manages the queue of sync actions with persistent storage support.
 * Actions are stored in memory and optionally persisted to localStorage/IndexedDB.
 */
export class EventQueue extends EventEmitter {
  private queue: SyncAction[] = [];
  private failedActions: Map<string, { action: SyncAction; error: Error; timestamp: number }> = new Map();
  private metrics: QueueMetrics = {
    totalEnqueued: 0,
    totalProcessed: 0,
    totalFailed: 0,
    currentSize: 0,
  };
  
  private readonly options: Required<EventQueueOptions>;
  private isDestroyed = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(options: EventQueueOptions = {}) {
    super();
    
    this.options = {
      maxSize: 1000,
      enableLogging: false,
      storageKey: 'attrition-sync-queue',
      ...options,
    };
  }

  /**
   * Initialize the queue and load any persisted actions
   */
  async initialize(): Promise<void> {
    this.log('📦 EventQueue: Initializing...');
    
    try {
      await this.loadFromStorage();
      this.updateMetrics();
      this.log('📦 EventQueue: Initialized with', this.queue.length, 'actions');
    } catch (error) {
      this.log('📦 EventQueue: Error during initialization:', error);
      // Continue with empty queue if loading fails
    }
  }

  /**
   * Destroy the queue and clean up
   */
  destroy(): void {
    this.log('📦 EventQueue: Destroying...');
    
    this.isDestroyed = true;
    
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    
    // Save current state before destroying
    this.saveToStorage().catch(error => {
      this.log('Error saving queue on destroy:', error);
    });
    
    this.queue = [];
    this.failedActions.clear();
    this.removeAllListeners();
  }

  /**
   * Add an action to the queue
   */
  async enqueue(action: SyncAction): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Cannot enqueue to destroyed queue');
    }

    // Check queue size limit
    if (this.queue.length >= this.options.maxSize) {
      this.log('⚠️ Queue at capacity, removing oldest action');
      this.queue.shift(); // Remove oldest action
    }

    this.queue.push(action);
    this.metrics.totalEnqueued++;
    this.updateMetrics();
    
    this.log('➕ Enqueued action:', action.id, 'Queue size:', this.queue.length);
    
    this.emit('action-enqueued', action);
    this.scheduleSave();
  }

  /**
   * Remove and return a single action from the queue
   */
  async dequeue(): Promise<SyncAction | undefined> {
    if (this.isDestroyed || this.queue.length === 0) {
      return undefined;
    }

    const action = this.queue.shift();
    
    if (action) {
      this.metrics.totalProcessed++;
      this.updateMetrics();
      this.log('➖ Dequeued action:', action.id, 'Queue size:', this.queue.length);
      this.emit('action-dequeued', action);
      this.scheduleSave();
    }

    return action;
  }

  /**
   * Remove and return multiple actions from the queue
   */
  async dequeueMany(count: number): Promise<SyncAction[]> {
    if (this.isDestroyed) {
      return [];
    }

    const actions = this.queue.splice(0, count);
    
    if (actions.length > 0) {
      this.metrics.totalProcessed += actions.length;
      this.updateMetrics();
      this.log('➖ Dequeued', actions.length, 'actions, Queue size:', this.queue.length);
      this.emit('actions-dequeued', actions);
      this.scheduleSave();
    }

    return actions;
  }

  /**
   * Get current queue size
   */
  async size(): Promise<number> {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  async isEmpty(): Promise<boolean> {
    return this.queue.length === 0;
  }

  /**
   * Peek at the next action without removing it
   */
  async peek(): Promise<SyncAction | undefined> {
    return this.queue[0];
  }

  /**
   * Get all actions without removing them
   */
  async getAll(): Promise<SyncAction[]> {
    return [...this.queue];
  }

  /**
   * Clear the entire queue
   */
  async clear(): Promise<void> {
    const cleared = this.queue.length;
    this.queue = [];
    this.updateMetrics();
    
    this.log('🗑️ Cleared queue,', cleared, 'actions removed');
    this.emit('queue-cleared', { count: cleared });
    this.scheduleSave();
  }

  /**
   * Mark an action as failed
   */
  markAsFailed(action: SyncAction, error: Error): void {
    this.failedActions.set(action.id, {
      action,
      error,
      timestamp: Date.now(),
    });
    
    this.metrics.totalFailed++;
    this.updateMetrics();
    
    this.log('❌ Action marked as failed:', action.id, error.message);
    this.emit('action-failed', action, error);
  }

  /**
   * Get all failed actions
   */
  async getFailedActions(): Promise<Array<{ action: SyncAction; error: Error; timestamp: number }>> {
    return Array.from(this.failedActions.values());
  }

  /**
   * Remove a failed action from the failed list
   */
  clearFailedAction(actionId: string): void {
    if (this.failedActions.delete(actionId)) {
      this.log('🧹 Cleared failed action:', actionId);
      this.emit('failed-action-cleared', actionId);
    }
  }

  /**
   * Clear all failed actions
   */
  clearAllFailedActions(): void {
    const count = this.failedActions.size;
    this.failedActions.clear();
    this.log('🧹 Cleared all failed actions:', count);
    this.emit('all-failed-actions-cleared', { count });
  }

  /**
   * Get queue metrics
   */
  getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }

  /**
   * Get actions older than specified timestamp
   */
  async getOldActions(maxAge: number): Promise<SyncAction[]> {
    const cutoff = Date.now() - maxAge;
    return this.queue.filter(action => action.timestamp < cutoff);
  }

  /**
   * Remove actions older than specified timestamp
   */
  async removeOldActions(maxAge: number): Promise<number> {
    const cutoff = Date.now() - maxAge;
    const initialLength = this.queue.length;
    
    this.queue = this.queue.filter(action => action.timestamp >= cutoff);
    
    const removed = initialLength - this.queue.length;
    
    if (removed > 0) {
      this.updateMetrics();
      this.log('🗑️ Removed', removed, 'old actions');
      this.emit('old-actions-removed', { count: removed, cutoff });
      this.scheduleSave();
    }

    return removed;
  }

  private updateMetrics(): void {
    this.metrics.currentSize = this.queue.length;
    this.metrics.oldestTimestamp = this.queue.length > 0 ? 
      Math.min(...this.queue.map(a => a.timestamp)) : 
      undefined;
  }

  private scheduleSave(): void {
    if (this.saveTimeout || this.isDestroyed) {
      return;
    }

    // Debounce saves to avoid too frequent storage operations
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.saveToStorage().catch(error => {
        this.log('Error saving queue:', error);
      });
    }, 1000);
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        queue: this.queue,
        failedActions: Array.from(this.failedActions.entries()),
        metrics: this.metrics,
        timestamp: Date.now(),
      };

      if (this.isDesktop()) {
        // Use desktop IPC for persistent storage
        await (window as any).desktop?.storage?.set?.(this.options.storageKey, data);
      } else {
        // Use localStorage for web
        localStorage.setItem(this.options.storageKey, JSON.stringify(data));
      }

      this.log('💾 Queue saved to storage');
    } catch (error) {
      this.log('Error saving to storage:', error);
      // Don't throw - storage failures shouldn't break the queue
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      let data: any = null;

      if (this.isDesktop()) {
        // Load from desktop IPC
        const result = await (window as any).desktop?.storage?.get?.(this.options.storageKey);
        if (result && result.success) {
          data = result.data;
        }
      } else {
        // Load from localStorage
        const stored = localStorage.getItem(this.options.storageKey);
        if (stored) {
          data = JSON.parse(stored);
        }
      }

      if (data && data.queue && Array.isArray(data.queue)) {
        this.queue = data.queue;
        
        // Restore failed actions
        if (data.failedActions && Array.isArray(data.failedActions)) {
          this.failedActions = new Map(data.failedActions);
        }
        
        // Restore metrics if available
        if (data.metrics) {
          this.metrics = { ...this.metrics, ...data.metrics };
        }
        
        this.log('📂 Loaded', this.queue.length, 'actions from storage');
      }
    } catch (error) {
      this.log('Error loading from storage:', error);
      // Start with empty queue if loading fails
    }
  }

  private isDesktop(): boolean {
    return typeof window !== 'undefined' && !!(window as any).desktop;
  }

  private log(...args: any[]): void {
    if (this.options.enableLogging) {
      console.log('[EventQueue]', ...args);
    }
  }
}