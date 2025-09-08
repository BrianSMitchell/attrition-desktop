// Extended Electron types for desktop application
import { ErrorCategory, ErrorSeverity, ErrorLogEntry } from '../services/errorLoggingService';

// IPC Renderer Events
export interface IpcRendererEvents {
  // App events
  'app:getVersion': () => Promise<string>;
  'app:openExternal': (url: string) => Promise<boolean>;
  
  // Network events
  'network:getStatus': () => Promise<{
    isOnline: boolean;
    isApiReachable: boolean;
    lastChecked: number;
    latencyMs: number;
  }>;
  'network:isFullyConnected': () => Promise<boolean>;
  
  // Token events
  'tokens:saveRefresh': (value: string) => Promise<{ ok: boolean }>;
  'tokens:deleteRefresh': () => Promise<{ ok: boolean }>;
  'tokens:hasRefresh': () => Promise<{ ok: boolean; has: boolean }>;
  'auth:refresh': () => Promise<{ 
    ok: boolean; 
    token?: string; 
    error?: string; 
    status?: number; 
    details?: any 
  }>;
  'auth:login': (email: string, password: string) => Promise<{
    success: boolean;
    data?: { token?: string; user?: any; empire?: any };
    message?: string;
    error?: string;
  }>;
  'auth:register': (email: string, username: string, password: string) => Promise<{
    success: boolean;
    data?: { token?: string; user?: any; empire?: any };
    message?: string;
    error?: string;
  }>;
  
  // Database events
  'db:kv:set': (key: string, value: any) => Promise<{ success: boolean; error?: string }>;
  'db:kv:get': (key: string) => Promise<{ success: boolean; value?: any; error?: string }>;
  'db:kv:delete': (key: string) => Promise<{ success: boolean; error?: string }>;
  
  'db:catalogs:set': (key: string, catalogData: any, version?: string, contentHash?: string) => Promise<{ success: boolean; error?: string }>;
  'db:catalogs:get': (key: string) => Promise<{ success: boolean; catalog?: any; error?: string }>;
  'db:catalogs:getAll': () => Promise<{ success: boolean; catalogs?: Record<string, any>; error?: string }>;
  
  'db:profile:set': (userId: string, deviceId: string, snapshotData: any, schemaVersion?: number) => Promise<{ success: boolean; error?: string }>;
  'db:profile:get': (userId: string, deviceId: string) => Promise<{ success: boolean; profile?: any; error?: string }>;
  
  // Event queue events
  'db:events:enqueue': (kind: string, deviceId: string, payload: any, dedupeKey?: string) => Promise<{ success: boolean; id?: number; error?: string }>;
  'db:events:dequeueForFlush': (limit?: number) => Promise<{ success: boolean; events?: any[]; error?: string }>;
  'db:events:markSent': (eventId: number) => Promise<{ success: boolean; error?: string }>;
  'db:events:markFailed': (eventId: number, errorMessage: string) => Promise<{ success: boolean; error?: string }>;
  'db:events:cleanup': (olderThanDays?: number) => Promise<{ success: boolean; deletedRows?: number; error?: string }>;
  'db:events:getPendingCount': (kind?: string | null) => Promise<{ success: boolean; count: number; error?: string }>;
  
  // Sync state events
  'db:sync:set': (key: string, value: any) => Promise<{ success: boolean; error?: string }>;
  'db:sync:get': (key: string) => Promise<{ success: boolean; value?: any; error?: string }>;
  
  // Bootstrap events
  'db:bootstrap:fetchAndCache': (accessToken?: string) => Promise<{ 
    success: boolean; 
    data?: any; 
    error?: string; 
    status?: number; 
    details?: any 
  }>;
  
  // Database health events
  'db:health': () => Promise<{ success: boolean; health?: any; error?: string }>;
  
