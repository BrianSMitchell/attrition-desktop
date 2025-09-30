// Platform interfaces and types
export type { 
  PlatformAdapter, 
  QueueMetrics, 
  FlushResult, 
  StorageResult, 
  AppInfo 
} from './PlatformAdapter';

// Platform implementations
export { DesktopAdapter } from './DesktopAdapter';
export { WebAdapter } from './WebAdapter';

// Main platform bridge
export { DesktopBridge, desktopBridge } from './DesktopBridge';
import { desktopBridge } from './DesktopBridge';
import type { PlatformAdapter } from './PlatformAdapter';

// Convenience function to get the platform adapter
export function getPlatformAdapter(): PlatformAdapter {
  return desktopBridge.getAdapter();
}

// Convenience function to check if running in desktop mode
export function isDesktopEnvironment(): boolean {
  return desktopBridge.isElectronDesktop();
}

/**
 * Initialize platform services
 * This should be called early in the application startup
 */
export async function initializePlatform(): Promise<void> {
  await desktopBridge.initialize();
}

/**
 * Cleanup platform services
 * This should be called during application shutdown
 */
export function cleanupPlatform(): void {
  desktopBridge.cleanup();
}
