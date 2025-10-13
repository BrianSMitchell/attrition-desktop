import { app, dialog, BrowserWindow } from 'electron';
import log from 'electron-log';
import { ENV_VARS } from './packages/shared/src/constants/env-vars';
import { DIRECTORY_PATHS } from './packages/shared/src/constants/file-paths';



/**
 * Check if we're running in development mode
 * Uses the same logic as API configuration for consistency
 */
function isDevelopmentMode() {
  // Check if we have clear development indicators
  const hasDevIndicators = 
    (typeof process !== 'undefined' && process.execPath?.includes(DIRECTORY_PATHS.NODE_MODULES)) ||
    !app.isPackaged;
  
  log.info('isDevelopmentMode check', {
    hasDevIndicators,
    isPackaged: app.isPackaged,
    execPath: process.execPath,
    nodeEnv: process.env[ENV_VARS.NODE_ENV]
  });
  
  return hasDevIndicators;
}

// Lazy-load autoUpdater to avoid module resolution issues in packed builds
let autoUpdater = null;

async function getAutoUpdater() {
  if (autoUpdater) {
    log.info('getAutoUpdater: Returning cached autoUpdater instance');
    return autoUpdater;
  }
  
  try {
    log.info('getAutoUpdater: Attempting to import electron-updater');
    const m = await import('electron-updater');
    log.info('getAutoUpdater: electron-updater module imported', { 
      hasAutoUpdater: !!m.autoUpdater, 
      hasDefault: !!m.default, 
      hasDefaultAutoUpdater: !!(m.default && m.default.autoUpdater),
      moduleKeys: Object.keys(m)
    });
    
    // Support both ESM and CJS shapes
    autoUpdater = m.autoUpdater || (m.default && m.default.autoUpdater) || null;
    
    if (!autoUpdater) {
      log.error('getAutoUpdater: autoUpdater export not found in module', {
        moduleKeys: Object.keys(m),
        hasAutoUpdater: !!m.autoUpdater,
        hasDefault: !!m.default
      });
      throw new Error('autoUpdater export not found');
    }
    
    log.info('getAutoUpdater: autoUpdater successfully resolved');
    return autoUpdater;
  } catch (error) {
    log.error('Failed to load electron-updater:', error, {
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack
    });
    return null;
  }
}

/**
 * Auto-updater service for Attrition desktop app
 * Handles automatic update checking, downloading, and installation
 */
class UpdateService {
  constructor() {
    this.updateAvailable = false;
    this.updateDownloaded = false;
    this.checkingForUpdate = false;
    this.downloadProgress = null;
    this.isValid = false;
    this.autoUpdater = null;
    
    // Initialize asynchronously and expose readiness promise
    this.readyPromise = this.initialize();
  }
  
  async initialize() {
    try {
      log.info('UpdateService: Starting initialization');
      this.autoUpdater = await getAutoUpdater();
      
      if (!this.autoUpdater) {
        log.error('autoUpdater is not available - UpdateService will be disabled');
        this.isValid = false;
        return;
      }
      
      log.info('UpdateService: autoUpdater loaded successfully');
      this.setupLogger();
      log.info('UpdateService: Logger configured');
      
      this.setupEventHandlers();
      log.info('UpdateService: Event handlers configured');
      
      this.configureUpdater();
      log.info('UpdateService: Updater configured');
      
      this.isValid = true;
      log.info('UpdateService initialized successfully');
    } catch (error) {
      log.error('Failed to initialize UpdateService:', error);
      this.isValid = false;
    }
  }

  setupLogger() {
    // Configure electron-log for auto-updater
    log.transports.file.level = 'info';
    this.autoUpdater.logger = log;
    this.autoUpdater.logger.info('UpdateService initialized');
  }

  setupEventHandlers() {
    // Auto-updater event handlers
    this.autoUpdater.on('checking-for-update', () => {
      this.checkingForUpdate = true;
      log.info('Checking for update...');
      this.notifyRenderer('update-checking');
    });

    this.autoUpdater.on('update-available', (info) => {
      this.updateAvailable = true;
      this.checkingForUpdate = false;
      log.info('Update available:', info.version);
      this.notifyRenderer('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    });

    this.autoUpdater.on('update-not-available', (info) => {
      this.checkingForUpdate = false;
      log.info('Update not available');
      this.notifyRenderer('update-not-available');
    });

    this.autoUpdater.on('error', (err) => {
      this.checkingForUpdate = false;
      log.error('Error in auto-updater:', err);
      this.notifyRenderer('update-error', { message: err.message });
    });

    this.autoUpdater.on('download-progress', (progressObj) => {
      this.downloadProgress = progressObj;
      const percent = Math.round(progressObj.percent);
      log.info(`Download progress: ${percent}%`);
      this.notifyRenderer('update-download-progress', {
        percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
        bytesPerSecond: progressObj.bytesPerSecond
      });
    });

    this.autoUpdater.on('update-downloaded', (info) => {
      this.updateDownloaded = true;
      log.info('Update downloaded');
      this.notifyRenderer('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate
      });
      this.promptForRestart();
    });
  }

  configureUpdater() {
    // Configure auto-updater settings
    this.autoUpdater.autoDownload = false; // Let user decide when to download
    this.autoUpdater.autoInstallOnAppQuit = true;
    
    // Only check for updates in production
    const isDev = isDevelopmentMode();
    if (isDev) {
      this.autoUpdater.updateConfigPath = 'dev-app-update.yml';
    }

    // Explicitly set GitHub configuration for updates
    log.info('Configuring GitHub update feed: BrianSMitchell/attrition-desktop');
    this.autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'BrianSMitchell',
      repo: 'attrition-desktop'
    });
    
    // Log current configuration
    log.info('UpdateService configuration:', {
      autoDownload: this.autoUpdater.autoDownload,
      autoInstallOnAppQuit: this.autoUpdater.autoInstallOnAppQuit,
      isDevelopment: isDev
    });
  }