  // Error logging events
  'error:log': (entry: Omit<ErrorLogEntry, 'id' | 'timestamp' | 'userAgent' | 'url' | 'process'>) => Promise<{ success: boolean; id?: string; error?: string }>;
  'error:getRecent': (hours?: number) => Promise<{ success: boolean; errors?: ErrorLogEntry[]; error?: string }>;
  'error:clear': () => Promise<{ success: boolean; error?: string }>;
  'error:export': (format?: 'json' | 'csv', hours?: number) => Promise<{ success: boolean; data?: string; error?: string }>;
  'error:getStats': (hours?: number) => Promise<{ success: boolean; stats?: any; error?: string }>;
}

// Extend Window interface
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke<K extends keyof IpcRendererEvents>(
          channel: K,
          ...args: Parameters<IpcRendererEvents[K]>
        ): Promise<ReturnType<IpcRendererEvents[K]>>;
        on<K extends keyof IpcRendererEvents>(
          channel: K,
          listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void
        ): void;
        once<K extends keyof IpcRendererEvents>(
          channel: K,
          listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void
        ): void;
        removeAllListeners<K extends keyof IpcRendererEvents>(channel: K): void;
      };
      errorLogger: {
        logError: (entry: Omit<ErrorLogEntry, 'id' | 'timestamp' | 'userAgent' | 'url' | 'process'>) => Promise<string | undefined>;
        getRecentErrors: (hours?: number) => Promise<ErrorLogEntry[]>;
        clearStoredLogs: () => Promise<void>;
        exportErrors: (format?: 'json' | 'csv', hours?: number) => Promise<string>;
        getErrorStats: (hours?: number) => Promise<any>;
        getSystemInfo: () => Promise<any>;
      };
    };
  }
}

// Export Electron types
/**
 * Desktop Performance Monitoring IPC response shapes
 */
export type PerfThreshold = {
  op?: string;
  p95Ms?: number;
  failRatePct?: number;
};

export type PerfBreachRecord = {
  op?: string;
  metric: 'p95Ms' | 'failRatePct';
  value: number;
  threshold: number;
  windowHours: number;
  ts: number;
};

export type PerfStats = any; // Renderer can refine later to exact shape

declare global {
  interface Window {
    /**
     * Exposed by Electron preload (contextBridge.exposeInMainWorld('desktop', ...))
     * See packages/desktop/src/preload.cjs and main IPC handlers for exact payloads.
     */
    desktop?: {
      perf: {
        getMetrics: (hours?: number) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        getStats: (hours?: number) => Promise<{ success: boolean; stats?: PerfStats; error?: string }>;
        export: (format?: 'json' | 'csv', hours?: number) => Promise<{ success: boolean; data?: string; format?: 'json' | 'csv'; error?: string }>;
        clear: () => Promise<{ success: boolean; deleted?: number; error?: string }>;
        getThresholds: () => Promise<{ success: boolean; thresholds?: PerfThreshold[]; error?: string }>;
        setThresholds: (thresholds: PerfThreshold[]) => Promise<{ success: boolean; error?: string }>;
        getThresholdBreaches: (hours?: number) => Promise<{ success: boolean; breaches?: PerfBreachRecord[]; error?: string }>;
      };
      // Other namespaces are exposed but typed loosely here to avoid coupling
      tokens?: {
        saveRefresh?: (value: string) => Promise<{ ok: boolean }>;
        deleteRefresh?: () => Promise<{ ok: boolean }>;
        hasRefresh?: () => Promise<{ ok: boolean; has: boolean }>;
      };
      auth?: {
        login?: (email: string, password: string) => Promise<{
          success: boolean;
          data?: { token?: string; user?: any; empire?: any };
          message?: string;
          error?: string;
        }>;
        register?: (email: string, username: string, password: string) => Promise<{
          success: boolean;
          data?: { token?: string; user?: any; empire?: any };
          message?: string;
          error?: string;
        }>;
        refresh?: () => Promise<{ ok: boolean; token?: string; error?: string; status?: number; details?: any }>;
      };
      db?: Record<string, any>;
      errors?: Record<string, any>;
      eventQueue?: {
        enqueue: (kind: string, payload: any, options?: any) => Promise<{
          success: boolean;
          eventId?: string;
          error?: string;
        }>;
      };
    };

  }
}

export type { 
  ErrorCategory, 
  ErrorSeverity, 
  ErrorLogEntry 
};
