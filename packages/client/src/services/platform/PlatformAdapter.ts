export interface QueueMetrics {
  pendingCount: number;
  processedCount: number;
  failedCount: number;
  lastFlushTime?: number;
  lastFlushDuration?: number;
}

export interface FlushResult {
  success: boolean;
  processed: number;
  errors?: string[];
  duration: number;
}

export interface StorageResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AppInfo {
  version: string;
  platform: string;
  isDesktop: boolean;
}

/**
 * Platform adapter interface that provides a unified API for desktop and web platforms.
 * This abstracts away platform-specific implementations and IPC calls.
 */
export interface PlatformAdapter {
  /**
   * Check if running in desktop environment
   */
  isDesktop(): boolean;

  /**
   * Get application version and platform information
   */
  getAppInfo(): Promise<AppInfo>;

  /**
   * Get the current platform version
   */
  getVersion(): Promise<string>;

  /**
   * Storage operations
   */
  storage: {
    /**
     * Save data to persistent storage
     */
    set(key: string, value: any): Promise<StorageResult<void>>;

    /**
     * Load data from persistent storage
     */
    get<T = any>(key: string): Promise<StorageResult<T>>;

    /**
     * Remove data from persistent storage
     */
    remove(key: string): Promise<StorageResult<void>>;

    /**
     * Clear all storage data
     */
    clear(): Promise<StorageResult<void>>;
  };

  /**
   * Authentication token operations
   */
  auth: {
    /**
     * Save refresh token securely
     */
    saveRefreshToken(token: string): Promise<StorageResult<void>>;

    /**
     * Load refresh token
     */
    getRefreshToken(): Promise<StorageResult<string>>;

    /**
     * Remove stored tokens
     */
    clearTokens(): Promise<StorageResult<void>>;
  };

  /**
   * Queue and sync operations
   */
  sync: {
    /**
     * Get queue metrics (pending count, etc.)
     */
    getQueueMetrics(): Promise<StorageResult<QueueMetrics>>;

    /**
     * Flush the event queue
     */
    flushEventQueue(): Promise<StorageResult<FlushResult>>;

    /**
     * Sync a batch of actions
     */
    syncBatch(batch: any): Promise<StorageResult<any>>;

    /**
     * Get pending queue count
     */
    getPendingCount(): Promise<StorageResult<number>>;
  };

  /**
   * Performance and monitoring
   */
  performance: {
    /**
     * Get performance metrics
     */
    getMetrics(hoursBack?: number): Promise<StorageResult<any[]>>;

    /**
     * Record a performance metric
     */
    recordMetric(operation: string, duration: number, success: boolean, error?: string): Promise<StorageResult<void>>;
  };

  /**
   * Cleanup resources
   */
  cleanup(): void;
}