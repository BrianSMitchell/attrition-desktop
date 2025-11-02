import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import keytar from 'keytar';
import desktopDb from './db.js';
import errorLogger from './services/errorLoggingService.js';
import performanceMonitoringService from './services/performanceMonitoringService.js';
import { httpRequest } from './services/httpClient.js';

// Import shared constants from CommonJS build to avoid ESM duplicate module loading
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const shared = require('../../shared/dist/cjs/index.js');
const { ENV_VARS, HTTP_STATUS, ERROR_MESSAGES, FILE_PATHS, DIRECTORY_PATHS } = shared;

// Security services removed - too restrictive for small game
import { UpdateService } from './services/updateService.js';

/**
 * Resolve current directory for this ESM module without shadowing CommonJS globals.
 */
const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
try {
  console.log('[DesktopMain] boot main', {
    importMeta: import.meta.url,
    dirname: DIRNAME,
    resourcesPath: process.resourcesPath,
    appIsPackaged: app.isPackaged,
    electron: process.versions?.electron,
    node: process.versions?.node
  });
} catch {}

const STARTUP_LOG = path.join(DIRNAME, 'startup.log');
function logStartup(msg: string, extra?: any): void {
  try {
    const line = `[${new Date().toISOString()}] ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}\n`;
    fs.appendFileSync(STARTUP_LOG, line, { encoding: 'utf8' });
  } catch {}
}
logStartup('boot', { dirname: DIRNAME, resourcesPath: process.resourcesPath, packaged: app.isPackaged });

/**
 * Resolve shared parser lazily to avoid hard-failing at module load time.
 * Falls back to identity parser if not found (sufficient for CSP testing).
 */
let parseAndNormalizeBootstrap: any;
async function resolveSharedParser(): Promise<any> {
  if (parseAndNormalizeBootstrap) return parseAndNormalizeBootstrap;

  // Attempt workspace/proper import first
  try {
    ({ parseAndNormalizeBootstrap } = await import('@game/shared'));
    return parseAndNormalizeBootstrap;
  } catch {}

  // Attempt file-based resolution in both dev and packaged layouts
  try {
    const { pathToFileURL } = await import('node:url');
    const candidates = [
      // Dev fallback (repo layout)
      path.resolve(DIRNAME, '../../shared/dist/esm/index.js'),
      // Packaged candidates (various electron-builder layouts)
      path.join(process.resourcesPath, 'app', 'packages', 'shared', DIRECTORY_PATHS.DIST, 'esm', FILE_PATHS.INDEX_JS),
      path.join(process.resourcesPath, 'app.asar', 'packages', 'shared', DIRECTORY_PATHS.DIST, 'esm', FILE_PATHS.INDEX_JS),
      path.join(process.resourcesPath, 'packages', 'shared', DIRECTORY_PATHS.DIST, 'esm', FILE_PATHS.INDEX_JS)
    ];

    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          ({ parseAndNormalizeBootstrap } = await import(pathToFileURL(p).href));
          return parseAndNormalizeBootstrap;
        }
      } catch {}
    }
  } catch {}

  // Last resort: identity parser (no validation). Warn and continue.
  try {
    errorLogger?.warn?.('[Desktop] Falling back to identity parser for bootstrap normalization (shared parser not found)');
  } catch {}
  parseAndNormalizeBootstrap = (data: any) => data;
  return parseAndNormalizeBootstrap;
}

const APP_ID = 'com.attrition.desktop';
const isDev = !app.isPackaged;

/**
 * Check if the game was launched by the launcher
 * The launcher should pass a command line argument or set an environment variable
 */
function checkLauncherLaunch() {
  // Check for launcher-specific command line arguments
  const hasLauncherFlag = process.argv.includes('--launched-by-launcher');
  
  // Check for launcher-specific environment variable
  const hasLauncherEnv = process.env[ENV_VARS.ATTRITION_LAUNCHED_BY_LAUNCHER] === 'true';
  
  // In development mode, allow direct launch
  if (isDev) {
    return true;
  }
  
  return hasLauncherFlag || hasLauncherEnv;
}

/**
 * Show warning dialog if game was launched directly (not through launcher)
 */
async function showLauncherWarning(): Promise<boolean> {
  const result = await dialog.showMessageBox(null as any, {
    type: 'warning',
    title: 'Attrition - Use Launcher',
    message: 'Please use the Attrition Launcher',
    detail: 'For the best experience and to ensure you have the latest updates, please launch Attrition through the official launcher instead of running the game directly.\n\nThe launcher handles automatic updates and ensures optimal performance.',
    buttons: ['Exit Game', 'Continue Anyway'],
    defaultId: 0,
    cancelId: 0
  });
  
  return result.response === 1; // Continue if user clicked "Continue Anyway"
}

/**
 * API Configuration with HTTPS support
 * - Development: Uses HTTP localhost for easy debugging
 * - Production: Enforces HTTPS for secure communication
 */
function getApiBaseUrl() {
  // Check for explicit environment variable first
  if (process.env[ENV_VARS.API_BASE_URL]) {
    return process.env[ENV_VARS.API_BASE_URL];
  }
  
  // In packaged production builds, default to HTTPS
  if (!isDev) {
    const productionHost = process.env[ENV_VARS.PRODUCTION_API_HOST] || 'attrition-game.onrender.com';
    return `https://${productionHost}/api`;
  }
  
  // Development: Use HTTP localhost
  return 'http://localhost:3001/api';
}

const API_BASE_URL = getApiBaseUrl();

// Log the API configuration for debugging
if (isDev) {
  console.log(`[Desktop] API Base URL: ${API_BASE_URL}`);
} else {
  // In production, only log the protocol and host (not full URL for security)
  try {
    const url = new URL(API_BASE_URL!);
    console.log(`[Desktop] API configured for ${url.protocol}//${url.host}`);
  } catch {
    console.log('[Desktop] API configuration loaded');
  }
}

// Network status tracking
let networkStatus = {
  isOnline: true,
  isApiReachable: true,
  lastChecked: Date.now(),
  latencyMs: 0
};

// Network check interval
let networkCheckInterval = null;


// Global error handling
process.on('uncaughtException', (error) => {
  errorLogger.fatal('Uncaught Exception in main process', error);
});

process.on('unhandledRejection', (reason, promise) => {
  errorLogger.error('Unhandled Promise Rejection in main process', reason as Error);
});

// All security middleware removed - too restrictive for small private game

// IPC handlers exposed to the preload bridge
ipcMain.handle('app:getVersion', () => {
  try {
    return app.getVersion();
  } catch (error) {
    errorLogger.error('Failed to get app version', error as Error);
    return 'unknown';
  }
});

ipcMain.handle('app:isPackaged', () => {
  try {
    return app.isPackaged;
  } catch (error) {
    errorLogger.error('Failed to get app isPackaged status', error as Error);
    return false; // Default to development mode if uncertain
  }
});

ipcMain.handle('app:openExternal', async (_event, url) => {
  try {
    // Security: Validate URL format and protocol allowlist
    if (!url || typeof url !== 'string' || url.length > 2000) {
      errorLogger.warn('app:openExternal rejected: invalid URL parameter', null, { urlType: typeof url, urlLength: url?.length });
      return false;
    }

    const u = new URL(url);
    
    // Security: Only allow safe protocols
    const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];
    if (!ALLOWED_PROTOCOLS.includes(u.protocol)) {
      errorLogger.warn('app:openExternal rejected: protocol not allowed', null, { protocol: u.protocol, url });
      return false;
    }

    // Security: Block potentially dangerous hosts
    const hostname = u.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      errorLogger.warn('app:openExternal rejected: local/private network access attempted', null, { hostname, url });
      return false;
    }

    await shell.openExternal(u.toString());
    return true;
  } catch (error) {
    errorLogger.error('Failed to open external URL', error as Error, { url: typeof url === 'string' ? url.substring(0, 100) : 'invalid' });
    return false;
  }
});

