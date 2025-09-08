import * as React from "react";

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface UpdateState {
  // Update availability
  updateAvailable: boolean;
  updateDownloaded: boolean;
  checkingForUpdate: boolean;
  
  // Update info
  updateInfo?: UpdateInfo;
  downloadProgress?: DownloadProgress;
  
  // Error state
  error?: string;
  
  // User preferences
  autoCheckEnabled: boolean;
  lastChecked?: Date;
}

interface UpdateContextType {
  state: UpdateState;
  
  // Actions
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  dismissUpdate: () => void;
  setAutoCheck: (enabled: boolean) => void;
}

const UpdateContext = React.createContext<UpdateContextType | undefined>(undefined);

export const useUpdate = (): UpdateContextType => {
  const ctx = React.useContext(UpdateContext);
  if (!ctx) {
    throw new Error("useUpdate must be used within an UpdateProvider");
  }
  return ctx;
};

// Check if running in desktop environment
const isDesktop = typeof window !== 'undefined' && (window as any).desktop?.updater;

export const UpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = React.useState<UpdateState>({
    updateAvailable: false,
    updateDownloaded: false,
    checkingForUpdate: false,
    autoCheckEnabled: true,
  });

  // Handle update events from main process
  React.useEffect(() => {
    if (!isDesktop) return;

    const desktop = (window as any).desktop;
    let cleanup: (() => void) | null = null;

    try {
      cleanup = desktop.updater.onUpdateEvent((eventData: { type: string; data: any }) => {
        const { type, data } = eventData;

        switch (type) {
          case 'update-checking':
            setState(prev => ({ 
              ...prev, 
              checkingForUpdate: true, 
              error: undefined 
            }));
            break;

          case 'update-available':
            setState(prev => ({
              ...prev,
              checkingForUpdate: false,
              updateAvailable: true,
              updateInfo: {
                version: data.version,
                releaseDate: data.releaseDate,
                releaseNotes: data.releaseNotes,
              },
            }));
            break;

          case 'update-not-available':
            setState(prev => ({
              ...prev,
              checkingForUpdate: false,
              lastChecked: new Date(),
            }));
            break;

          case 'update-download-progress':
            setState(prev => ({
              ...prev,
              downloadProgress: {
                percent: data.percent,
                transferred: data.transferred,
                total: data.total,
                bytesPerSecond: data.bytesPerSecond,
              },
            }));
            break;

          case 'update-downloaded':
            setState(prev => ({
              ...prev,
              updateDownloaded: true,
              downloadProgress: undefined,
            }));
            break;

          case 'update-error':
            setState(prev => ({
              ...prev,
              checkingForUpdate: false,
              error: data.message,
              downloadProgress: undefined,
            }));
            break;

          case 'update-restart-later':
            // User chose to restart later, just clear the download progress
            setState(prev => ({
              ...prev,
              downloadProgress: undefined,
            }));
            break;

          default:
            console.warn('[UpdateContext] Unknown update event:', type, data);
        }
      });
    } catch (error) {
      console.error('[UpdateContext] Failed to setup update event listener:', error);
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  // Load initial update status
  React.useEffect(() => {
    if (!isDesktop) return;

    const loadStatus = async () => {
      try {
        const desktop = (window as any).desktop;
        const response = await desktop.updater.getStatus();
        
        if (response.success) {
          setState(prev => ({
            ...prev,
            updateAvailable: response.status.updateAvailable,
            updateDownloaded: response.status.updateDownloaded,
            checkingForUpdate: response.status.checkingForUpdate,
            downloadProgress: response.status.downloadProgress,
          }));
        }
      } catch (error) {
        console.error('[UpdateContext] Failed to load initial update status:', error);
      }
    };

    loadStatus();
  }, []);

  const checkForUpdates = React.useCallback(async () => {
    if (!isDesktop) {
      console.warn('[UpdateContext] checkForUpdates called in non-desktop environment');
      return;
    }

    try {
      const desktop = (window as any).desktop;
      const response = await desktop.updater.checkForUpdates();
      
      if (!response.success) {
        setState(prev => ({ ...prev, error: response.error }));
      }
    } catch (error) {
      console.error('[UpdateContext] Check for updates failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        checkingForUpdate: false,
      }));
    }
  }, []);

  const downloadUpdate = React.useCallback(async () => {
    if (!isDesktop || !state.updateAvailable) return;

    try {
      const desktop = (window as any).desktop;
      const response = await desktop.updater.downloadUpdate();
      
      if (!response.success) {
        setState(prev => ({ ...prev, error: response.error }));
      }
    } catch (error) {
      console.error('[UpdateContext] Download update failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, [state.updateAvailable]);

  const installUpdate = React.useCallback(async () => {
    if (!isDesktop || !state.updateDownloaded) return;

    try {
      const desktop = (window as any).desktop;
      const response = await desktop.updater.installUpdate();
      
      // If we get here, the app should be restarting
      if (!response.success) {
        setState(prev => ({ ...prev, error: response.error }));
      }
    } catch (error) {
      console.error('[UpdateContext] Install update failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, [state.updateDownloaded]);

  const dismissUpdate = React.useCallback(() => {
    setState(prev => ({
      ...prev,
      updateAvailable: false,
      updateInfo: undefined,
      downloadProgress: undefined,
      error: undefined,
    }));
  }, []);

  const setAutoCheck = React.useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, autoCheckEnabled: enabled }));
    // Could also persist this setting to localStorage
    localStorage.setItem('autoUpdateCheck', enabled.toString());
  }, []);

  // Load auto-check preference from localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem('autoUpdateCheck');
    if (stored !== null) {
      setState(prev => ({ ...prev, autoCheckEnabled: stored === 'true' }));
    }
  }, []);

  const value = React.useMemo(
    () => ({
      state,
      checkForUpdates,
      downloadUpdate,
      installUpdate,
      dismissUpdate,
      setAutoCheck,
    }),
    [state, checkForUpdates, downloadUpdate, installUpdate, dismissUpdate, setAutoCheck]
  );

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
};

// Helper function to format file size
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Helper function to format download speed
export const formatSpeed = (bytesPerSecond: number): string => {
  return formatBytes(bytesPerSecond) + '/s';
};