  /**
   * Check for updates manually
   * @param {boolean} silent - Whether to show "no updates" message
   */
  async checkForUpdates(silent = false) {
    const isDev = isDevelopmentMode();
    log.info(`UpdateService.checkForUpdates called`, { silent, isValid: this.isValid, checkingForUpdate: this.checkingForUpdate, isDev });
    
    if (!this.isValid) {
      log.warn('UpdateService is not valid - skipping update check');
      return { success: false, error: 'UpdateService not initialized' };
    }
    
    // In development, simulate or warn instead of actual update check
    if (isDev) {
      log.info('Development mode detected - simulating update check');
      if (!silent) {
        this.notifyRenderer('update-checking');
        // Simulate checking delay
        setTimeout(() => {
          this.notifyRenderer('update-not-available');
        }, 2000);
      }
      return { success: true, isDevelopment: true, message: 'Development mode - no actual update check performed' };
    }
    
    if (this.checkingForUpdate) {
      log.info('Update check already in progress');
      return { success: false, error: 'Update check already in progress' };
    }

    try {
      log.info('Starting update check...');
      if (!silent) {
        log.info('Notifying renderer: update-checking');
        this.notifyRenderer('update-checking');
      }
      
      log.info('Calling autoUpdater.checkForUpdatesAndNotify()');
      const result = await this.autoUpdater.checkForUpdatesAndNotify();
      log.info('checkForUpdatesAndNotify completed', { result });
      
      return { success: true, result };
    } catch (error) {
      log.error('Failed to check for updates:', error, {
        errorMessage: error.message,
        errorCode: error.code,
        errorStack: error.stack
      });
      if (!silent) {
        log.info('Notifying renderer: update-error');
        this.notifyRenderer('update-error', { message: error.message });
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Download available update
   */
  async downloadUpdate() {
    if (!this.isValid) {
      log.warn('UpdateService is not valid - skipping download');
      return;
    }
    
    if (!this.updateAvailable) {
      log.warn('No update available to download');
      return;
    }

    try {
      log.info('Starting update download...');
      await this.autoUpdater.downloadUpdate();
    } catch (error) {
      log.error('Failed to download update:', error);
      this.notifyRenderer('update-error', { message: error.message });
    }
  }

  /**
   * Install downloaded update and restart app
   */
  quitAndInstall() {
    if (!this.updateDownloaded) {
      log.warn('No update downloaded to install');
      return;
    }

    log.info('Quitting and installing update...');
    this.autoUpdater.quitAndInstall(false, true);
  }

  /**
   * Prompt user to restart for update installation
   */
  async promptForRestart() {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'A new version of Attrition has been downloaded.',
      detail: 'The application will restart to apply the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    });

    if (result.response === 0) {
      this.quitAndInstall();
    } else {
      log.info('User chose to restart later');
      this.notifyRenderer('update-restart-later');
    }
  }

  /**
   * Start periodic update checks
   * @param {number} intervalMinutes - Check interval in minutes (default: 60)
   */
  startPeriodicChecks(intervalMinutes = 60) {
    if (!this.isValid) {
      log.warn('UpdateService is not valid - skipping periodic checks');
      return;
    }
    
    // Don't start periodic checks in development
    const isDev = isDevelopmentMode();
    if (isDev) {
      log.info('Skipping periodic update checks in development');
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    log.info(`Starting periodic update checks every ${intervalMinutes} minutes`);

    // Initial check after 2 minutes
    setTimeout(() => {
      this.checkForUpdates(true);
    }, 2 * 60 * 1000);

    // Periodic checks
    setInterval(() => {
      this.checkForUpdates(true);
    }, intervalMs);
  }

  /**
   * Get current update service status
   * @returns {object} Status information
   */
  getStatus() {
    const status = {
      isValid: this.isValid,
      updateAvailable: this.updateAvailable,
      updateDownloaded: this.updateDownloaded,
      checkingForUpdate: this.checkingForUpdate,
      downloadProgress: this.downloadProgress
    };
    
    log.info('UpdateService.getStatus called', status);
    return status;
  }


  /**
   * Notify renderer process of update events
   */
  notifyRenderer(event, data = {}) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send('update-event', { type: event, data });
    });
  }

}

export { UpdateService };
