import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script for Electron renderer with contextIsolation + sandbox.
 * Exposes a minimal, safe API under window.desktop.
 */
contextBridge.exposeInMainWorld('desktop', {
  // App information
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  isPackaged: () => ipcRenderer.invoke('app:isPackaged'),

  // Secure token bridge
  tokens: {
    // Access token (can be retrieved for restoration)
    saveToken: (value: string) => ipcRenderer.invoke('tokens:saveToken', value),
    getToken: () => ipcRenderer.invoke('tokens:getToken'),
    deleteToken: () => ipcRenderer.invoke('tokens:deleteToken'),
    
    // Refresh token (no getter to avoid leaking to renderer)
    saveRefresh: (value: string) => ipcRenderer.invoke('tokens:saveRefresh', value),
    deleteRefresh: () => ipcRenderer.invoke('tokens:deleteRefresh'),
    hasRefresh: () => ipcRenderer.invoke('tokens:hasRefresh'),
  },

  // Auth helpers (do not expose raw refresh token)
  auth: {
    login: (email: string, password: string) => 
      ipcRenderer.invoke('auth:login', { email, password }),
    register: (email: string, username: string, password: string) => 
      ipcRenderer.invoke('auth:register', { email, username, password }),
    refresh: () => ipcRenderer.invoke('auth:refresh'),
  },

  // Offline database operations for offline/online hybrid
  db: {
    // KV Store operations
    kv: {
      set: (key: string, value: any) => ipcRenderer.invoke('db:kv:set', key, value),
      get: (key: string) => ipcRenderer.invoke('db:kv:get', key),
      delete: (key: string) => ipcRenderer.invoke('db:kv:delete', key),
    },

    // Catalogs operations
    catalogs: {
      set: (key: string, catalogData: any, version: number, contentHash: string) => 
        ipcRenderer.invoke('db:catalogs:set', key, catalogData, version, contentHash),
      get: (key: string) => ipcRenderer.invoke('db:catalogs:get', key),
      getAll: () => ipcRenderer.invoke('db:catalogs:getAll'),
    },

    // Profile snapshot operations
    profile: {
      set: (userId: string, deviceId: string, snapshotData: any, schemaVersion: number) => 
        ipcRenderer.invoke('db:profile:set', userId, deviceId, snapshotData, schemaVersion),
      get: (userId: string, deviceId: string) => 
        ipcRenderer.invoke('db:profile:get', userId, deviceId),
    },

    // Event queue operations (Tier A only) - MINIMIZED
    events: {
      enqueue: (kind: string, deviceId: string, payload: any, dedupeKey?: string) => 
        ipcRenderer.invoke('db:events:enqueue', kind, deviceId, payload, dedupeKey),
      cleanup: (olderThanDays: number) => 
        ipcRenderer.invoke('db:events:cleanup', olderThanDays),
      getPendingCount: (kind?: string) => 
        ipcRenderer.invoke('db:events:getPendingCount', kind ?? null),
      flushQueue: (limit?: number) => 
        ipcRenderer.invoke('db:events:flushQueue', limit ?? 50),
      getQueueMetrics: () => ipcRenderer.invoke('db:events:getQueueMetrics'),
    },

    // Sync state operations
    sync: {
      set: (key: string, value: any) => ipcRenderer.invoke('db:sync:set', key, value),
      get: (key: string) => ipcRenderer.invoke('db:sync:get', key),
    },

    // Bootstrap operations
    bootstrap: {
      fetchAndCache: (accessToken: string) => 
        ipcRenderer.invoke('db:bootstrap:fetchAndCache', accessToken),
    },

    // Database health check
    health: () => ipcRenderer.invoke('db:health'),
  },

  // Event Queue (Business logic layer - for UI)
  eventQueue: {
    enqueue: (kind: string, payload: any, options?: any) => 
      ipcRenderer.invoke('eventQueue:enqueue', kind, payload, options),
  },

  // Error logging operations
  errors: {
    log: (entry: any) => ipcRenderer.invoke('error:log', entry),
    getRecent: (hours: number) => ipcRenderer.invoke('error:getRecent', hours),
    clear: () => ipcRenderer.invoke('error:clear'),
    export: (format: string, hours: number) => 
      ipcRenderer.invoke('error:export', format, hours),
    getStats: (hours: number) => ipcRenderer.invoke('error:getStats', hours),
  },

  // Performance monitoring operations
  perf: {
    getMetrics: (hours: number) => ipcRenderer.invoke('perf:getMetrics', hours),
    getStats: (hours: number) => ipcRenderer.invoke('perf:getStats', hours),
    export: (format: string, hours: number) => 
      ipcRenderer.invoke('perf:export', format, hours),
    clear: () => ipcRenderer.invoke('perf:clear'),
    getThresholds: () => ipcRenderer.invoke('perf:getThresholds'),
    setThresholds: (thresholds: any) => 
      ipcRenderer.invoke('perf:setThresholds', thresholds),
    getThresholdBreaches: (hours: number) => 
      ipcRenderer.invoke('perf:getThresholdBreaches', hours),
  },

  // Auto-updater operations
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('update:check'),
    downloadUpdate: () => ipcRenderer.invoke('update:download'),
    installUpdate: () => ipcRenderer.invoke('update:install'),
    getStatus: () => ipcRenderer.invoke('update:status'),
    
    // Event listeners for update events
    onUpdateEvent: (callback: (data: any) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('update-event', handler);
      return () => ipcRenderer.removeListener('update-event', handler);
    },
  },
});