// Network status IPC handlers - REMOVED
// These were not exposed in preload bridge and unused by renderer
// Network status is now handled internally by main process only

/**
 * Get or create a stable device id used for desktop cached profile entries.
 * Stored in kv_store under 'device_id'.
 */
function getOrCreateDeviceId() {
  try {
    const existing = desktopDb.getKeyValue('device_id');
    if (existing && typeof existing === 'string') {
      return existing;
    }
    // Simple unique id (non-cryptographic)
    const id =
      Math.random().toString(36).substring(2, 10) +
      Math.random().toString(36).substring(2, 10);
    desktopDb.setKeyValue('device_id', id);
    return id;
  } catch (error) {
    errorLogger.warn('Failed device id get/set; falling back to unknown-device', error as Error);
    return 'unknown-device';
  }
}


/**
 * Refresh token secure storage (OS keychain via keytar)
 * We intentionally do NOT expose a getter to avoid leaking the raw refresh token to the renderer.
 */
ipcMain.handle('tokens:saveRefresh', async (_event, refreshToken) => {
  try {
    await keytar.setPassword(APP_ID, 'refresh', String(refreshToken ?? ''));
    return { ok: true };
  } catch (error) {
    errorLogger.error('Failed to save refresh token', error as Error);
    return { ok: false };
  }
});

ipcMain.handle('tokens:deleteRefresh', async () => {
  try {
    await keytar.deletePassword(APP_ID, 'refresh');
    return { ok: true };
  } catch (error) {
    errorLogger.error('Failed to delete refresh token', error as Error);
    return { ok: false };
  }
});

ipcMain.handle('tokens:hasRefresh', async () => {
  try {
    const rt = await keytar.getPassword(APP_ID, 'refresh');
    return { ok: true, has: !!rt };
  } catch (error) {
    errorLogger.error('Failed to check refresh token', error as Error);
    return { ok: false, has: false };
  }
});

/**
 * Perform a refresh using the stored refresh token without exposing it to the renderer.
 * Returns: { ok: boolean, token?: string }
 */
ipcMain.handle('auth:refresh', async (event) => {
  try {
    const refreshToken = await keytar.getPassword(APP_ID, 'refresh');
    if (!refreshToken) {
      errorLogger.info('No refresh token available for auth refresh');
      return { ok: false, error: 'no_refresh' };
    }

    const url = `${API_BASE_URL!.replace(/\/$/, '')}/auth/refresh`;

    // NEW: forward renderer headers for device fingerprint consistency
    const userAgent =
      (event?.sender?.getUserAgent && event.sender.getUserAgent()) ||
      (BrowserWindow.getAllWindows()[0]?.webContents?.getUserAgent && BrowserWindow.getAllWindows()[0].webContents.getUserAgent()) ||
      'node';
    const acceptLanguage = app.getLocale?.() || 'en-US';
    
    // Retry mechanism for server startup - retry up to 3 times with delays
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await httpRequest({
          url,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': userAgent, 'Accept-Language': acceptLanguage },
          body: JSON.stringify({ refreshToken }),
          timeoutMs: 10000,
          tag: 'auth:refresh'
        });

        if (result.ok) {
          // Success - process the response
          const json = result.json ?? {};
          // Expect ApiResponse<RefreshResponse>
          if (json && json.success && json.data && json.data.token) {
            const nextRt = json.data.refreshToken;
            if (nextRt) {
              try {
                await keytar.setPassword(APP_ID, 'refresh', String(nextRt));
              } catch (error) {
                errorLogger.error('Failed to rotate refresh token', error as Error);
              }
            }
            return { ok: true, token: String(json.data.token) };
          }

          errorLogger.warn('Auth refresh invalid response', null, { response: json });
          return { ok: false, error: json?.error || 'refresh_failed' };
        }
        
        // If it's a connection error and we have more attempts, wait and retry
        if (attempt < 3 && (result.error?.code === 'ECONNREFUSED' || result.error?.code === 'FETCH_ERROR')) {
          errorLogger.info(`Auth refresh attempt ${attempt} failed, retrying in ${attempt * 1000}ms`, null, { error: result.error?.code });
          await new Promise(resolve => setTimeout(resolve, attempt * 1000)); // 1s, 2s delays
          lastError = result;
          continue;
        }
        
        // Final attempt or non-connection error
        if (result.status === 401) {
          try {
            await keytar.deletePassword(APP_ID, 'refresh');
            errorLogger.info('Auth refresh received 401 - cleared stored refresh token');
          } catch (e) {
            errorLogger.error('Failed to clear refresh token after 401', e as Error);
          }
          return { ok: false, status: HTTP_STATUS.UNAUTHORIZED, error: 'invalid_refresh_token' };
        }
        errorLogger.warn('Auth refresh HTTP failure', null, { status: result.status, code: result.error?.code, attempt });
        return { ok: false, status: result.status };
        
      } catch (requestError) {
        lastError = requestError;
        if (attempt < 3) {
          errorLogger.info(`Auth refresh attempt ${attempt} exception, retrying in ${attempt * 1000}ms`, null, { error: (requestError as Error).message });
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          continue;
        }
        break;
      }
    }

    // All attempts failed
    errorLogger.error('Auth refresh failed after all attempts', lastError as Error);
    return { ok: false, error: 'all_attempts_failed' };
  } catch (error) {
    errorLogger.error('Auth refresh exception', error as Error);
    return { ok: false, error: 'exception' };
  }
});

/**
 * Perform login/register in main so refresh token never touches the renderer.
 * On success: store refreshToken to OS keychain and return sanitized payload without it.
 */
ipcMain.handle('auth:login', async (event, { email, password }) => {
  console.log('[AUTH] Login attempt via IPC:', { email, password: password ? '[PRESENT]' : '[MISSING]' });
  
  // Basic input validation
  if (!email || !password) {
    console.log('[AUTH] Login validation failed - missing email or password');
    return { success: false, error: 'Email and password are required', message: 'Email and password are required' };
  }
  try {
    const url = `${API_BASE_URL!.replace(/\/$/, '')}/auth/login`;
    console.log('[AUTH] Making login request to:', url);
    const userAgent =
      (event?.sender?.getUserAgent && event.sender.getUserAgent()) ||
      (BrowserWindow.getAllWindows()[0]?.webContents?.getUserAgent && BrowserWindow.getAllWindows()[0].webContents.getUserAgent()) ||
      'node';
    const acceptLanguage = app.getLocale?.() || 'en-US';
    const result = await httpRequest({
      url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': userAgent, 'Accept-Language': acceptLanguage },
      body: JSON.stringify({ email, password }),
      timeoutMs: 10000,
      tag: 'auth:login'
    });

    const json = result.json ?? {};
    console.log('[AUTH] Login response:', { ok: result.ok, status: result.status, json: json ? 'Present' : 'Missing', success: json?.success });
    console.log('[AUTH] Full server response:', json);
    if (json && json.success && json.data) {
      const { refreshToken, token, user, empire } = json.data || {};
      if (refreshToken) {
        try {
          await keytar.setPassword(APP_ID, 'refresh', String(refreshToken));
        } catch (error) {
          errorLogger.error('Failed to save refresh token on login', error as Error);
        }
      }
      console.log('[AUTH] Login successful, returning user data');
      return { success: true, data: { token, user, empire }, message: json.message };
    }

    // Pass through server error shape when available (add canonical fields)
    console.log('[AUTH] Login failed, processing error response');
    if (!result.ok) {
      if (json && typeof json === 'object') {
        console.log('[AUTH] Returning server error JSON:', json);
        return json;
      }
      const code = (result.error?.code || (result.status ? `HTTP_${result.status}` : 'NETWORK_UNAVAILABLE'));
      const message = (json && (json.message || json.error)) || (result.status ? `HTTP ${result.status}` : ERROR_MESSAGES.NETWORK_ERROR);
      return {
        success: false,
        code,
        message,
        error: code,
        status: result.status,
        details: result.error?.details ?? result.text,
        requestId: result.requestId,
        durationMs: result.durationMs
      };
    }

    return json || { success: false, code: 'INVALID_RESPONSE', message: 'Invalid response', error: 'INVALID_RESPONSE' };
  } catch (error) {
    errorLogger.error('Auth login exception', error as Error);
    return { success: false, error: 'exception' };
  }
});

