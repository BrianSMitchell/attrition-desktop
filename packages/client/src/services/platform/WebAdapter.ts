import { ERROR_MESSAGES } from '../../server/src/constants/response-formats';
import { ENV_VARS } from '@shared/constants/env-vars';

  PlatformAdapter, 
  QueueMetrics, 
  FlushResult, 
  StorageResult, 
  AppInfo 
} from './PlatformAdapter';

/**
 * Web platform adapter that provides fallback implementations for web browsers.
 * Uses localStorage and simulated operations where desktop IPC isn't available.
 */
export class WebAdapter implements PlatformAdapter {
  private mockQueueCount = 0;

  constructor() {
    // Initialize with some mock data for demonstration
    this.loadMockData();
  }

  isDesktop(): boolean {
    return false; // Always false for WebAdapter
  }

  async getAppInfo(): Promise<AppInfo> {
    return {
      version: process.env[ENV_VARS.REACT_APP_VERSION] || 'dev',
      platform: 'web',
      isDesktop: false,
    };
  }

  async getVersion(): Promise<string> {
    return process.env[ENV_VARS.REACT_APP_VERSION] || 'dev';
  }

  storage = {
    async set(key: string, value: any): Promise<StorageResult<void>> {
      try {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Storage error',
        };
      }
    },

    async get<T = any>(key: string): Promise<StorageResult<T>> {
      try {
        const item = localStorage.getItem(key);
        
        if (item === null) {
          return { 
            success: false, 
            error: 'Item not found' 
          };
        }

        const data = JSON.parse(item);
        return { 
          success: true, 
          data 
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Storage error',
        };
      }
    },

    async remove(key: string): Promise<StorageResult<void>> {
      try {
        localStorage.removeItem(key);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Storage error',
        };
      }
    },

    async clear(): Promise<StorageResult<void>> {
      try {
        localStorage.clear();
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Storage error',
        };
      }
    },
  };

  auth = {
    async saveRefreshToken(token: string): Promise<StorageResult<void>> {
      try {
        // In web, we store refresh tokens in localStorage
        // In production, consider more secure alternatives like httpOnly cookies
        localStorage.setItem('attrition-refresh-token', token);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Auth storage error',
        };
      }
    },

    async getRefreshToken(): Promise<StorageResult<string>> {
      try {
        const token = localStorage.getItem('attrition-refresh-token');
        
        if (!token) {
          return { 
            success: false, 
            error: 'No refresh token found' 
          };
        }

        return { 
          success: true, 
          data: token 
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Auth storage error',
        };
      }
    },

    async clearTokens(): Promise<StorageResult<void>> {
      try {
        localStorage.removeItem('attrition-refresh-token');
        localStorage.removeItem('auth-storage'); // Clear Zustand auth storage too
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Auth storage error',
        };
      }
    },
  };

  sync = {
    async getQueueMetrics(): Promise<StorageResult<QueueMetrics>> {
      try {
        // Simulate queue metrics for web
        const adapter = this as any; // Access private property
        const metrics: QueueMetrics = {
          pendingCount: adapter.mockQueueCount,
          processedCount: 0,
          failedCount: 0,
          lastFlushTime: Date.now() - 30000, // 30 seconds ago
          lastFlushDuration: 150, // 150ms
        };

        return { 
          success: true, 
          data: metrics 
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : ERROR_MESSAGES.SYNC_ERROR,
        };
      }
    },

    async flushEventQueue(): Promise<StorageResult<FlushResult>> {
      try {
        // Simulate queue flush for web
        const startTime = Date.now();
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const adapter = this as any; // Access private property
        const processed = adapter.mockQueueCount;
        adapter.mockQueueCount = 0; // Clear the mock queue
        
        const duration = Date.now() - startTime;
        
        const result: FlushResult = {
          success: true,
          processed,
          duration,
          errors: [],
        };

        return { 
          success: true, 
          data: result 
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : ERROR_MESSAGES.SYNC_ERROR,
        };
      }
    },

    async syncBatch(batch: any): Promise<StorageResult<any>> {
      try {
        // Simulate batch sync for web
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Create mock results for each action in the batch
        const results = batch.actions?.map((action: any) => ({
          actionId: action.id,
          success: true,
          timestamp: Date.now(),
        })) || [];

        return { 
          success: true, 
          data: results 
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : ERROR_MESSAGES.SYNC_ERROR,
        };
      }
    },

    async getPendingCount(): Promise<StorageResult<number>> {
      try {
        const adapter = this as any; // Access private property
        return { 
          success: true, 
          data: adapter.mockQueueCount 
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : ERROR_MESSAGES.SYNC_ERROR,
        };
      }
    },
  };

  performance = {
    async getMetrics(): Promise<StorageResult<any[]>> {
      try {
        // Generate some mock performance metrics
        const now = Date.now();
        const metrics = [];
        
        // Generate a few mock metrics within the time window
        for (let i = 0; i < 3; i++) {
          metrics.push({
            operation: i === 0 ? 'flush_cycle_complete' : 'sync_operation',
            timestamp: now - (i * 20 * 60 * 1000), // Every 20 minutes
            durationMs: 50 + Math.random() * 100,
            success: Math.random() > 0.2, // 80% success rate
            error: Math.random() > 0.8 ? 'Network timeout' : undefined,
          });
        }

        return { 
          success: true, 
          data: metrics 
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Performance error',
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
        // In web, we could store performance metrics in localStorage
        // or send them to a analytics service
        const metric = {
          operation,
          duration,
          success,
          error,
          timestamp: Date.now(),
        };
        
        console.log('?? WebAdapter Performance Metric:', metric);
        
        // Simple localStorage persistence without class method dependency
        const stored = localStorage.getItem('attrition-performance-metrics');
        const existingMetrics = stored ? JSON.parse(stored) : [];
        existingMetrics.push(metric);
        
        // Keep only last 100 metrics to avoid storage bloat
        const recentMetrics = existingMetrics.slice(-100);
        localStorage.setItem('attrition-performance-metrics', JSON.stringify(recentMetrics));

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Performance error',
        };
      }
    },
  };

  cleanup(): void {
    console.log('?? WebAdapter: Cleaning up...');
    // Web adapter doesn't need extensive cleanup
  }

  /**
   * Add a mock action to the queue (for testing/demo purposes)
   */
  addMockQueueItem(): void {
    this.mockQueueCount++;
  }

  /**
   * Set mock queue count (for testing/demo purposes)
   */
  setMockQueueCount(count: number): void {
    this.mockQueueCount = count;
  }

  private loadMockData(): void {
    // Initialize with some mock queue items for demonstration
    this.mockQueueCount = 0;
  }

}

