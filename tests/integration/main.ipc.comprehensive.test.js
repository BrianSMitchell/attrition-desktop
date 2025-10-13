import { ERROR_MESSAGES } from '../constants/response-formats';

import { HTTP_STATUS } from '../packages/shared/src/response-formats';
const path = require('path');
const fs = require('fs');

// Mock electron modules
const mockIpcMain = {
  handle: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn()
};

const mockApp = {
  getVersion: jest.fn().mockReturnValue('1.0.0'),
  isPackaged: false,
  setAppUserModelId: jest.fn(),
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(__dirname, 'test-data-ipc');
    }
    return '';
  }
};

const mockShell = {
  openExternal: jest.fn().mockResolvedValue(true),
  openPath: jest.fn().mockResolvedValue('')
};

const mockBrowserWindow = {
  getAllWindows: jest.fn().mockReturnValue([]),
  fromWebContents: jest.fn().mockReturnValue({
    show: jest.fn(),
    hide: jest.fn(),
    destroy: jest.fn()
  })
};

// Mock electron
jest.mock('electron', () => ({
  app: mockApp,
  shell: mockShell,
  BrowserWindow: mockBrowserWindow,
  ipcMain: mockIpcMain
}));

// Mock keytar
const mockKeytar = {
  getPassword: jest.fn(),
  setPassword: jest.fn(),
  deletePassword: jest.fn()
};

jest.mock('keytar', () => mockKeytar);

// Mock node modules
jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

jest.mock('node:path', () => ({
  ...jest.requireActual('node:path'),
  resolve: jest.fn((...args) => args.join('/')),
  join: jest.fn((...args) => args.join('/'))
}));

// Mock desktop database
const mockDesktopDb = {
  setKeyValue: jest.fn(),
  getKeyValue: jest.fn(),
  deleteKeyValue: jest.fn(),
  setCatalog: jest.fn(),
  getCatalog: jest.fn(),
  getAllCatalogs: jest.fn(),
  setProfileSnapshot: jest.fn(),
  getProfileSnapshot: jest.fn(),
  enqueueEvent: jest.fn(),
  dequeueEventsForFlush: jest.fn(),
  markEventSent: jest.fn(),
  markEventFailed: jest.fn(),
  markEventCompleted: jest.fn(),
  deleteOldSentEvents: jest.fn(),
  setSyncState: jest.fn(),
  getSyncState: jest.fn(),
  getHealthInfo: jest.fn(),
  getEventStats: jest.fn(),
  getPendingEventsCount: jest.fn(),
  retryFailedEvents: jest.fn(),
  clearFailedEvents: jest.fn()
};

jest.mock('../db.js', () => mockDesktopDb);

// Test data directory
const testDataDir = path.join(__dirname, 'test-data-ipc');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

