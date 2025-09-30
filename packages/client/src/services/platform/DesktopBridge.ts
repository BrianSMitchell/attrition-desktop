import { PlatformAdapter } from './PlatformAdapter';
import { DesktopAdapter } from './DesktopAdapter';
import { WebAdapter } from './WebAdapter';

/**
 * DesktopBridge provides the main platform interface for the Attrition desktop game.
 * It automatically detects the environment and uses the appropriate adapter.
 * 
 * Since this is primarily a desktop Electron game, the DesktopAdapter is the main implementation,
 * with WebAdapter only used as a fallback during development.
 */
export class DesktopBridge {
  private adapter: PlatformAdapter;
  private static instance: DesktopBridge | null = null;

  private constructor() {
    // Detect environment and create appropriate adapter
    if (this.isElectronDesktop()) {
      console.log('🖥️ DesktopBridge: Initializing with DesktopAdapter (Electron)');
      this.adapter = new DesktopAdapter();
    } else {
      console.warn('⚠️ DesktopBridge: Running in web mode - using WebAdapter for development only');
      this.adapter = new WebAdapter();
    }
  }

  /**
   * Get singleton instance of DesktopBridge
   */
  static getInstance(): DesktopBridge {
    if (!DesktopBridge.instance) {
      DesktopBridge.instance = new DesktopBridge();
    }
    return DesktopBridge.instance;
  }

  /**
   * Get the platform adapter
   */
  getAdapter(): PlatformAdapter {
    return this.adapter;
  }

  /**
   * Check if running in Electron desktop environment
   */
  isElectronDesktop(): boolean {
    // In sandboxed renderers, process.type may not be accessible.
    // Presence of window.desktop (from preload) is the most reliable signal.
    return (
      typeof window !== 'undefined' &&
      !!(window as any).desktop
    );
  }

  /**
   * Check if the desktop IPC interface is available
   */
  hasDesktopIPC(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!(window as any).desktop &&
      !!(window as any).desktop.db &&
      !!(window as any).desktop.auth
    );
  }

  /**
   * Get desktop API status for debugging
   */
  getDesktopAPIStatus(): Record<string, boolean> {
    if (typeof window === 'undefined' || !(window as any).desktop) {
      return {};
    }

    const desktop = (window as any).desktop;
    
    return {
      hasDesktop: !!desktop,
      hasDB: !!desktop.db,
      hasEvents: !!desktop.db?.events,
      hasAuth: !!desktop.auth,
      hasStorage: !!desktop.storage,
      hasPerf: !!desktop.perf,
      hasApp: !!desktop.app,
      
      // Specific IPC methods
      hasPendingCount: !!desktop.db?.events?.getPendingCount,
      hasFlushQueue: !!desktop.db?.events?.flushQueue,
      hasSyncBatch: !!desktop.db?.events?.syncBatch,
      hasGetMetrics: !!desktop.perf?.getMetrics,
      hasRecordMetric: !!desktop.perf?.recordMetric,
      hasSaveRefreshToken: !!desktop.auth?.saveRefreshToken,
      hasGetRefreshToken: !!desktop.auth?.getRefreshToken,
      hasStorageGet: !!desktop.storage?.get,
      hasStorageSet: !!desktop.storage?.set,
    };
  }

  /**
   * Verify desktop IPC is properly initialized
   */
  async verifyDesktopIPC(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!this.isElectronDesktop()) {
      errors.push('Not running in Electron desktop environment');
      return { success: false, errors };
    }

    if (!this.hasDesktopIPC()) {
      errors.push('Desktop IPC interface not available');
      return { success: false, errors };
    }

    // Test basic IPC calls
    try {
      const versionResult = await this.adapter.getVersion();
      if (!versionResult || versionResult === 'unknown') {
        errors.push('Desktop version IPC call failed');
      }
    } catch (error) {
      errors.push(`Desktop version IPC error: ${error}`);
    }

    try {
      const pendingResult = await this.adapter.sync.getPendingCount();
      if (!pendingResult.success) {
        errors.push('Desktop pending count IPC call failed');
      }
    } catch (error) {
      errors.push(`Desktop pending count IPC error: ${error}`);
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Initialize the desktop bridge and verify IPC
   */
  async initialize(): Promise<void> {
    console.log('🚀 DesktopBridge: Initializing...');
    
    const status = this.getDesktopAPIStatus();
    console.log('🔍 DesktopBridge: API Status:', status);

    if (this.isElectronDesktop()) {
      const verification = await this.verifyDesktopIPC();
      
      if (!verification.success) {
        console.error('❌ DesktopBridge: IPC verification failed:', verification.errors);
        throw new Error(`Desktop IPC verification failed: ${verification.errors.join(', ')}`);
      }
      
      console.log('✅ DesktopBridge: Desktop IPC verified successfully');
    } else {
      console.warn('⚠️ DesktopBridge: Running in development web mode');
    }
  }

  /**
   * Cleanup the bridge
   */
  cleanup(): void {
    console.log('🧹 DesktopBridge: Cleaning up...');
    
    this.adapter.cleanup();
    
    // Clear singleton instance
    DesktopBridge.instance = null;
  }

  /**
   * Quick access methods for common operations
   */

  /**
   * Get current sync queue status
   */
  async getSyncStatus() {
    const queueResult = await this.adapter.sync.getPendingCount();
    const metricsResult = await this.adapter.sync.getQueueMetrics();
    
    return {
      pendingCount: queueResult.success ? queueResult.data : 0,
      metrics: metricsResult.success ? metricsResult.data : null,
      isDesktop: this.adapter.isDesktop(),
    };
  }

  /**
   * Perform sync operation
   */
  async performSync() {
    console.log('🔄 DesktopBridge: Performing sync...');
    
    const result = await this.adapter.sync.flushEventQueue();
    
    if (result.success) {
      console.log('✅ DesktopBridge: Sync completed:', result.data);
      return result.data;
    } else {
      console.error('❌ DesktopBridge: Sync failed:', result.error);
      throw new Error(result.error);
    }
  }

  /**
   * Save authentication token
   */
  async saveAuthToken(token: string) {
    const result = await this.adapter.auth.saveRefreshToken(token);
    
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  /**
   * Get authentication token
   */
  async getAuthToken(): Promise<string | null> {
    const result = await this.adapter.auth.getRefreshToken();
    return result.success ? result.data! : null;
  }

  /**
   * Record performance metric
   */
  async recordPerformanceMetric(operation: string, duration: number, success: boolean, error?: string) {
    await this.adapter.performance.recordMetric(operation, duration, success, error);
  }
}

// Export singleton instance for easy access
export const desktopBridge = DesktopBridge.getInstance();