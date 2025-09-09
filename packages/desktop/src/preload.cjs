'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload (CommonJS) for Electron renderer with contextIsolation + sandbox.
 * Exposes a minimal, safe API under window.desktop.
 */
contextBridge.exposeInMainWorld('desktop', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),

  // Secure token bridge (refresh token only — no raw getter)
  tokens: {
    saveRefresh: (value) => ipcRenderer.invoke('tokens:saveRefresh', value),
    deleteRefresh: () => ipcRenderer.invoke('tokens:deleteRefresh'),
    hasRefresh: () => ipcRenderer.invoke('tokens:hasRefresh'),
  },

  // Auth helpers (do not expose raw refresh token)
  auth: {
    // Pass structured objects to match main process handlers
    login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
    register: (email, username, password) => ipcRenderer.invoke('auth:register', { email, username, password }),
    refresh: () => ipcRenderer.invoke('auth:refresh'),
  },

  // Offline database operations for offline/online hybrid
  db: {
    // KV Store operations
    kv: {
      set: (key, value) => ipcRenderer.invoke('db:kv:set', key, value),
      get: (key) => ipcRenderer.invoke('db:kv:get', key),
      delete: (key) => ipcRenderer.invoke('db:kv:delete', key),
    },

    // Catalogs operations
    catalogs: {
      set: (key, catalogData, version, contentHash) => ipcRenderer.invoke('db:catalogs:set', key, catalogData, version, contentHash),
      get: (key) => ipcRenderer.invoke('db:catalogs:get', key),
      getAll: () => ipcRenderer.invoke('db:catalogs:getAll'),
    },

    // Profile snapshot operations
    profile: {
      set: (userId, deviceId, snapshotData, schemaVersion) => ipcRenderer.invoke('db:profile:set', userId, deviceId, snapshotData, schemaVersion),
      get: (userId, deviceId) => ipcRenderer.invoke('db:profile:get', userId, deviceId),
    },

    // Event queue operations (Tier A only) - MINIMIZED
    events: {
      enqueue: (kind, deviceId, payload, dedupeKey) => ipcRenderer.invoke('db:events:enqueue', kind, deviceId, payload, dedupeKey),
      // REMOVED: dequeueForFlush, markSent, markFailed - Internal operations only
      cleanup: (olderThanDays) => ipcRenderer.invoke('db:events:cleanup', olderThanDays),
      getPendingCount: (kind) => ipcRenderer.invoke('db:events:getPendingCount', kind ?? null),
    },

    // Sync state operations
    sync: {
      set: (key, value) => ipcRenderer.invoke('db:sync:set', key, value),
      get: (key) => ipcRenderer.invoke('db:sync:get', key),
    },

    // Bootstrap operations
    bootstrap: {
      fetchAndCache: (accessToken) => ipcRenderer.invoke('db:bootstrap:fetchAndCache', accessToken),
    },

    // Database health check
    health: () => ipcRenderer.invoke('db:health'),
  },

  // Event Queue (Business logic layer - for UI)
  eventQueue: {
    enqueue: (kind, payload, options) => ipcRenderer.invoke('eventQueue:enqueue', kind, payload, options),
  },

  // Error logging operations
  errors: {
    log: (entry) => ipcRenderer.invoke('error:log', entry),
    getRecent: (hours) => ipcRenderer.invoke('error:getRecent', hours),
    clear: () => ipcRenderer.invoke('error:clear'),
    export: (format, hours) => ipcRenderer.invoke('error:export', format, hours),
    getStats: (hours) => ipcRenderer.invoke('error:getStats', hours),
  },

  // Performance monitoring operations
  perf: {
    getMetrics: (hours) => ipcRenderer.invoke('perf:getMetrics', hours),
    getStats: (hours) => ipcRenderer.invoke('perf:getStats', hours),
    export: (format, hours) => ipcRenderer.invoke('perf:export', format, hours),
    clear: () => ipcRenderer.invoke('perf:clear'),
    getThresholds: () => ipcRenderer.invoke('perf:getThresholds'),
    setThresholds: (thresholds) => ipcRenderer.invoke('perf:setThresholds', thresholds),
    getThresholdBreaches: (hours) => ipcRenderer.invoke('perf:getThresholdBreaches', hours),
  },

  // Auto-updater operations
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('update:check'),
    downloadUpdate: () => ipcRenderer.invoke('update:download'),
    installUpdate: () => ipcRenderer.invoke('update:install'),
    getStatus: () => ipcRenderer.invoke('update:status'),
    
    // Event listeners for update events
    onUpdateEvent: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('update-event', handler);
      return () => ipcRenderer.removeListener('update-event', handler);
    },
  },
});