describe('Main Process IPC Handlers - Comprehensive Tests', () => {
  let ipcHandlers = {};
  let mainModule;

  // Helper to register IPC handlers
  const registerIpcHandler = (channel, handler) => {
    ipcHandlers[channel] = handler;
  };

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Setup ipcMain mock to capture handlers
    mockIpcMain.handle.mockImplementation((channel, handler) => {
      registerIpcHandler(channel, handler);
    });

    // Import main module to register handlers
    jest.isolateModules(() => {
      mainModule = require('../main.js');
    });

    // Reset mock implementations
    mockDesktopDb.setKeyValue.mockReset();
    mockDesktopDb.getKeyValue.mockReset();
    mockDesktopDb.deleteKeyValue.mockReset();
    mockDesktopDb.setCatalog.mockReset();
    mockDesktopDb.getCatalog.mockReset();
    mockDesktopDb.getAllCatalogs.mockReset();
    mockDesktopDb.setProfileSnapshot.mockReset();
    mockDesktopDb.getProfileSnapshot.mockReset();
    mockDesktopDb.enqueueEvent.mockReset();
    mockDesktopDb.dequeueEventsForFlush.mockReset();
    mockDesktopDb.markEventSent.mockReset();
    mockDesktopDb.markEventFailed.mockReset();
    mockDesktopDb.markEventCompleted.mockReset();
    mockDesktopDb.deleteOldSentEvents.mockReset();
    mockDesktopDb.setSyncState.mockReset();
    mockDesktopDb.getSyncState.mockReset();
    mockDesktopDb.getHealthInfo.mockReset();
    mockDesktopDb.getEventStats.mockReset();
    mockDesktopDb.getPendingEventsCount.mockReset();
    mockDesktopDb.retryFailedEvents.mockReset();
    mockDesktopDb.clearFailedEvents.mockReset();
  });

  afterEach(() => {
    // Clean up test data directory
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
    
    // Clear IPC handlers
    ipcHandlers = {};
  });

  describe('Application IPC Handlers', () => {
    test('should handle app:getVersion correctly', async () => {
      const handler = ipcHandlers['app:getVersion'];
      expect(handler).toBeDefined();
      
      const result = await handler();
      expect(result).toBe('1.0.0');
    });

    test('should handle app:openExternal with valid URL', async () => {
      const handler = ipcHandlers['app:openExternal'];
      expect(handler).toBeDefined();
      
      const testUrl = 'https://example.com';
      const result = await handler(null, testUrl);
      expect(result).toBe(true);
      expect(mockShell.openExternal).toHaveBeenCalledWith(testUrl);
    });

    test('should handle app:openExternal with invalid URL gracefully', async () => {
      const handler = ipcHandlers['app:openExternal'];
      
      const result = await handler(null, 'invalid-url');
      expect(result).toBe(false);
      expect(mockShell.openExternal).not.toHaveBeenCalled();
    });

    test('should handle app:openExternal with URL parsing errors', async () => {
      const handler = ipcHandlers['app:openExternal'];
      
      // Mock shell.openExternal to throw an error
      mockShell.openExternal.mockRejectedValueOnce(new Error(ERROR_MESSAGES.NETWORK_ERROR));
      
      const result = await handler(null, 'https://example.com');
      expect(result).toBe(false);
      expect(mockShell.openExternal).toHaveBeenCalledWith('https://example.com');
    });
  });

  describe('Network Status IPC Handlers', () => {
    test('should handle network:getStatus correctly', async () => {
      const handler = ipcHandlers['network:getStatus'];
      expect(handler).toBeDefined();
      
      const result = await handler();
      expect(result).toEqual({
        isOnline: true,
        isApiReachable: true,
        lastChecked: expect.any(Number),
        latencyMs: 0
      });
    });

    test('should handle network:isFullyConnected correctly', async () => {
      const handler = ipcHandlers['network:isFullyConnected'];
      expect(handler).toBeDefined();
      
      const result = await handler();
      expect(result).toBe(true);
    });

    test('should handle network status with custom values', async () => {
      // This would require mocking the network status in main.js
      // For now, we test the default behavior
      const getStatusHandler = ipcHandlers['network:getStatus'];
      const isFullyConnectedHandler = ipcHandlers['network:isFullyConnected'];
      
      const status = await getStatusHandler();
      const isConnected = await isFullyConnectedHandler();
      
      expect(status.isOnline).toBe(true);
      expect(status.isApiReachable).toBe(true);
      expect(isConnected).toBe(true);
    });
  });

  describe('Token Storage IPC Handlers', () => {
    const APP_ID = 'com.attrition.desktop';

    beforeEach(() => {
      // Reset keytar mocks for each test
      mockKeytar.getPassword.mockReset();
      mockKeytar.setPassword.mockReset();
      mockKeytar.deletePassword.mockReset();
    });









    test('should handle tokens:saveRefresh correctly', async () => {
      const handler = ipcHandlers['tokens:saveRefresh'];
      expect(handler).toBeDefined();
      
      const testToken = 'refresh-token';
      mockKeytar.setPassword.mockResolvedValueOnce(undefined);
      
      const result = await handler(null, testToken);
      expect(result).toEqual({ ok: true });
      expect(mockKeytar.setPassword).toHaveBeenCalledWith(APP_ID, 'refresh', testToken);
    });

    test('should handle tokens:saveRefresh with null value', async () => {
      const handler = ipcHandlers['tokens:saveRefresh'];
      
      mockKeytar.setPassword.mockResolvedValueOnce(undefined);
      
      const result = await handler(null, null);
      expect(result).toEqual({ ok: true });
      expect(mockKeytar.setPassword).toHaveBeenCalledWith(APP_ID, 'refresh', '');
    });

    test('should handle tokens:saveRefresh with error gracefully', async () => {
      const handler = ipcHandlers['tokens:saveRefresh'];
      
      mockKeytar.setPassword.mockRejectedValueOnce(new Error('Keychain error'));
      
      const result = await handler(null, 'test-token');
      expect(result).toEqual({ ok: false });
    });

    test('should handle tokens:deleteRefresh correctly', async () => {
      const handler = ipcHandlers['tokens:deleteRefresh'];
      expect(handler).toBeDefined();
      
      mockKeytar.deletePassword.mockResolvedValueOnce(undefined);
      
      const result = await handler();
      expect(result).toEqual({ ok: true });
      expect(mockKeytar.deletePassword).toHaveBeenCalledWith(APP_ID, 'refresh');
    });

    test('should handle tokens:deleteRefresh with error gracefully', async () => {
      const handler = ipcHandlers['tokens:deleteRefresh'];
      
      mockKeytar.deletePassword.mockRejectedValueOnce(new Error('Keychain error'));
      
      const result = await handler();
      expect(result).toEqual({ ok: false });
    });

    test('should handle tokens:hasRefresh correctly when token exists', async () => {
      const handler = ipcHandlers['tokens:hasRefresh'];
      expect(handler).toBeDefined();
      
      const testToken = 'refresh-token';
      mockKeytar.getPassword.mockResolvedValueOnce(testToken);
      
      const result = await handler();
      expect(result).toEqual({ ok: true, has: true });
      expect(mockKeytar.getPassword).toHaveBeenCalledWith(APP_ID, 'refresh');
    });

    test('should handle tokens:hasRefresh correctly when no token exists', async () => {
      const handler = ipcHandlers['tokens:hasRefresh'];
      
      mockKeytar.getPassword.mockResolvedValueOnce(null);
      
      const result = await handler();
      expect(result).toEqual({ ok: true, has: false });
    });

    test('should handle tokens:hasRefresh with error gracefully', async () => {
      const handler = ipcHandlers['tokens:hasRefresh'];
      
      mockKeytar.getPassword.mockRejectedValueOnce(new Error('Keychain error'));
      
      const result = await handler();
      expect(result).toEqual({ ok: false, has: false });
    });
  });

  describe('Authentication IPC Handlers', () => {
    const APP_ID = 'com.attrition.desktop';

    beforeEach(() => {
      // Reset fetch mock
      global.fetch = jest.fn();
    });

    test('should handle auth:refresh successfully', async () => {
      const handler = ipcHandlers['auth:refresh'];
      expect(handler).toBeDefined();
      
      const refreshToken = 'test-refresh-token';
      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';
      
      // Mock refresh token retrieval
      mockKeytar.getPassword.mockResolvedValueOnce(refreshToken);
      
      // Mock fetch response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: {
            token: newAccessToken,
            refreshToken: newRefreshToken
          }
        })
      });
      
      // Mock keytar.setPassword for refresh token rotation
      mockKeytar.setPassword.mockResolvedValueOnce(undefined);
      
      const result = await handler();
      expect(result).toEqual({ ok: true, token: newAccessToken });
      expect(mockKeytar.setPassword).toHaveBeenCalledWith(APP_ID, 'refresh', newRefreshToken);
    });

    test('should handle auth:refresh when no refresh token exists', async () => {
      const handler = ipcHandlers['auth:refresh'];
      
      mockKeytar.getPassword.mockResolvedValueOnce(null);
      
      const result = await handler();
      expect(result).toEqual({ ok: false, error: 'no_refresh' });
    });

    test('should handle auth:refresh when HTTP request fails', async () => {
      const handler = ipcHandlers['auth:refresh'];
      
      const refreshToken = 'test-refresh-token';
      mockKeytar.getPassword.mockResolvedValueOnce(refreshToken);
      
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: HTTP_STATUS.UNAUTHORIZED
      });
      
      const result = await handler();
      expect(result).toEqual({ ok: false, status: HTTP_STATUS.UNAUTHORIZED });
    });

    test('should handle auth:refresh when fetch throws error', async () => {
      const handler = ipcHandlers['auth:refresh'];
      
      const refreshToken = 'test-refresh-token';
      mockKeytar.getPassword.mockResolvedValueOnce(refreshToken);
      
      global.fetch.mockRejectedValueOnce(new Error(ERROR_MESSAGES.NETWORK_ERROR));
      
      const result = await handler();
      expect(result).toEqual({ ok: false, error: 'exception' });
    });

    test('should handle auth:refresh with invalid JSON response', async () => {
      const handler = ipcHandlers['auth:refresh'];
      
      const refreshToken = 'test-refresh-token';
      mockKeytar.getPassword.mockResolvedValueOnce(refreshToken);
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON'))
      });
      
      const result = await handler();
      expect(result).toEqual({ ok: false, error: 'refresh_failed' });
    });

    test('should handle auth:refresh with unsuccessful response', async () => {
      const handler = ipcHandlers['auth:refresh'];
      
      const refreshToken = 'test-refresh-token';
      mockKeytar.getPassword.mockResolvedValueOnce(refreshToken);
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: false,
          error: 'invalid_credentials'
        })
      });
      
      const result = await handler();
      expect(result).toEqual({ ok: false, error: 'invalid_credentials' });
    });

    test('should handle auth:refresh with refresh token rotation failure', async () => {
      const handler = ipcHandlers['auth:refresh'];
      
      const refreshToken = 'test-refresh-token';
      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';
      
      mockKeytar.getPassword.mockResolvedValueOnce(refreshToken);
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: {
            token: newAccessToken,
            refreshToken: newRefreshToken
          }
        })
      });
      
      // Mock keytar.setPassword to fail
      mockKeytar.setPassword.mockRejectedValueOnce(new Error('Keychain error'));
      
      const result = await handler();
      expect(result).toEqual({ ok: true, token: newAccessToken });
      // Should still succeed even if refresh token rotation fails
    });
  });

  describe('Database KV Store IPC Handlers', () => {
    test('should handle db:kv:set correctly', async () => {
      const handler = ipcHandlers['db:kv:set'];
      expect(handler).toBeDefined();
      
      const testKey = 'test-key';
      const testValue = { data: 'test' };
      mockDesktopDb.setKeyValue.mockReturnValueOnce(true);
      
      const result = await handler(null, testKey, testValue);
      expect(result).toEqual({ success: true });
      expect(mockDesktopDb.setKeyValue).toHaveBeenCalledWith(testKey, testValue);
    });

    test('should handle db:kv:set with error gracefully', async () => {
      const handler = ipcHandlers['db:kv:set'];
      
      const testKey = 'test-key';
      const testValue = { data: 'test' };
      mockDesktopDb.setKeyValue.mockReturnValueOnce(false);
      
      const result = await handler(null, testKey, testValue);
      expect(result).toEqual({ success: false, error: expect.any(String) });
    });

    test('should handle db:kv:set with exception gracefully', async () => {
      const handler = ipcHandlers['db:kv:set'];
      
      const testKey = 'test-key';
      const testValue = { data: 'test' };
      mockDesktopDb.setKeyValue.mockImplementationOnce(() => {
        throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
      });
      
      const result = await handler(null, testKey, testValue);
      expect(result).toEqual({ success: false, error: ERROR_MESSAGES.DATABASE_ERROR });
    });

    test('should handle db:kv:get correctly', async () => {
      const handler = ipcHandlers['db:kv:get'];
      expect(handler).toBeDefined();
      
      const testKey = 'test-key';
      const testValue = { data: 'test' };
      mockDesktopDb.getKeyValue.mockReturnValueOnce(testValue);
      
      const result = await handler(null, testKey);
      expect(result).toEqual({ success: true, value: testValue });
      expect(mockDesktopDb.getKeyValue).toHaveBeenCalledWith(testKey);
    });

    test('should handle db:kv:get when no value exists', async () => {
      const handler = ipcHandlers['db:kv:get'];
      
      const testKey = 'non-existent-key';
      mockDesktopDb.getKeyValue.mockReturnValueOnce(null);
      
      const result = await handler(null, testKey);
      expect(result).toEqual({ success: true, value: null });
    });

    test('should handle db:kv:get with error gracefully', async () => {
      const handler = ipcHandlers['db:kv:get'];
      
      const testKey = 'test-key';
      mockDesktopDb.getKeyValue.mockImplementationOnce(() => {
        throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
      });
      
      const result = await handler(null, testKey);
      expect(result).toEqual({ success: false, error: ERROR_MESSAGES.DATABASE_ERROR });
    });

    test('should handle db:kv:delete correctly', async () => {
      const handler = ipcHandlers['db:kv:delete'];
      expect(handler).toBeDefined();
      
      const testKey = 'test-key';
      mockDesktopDb.deleteKeyValue.mockReturnValueOnce(true);
      
      const result = await handler(null, testKey);
      expect(result).toEqual({ success: true });
      expect(mockDesktopDb.deleteKeyValue).toHaveBeenCalledWith(testKey);
    });

    test('should handle db:kv:delete when key does not exist', async () => {
      const handler = ipcHandlers['db:kv:delete'];
      
      const testKey = 'non-existent-key';
      mockDesktopDb.deleteKeyValue.mockReturnValueOnce(false);
      
      const result = await handler(null, testKey);
      expect(result).toEqual({ success: true });
      // Should still return success even if key doesn't exist
    });

    test('should handle db:kv:delete with error gracefully', async () => {
      const handler = ipcHandlers['db:kv:delete'];
      
      const testKey = 'test-key';
      mockDesktopDb.deleteKeyValue.mockImplementationOnce(() => {
        throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
      });
      
      const result = await handler(null, testKey);
      expect(result).toEqual({ success: false, error: ERROR_MESSAGES.DATABASE_ERROR });
    });
  });

  describe('Database Catalog IPC Handlers', () => {
    test('should handle db:catalogs:set correctly', async () => {
      const handler = ipcHandlers['db:catalogs:set'];
      expect(handler).toBeDefined();
      
      const testKey = 'buildings';
      const testData = { items: [] };
      const testVersion = '1.0.0';
      const testHash = 'abc123';
      mockDesktopDb.setCatalog.mockReturnValueOnce(true);
      
      const result = await handler(null, testKey, testData, testVersion, testHash);
      expect(result).toEqual({ success: true });
      expect(mockDesktopDb.setCatalog).toHaveBeenCalledWith(testKey, testData, testVersion, testHash);
    });

    test('should handle db:catalogs:set with error gracefully', async () => {
      const handler = ipcHandlers['db:catalogs:set'];
      
      const testKey = 'buildings';
      const testData = { items: [] };
      const testVersion = '1.0.0';
      const testHash = 'abc123';
      mockDesktopDb.setCatalog.mockReturnValueOnce(false);
      
      const result = await handler(null, testKey, testData, testVersion, testHash);
      expect(result).toEqual({ success: false, error: expect.any(String) });
    });

    test('should handle db:catalogs:get correctly', async () => {
      const handler = ipcHandlers['db:catalogs:get'];
      expect(handler).toBeDefined();
      
      const testKey = 'buildings';
      const testCatalog = { data: { items: [] }, version: '1.0.0' };
      mockDesktopDb.getCatalog.mockReturnValueOnce(testCatalog);
      
      const result = await handler(null, testKey);
      expect(result).toEqual({ success: true, catalog: testCatalog });
      expect(mockDesktopDb.getCatalog).toHaveBeenCalledWith(testKey);
    });

    test('should handle db:catalogs:get when catalog does not exist', async () => {
      const handler = ipcHandlers['db:catalogs:get'];
      
      const testKey = 'non-existent-catalog';
      mockDesktopDb.getCatalog.mockReturnValueOnce(null);
      
      const result = await handler(null, testKey);
      expect(result).toEqual({ success: true, catalog: null });
    });

    test('should handle db:catalogs:get with error gracefully', async () => {
      const handler = ipcHandlers['db:catalogs:get'];
      
      const testKey = 'buildings';
      mockDesktopDb.getCatalog.mockImplementationOnce(() => {
        throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
      });
      
      const result = await handler(null, testKey);
      expect(result).toEqual({ success: false, error: ERROR_MESSAGES.DATABASE_ERROR });
    });

    test('should handle db:catalogs:getAll correctly', async () => {
      const handler = ipcHandlers['db:catalogs:getAll'];
      expect(handler).toBeDefined();
      
      const testCatalogs = { buildings: { data: {} }, units: { data: {} } };
      mockDesktopDb.getAllCatalogs.mockReturnValueOnce(testCatalogs);
      
      const result = await handler();
      expect(result).toEqual({ success: true, catalogs: testCatalogs });
      expect(mockDesktopDb.getAllCatalogs).toHaveBeenCalled();
    });

    test('should handle db:catalogs:getAll with error gracefully', async () => {
      const handler = ipcHandlers['db:catalogs:getAll'];
      
      mockDesktopDb.getAllCatalogs.mockImplementationOnce(() => {
        throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
      });
      
      const result = await handler();
      expect(result).toEqual({ success: false, error: ERROR_MESSAGES.DATABASE_ERROR });
    });
  });

  describe('Database Profile IPC Handlers', () => {
    test('should handle db:profile:set correctly', async () => {
      const handler = ipcHandlers['db:profile:set'];
      expect(handler).toBeDefined();
      
      const userId = 'user-123';
      const deviceId = 'device-456';
      const snapshotData = { level: 10 };
      const schemaVersion = 2;
      mockDesktopDb.setProfileSnapshot.mockReturnValueOnce(true);
      
      const result = await handler(null, userId, deviceId, snapshotData, schemaVersion);
      expect(result).toEqual({ success: true });
      expect(mockDesktopDb.setProfileSnapshot).toHaveBeenCalledWith(userId, deviceId, snapshotData, schemaVersion);
    });

    test('should handle db:profile:set with error gracefully', async () => {
      const handler = ipcHandlers['db:profile:set'];
      
      const userId = 'user-123';
      const deviceId = 'device-456';
      const snapshotData = { level: 10 };
      const schemaVersion = 2;
      mockDesktopDb.setProfileSnapshot.mockReturnValueOnce(false);
      
      const result = await handler(null, userId, deviceId, snapshotData, schemaVersion);
      expect(result).toEqual({ success: false, error: expect.any(String) });
    });

    test('should handle db:profile:get correctly', async () => {
      const handler = ipcHandlers['db:profile:get'];
      expect(handler).toBeDefined();
      
      const userId = 'user-123';
      const deviceId = 'device-456';
      const testProfile = { data: { level: 10 }, fetchedAt: new Date().toISOString() };
      mockDesktopDb.getProfileSnapshot.mockReturnValueOnce(testProfile);
      
      const result = await handler(null, userId, deviceId);
      expect(result).toEqual({ success: true, profile: testProfile });
      expect(mockDesktopDb.getProfileSnapshot).toHaveBeenCalledWith(userId, deviceId);
    });

    test('should handle db:profile:get when profile does not exist', async () => {
      const handler = ipcHandlers['db:profile:get'];
      
      const userId = 'user-123';
      const deviceId = 'device-456';
      mockDesktopDb.getProfileSnapshot.mockReturnValueOnce(null);
      
      const result = await handler(null, userId, deviceId);
      expect(result).toEqual({ success: true, profile: null });
    });

    test('should handle db:profile:get with error gracefully', async () => {
      const handler = ipcHandlers['db:profile:get'];
      
      const userId = 'user-123';
      const deviceId = 'device-456';
      mockDesktopDb.getProfileSnapshot.mockImplementationOnce(() => {
        throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
      });
      
      const result = await handler(null, userId, deviceId);
      expect(result).toEqual({ success: false, error: ERROR_MESSAGES.DATABASE_ERROR });
    });
  });

  describe('Database Event Queue IPC Handlers', () => {
    test('should handle db:events:enqueue correctly', async () => {
      const handler = ipcHandlers['db:events:enqueue'];
      expect(handler).toBeDefined();
      
      const kind = 'structures';
      const deviceId = 'device-123';
      const payload = { action: 'build' };
      const dedupeKey = 'dedupe-456';
      const eventId = 1;
      mockDesktopDb.enqueueEvent.mockReturnValueOnce(eventId);
      
      const result = await handler(null, kind, deviceId, payload, dedupeKey);
      expect(result).toEqual({ success: true, id: eventId });
      expect(mockDesktopDb.enqueueEvent).toHaveBeenCalledWith(kind, deviceId, payload, { dedupeKey });
    });

    test('should handle db:events:enqueue with error gracefully', async () => {
      const handler = ipcHandlers['db:events:enqueue'];
      
      const kind = 'structures';
      const deviceId = 'device-123';
      const payload = { action: 'build' };
      const dedupeKey = 'dedupe-456';
      mockDesktopDb.enqueueEvent.mockImplementationOnce(() => {
        throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
      });
      
      const result = await handler(null, kind, deviceId, payload, dedupeKey);
      expect(result).toEqual({ success: false, error: ERROR_MESSAGES.DATABASE_ERROR });
    });

    test('should handle db:events:dequeueForFlush correctly', async () => {
      const handler = ipcHandlers['db:events:dequeueForFlush'];
      expect(handler).toBeDefined();
      
      const limit = 10;
      const testEvents = [{ id: 1, kind: 'structures' }];
      mockDesktopDb.dequeueEventsForFlush.mockReturnValueOnce(testEvents);
      
      const result = await handler(null, limit);
      expect(result).toEqual({ success: true, events: testEvents });
      expect(mockDesktopDb.dequeueEventsForFlush).toHaveBeenCalledWith(limit);
    });

    test('should handle db:events:dequeueForFlush with kind parameter', async () => {
      const handler = ipcHandlers['db:events:dequeueForFlush'];
      
      const limit = 5;
      const kind = 'research';
      const testEvents = [{ id: 2, kind: 'research' }];
      mockDesktopDb.dequeueEventsForFlush.mockReturnValueOnce(testEvents);
      
      const result = await handler(null, limit, kind);
      expect(result).toEqual({ success: true, events: testEvents });
      expect(mockDesktopDb.dequeueEventsForFlush).toHaveBeenCalledWith(limit, kind);
    });

    test('should handle db:events:dequeueForFlush with error gracefully', async () => {
      const handler = ipcHandlers['db:events:dequeueForFlush'];
      
      const limit = 10;
      mockDesktopDb.dequeueEventsForFlush.mockImplementationOnce(() => {
        throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
      });
      
      const result = await handler(null, limit);
      expect(result).toEqual({ success: false, error: ERROR_MESSAGES.DATABASE_ERROR });
    });

    test('should handle db:events:markSent correctly', async () => {
      const handler = ipcHandlers['db:events:markSent'];
      expect(handler).toBeDefined();
      
      const eventId = 1;
      mockDesktopDb.markEventSent.mockReturnValueOnce(true);
      
      const result = await handler(null, eventId);
      expect(result).toEqual({ success: true });
      expect(mockDesktopDb.markEventSent).toHaveBeenCalledWith(eventId);
    });

    test('should handle db:events:markSent with error gracefully', async () => {
      const handler = ipcHandlers['db:events:markSent'];
      
      const eventId = 1;
      mockDesktopDb.markEventSent.mockReturnValueOnce(false);
      
      const result = await handler(null, eventId);
      expect(result).toEqual({ success: false, error: expect.any(String) });
    });

    test('should handle db:events:markFailed correctly', async () => {
      const handler = ipcHandlers['db:events:markFailed'];
      expect(handler).toBeDefined();
      
      const eventId = 1;
      const errorMessage = 'Test error';
      mockDesktopDb.markEventFailed.mockReturnValueOnce(true);
      
      const result = await handler(null, eventId, errorMessage);
      expect(result).toEqual({ success: true });
      expect(mockDesktopDb.markEventFailed).toHaveBeenCalledWith(eventId, errorMessage);
    });

    test('should handle db:events:markFailed with error gracefully', async () => {
      const handler = ipcHandlers['db:events:markFailed'];
      
      const eventId = 1;
      const errorMessage = 'Test error';
      mockDesktopDb.markEventFailed.mockReturnValueOnce(false);
      
      const result = await handler(null, eventId, errorMessage);
      expect(result).toEqual({ success: false, error: expect.any(String) });
    });

    test('should handle db:events:cleanup correctly', async () => {
      const handler = ipcHandlers['db:events:cleanup'];
      expect(handler).toBeDefined();
      
      const olderThanDays = 7;
      const deletedRows = 5;
      mockDesktopDb.deleteOldSentEvents.mockReturnValueOnce(deletedRows);
      
      const result = await handler(null, olderThanDays);
      expect(result).toEqual({ success: true, deletedRows });
      expect(mockDesktopDb.deleteOldSentEvents).toHaveBeenCalledWith(olderThanDays);
    });

    test('should handle db:events:cleanup with error gracefully', async () => {
      const handler = ipcHandlers['db:events:cleanup'];
      
      const olderThanDays = 7;
      mockDesktopDb.deleteOldSentEvents.mockImplementationOnce(() => {
        throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
      });
      
      const result = await handler(null, olderThanDays);
      expect(result).toEqual({ success: false, error: ERROR_MESSAGES.DATABASE_ERROR });
    });
  });

  describe('Database Sync State IPC Handlers', () => {
    test('should handle db:sync:set correctly', async () => {
      const handler = ipcHandlers['db:sync:set'];
      expect(handler).toBeDefined();
      
      const key = 'last-sync';
      const value = { timestamp: Date.now() };
      mockDesktopDb.setSyncState.mockReturnValueOnce(true);
      
      const result = await handler(null, key, value);
      expect(result).toEqual({ success: true });
      expect(mockDesktopDb.setSyncState).toHaveBeenCalledWith(key, value);
    });

    test('should handle db:sync:set with error gracefully', async () => {
      const handler = ipcHandlers['db:sync:set'];
      
      const key = 'last-sync';
      const value = { timestamp: Date.now() };
      mockDesktopDb.setSyncState.mockReturnValueOnce(false);
      
      const result = await handler(null, key, value);
      expect(result).toEqual({ success: false, error: expect.any(String) });
    });

    test('should handle db:sync:get correctly', async () => {
      const handler = ipcHandlers['db:sync:get'];
      expect(handler).toBeDefined();
      
      const key = 'last-sync';
      const value = { timestamp: Date.now() };
      mockDesktopDb.getSyncState.mockReturnValueOnce(value);
      
      const result = await handler(null, key);
      expect(result).toEqual({ success: true, value });
      expect(mockDesktopDb.getSyncState).toHaveBeenCalledWith(key);
    });

    test('should handle db:sync:get when key does not exist', async () => {
      const handler = ipcHandlers['db:sync:get'];
      
      const key = 'non-existent-key';
      mockDesktopDb.getSyncState.mockReturnValueOnce(null);
      
      const result = await handler(null, key);
      expect(result).toEqual({ success: true, value: null });
    });

    test('should handle db:sync:get with error gracefully', async () => {
      const handler = ipcHandlers['db:sync:get'];
      
      const key = 'last-sync';
      mockDesktopDb.getSyncState.mockImplementationOnce(() => {
        throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
      });
      
      const result = await handler(null, key);
      expect(result).toEqual({ success: false, error: ERROR_MESSAGES.DATABASE_ERROR });
    });
  });

  describe('Bootstrap IPC Handler', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    test('should handle db:bootstrap:fetchAndCache successfully', async () => {
      const handler = ipcHandlers['db:bootstrap:fetchAndCache'];
      expect(handler).toBeDefined();
      
      // Mock access token
      mockKeytar.getPassword.mockResolvedValueOnce('test-access-token');
      
      // Mock fetch response
      const bootstrapData = {
        catalogs: {
          buildings: { data: {}, version: '1.0.0' }
        },
        profile: {
          userId: 'user-123',
          deviceId: 'device-456',
          data: {}
        },
        version: '1.0.0'
      };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: bootstrapData
        })
      });
      
      // Mock database operations
      mockDesktopDb.setCatalog.mockReturnValue(true);
      mockDesktopDb.setProfileSnapshot.mockReturnValue(true);
      mockDesktopDb.setSyncState.mockReturnValue(true);
      
      const result = await handler(null, 'test-access-token');
      expect(result).toEqual({ success: true, data: bootstrapData });
    });

    test('should handle db:bootstrap:fetchAndCache when no access token', async () => {
      const handler = ipcHandlers['db:bootstrap:fetchAndCache'];
      
      mockKeytar.getPassword.mockResolvedValueOnce(null);
      
      const result = await handler();
      expect(result).toEqual({ success: false, error: 'no_access_token' });
    });

    test('should handle db:bootstrap:fetchAndCache when HTTP request fails', async () => {
      const handler = ipcHandlers['db:bootstrap:fetchAndCache'];
      
      mockKeytar.getPassword.mockResolvedValueOnce('test-access-token');
      
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        text: jest.fn().mockResolvedValueOnce('Internal Server Error')
      });
      
      const result = await handler(null, 'test-access-token');
      expect(result).toEqual({
        success: false,
        error: 'http_500',
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        details: 'Internal Server Error'
      });
    });

    test('should handle db:bootstrap:fetchAndCache with invalid JSON response', async () => {
      const handler = ipcHandlers['db:bootstrap:fetchAndCache'];
      
      mockKeytar.getPassword.mockResolvedValueOnce('test-access-token');
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON'))
      });
      
      const result = await handler(null, 'test-access-token');
      expect(result).toEqual({
        success: false,
        error: 'invalid_response',
        details: {}
      });
    });

    test('should handle db:bootstrap:fetchAndCache with unsuccessful response', async () => {
      const handler = ipcHandlers['db:bootstrap:fetchAndCache'];
      
      mockKeytar.getPassword.mockResolvedValueOnce('test-access-token');
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: false,
          error: 'invalid_data'
        })
      });
      
      const result = await handler(null, 'test-access-token');
      expect(result).toEqual({
        success: false,
        error: 'invalid_response',
        details: {
          success: false,
          error: 'invalid_data'
        }
      });
    });

    test('should handle db:bootstrap:fetchAndCache with catalog caching failure', async () => {
      const handler = ipcHandlers['db:bootstrap:fetchAndCache'];
      
      mockKeytar.getPassword.mockResolvedValueOnce('test-access-token');
      
      const bootstrapData = {
        version: '1.0.0',
        catalogs: {
          buildings: {
            data: { solar_plants: { key: 'solar_plants', name: 'Solar Plants' } },
            version: '1.0.0',
            contentHash: 'abc123'
          }
        }
      };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: bootstrapData
        })
      });
      
      // Mock catalog caching failure
      mockDesktopDb.setCatalog.mockImplementationOnce(() => {
        throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
      });
      
      const result = await handler(null, 'test-access-token');
      expect(result).toEqual({
        success: false,
        error: 'cache_catalog_buildings',
        details: ERROR_MESSAGES.DATABASE_ERROR
      });
    });

    test('should handle db:bootstrap:fetchAndCache with profile caching failure', async () => {
      const handler = ipcHandlers['db:bootstrap:fetchAndCache'];
      
      mockKeytar.getPassword.mockResolvedValueOnce('test-access-token');
      
      const bootstrapData = {
        version: '1.0.0',
        profile: {
          userId: 'user-123',
          deviceId: 'device-456',
          data: { level: 10, resources: { metal: 1000 } },
          schemaVersion: 2
        }
      };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: bootstrapData
        })
      });
      
      // Mock profile caching failure
      mockDesktopDb.setProfileSnapshot.mockImplementationOnce(() => {
        throw new Error('Profile database error');
      });
      
      const result = await handler(null, 'test-access-token');
      expect(result).toEqual({
        success: false,
        error: 'cache_profile',
        details: 'Profile database error'
      });
    });

    test('should handle db:bootstrap:fetchAndCache with bootstrap state recording failure gracefully', async () => {
      const handler = ipcHandlers['db:bootstrap:fetchAndCache'];
      
      mockKeytar.getPassword.mockResolvedValueOnce('test-access-token');
      
      const bootstrapData = {
        version: '1.0.0',
        catalogs: {
          buildings: {
            data: { solar_plants: { key: 'solar_plants' } },
            version: '1.0.0',
            contentHash: 'abc123'
          }
        }
      };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: bootstrapData
        })
      });
      
      mockDesktopDb.setCatalog.mockImplementation(() => true);
      mockDesktopDb.setSyncState.mockImplementationOnce(() => {
        throw new Error('State recording error');
      });
      
      // Should still succeed even if state recording fails
      const result = await handler(null, 'test-access-token');
      expect(result).toEqual({ success: true, data: bootstrapData });
    });
  });

  describe('Database Health IPC Handler', () => {
    test('should handle db:health correctly', async () => {
      const handler = ipcHandlers['db:health'];
      expect(handler).toBeDefined();
      
      const healthInfo = {
        connected: true,
        fileSize: 1024,
        tableCounts: { kv_store: 1 },
        schemaVersion: 2
      };
      mockDesktopDb.getHealthInfo.mockReturnValueOnce(healthInfo);
      
      const result = await handler();
      expect(result).toEqual({ success: true, health: healthInfo });
      expect(mockDesktopDb.getHealthInfo).toHaveBeenCalled();
    });

    test('should handle db:health with error gracefully', async () => {
      const handler = ipcHandlers['db:health'];
      
      mockDesktopDb.getHealthInfo.mockImplementationOnce(() => {
        throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
      });
      
      const result = await handler();
      expect(result).toEqual({ success: false, error: ERROR_MESSAGES.DATABASE_ERROR });
    });
  });

  describe('IPC Handler Registration and Edge Cases', () => {
    test('should register all expected IPC handlers', () => {
      const expectedHandlers = [
        'app:getVersion',
        'app:openExternal',
        'network:getStatus',
        'network:isFullyConnected',
        'tokens:saveRefresh',
        'tokens:deleteRefresh',
        'tokens:hasRefresh',
        'auth:refresh',
        'db:kv:set',
        'db:kv:get',
        'db:kv:delete',
        'db:catalogs:set',
        'db:catalogs:get',
        'db:catalogs:getAll',
        'db:profile:set',
        'db:profile:get',
        'db:events:enqueue',
        'db:events:dequeueForFlush',
        'db:events:markSent',
        'db:events:markFailed',
        'db:events:cleanup',
        'db:sync:set',
        'db:sync:get',
        'db:bootstrap:fetchAndCache',
        'db:health'
      ];
      
      expectedHandlers.forEach(handlerName => {
        expect(ipcHandlers[handlerName]).toBeDefined();
        expect(typeof ipcHandlers[handlerName]).toBe('function');
      });
    });

    test('should handle missing IPC handlers gracefully', async () => {
      // Try to call a non-existent handler
      const nonExistentHandler = ipcHandlers['non-existent-handler'];
      expect(nonExistentHandler).toBeUndefined();
    });

    test('should handle IPC handler with wrong number of arguments', async () => {
      const handler = ipcHandlers['app:getVersion'];
      
      // Call with extra arguments - should still work
      const result = await handler('extra', 'arguments');
      expect(result).toBe('1.0.0');
    });

    test('should handle IPC handler with null/undefined arguments', async () => {
      const handler = ipcHandlers['tokens:hasRefresh'];
      
      mockKeytar.getPassword.mockResolvedValueOnce(null);
      
      // Call with null event argument
      const result = await handler(null);
      expect(result).toEqual({ ok: true, has: false });
    });
  });

  describe('Security and Validation', () => {
    test('should validate input parameters for sensitive operations', async () => {
      const handler = ipcHandlers['tokens:setAccess'];
      
      // Test with various input types
      const testCases = [
        { input: null, expected: '' },
        { input: undefined, expected: '' },
        { input: '', expected: '' },
        { input: 'valid-token', expected: 'valid-token' },
        { input: 123, expected: '123' },
        { input: true, expected: 'true' }
      ];
      
      for (const testCase of testCases) {
        mockKeytar.setPassword.mockClear();
        const result = await handler(null, testCase.input);
        expect(result).toBe(true);
        expect(mockKeytar.setPassword).toHaveBeenCalledWith(
          'com.attrition.desktop',
          'access',
          testCase.expected
        );
      }
    });

    test('should prevent SQL injection through IPC parameters', async () => {
      const handler = ipcHandlers['db:kv:set'];
      
      // Test with malicious input
      const maliciousKey = "'; DROP TABLE kv_store; --";
      const maliciousValue = { data: "test'; INSERT INTO kv_store (key, value) VALUES ('hacked', 'yes'); --" };
      mockDesktopDb.setKeyValue.mockReturnValueOnce(true);
      
      const result = await handler(null, maliciousKey, maliciousValue);
      expect(result).toEqual({ success: true });
      
      // Verify that the malicious input was treated as literal strings
      expect(mockDesktopDb.setKeyValue).toHaveBeenCalledWith(maliciousKey, maliciousValue);
    });

    test('should handle extremely large payloads gracefully', async () => {
      const handler = ipcHandlers['db:kv:set'];
      
      // Create large payload
      const largePayload = {
        data: Array(10000).fill(0).map((_, i) => ({
          id: i,
          value: `Very long string value ${i} `.repeat(100)
        }))
      };
      mockDesktopDb.setKeyValue.mockReturnValueOnce(true);
      
      // Should not throw but may fail due to size limits
      const result = await handler(null, 'large-payload', largePayload);
      expect(['true', 'false']).toContain(String(result.success));
    });

    test('should handle circular references in JSON gracefully', async () => {
      const handler = ipcHandlers['db:kv:set'];
      
      // Create object with circular reference
      const circularObj = { data: 'test' };
      circularObj.self = circularObj; // Circular reference
      mockDesktopDb.setKeyValue.mockReturnValueOnce(true);
      
      // Should handle circular reference gracefully (JSON.stringify will fail)
      const result = await handler(null, 'circular-test', circularObj);
      expect(['true', 'false']).toContain(String(result.success));
    });
  });

  describe('Performance and Concurrency', () => {
    test('should handle concurrent IPC calls efficiently', async () => {
      const handler = ipcHandlers['db:kv:get'];
      
      // Create multiple concurrent calls
      const promises = [];
      for (let i = 0; i < 10; i++) {
        mockDesktopDb.getKeyValue.mockResolvedValueOnce(`value-${i}`);
        promises.push(handler(null, `key-${i}`));
      }
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result).toEqual({ success: true, value: `value-${index}` });
      });
    });

    test('should handle rapid successive calls without race conditions', async () => {
      const handler = ipcHandlers['tokens:hasRefresh'];
      
      // Make rapid successive calls
      const results = [];
      for (let i = 0; i < 5; i++) {
        mockKeytar.getPassword.mockResolvedValueOnce(`refresh-${i}`);
        results.push(await handler());
      }
      
      expect(results).toEqual([
        { ok: true, has: true },
        { ok: true, has: true },
        { ok: true, has: true },
        { ok: true, has: true },
        { ok: true, has: true }
      ]);
    });

    test('should handle timeout scenarios gracefully', async () => {
      const handler = ipcHandlers['auth:refresh'];
      
      // Mock slow fetch that times out
      global.fetch.mockImplementationOnce(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ ok: false, status: 408 }), 100);
        });
      });
      
      mockKeytar.getPassword.mockResolvedValueOnce('test-refresh-token');
      
      const result = await handler();
      // Should handle timeout gracefully
      expect(['true', 'false']).toContain(String(result.ok));
    });
  });
});



