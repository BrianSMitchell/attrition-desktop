import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktop', {
  // Returns the application version from the main process
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Open an external URL in the user's default browser
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),

  // Update service API
  updater: {
    // Check for updates
    checkForUpdates: () => ipcRenderer.invoke('update:check'),
    
    // Download available update
    downloadUpdate: () => ipcRenderer.invoke('update:download'),
    
    // Install downloaded update and restart
    installUpdate: () => ipcRenderer.invoke('update:install'),
    
    // Get current update status
    getStatus: () => ipcRenderer.invoke('update:status'),
    
    // Listen for update events
    onUpdateEvent: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('update-event', handler);
      
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener('update-event', handler);
      };
    }
  }
});
