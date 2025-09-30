/**
 * AsyncMutex provides mutual exclusion for async operations.
 * Prevents race conditions by ensuring only one operation of a given key runs at a time.
 */
export class AsyncMutex {
  private locks = new Map<string, Promise<void>>();

  /**
   * Acquires a lock for the given key and executes the function.
   * If a lock is already held for this key, waits for it to complete first.
   * 
   * @param key - Unique identifier for the operation
   * @param fn - Function to execute under the lock
   * @returns Promise resolving to the function's result
   */
  async acquire<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Wait for any existing operation with this key to complete
    const existingLock = this.locks.get(key);
    if (existingLock) {
      try {
        await existingLock;
      } catch {
        // Ignore errors from previous operations
      }
    }

    // Create a new lock for this operation
    const lockPromise = this.executeWithCleanup(key, fn);
    this.locks.set(key, lockPromise.catch(() => {}) as Promise<void>); // Store promise but catch errors

    return lockPromise;
  }

  private async executeWithCleanup<T>(key: string, fn: () => Promise<T>): Promise<T> {
    try {
      const result = await fn();
      return result;
    } finally {
      // Clean up the lock when operation completes (success or failure)
      this.locks.delete(key);
    }
  }

  /**
   * Checks if a lock is currently held for the given key
   */
  isLocked(key: string): boolean {
    return this.locks.has(key);
  }

  /**
   * Gets the number of currently held locks
   */
  getActiveLockCount(): number {
    return this.locks.size;
  }

  /**
   * Clears all locks (use with caution - mainly for testing/cleanup)
   */
  clearAll(): void {
    this.locks.clear();
  }
}