// SIMPLE DIRECT REGISTRATION - No security middleware, just works
ipcMain.handle('auth:register', async (event, { email, username, password }) => {
  console.log('[AUTH] Direct registration attempt:', { email, username });
  try {
    const url = `${API_BASE_URL!.replace(/\/$/, '')}/auth/register`;

    const userAgent =
      (event?.sender?.getUserAgent && event.sender.getUserAgent()) ||
      (BrowserWindow.getAllWindows()[0]?.webContents?.getUserAgent && BrowserWindow.getAllWindows()[0].webContents.getUserAgent()) ||
      'node';
    const acceptLanguage = app.getLocale?.() || 'en-US';

    const result = await httpRequest({
      url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': userAgent, 'Accept-Language': acceptLanguage },
      body: JSON.stringify({ email, username, password }),
      timeoutMs: 10000,
      tag: 'auth:register'
    });

    const json = result.json ?? {};
    if (json && json.success && json.data) {
      const { refreshToken, token, user, empire } = json.data || {};
      if (refreshToken) {
        try {
          await keytar.setPassword(APP_ID, 'refresh', String(refreshToken));
        } catch (error) {
          errorLogger.error('Failed to save refresh token on register', error as Error);
        }
      }
      return { success: true, data: { token, user, empire }, message: json.message };
    }

    // Pass through server error shape when available
    if (!result.ok) {
      if (json && typeof json === 'object') {
        return json;
      }
      const code = (result.error?.code || (result.status ? `HTTP_${result.status}` : 'NETWORK_UNAVAILABLE'));
      const message = (json && (json.message || json.error)) || (result.status ? `HTTP ${result.status}` : ERROR_MESSAGES.NETWORK_ERROR);
      return {
        success: false,
        code,
        message,
        error: code,
        status: result.status
      };
    }

    return json || { success: false, code: 'INVALID_RESPONSE', message: 'Invalid response', error: 'INVALID_RESPONSE' };
  } catch (error) {
    errorLogger.error('Auth register exception', error as Error);
    return { success: false, error: ERROR_MESSAGES.NETWORK_ERROR, message: 'Could not connect to server' };
  }
});

// OLD SECURE VERSION - DISABLED
/*
ipcMain.handle('auth:register-secure', secureIpcHandler('auth:register', async (_event, { email, username, password }) => {
  try {
    const url = `${API_BASE_URL.replace(/\/$/, '')}/auth/register`;
    const result = await httpRequest({
      url,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
      timeoutMs: 10000,
      tag: 'auth:register'
    });

    const json = result.json ?? {};
    if (json && json.success && json.data) {
      const { refreshToken, token, user, empire } = json.data || {};
      if (refreshToken) {
        try {
          await keytar.setPassword(APP_ID, 'refresh', String(refreshToken));
        } catch (error) {
          errorLogger.error('Failed to save refresh token on register', error);
        }
      }
      return { success: true, data: { token, user, empire }, message: json.message };
    }

    // Pass through server error shape when available (add canonical fields)
    if (!result.ok) {
      if (json && typeof json === 'object') {
        return json;
      }
      const code = (result.error?.code || (result.status ? `HTTP_${result.status}` : 'NETWORK_UNAVAILABLE'));
      const message = (json && (json.message || json.error)) || (result.status ? `HTTP ${result.status}` : ERROR_MESSAGES.NETWORK_ERROR);
      return {
        success: false,
        code,
        message,
        error: code,
        status: result.status,
        details: result.error?.details ?? result.text,
        requestId: result.requestId,
        durationMs: result.durationMs
      };
    }

    return json || { success: false, code: 'INVALID_RESPONSE', message: 'Invalid response', error: 'INVALID_RESPONSE' };
  } catch (error) {
    errorLogger.error('Auth register exception', error);
    return { success: false, error: 'exception' };
  }
}, { circuitBreaker: true, auditLog: true, sanitizeParams: true }));
*/

// ===== DATABASE IPC HANDLERS =====

/**
 * Security: Key validation for KV store operations
 * Prevents access to sensitive system keys and enforces namespace rules
 */
function validateKVKey(key: string): { valid: boolean; reason?: string } {
  if (!key || typeof key !== 'string') {
    return { valid: false, reason: 'Key must be a non-empty string' };
  }
  
  if (key.length > 200) {
    return { valid: false, reason: 'Key too long (max 200 characters)' };
  }
  
  // Security: Block access to sensitive system keys
  const FORBIDDEN_KEYS = [
    'device_id', 'bootstrap_version', 'bootstrap_completed_at',
    'refresh_token', 'access_token', 'api_key', 'secret'
  ];
  
  if (FORBIDDEN_KEYS.includes(key) || FORBIDDEN_KEYS.some(forbidden => key.toLowerCase().includes(forbidden))) {
    return { valid: false, reason: 'Access to system keys is forbidden' };
  }
  
  // Security: Enforce namespace prefixes for user data
  const ALLOWED_PREFIXES = [
    'user_', 'cache_', 'settings_', 'ui_', 'game_', 'temp_', 'session_'
  ];
  
  const hasValidPrefix = ALLOWED_PREFIXES.some(prefix => key.startsWith(prefix));
  if (!hasValidPrefix) {
    return { valid: false, reason: 'Key must start with an allowed prefix: ' + ALLOWED_PREFIXES.join(', ') };
  }
  
  return { valid: true };
}

