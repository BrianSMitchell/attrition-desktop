import { app, dialog, BrowserWindow } from 'electron';
import log from 'electron-log';

// Lazy-load autoUpdater to avoid module resolution issues in packed builds
let autoUpdater = null;

async function getAutoUpdater() {
  if (autoUpdater) return autoUpdater;
  
  try {
    const m = await import('electron-updater');
    // Support both ESM and CJS shapes
    autoUpdater = m.autoUpdater || (m.default && m.default.autoUpdater) || null;
    if (!autoUpdater) {
      throw new Error('autoUpdater export not found');
    }
    return autoUpdater;
  } catch (error) {
    log.error('Failed to load electron-updater:', error);
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
    
    // Initialize asynchronously
    this.initialize();
  }
  
  async initialize() {
    try {
      this.autoUpdater = await getAutoUpdater();
      
      if (!this.autoUpdater) {
        log.error('autoUpdater is not available - UpdateService will be disabled');
        return;
      }
      
      this.setupLogger();
      this.setupEventHandlers();
      this.configureUpdater();
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
    this.autoUpdater.autoDownload = true; // Download updates automatically in background
    this.autoUpdater.autoInstallOnAppQuit = true;
    
    // Only check for updates in production
    if (process.env.NODE_ENV === 'development') {
      this.autoUpdater.updateConfigPath = 'dev-app-update.yml';
    }

    // Set update server URL if needed (defaults to GitHub Releases)
    // this.autoUpdater.setFeedURL({
    //   provider: 'github',
    //   owner: 'attrition-game',
    //   repo: 'attrition-desktop'
    // });
  }

  /**
   * Check for updates manually
   * @param {boolean} silent - Whether to show "no updates" message
   */
  async checkForUpdates(silent = false) {
    if (!this.isValid) {
      log.warn('UpdateService is not valid - skipping update check');
      return;
    }
    
    if (this.checkingForUpdate) {
      log.info('Update check already in progress');
      return;
    }

    try {
      if (!silent) {
        this.notifyRenderer('update-checking');
      }
      
      await this.autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
      log.error('Failed to check for updates:', error);
      if (!silent) {
        this.notifyRenderer('update-error', { message: error.message });
      }
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
    if (process.env.NODE_ENV === 'development') {
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
    return {
      isValid: this.isValid,
      updateAvailable: this.updateAvailable,
      updateDownloaded: this.updateDownloaded,
      checkingForUpdate: this.checkingForUpdate,
      downloadProgress: this.downloadProgress
    };
  }

  /**
   * Notify renderer process about update events
   * @param {string} event - Event type
   * @param {object} data - Event data
   */
  notifyRenderer(event, data = {}) {
    try {
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send('update-event', { event, data, timestamp: Date.now() });
        }
      });
    } catch (error) {
      log.error('Failed to notify renderer about update event:', error);
    }
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

  /**
   * Get current update status
   */
  getStatus() {
    return {
      updateAvailable: this.updateAvailable,
      updateDownloaded: this.updateDownloaded,
      checkingForUpdate: this.checkingForUpdate,
      downloadProgress: this.downloadProgress
    };
  }
}

export { UpdateService };
