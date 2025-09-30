import { 
  PlatformAdapter, 
  QueueMetrics, 
  FlushResult, 
  StorageResult, 
  AppInfo 
} from './PlatformAdapter';

/**
 * Desktop platform adapter that uses Electron IPC for desktop-specific operations.
 * All desktop IPC calls are centralized here to avoid scattered IPC usage throughout the app.
 */
export class DesktopAdapter implements PlatformAdapter {

  constructor() {
    // Verify desktop environment
    if (!this.isDesktop()) {
      throw new Error('DesktopAdapter can only be used in desktop environment');
    }
  }

  isDesktop(): boolean {
    return typeof window !== 'undefined' && !!(window as any).desktop;
  }

  async getAppInfo(): Promise<AppInfo> {
    try {
      const version = await this.getVersion();
      return {
        version,
        platform: 'desktop',
        isDesktop: true,
      };
    } catch (error) {
      // Fallback if version fetch fails
      return {
        version: 'unknown',
        platform: 'desktop',
        isDesktop: true,
      };
    }
  }

  async getVersion(): Promise<string> {
    try {
      const result = await (window as any).desktop?.getVersion?.();
      return result || 'unknown';
    } catch (error) {
      console.error('DesktopAdapter: Error getting version:', error);
      return 'unknown';
    }
  }

  storage = {
    async set(key: string, value: any): Promise<StorageResult<void>> {
      try {
        const result = await (window as any).desktop?.storage?.set?.(key, value);
        
        if (result && result.success) {
          return { success: true };
        } else {
          return { 
            success: false, 
            error: result?.error || 'Storage set operation failed' 
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown storage error',
        };
      }
    },

    async get<T = any>(key: string): Promise<StorageResult<T>> {
      try {
        const result = await (window as any).desktop?.storage?.get?.(key);
        
        if (result && result.success) {
          return { 
            success: true, 
            data: result.data 
          };
        } else {
          return { 
            success: false, 
            error: result?.error || 'Storage get operation failed' 
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown storage error',
        };
      }
    },

    async remove(key: string): Promise<StorageResult<void>> {
      try {
        const result = await (window as any).desktop?.storage?.remove?.(key);
        
        if (result && result.success) {
          return { success: true };
        } else {
          return { 
            success: false, 
            error: result?.error || 'Storage remove operation failed' 
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown storage error',
        };
      }
    },

    async clear(): Promise<StorageResult<void>> {
      try {
        const result = await (window as any).desktop?.storage?.clear?.();
        
        if (result && result.success) {
          return { success: true };
        } else {
          return { 
            success: false, 
            error: result?.error || 'Storage clear operation failed' 
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown storage error',
        };
      }
    },
  };

  auth = {
    async saveRefreshToken(token: string): Promise<StorageResult<void>> {
      try {
        // Use secure storage for refresh tokens
        const result = await (window as any).desktop?.auth?.saveRefreshToken?.(token);
        
        if (result && result.success) {
          return { success: true };
        } else {
          return { 
            success: false, 
            error: result?.error || 'Failed to save refresh token' 
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown auth error',
        };
      }
    },

    async getRefreshToken(): Promise<StorageResult<string>> {
      try {
        const result = await (window as any).desktop?.auth?.getRefreshToken?.();
        
        if (result && result.success && result.token) {
          return { 
            success: true, 
            data: result.token 
          };
        } else {
          return { 
            success: false, 
            error: result?.error || 'No refresh token found' 
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown auth error',
        };
      }
    },

    async clearTokens(): Promise<StorageResult<void>> {
      try {
        const result = await (window as any).desktop?.auth?.clearTokens?.();
        
        if (result && result.success) {
          return { success: true };
        } else {
          return { 
            success: false, 
            error: result?.error || 'Failed to clear tokens' 
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown auth error',
        };
      }
    },
  };

  sync = {
    async getQueueMetrics(): Promise<StorageResult<QueueMetrics>> {
      try {
        const result = await (window as any).desktop?.db?.events?.getQueueMetrics?.();
        
        if (result && result.success && result.metrics) {
          return { 
            success: true, 
            data: result.metrics 
          };
        } else {
          return { 
            success: false, 
            error: result?.error || 'Failed to get queue metrics' 
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown sync error',
        };
      }
    },

    async flushEventQueue(): Promise<StorageResult<FlushResult>> {
      try {
        const startTime = Date.now();
        const result = await (window as any).desktop?.db?.events?.flushQueue?.();
        const duration = Date.now() - startTime;
        
        if (result && result.success) {
          const flushResult: FlushResult = {
            success: true,
            processed: result.processed || 0,
            duration,
            errors: result.errors || [],
          };
          
          return { 
            success: true, 
            data: flushResult 
          };
        } else {
          return { 
            success: false, 
            error: result?.error || 'Queue flush failed' 
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown sync error',
        };
      }
    },

    async syncBatch(batch: any): Promise<StorageResult<any>> {
      try {
        const result = await (window as any).desktop?.db?.events?.syncBatch?.(batch);
        
        if (result && result.success) {
          return { 
            success: true, 
            data: result.results || [] 
          };
        } else {
          return { 
            success: false, 
            error: result?.error || 'Batch sync failed' 
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown sync error',
        };
      }
    },

    async getPendingCount(): Promise<StorageResult<number>> {
      try {
        const result = await (window as any).desktop?.db?.events?.getPendingCount?.(null);
        
        if (result && result.success && typeof result.count === 'number') {
          return { 
            success: true, 
            data: result.count 
          };
        } else {
          return { 
            success: false, 
            error: result?.error || 'Failed to get pending count' 
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown sync error',
        };
      }
    },
  };

  performance = {
    async getMetrics(hoursBack: number = 1): Promise<StorageResult<any[]>> {
      try {
        const result = await (window as any).desktop?.perf?.getMetrics?.(hoursBack);
        
        if (result && result.success && Array.isArray(result.data)) {
          return { 
            success: true, 
            data: result.data 
          };
        } else {
          return { 
            success: false, 
            error: result?.error || 'Failed to get performance metrics' 
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown performance error',
        };
      }
    },

    async recordMetric(
      operation: string, 
      duration: number, 
      success: boolean, 
      error?: string
    ): Promise<StorageResult<void>> {
      try {
        const result = await (window as any).desktop?.perf?.recordMetric?.({
          operation,
          duration,
          success,
          error,
          timestamp: Date.now(),
        });
        
        if (result && result.success) {
          return { success: true };
        } else {
          return { 
            success: false, 
            error: result?.error || 'Failed to record performance metric' 
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown performance error',
        };
      }
    },
  };

  cleanup(): void {
    console.log('🧹 DesktopAdapter: Cleaning up...');
    // Desktop adapter doesn't need extensive cleanup since IPC calls are stateless
  }
}