// KV Store
ipcMain.handle('db:kv:set', async (_event, key, value) => {
  try {
    // Security: Validate key before operation
    const validation = validateKVKey(key);
    if (!validation.valid) {
      errorLogger.warn('KV store set rejected', null, { key, reason: validation.reason });
      return { success: false, error: validation.reason };
    }
    
    // Security: Validate value size to prevent DoS
    if (value && typeof value === 'string' && value.length > 100000) {
      errorLogger.warn('KV store set rejected: value too large', null, { key, valueSize: value.length });
      return { success: false, error: 'Value too large (max 100KB)' };
    }
    
    return { success: desktopDb.setKeyValue(key, value) };
  } catch (error) {
    errorLogger.error('KV store set failed', error as Error, { key: key?.substring(0, 50) });
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('db:kv:get', async (_event, key) => {
  try {
    // Security: Validate key before operation
    const validation = validateKVKey(key);
    if (!validation.valid) {
      errorLogger.warn('KV store get rejected', null, { key, reason: validation.reason });
      return { success: false, error: validation.reason };
    }
    
    const value = desktopDb.getKeyValue(key);
    return { success: true, value };
  } catch (error) {
    errorLogger.error('KV store get failed', error as Error, { key: key?.substring(0, 50) });
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('db:kv:delete', async (_event, key) => {
  try {
    // Security: Validate key before operation
    const validation = validateKVKey(key);
    if (!validation.valid) {
      errorLogger.warn('KV store delete rejected', null, { key, reason: validation.reason });
      return { success: false, error: validation.reason };
    }
    
    return { success: desktopDb.deleteKeyValue(key) };
  } catch (error) {
    errorLogger.error('KV store delete failed', error as Error, { key: key?.substring(0, 50) });
    return { success: false, error: (error as Error).message };
  }
});

// Catalogs
ipcMain.handle('db:catalogs:set', async (_event, key, catalogData, version, contentHash) => {
  try {
    return { success: desktopDb.setCatalog(key, catalogData, version, contentHash) };
  } catch (error) {
    errorLogger.error('Catalog set failed', error as Error, { key, version });
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('db:catalogs:get', async (_event, key) => {
  try {
    const catalog = desktopDb.getCatalog(key);
    return { success: true, catalog };
  } catch (error) {
    errorLogger.error('Catalog get failed', error as Error, { key });
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('db:catalogs:getAll', async () => {
  try {
    const catalogs = desktopDb.getAllCatalogs();
    return { success: true, catalogs };
  } catch (error) {
    errorLogger.error('Catalog getAll failed', error as Error);
    return { success: false, error: (error as Error).message };
  }
});

// Profile Snapshot
ipcMain.handle('db:profile:set', async (_event, userId, deviceId, snapshotData, schemaVersion) => {
  try {
    return { success: desktopDb.setProfileSnapshot(userId, deviceId, snapshotData, schemaVersion) };
  } catch (error) {
    errorLogger.error('Profile set failed', error as Error, { userId, deviceId });
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('db:profile:get', async (_event, userId, deviceId) => {
  try {
    const profile = desktopDb.getProfileSnapshot(userId, deviceId);
    return { success: true, profile };
  } catch (error) {
    errorLogger.error('Profile get failed', error as Error, { userId, deviceId });
    return { success: false, error: (error as Error).message };
  }
});

let eventQueueService: any;
let updateService: any;

// Update service IPC handlers
ipcMain.handle('update:check', async () => {
  try {
    errorLogger.info('IPC update:check called', null, { hasUpdateService: !!updateService });
    if (!updateService) {
      errorLogger.warn('Update service not initialized');
      return { success: false, error: 'Update service not initialized' };
    }
    const result = await updateService.checkForUpdates();
    errorLogger.info('Update check completed', null, result);
    return result || { success: true };
  } catch (error) {
    errorLogger.error('Update check failed', error as Error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('update:download', async () => {
  try {
    errorLogger.info('IPC update:download called', null, { hasUpdateService: !!updateService });
    if (!updateService) {
      errorLogger.warn('Update service not initialized');
      return { success: false, error: 'Update service not initialized' };
    }
    await updateService.downloadUpdate();
    return { success: true };
  } catch (error) {
    errorLogger.error('Update download failed', error as Error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('update:install', async () => {
  try {
    errorLogger.info('IPC update:install called', null, { hasUpdateService: !!updateService });
    if (!updateService) {
      errorLogger.warn('Update service not initialized');
      return { success: false, error: 'Update service not initialized' };
    }
    updateService.quitAndInstall();
    return { success: true };
  } catch (error) {
    errorLogger.error('Update install failed', error as Error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('update:status', async () => {
  try {
    errorLogger.info('IPC update:status called', null, { hasUpdateService: !!updateService });
    if (!updateService) {
      errorLogger.warn('Update service not initialized');
      return { success: false, error: 'Update service not initialized' };
    }
    const status = updateService.getStatus();
    errorLogger.info('Update status retrieved', null, status);
    return { success: true, status };
  } catch (error) {
    errorLogger.error('Update status check failed', error as Error);
    return { success: false, error: (error as Error).message };
  }
});

/**
 * Defer resolution until after app.whenReady() so app.getAppPath() points at resources/app(.asar)
 * and not the source tree. Uses multiple candidates to work in both dev and packaged builds.
 */
async function loadEventQueueService() {
  const { pathToFileURL } = await import('node:url');

  // Ensure app is ready for a reliable app path
  if (!app.isReady?.()) {
    try { await app.whenReady?.(); } catch {}
  }

  // Temporary bypass for packaged build to unblock CSP testing:
  // Use a minimal stub so the app can launch even if dynamic resolution fails.
  if (app.isPackaged) {
    errorLogger.warn('[Desktop] Using packaged stub EventQueueService for CSP test run');
    eventQueueService = {
      enqueue: async (kind: string, payload: any, options: any = {}) => {
        try {
          const deviceId =
            (typeof desktopDb.getKeyValue === 'function' && desktopDb.getKeyValue('device_id')) ||
            'stub-device';
          const dedupeKey = options?.dedupeKey ?? null;
          return desktopDb.enqueueEvent(kind, deviceId, payload, { dedupeKey });
        } catch (e) {
          errorLogger.error('[Desktop] Packaged stub EventQueueService enqueue failed', e as Error, { kind });
          throw e;
        }
      }
    };
    return;
  }

  const appPathSafe = (() => {
    try { return app.getAppPath(); } catch { return null; }
  })();

  errorLogger.info('[Desktop] Resolving eventQueueService candidates', null, {
    appPath: appPathSafe,
    dirname: DIRNAME,
    resourcesPath: process.resourcesPath
  });

  // 0) First try relative to this module (dev only). In packaged builds we short-circuit with a stub above.
  let lastError;
  if (!app.isPackaged) {
    try {
      const href = new URL('./services/eventQueueService.js', import.meta.url).href;
      ({ default: eventQueueService } = await import(href));
      errorLogger.info('[Desktop] Loaded eventQueueService via import.meta.url', null, { resolved: href });
      return;
    } catch (e) {
      lastError = e;
    }
  }

  // Dev-only resolution attempts via path candidates; packaged builds use the stub above.
  if (!app.isPackaged) {
    const svcCandidates = [
      // App path variants (preferred; covers app.asar and unpacked app)
      appPathSafe && path.join(appPathSafe, 'src', 'services', 'eventQueueService.js'),
      appPathSafe && path.join(appPathSafe, 'services', 'eventQueueService.js'),

      // DIRNAME variants (depends on where main.js is located at runtime)
      path.join(DIRNAME, 'src', 'services', 'eventQueueService.js'),
      path.join(DIRNAME, 'services', 'eventQueueService.js'),

      // resources root variants
      process.resourcesPath && path.join(process.resourcesPath, 'app', 'src', 'services', 'eventQueueService.js'),
      process.resourcesPath && path.join(process.resourcesPath, 'app', 'services', 'eventQueueService.js'),
      process.resourcesPath && path.join(process.resourcesPath, 'app.asar', 'src', 'services', 'eventQueueService.js'),
      process.resourcesPath && path.join(process.resourcesPath, 'app.asar', 'services', 'eventQueueService.js'),
    ].filter(Boolean);

    for (const p of svcCandidates) {
      try {
        ({ default: eventQueueService } = await import(pathToFileURL(p!).href));
        errorLogger.info('[Desktop] Loaded eventQueueService', null, { resolved: p });
        return;
      } catch (e) {
        lastError = e;
        // continue
      }
    }
  }

  errorLogger.fatal('Failed to resolve eventQueueService.js', null, {
    dirname: DIRNAME,
    appPath: appPathSafe,
    lastError: (lastError as Error)?.message
  });

  // Fallback stub to allow app to continue (for CSP testing) if the service cannot be resolved
  eventQueueService = {
    enqueue: async (kind: string, payload: any, options: any = {}) => {
      try {
        const deviceId =
          (typeof desktopDb.getKeyValue === 'function' && desktopDb.getKeyValue('device_id')) ||
          'stub-device';
        const dedupeKey = options?.dedupeKey ?? null;
        return desktopDb.enqueueEvent(kind, deviceId, payload, { dedupeKey });
      } catch (e) {
        errorLogger.error('[Desktop] Stub EventQueueService enqueue failed', e as Error, { kind });
        throw e;
      }
    }
  };
  errorLogger.warn('[Desktop] Using stub EventQueueService fallback');
  return;
}

// Event Queue (DB layer - internal)
ipcMain.handle('db:events:enqueue', async (_event, kind, deviceId, payload, dedupeKey) => {
  try {
    const id = desktopDb.enqueueEvent(kind, deviceId, payload, dedupeKey);
    return { success: true, id };
  } catch (error) {
    errorLogger.error('Event enqueue failed', error as Error, { kind, deviceId });
    return { success: false, error: (error as Error).message };
  }
});

// Provide a public flush endpoint that proxies to the internal EventQueueService
ipcMain.handle('db:events:flushQueue', async (_event, limit = 50) => {
  try {
    const res = await eventQueueService.flushPendingEvents(limit);
    return {
      success: true,
      processed: res?.flushed ?? 0,
      failed: res?.failed ?? 0,
      completed: res?.completed ?? 0,
      errors: []
    };
  } catch (error) {
    errorLogger.error('Flush queue failed', error as Error);
    return { success: false, error: (error as Error).message };
  }
});

// Lightweight queue metrics for renderer diagnostics
ipcMain.handle('db:events:getQueueMetrics', async () => {
  try {
    const pendingCount = desktopDb.getPendingEventsCount(null);
    const metrics = {
      pendingCount,
      processedCount: 0,
      failedCount: 0,
      lastFlushTime: Date.now(),
      lastFlushDuration: 0,
    };
    return { success: true, metrics };
  } catch (error) {
    errorLogger.error('Get queue metrics failed', error as Error);
    return { success: false, error: (error as Error).message };
  }
});

// Event Queue (Business logic layer - for UI)
ipcMain.handle('eventQueue:enqueue', async (_event, kind, payload, options = {}) => {
  try {
    // Security: Validate kind parameter
    if (!kind || typeof kind !== 'string' || kind.length > 100) {
      errorLogger.warn('Event enqueue rejected: invalid kind', null, { kind, kindType: typeof kind });
      return { success: false, error: 'Event kind must be a string (max 100 chars)' };
    }
    
    // Security: Validate payload size to prevent DoS
    const payloadString = JSON.stringify(payload || {});
    if (payloadString.length > 50000) {
      errorLogger.warn('Event enqueue rejected: payload too large', null, { kind, payloadSize: payloadString.length });
      return { success: false, error: 'Event payload too large (max 50KB)' };
    }
    
    const eventId = await eventQueueService.enqueue(kind, payload, options);
    return { success: true, eventId };
  } catch (error) {
    errorLogger.error('EventQueueService enqueue failed', error as Error, { kind: kind?.substring(0, 50), options });
    return { success: false, error: (error as Error).message };
  }
});

// REMOVED: Internal event queue operations that should not be exposed to renderer
// - db:events:dequeueForFlush - Internal operation only
// - db:events:markSent - Should be handled internally by main process
// - db:events:markFailed - Should be handled internally by main process
// These operations are now performed internally by the eventQueueService

ipcMain.handle('db:events:cleanup', async (_event, olderThanDays = 7) => {
  try {
    const deletedRows = desktopDb.deleteOldSentEvents(olderThanDays);
    return { success: true, deletedRows };
  } catch (error) {
    errorLogger.error('Event cleanup failed', error as Error, { olderThanDays });
    return { success: false, error: (error as Error).message };
  }
});

// Pending events count (for sync status display)
ipcMain.handle('db:events:getPendingCount', async (_event, kind = null) => {
  try {
    const count = desktopDb.getPendingEventsCount(kind);
    return { success: true, count };
  } catch (error) {
    errorLogger.error('Get pending events count failed', error as Error, { kind });
    return { success: false, error: (error as Error).message, count: 0 };
  }
});

// Sync State
ipcMain.handle('db:sync:set', async (_event, key, value) => {
  try {
    return { success: desktopDb.setSyncState(key, value) };
  } catch (error) {
    errorLogger.error('Sync state set failed', error as Error, { key });
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('db:sync:get', async (_event, key) => {
  try {
    const value = desktopDb.getSyncState(key);
    return { success: true, value };
  } catch (error) {
    errorLogger.error('Sync state get failed', error as Error, { key });
    return { success: false, error: (error as Error).message };
  }
});

// Bootstrap Operations
ipcMain.handle('db:bootstrap:fetchAndCache', async (event, accessTokenParam) => {
  try {
    errorLogger.info('Starting bootstrap fetch and cache');
    
    // Security: Validate access token format and length
    const accessToken = accessTokenParam;
    if (!accessToken) {
      errorLogger.warn('No access token available for bootstrap');
      return { success: false, error: 'no_access_token' };
    }
    
    if (typeof accessToken !== 'string') {
      errorLogger.warn('Bootstrap rejected: access token must be string', null, { tokenType: typeof accessToken });
      return { success: false, error: 'invalid_token_type' };
    }
    
    if (accessToken.length > 5000) {
      errorLogger.warn('Bootstrap rejected: access token too long', null, { tokenLength: accessToken.length });
      return { success: false, error: 'token_too_long' };
    }
    
    // Security: Basic JWT format validation (should start with 'eyJ' for header)
    if (!accessToken.startsWith('eyJ')) {
      errorLogger.warn('Bootstrap rejected: invalid JWT format', null, { tokenPrefix: accessToken.substring(0, 10) });
      return { success: false, error: 'invalid_jwt_format' };
    }
    
    // Security: Check for proper JWT structure (should have 2 dots)
    const jwtParts = accessToken.split('.');
    if (jwtParts.length !== 3) {
      errorLogger.warn('Bootstrap rejected: malformed JWT', null, { parts: jwtParts.length });
      return { success: false, error: 'malformed_jwt' };
    }

    // Fetch bootstrap data from API
    const url = `${API_BASE_URL!.replace(/\/$/, '')}/sync/bootstrap`;
    errorLogger.info('Fetching bootstrap data', null, { url });
    
    const startTime = Date.now();
    const result = await httpRequest({
      url,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeoutMs: 10000,
      tag: 'bootstrap'
    });

    const fetchTime = Date.now() - startTime;
    errorLogger.info('HTTP response received', null, { status: result.status, fetchTimeMs: fetchTime });

    // Record performance metric for bootstrap fetch
    try {
      desktopDb.logSyncPerformanceMetric({
        operation: 'bootstrap_fetch',
        durationMs: fetchTime,
        timestamp: Date.now(),
        success: !!result.ok,
        batchSize: 1,
        error: result.ok ? undefined : (result.error?.code || (result.status ? `HTTP ${result.status}` : 'NETWORK_ERROR')),
        context: {
          url,
          status: result.status,
          fetchTimeMs: fetchTime
        },
        process: 'main'
      });
    } catch (perfError) {
      errorLogger.warn('Failed to log bootstrap fetch performance metric', perfError as Error);
    }

    if (!result.ok) {
      const errorText = result.text || (result.json ? JSON.stringify(result.json) : 'Unknown error');
      const code = (result.error?.code || (result.status ? `HTTP_${result.status}` : 'NETWORK_UNAVAILABLE'));
      const message = (result.json && (result.json.message || result.json.error)) || (result.status ? `HTTP ${result.status}` : ERROR_MESSAGES.NETWORK_ERROR);
      errorLogger.error('Bootstrap fetch failed', { 
        status: result.status, 
        code,
        message,
        requestId: result.requestId,
        durationMs: result.durationMs,
        errorText 
      });
      return { success: false, code, message, error: code, status: result.status, details: result.error?.details ?? errorText, requestId: result.requestId, durationMs: result.durationMs };
    }

    const json = result.json ?? {};
    if (!json.success || !json.data) {
      errorLogger.error('Bootstrap response invalid', {
        hasSuccess: !!json.success,
        hasData: !!json.data,
        responseKeys: Object.keys(json || {})
      });
      return { success: false, code: 'INVALID_RESPONSE', message: 'Bootstrap response missing success/data', error: 'INVALID_RESPONSE', details: json };
    }

    // Validate and normalize payload for desktop caching
    let normalized;
    try {
      const fbVer =
        (typeof json?.data?.version === 'string'
          ? json.data.version
          : (json?.data?.version && typeof json.data.version === 'object' && json.data.version.catalogs) || '1.0.0');
      const parser = await resolveSharedParser();
      normalized = parser(json.data, {
        deviceId: getOrCreateDeviceId(),
        fallbackVersion: String(fbVer || '1.0.0')
      });
    } catch (error) {
      errorLogger.error('Bootstrap payload validation failed', error as Error);
      return {
        success: false,
        code: 'INVALID_CACHE_DATA',
        message: 'Bootstrap payload failed validation',
        error: 'INVALID_CACHE_DATA',
        details: (error as any)?.message
      };
    }

    // Version check and cache invalidation if the incoming version differs
    try {
      const prevVersion = desktopDb.getSyncState('bootstrap_version');
      const nextVersion = normalized.version || '1.0.0';
      if (prevVersion && typeof prevVersion === 'string' && prevVersion !== nextVersion) {
        errorLogger.info('Cache version mismatch; invalidating cached content', null, { from: prevVersion, to: nextVersion });
        const ok = desktopDb.clearCachedContent();
        // Record a perf metric for observability
        try {
          desktopDb.logSyncPerformanceMetric({
            operation: 'cache_invalidate',
            durationMs: 0,
            timestamp: Date.now(),
            success: !!ok,
            batchSize: 0,
            context: { from: prevVersion, to: nextVersion },
            process: 'main'
          });
        } catch (perfError) {
          errorLogger.warn('Failed to log cache invalidate performance metric', perfError as Error);
        }
        if (!ok) {
          errorLogger.warn('Cache invalidation reported failure');
        }
      }
    } catch (invErr) {
      errorLogger.warn('Cache invalidation threw', invErr as Error);
    }

    const catalogCount = normalized.catalogs ? Object.keys(normalized.catalogs).length : 0;
    const hasProfile = !!normalized.profile;

    errorLogger.info('Bootstrap data received successfully', null, {
      catalogCount,
      hasProfile,
      hasVersion: !!normalized.version,
      fetchTimeMs: fetchTime
    });

    // Cache catalogs
    let cachedCatalogs = 0;
    const cacheStartTime = Date.now();
    if (normalized.catalogs) {
      errorLogger.info('Caching catalogs', null, { catalogCount });
      
      for (const [key, catalogInfo] of Object.entries(normalized.catalogs)) {
        try {
          const info = catalogInfo as any;
          const success = desktopDb.setCatalog(
            key,
            info.data,
            info.version,
            info.contentHash
          );
          if (success) {
            cachedCatalogs++;
          }
          errorLogger.debug('Cached catalog', null, { 
            key, 
            success, 
            version: info.version,
            hasData: !!info.data,
            hasContentHash: !!info.contentHash
          });
        } catch (error) {
          errorLogger.error('Failed to cache catalog', error as Error, { key });
          return { success: false, error: `cache_catalog_${key}`, details: (error as Error).message };
        }
      }
      
      const cacheTime = Date.now() - cacheStartTime;
      errorLogger.info('Completed catalog caching', null, {
        totalCatalogs: catalogCount,
        successfullyCached: cachedCatalogs,
        cacheTimeMs: cacheTime
      });

      // Record performance metric for catalog caching
      try {
        desktopDb.logSyncPerformanceMetric({
          operation: 'catalog_cache',
          durationMs: cacheTime,
          timestamp: Date.now(),
          success: true,
          batchSize: catalogCount,
          context: {
            totalCatalogs: catalogCount,
            successfullyCached: cachedCatalogs,
            cacheTimeMs: cacheTime
          },
          process: 'main'
        });
      } catch (perfError) {
        errorLogger.warn('Failed to log catalog cache performance metric', perfError as Error);
      }
    }

    // Cache profile snapshot if available
    let profileCached = false;
    const profileCacheStartTime = Date.now();
    if (normalized.profile) {
      try {
        errorLogger.info('Caching profile snapshot', null, {
          userId: normalized.profile.userId,
          deviceId: normalized.profile.deviceId,
          hasData: !!normalized.profile.data,
          schemaVersion: normalized.profile.schemaVersion
        });
        
        const success = desktopDb.setProfileSnapshot(
          normalized.profile.userId,
          normalized.profile.deviceId,
          normalized.profile.data,
          normalized.profile.schemaVersion || 1
        );
        profileCached = success;
        const profileCacheTime = Date.now() - profileCacheStartTime;
        
        errorLogger.info('Profile snapshot cached', null, { 
          success,
          userId: normalized.profile.userId,
          cacheTimeMs: profileCacheTime
        });

        // Record performance metric for profile caching
        try {
          desktopDb.logSyncPerformanceMetric({
            operation: 'profile_cache',
            durationMs: profileCacheTime,
            timestamp: Date.now(),
            success: success,
            batchSize: 1,
            context: {
              userId: normalized.profile.userId,
              success: success,
              cacheTimeMs: profileCacheTime
            },
            process: 'main'
          });
        } catch (perfError) {
          errorLogger.warn('Failed to log profile cache performance metric', perfError as Error);
        }
      } catch (error) {
        errorLogger.error('Failed to cache profile snapshot', error as Error, {
          userId: normalized.profile?.userId
        });
        return { success: false, error: 'cache_profile', details: (error as Error).message };
      }
    }

    // Store bootstrap completion timestamp
    try {
      errorLogger.info('Recording bootstrap completion state');
      const stateStartTime = Date.now();
      
      desktopDb.setSyncState('bootstrap_completed_at', new Date().toISOString());
      desktopDb.setSyncState('bootstrap_version', normalized.version || '1.0.0');
      
      const stateTime = Date.now() - stateStartTime;
      errorLogger.info('Bootstrap state recorded', null, {
        version: normalized.version || '1.0.0',
        stateTimeMs: stateTime
      });
    } catch (error) {
      errorLogger.error('Failed to record bootstrap state', error as Error);
    }

    const totalTime = Date.now() - startTime;
    errorLogger.info('Bootstrap fetch and cache completed', null, {
      totalTimeMs: totalTime,
      catalogsCached: cachedCatalogs,
      profileCached,
      hasProfile
    });

    // Record overall performance metric for bootstrap operation
    try {
      desktopDb.logSyncPerformanceMetric({
        operation: 'bootstrap_complete',
        durationMs: totalTime,
        timestamp: Date.now(),
        success: true,
        batchSize: 1,
        context: {
          totalTimeMs: totalTime,
          catalogsCached: cachedCatalogs,
          profileCached,
          hasProfile,
          catalogCount
        },
        process: 'main'
      });
    } catch (perfError) {
      errorLogger.warn('Failed to log bootstrap complete performance metric', perfError as Error);
    }
    
    return { success: true, data: json.data };
 } catch (error) {
    const errorTime = Date.now();
    errorLogger.fatal('Bootstrap fetchAndCache failed with exception', error as Error);
    
    // Record performance metric for failed bootstrap operation
    try {
      desktopDb.logSyncPerformanceMetric({
        operation: 'bootstrap_complete',
        durationMs: 0, // Duration not meaningful for exceptions
        timestamp: errorTime,
        success: false,
        batchSize: 1,
        error: (error as Error).message,
        context: {
          errorType: (error as any).constructor.name,
          errorMessage: (error as Error).message
        },
        process: 'main'
      });
    } catch (perfError) {
      errorLogger.warn('Failed to log bootstrap error performance metric', perfError as Error);
    }
    
    return { success: false, error: 'exception', details: (error as Error).message };
  }
});

// Database Health
ipcMain.handle('db:health', async () => {
  try {
    const health = desktopDb.getHealthInfo();
    return { success: true, health };
  } catch (error) {
    errorLogger.error('Database health check failed', error as Error);
    return { success: false, error: (error as Error).message };
  }
});

// Error Logging IPC Handlers
ipcMain.handle('error:log', async (_event, entry) => {
  try {
    // Security: Validate error entry structure and size
    if (!entry || typeof entry !== 'object') {
      return { success: false, error: 'Error entry must be an object' };
    }
    
    // Security: Limit message length to prevent DoS
    if (entry.message && typeof entry.message === 'string' && entry.message.length > 5000) {
      entry.message = entry.message.substring(0, 5000) + '... [truncated]';
    }
    
    // Security: Limit stack trace length
    if (entry.stack && typeof entry.stack === 'string' && entry.stack.length > 10000) {
      entry.stack = entry.stack.substring(0, 10000) + '... [truncated]';
    }
    
    const result = desktopDb.logError(entry);
    return { success: true, id: result };
  } catch (error) {
    console.error('[Main] Error logging failed:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('error:getRecent', async (_event, hours = 24) => {
  try {
    const errors = desktopDb.getRecentErrors(hours);
    return { success: true, errors };
  } catch (error) {
    errorLogger.error('Failed to get recent errors', error as Error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('error:clear', async () => {
  try {
    desktopDb.clearErrorLogs();
    return { success: true };
  } catch (error) {
    errorLogger.error('Failed to clear stored logs', error as Error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('error:export', async (_event, { format = 'json', hours = 24 } = {}) => {
  try {
    const errors = desktopDb.getRecentErrors(hours);
    const data = format === 'json' ? JSON.stringify(errors, null, 2) : errors.map(e => JSON.stringify(e)).join('\n');
    return { success: true, data };
  } catch (error) {
    errorLogger.error('Failed to export errors', error as Error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('error:getStats', async (_event, hours = 24) => {
  try {
    const errors = desktopDb.getRecentErrors(hours);
    const stats = {
      total: errors.length,
      byLevel: errors.reduce((acc: Record<string, number>, e: any) => {
        acc[e.level || 'unknown'] = (acc[e.level || 'unknown'] || 0) + 1;
        return acc;
      }, {})
    };
    return { success: true, stats };
  } catch (error) {
    errorLogger.error('Failed to get error stats', error as Error);
    return { success: false, error: (error as Error).message };
  }
});

// Security monitoring handlers removed - no longer needed

 // ===== Performance Monitoring IPC Handlers =====
ipcMain.handle('perf:getMetrics', async (_event, hours = 24) => {
  try {
    const h = Number(hours);
    const windowHours = Number.isFinite(h) && h > 0 ? h : 24;
    const data = performanceMonitoringService.getMetrics(windowHours);
    return { success: true, data };
  } catch (error) {
    errorLogger.error('perf:getMetrics failed', error as Error, { hours });
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('perf:getStats', async (_event, hours = 24) => {
  try {
    const h = Number(hours);
    const windowHours = Number.isFinite(h) && h > 0 ? h : 24;
    const stats = performanceMonitoringService.getStats(windowHours);
    return { success: true, stats };
  } catch (error) {
    errorLogger.error('perf:getStats failed', error as Error, { hours });
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('perf:export', async (_event, { format = 'json', hours = 24 } = {}) => {
  try {
    const fmt = (typeof format === 'string' && (format === 'csv' || format === 'json')) ? format : 'json';
    const h = Number(hours);
    const windowHours = Number.isFinite(h) && h > 0 ? h : 24;
    const data = performanceMonitoringService.export(fmt, windowHours);
    return { success: true, data, format: fmt };
  } catch (error) {
    errorLogger.error('perf:export failed', error as Error, { format, hours });
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('perf:clear', async () => {
  try {
    const deleted = performanceMonitoringService.clear();
    return { success: true, deleted };
  } catch (error) {
    errorLogger.error('perf:clear failed', error as Error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('perf:getThresholds', async () => {
  try {
    const thresholds = performanceMonitoringService.getThresholds();
    return { success: true, thresholds };
  } catch (error) {
    errorLogger.error('perf:getThresholds failed', error as Error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('perf:setThresholds', async (_event, thresholds) => {
  try {
    const ok = performanceMonitoringService.setThresholds(Array.isArray(thresholds) ? thresholds : []);
    return { success: ok };
  } catch (error) {
    errorLogger.error('perf:setThresholds failed', error as Error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('perf:getThresholdBreaches', async (_event, hours = 1) => {
  try {
    const h = Number(hours);
    const windowHours = Number.isFinite(h) && h > 0 ? h : 1;
    const breaches = performanceMonitoringService.getThresholdBreaches(windowHours);
    return { success: true, breaches };
  } catch (error) {
    errorLogger.error('perf:getThresholdBreaches failed', error as Error, { hours });
    return { success: false, error: (error as Error).message };
  }
});

function resolveClientIndex() {
  // During development, load the client build from packages/client/dist/index.html
  const devIndex = path.resolve(DIRNAME, '../../client/dist/index.html');
  if (isDev && fs.existsSync(devIndex)) {
    return devIndex;
  }

  // Candidate locations for packaged builds. These cover common layouts for
  // electron-builder/forge where assets are placed under resources/app or app.asar.
  const candidates = [
    // electron-builder typical: resources/app/<copied client>
    path.join(process.resourcesPath, 'app', 'client', FILE_PATHS.INDEX_HTML),
    path.join(process.resourcesPath, 'app', 'packages', 'client', DIRECTORY_PATHS.DIST, FILE_PATHS.INDEX_HTML),

    // Asar-packed variants
    path.join(process.resourcesPath, 'app.asar', 'client', FILE_PATHS.INDEX_HTML),
    path.join(process.resourcesPath, 'app.asar', 'packages', 'client', DIRECTORY_PATHS.DIST, FILE_PATHS.INDEX_HTML),

    // Loose resources (if copied without app/app.asar)
    path.join(process.resourcesPath, 'client', FILE_PATHS.INDEX_HTML),
    path.join(process.resourcesPath, 'packages', 'client', DIRECTORY_PATHS.DIST, FILE_PATHS.INDEX_HTML),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch (error) {
      errorLogger.warn('Failed to check candidate path', error as Error, { path: p });
    }
  }

  errorLogger.warn('Could not find packaged index.html', null, { candidates: candidates.join(', ') });
  // Fallback to devIndex to aid local development
  return devIndex;
}

function createMainWindow() {
  logStartup('createMainWindow:begin');
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#111318',
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(DIRNAME, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: false
    }
  });

  // Window lifecycle diagnostics
  win.on('show', () => logStartup('window:show'));
  win.on('focus', () => logStartup('window:focus'));
  win.on('blur', () => logStartup('window:blur'));
  win.on('closed', () => logStartup('window:closed'));

  // CSP Enforcement via headers (dev allows 'unsafe-eval' for Pixi dev tooling; prod removes it)
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;"
      : "script-src 'self' 'unsafe-inline' blob:;";

    const csp = `
  default-src 'self';
  ${scriptSrc}
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  connect-src 'self' https: http: ws: wss:;
  media-src 'self' blob:;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
    `;
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });

  win.once('ready-to-show', () => {
    logStartup('ready-to-show');
    win.show();
    try {
      if (isDev) {
        win.webContents.openDevTools({ mode: 'detach' });
      }
    } catch (error) {
      errorLogger.warn('Failed to open dev tools', error as Error);
    }
  });

  // Open external links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Diagnostics: surface renderer/main failures and console to the terminal
  win.webContents.on('render-process-gone', (_ev, details) => {
    logStartup('render-process-gone', details);
    errorLogger.error('render-process-gone', details);
  });
  
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelNames = ['log','warn','error','info','debug'];
    const lvl = levelNames[level] || level;

    // Filter out known harmless DevTools Autofill protocol noise
    try {
      const src = String(sourceId || '');
      const msg = String(message || '');
      if (src.startsWith('devtools://') && (msg.includes('Autofill.enable') || msg.includes('Autofill.setAddresses'))) {
        return; // suppress noisy devtools protocol errors
      }
    } catch {}

    const payload = { lvl, message, line, sourceId };
    logStartup('console-message', payload);
    console.log(`[Renderer:${lvl}]`, message, `(at ${sourceId}:${line})`);
  });

  // Inject lightweight navigation diagnostics into the renderer after content loads
  win.webContents.on('did-finish-load', () => {
    const script = `
      (function(){
        try {
          const log = (...args) => console.log('[nav-diag]', ...args);
          // Observe hash/popstate
          window.addEventListener('hashchange', () => log('hashchange', location.href), false);
          window.addEventListener('popstate', () => log('popstate', location.href), false);

          // Wrap history methods to detect absolute-path navigations (e.g., "/login")
          const wrapHistory = (key) => {
            const orig = history[key];
            if (typeof orig !== 'function') return;
            history[key] = function(...args) {
              try {
                const url = args[2] ?? args[0];
                if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
                  console.trace('[nav-diag]', key, 'absolute-path', url);
                }
              } catch {}
              return orig.apply(this, args);
            };
          };
          wrapHistory('pushState');
          wrapHistory('replaceState');

          // Wrap location.assign/replace to detect absolute-path navigations
          try {
            const origAssign = window.location.assign.bind(window.location);
            window.location.assign = function(url) {
              try {
                const s = String(url);
                if (s.startsWith('/') && !s.startsWith('//')) console.trace('[nav-diag]', 'location.assign', s);
              } catch {}
              return origAssign(url);
            };
          } catch {}
          try {
            const origReplace = window.location.replace.bind(window.location);
            window.location.replace = function(url) {
              try {
                const s = String(url);
                if (s.startsWith('/') && !s.startsWith('//')) console.trace('[nav-diag]', 'location.replace', s);
              } catch {}
              return origReplace(url);
            };
          } catch {}

          log('diagnostics-installed', location.href);
        } catch(e) {
          console.warn('[nav-diag] install failed', e && e.message);
        }
      })();
    `;
    try {
      win.webContents.executeJavaScript(script, true).catch((e) => {
        errorLogger.warn('nav-diag injection failed', e);
      });
    } catch (e) {
      errorLogger.warn('nav-diag injection error', e as Error);
    }
  });

  // Guard against accidental top-level navigations to file:///C:/... (e.g., "/login")
  // Always redirect back to our index.html with an appropriate hash route.
  // This handles both direct navigations and also failed loads (e.g., ERR_FILE_NOT_FOUND)
  const redirectToHashRoute = (event: any, url: string, reason: string) => {
    try {
      const u = new URL(url);
      if (u.protocol !== 'file:') return false;

      // Allow loading our packaged index.html; block other file:// paths
      const pathname = u.pathname.replace(/\\/g, '/');
      const isIndex = /index\.html$/i.test(pathname);
      if (isIndex) return false;

      // Derive a best-effort hash from the pathname (handles "/C:/login" and "/login")
      let hashPath = '/';
      const lower = pathname.toLowerCase();
      if (lower.endsWith('/login') || lower === '/c:/login') {
        hashPath = '/login';
      } else {
        // Try to strip drive letter if present
        const m = lower.match(/\/(?:[a-z]:)?(\/.*)$/);
        if (m && m[1]) hashPath = m[1];
      }

      event.preventDefault();
      const indexPath = resolveClientIndex();
      logStartup('nav-redirect', { reason, from: url, to: indexPath, hash: hashPath });
      win.loadFile(indexPath, { hash: hashPath }).catch((e) => {
        errorLogger.error('loadFile redirect failed', e, { from: url, hash: hashPath });
      });
      return true;
    } catch (e) {
      errorLogger.warn('redirectToHashRoute error', e as Error, { url, reason });
      return false;
    }
  };

  win.webContents.on('will-navigate', (event, url) => {
    redirectToHashRoute(event, url, 'will-navigate');
  });

  win.webContents.on('will-redirect', (event, url) => {
    redirectToHashRoute(event, url, 'will-redirect');
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    const payload = { errorCode, errorDescription, validatedURL, isMainFrame };
    logStartup('did-fail-load', payload);
    errorLogger.error('did-fail-load', payload);

    // If this is a file:///C:/login style navigation that failed, redirect back to index with proper hash
    if (isMainFrame && errorCode === -6 && validatedURL) { // -6 is ERR_FILE_NOT_FOUND
      try {
        redirectToHashRoute(event, validatedURL, 'did-fail-load');
      } catch (e) {
        errorLogger.error('Failed to redirect after load failure', e, { validatedURL });
      }
    }
  });

  const indexPath = resolveClientIndex();
  logStartup('createMainWindow:loadFile', { indexPath });
  errorLogger.info('Loading index', null, { indexPath });
  win.loadFile(indexPath).catch((error) => {
    errorLogger.fatal('Failed to load index.html', error);
  });

  return win;
}

app.on('ready', async () => {
  logStartup('app:ready');
  
  // Check if the game was launched through the launcher
  if (!checkLauncherLaunch()) {
    const shouldContinue = await showLauncherWarning();
    if (!shouldContinue) {
      app.quit();
      return;
    }
  }
  
  try {
    // Improve notifications and app identity on Windows
    app.setAppUserModelId(APP_ID);
  } catch (error) {
    errorLogger.warn('Failed to set app user model ID', error as Error);
  }

  // Initialize SQLite BEFORE loading services that depend on it
  try {
    desktopDb.init();
  } catch (error) {
    errorLogger.fatal('Failed to initialize desktop database', error);
  }

  // Load dynamic services now that app path is reliable and DB is initialized
  try {
    await loadEventQueueService();
  } catch (error) {
    errorLogger.fatal('Failed to load eventQueueService at startup', error);
  }

  // Initialize auto-updater service
  try {
    errorLogger.info('Initializing UpdateService...');
    updateService = new UpdateService();
    errorLogger.info('UpdateService instance created');

    // Wait for initialization to complete before starting periodic checks
    try {
      await updateService.readyPromise;
    } catch (e) {
      errorLogger.error('UpdateService failed during initialization', e);
    }

    if (updateService && updateService.isValid) {
      updateService.startPeriodicChecks(60); // Check every hour
      errorLogger.info('UpdateService periodic checks started');

      // Kick off a silent check shortly after startup
      setTimeout(() => {
        try { 
          errorLogger.info('Running delayed silent update check');
          updateService.checkForUpdates(true); 
        } catch (e) {
          errorLogger.error('Delayed update check failed', e);
        }
      }, 5000);

      errorLogger.info('UpdateService initialization completed successfully');
    } else {
      errorLogger.warn('UpdateService invalid after initialization; skipping periodic checks');
    }
  } catch (error) {
    errorLogger.error('Failed to initialize UpdateService', error);
    updateService = null;
  }
  
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // macOS: re-create a window when the dock icon is clicked and no other windows are open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Store references to any child processes we spawn
const childProcesses = new Set();

// Handle app termination gracefully
app.on('before-quit', (event) => {
  errorLogger.info('Application shutting down');
  
  // Prevent immediate quit to allow cleanup
  event.preventDefault();
  
  // Kill any child processes we spawned
  childProcesses.forEach((child: any) => {
    try {
      if (!child.killed) {
        child.kill('SIGTERM');
        // Force kill after 2 seconds if still running
        setTimeout(() => {
          if (!child.killed) {
            try {
              child.kill('SIGKILL');
            } catch (err) {
              console.error('Failed to force kill child process:', err);
            }
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to kill child process:', err);
    }
  });
  
  // Security service cleanup removed - no longer needed
  
  // errorLogger doesn't have a close method, skip this step
  
  // Close database connection
  try {
    desktopDb.close();
  } catch (err) {
    console.error('Failed to close database:', err);
  }
  
  // Give processes time to cleanup, then force quit
  setTimeout(() => {
    console.log('Force quitting application');
    app.exit(0);
  }, 300);
});

// Add process signal handlers for better cleanup
process.on('SIGTERM', () => {
  errorLogger.info('Received SIGTERM signal');
  app.quit();
});

process.on('SIGINT', () => {
  errorLogger.info('Received SIGINT signal');
 app.quit();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  errorLogger.fatal('Uncaught Exception in main process', error);
  app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  errorLogger.error('Unhandled Promise Rejection in main process', reason);
  app.quit();
});
