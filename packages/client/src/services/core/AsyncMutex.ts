import { AsyncMutexOptions } from './types';

/**
 * AsyncMutex provides mutual exclusion for async operations to prevent race conditions.
 * Only one operation can execute at a time within the same mutex instance.
 */
export class AsyncMutex {
  private queue: Array<{
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }> = [];
  private locked = false;
  private options: Required<AsyncMutexOptions>;

  constructor(options: AsyncMutexOptions = {}) {
    this.options = {
      timeout: options.timeout || 30000, // 30 seconds default
      debug: options.debug || false,
    };
  }

  /**
   * Execute a function with mutual exclusion
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // Remove from queue if timeout
        const index = this.queue.findIndex(item => item.resolve === resolve);
        if (index >= 0) {
          this.queue.splice(index, 1);
        }
        reject(new Error('Mutex timeout'));
      }, this.options.timeout);

      const executeTask = async () => {
        try {
          clearTimeout(timeoutId);
          if (this.options.debug) {
            console.log('🔒 AsyncMutex: Executing task');
          }
          
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        } finally {
          this.locked = false;
          this.processQueue();
          
          if (this.options.debug) {
            console.log('🔓 AsyncMutex: Task completed, queue length:', this.queue.length);
          }
        }
      };

      if (!this.locked) {
        this.locked = true;
        executeTask();
      } else {
        if (this.options.debug) {
          console.log('⏳ AsyncMutex: Task queued, queue length:', this.queue.length + 1);
        }
        this.queue.push({ resolve, reject });
      }
    });
  }

  private processQueue(): void {
    if (this.queue.length > 0 && !this.locked) {
      const next = this.queue.shift();
      if (next) {
        this.locked = true;
        // Execute the next task
        next.resolve(undefined);
      }
    }
  }

  /**
   * Get the current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Check if the mutex is currently locked
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Clear the queue (useful for cleanup)
   */
  clear(): void {
    this.queue.forEach(item => {
      item.reject(new Error('Mutex cleared'));
    });
    this.queue = [];
    this.locked = false;
  }
}