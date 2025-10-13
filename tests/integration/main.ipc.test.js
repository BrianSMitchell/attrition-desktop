const { ipcMain } = require('electron');

import { HTTP_STATUS } from '../packages/shared/src/response-formats';
const { ipcMain } = require('electron');
const keytar = require('keytar');
const path = require('path');
const fs = require('fs');

// Mock electron modules
const mockApp = {
  getVersion: jest.fn().mockReturnValue('1.0.0'),
  isPackaged: false,
  setAppUserModelId: jest.fn(),
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(__dirname, 'test-data');
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
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn()
  }
}));

// Mock keytar
jest.mock('keytar', () => ({
  getPassword: jest.fn(),
  setPassword: jest.fn(),
  deletePassword: jest.fn()
}));

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
  deleteOldSentEvents: jest.fn(),
  setSyncState: jest.fn(),
  getSyncState: jest.fn(),
  getHealthInfo: jest.fn()
};

jest.mock('../db.js', () => mockDesktopDb);

// Test data directory
const testDataDir = path.join(__dirname, 'test-data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

describe('Main Process IPC Handlers', () => {
  let mainModule;
  let ipcHandlers = {};

  // Helper to register IPC handlers
  const registerIpcHandler = (channel, handler) => {
    ipcHandlers[channel] = handler;
  };

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Setup ipcMain mock to capture handlers
    ipcMain.handle.mockImplementation((channel, handler) => {
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
    mockDesktopDb.deleteOldSentEvents.mockReset();
    mockDesktopDb.setSyncState.mockReset();
    mockDesktopDb.getSyncState.mockReset();
    mockDesktopDb.getHealthInfo.mockReset();
  });

  afterEach(() => {
    // Clean up test data directory
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('App IPC Handlers', () => {
    test('should handle app:getVersion', async () => {
      const handler = ipcHandlers['app:getVersion'];
      expect(handler).toBeDefined();
      
      const result = await handler();
      expect(result).toBe('1.0.0');
    });

    test('should handle app:openExternal', async () => {
      const handler = ipcHandlers['app:openExternal'];
      expect(handler).toBeDefined();
      
      const testUrl = 'https://example.com';
      const result = await handler(null, testUrl);
      expect(result).toBe(true);
      expect(mockShell.openExternal).toHaveBeenCalledWith(testUrl);
    });

    test('should handle app:openExternal with invalid URL', async () => {
      const handler = ipcHandlers['app:openExternal'];
      
      const result = await handler(null, 'invalid-url');
      expect(result).toBe(false);
      expect(mockShell.openExternal).not.toHaveBeenCalled();
    });
  });

  describe('Network IPC Handlers', () => {
    test('should handle network:getStatus', async () => {
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

    test('should handle network:isFullyConnected', async () => {
      const handler = ipcHandlers['network:isFullyConnected'];
      expect(handler).toBeDefined();
      
      const result = await handler();
      expect(result).toBe(true);
    });
  });

  describe('Token Storage IPC Handlers', () => {
    const APP_ID = 'com.attrition.desktop';

    test('should handle tokens:saveRefresh', async () => {
      const handler = ipcHandlers['tokens:saveRefresh'];
      expect(handler).toBeDefined();
      
      const testToken = 'refresh-token';
      keytar.setPassword.mockResolvedValueOnce(undefined);
      
      const result = await handler(null, testToken);
      expect(result).toEqual({ ok: true });
      expect(keytar.setPassword).toHaveBeenCalledWith(APP_ID, 'refresh', testToken);
    });

    test('should handle tokens:deleteRefresh', async () => {
      const handler = ipcHandlers['tokens:deleteRefresh'];
      expect(handler).toBeDefined();
      
      keytar.deletePassword.mockResolvedValueOnce(undefined);
      
      const result = await handler();
      expect(result).toEqual({ ok: true });
      expect(keytar.deletePassword).toHaveBeenCalledWith(APP_ID, 'refresh');
    });

    test('should handle tokens:hasRefresh', async () => {
      const handler = ipcHandlers['tokens:hasRefresh'];
      expect(handler).toBeDefined();
      
      const testToken = 'refresh-token';
      keytar.getPassword.mockResolvedValueOnce(testToken);
      
      const result = await handler();
      expect(result).toEqual({ ok: true, has: true });
      expect(keytar.getPassword).toHaveBeenCalledWith(APP_ID, 'refresh');
    });
  });

  describe('Auth IPC Handlers', () => {
    test('should handle auth:refresh successfully', async () => {
      const handler = ipcHandlers['auth:refresh'];
      expect(handler).toBeDefined();
      
      const refreshToken = 'test-refresh-token';
      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';
      
      // Mock refresh token retrieval
      keytar.getPassword.mockResolvedValueOnce(refreshToken);
      
      // Mock fetch response
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: {
            token: newAccessToken,
            refreshToken: newRefreshToken
          }
        })
      });
      
      const result = await handler();
      expect(result).toEqual({ ok: true, token: newAccessToken });
      expect(keytar.setPassword).toHaveBeenCalledWith('com.attrition.desktop', 'refresh', newRefreshToken);
    });

    test('should handle auth:refresh when no refresh token exists', async () => {
      const handler = ipcHandlers['auth:refresh'];
      
      keytar.getPassword.mockResolvedValueOnce(null);
      
      const result = await handler();
      expect(result).toEqual({ ok: false, error: 'no_refresh' });
    });

    test('should handle auth:refresh when HTTP request fails', async () => {
      const handler = ipcHandlers['auth:refresh'];
      
      const refreshToken = 'test-refresh-token';
      keytar.getPassword.mockResolvedValueOnce(refreshToken);
      
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: HTTP_STATUS.UNAUTHORIZED
      });
      
      const result = await handler();
      expect(result).toEqual({ ok: false, status: HTTP_STATUS.UNAUTHORIZED });
    });

    test('should handle auth:login and return sanitized payload (no refreshToken)', async () => {
      const handler = ipcHandlers['auth:login'];
      expect(handler).toBeDefined();

      const email = 'user@test.com';
      const password = 'secret';
      const token = 'access-token';
      const user = { _id: 'u1' };
      const empire = { _id: 'e1' };
      const refreshToken = 'refresh-1';

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: { token, user, empire, refreshToken },
          message: 'Logged in'
        })
      });

      keytar.setPassword.mockResolvedValueOnce(undefined);

      const result = await handler(null, email, password);
      expect(result).toEqual({ success: true, data: { token, user, empire }, message: 'Logged in' });
      expect(keytar.setPassword).toHaveBeenCalledWith('com.attrition.desktop', 'refresh', refreshToken);
    });

    test('should handle auth:register and return sanitized payload (no refreshToken)', async () => {
      const handler = ipcHandlers['auth:register'];
      expect(handler).toBeDefined();

      const email = 'user@test.com';
      const username = 'user1';
      const password = 'secret';
      const token = 'access-token';
      const user = { _id: 'u1' };
      const empire = { _id: 'e1' };
      const refreshToken = 'refresh-1';

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: { token, user, empire, refreshToken },
          message: 'Registered'
        })
      });

      keytar.setPassword.mockResolvedValueOnce(undefined);

      const result = await handler(null, email, username, password);
      expect(result).toEqual({ success: true, data: { token, user, empire }, message: 'Registered' });
      expect(keytar.setPassword).toHaveBeenCalledWith('com.attrition.desktop', 'refresh', refreshToken);
    });
  });

  describe('Database KV Store IPC Handlers', () => {
    test('should handle db:kv:set', async () => {
      const handler = ipcHandlers['db:kv:set'];
      expect(handler).toBeDefined();
      
      const testKey = 'test-key';
      const testValue = { data: 'test' };
      mockDesktopDb.setKeyValue.mockReturnValueOnce(true);
      
      const result = await handler(null, testKey, testValue);
      expect(result).toEqual({ success: true });
      expect(mockDesktopDb.setKeyValue).toHaveBeenCalledWith(testKey, testValue);
    });

    test('should handle db:kv:get', async () => {
      const handler = ipcHandlers['db:kv:get'];
      expect(handler).toBeDefined();
      
      const testKey = 'test-key';
      const testValue = { data: 'test' };
      mockDesktopDb.getKeyValue.mockReturnValueOnce(testValue);
      
      const result = await handler(null, testKey);
      expect(result).toEqual({ success: true, value: testValue });
      expect(mockDesktopDb.getKeyValue).toHaveBeenCalledWith(testKey);
    });

    test('should handle db:kv:delete', async () => {
      const handler = ipcHandlers['db:kv:delete'];
      expect(handler).toBeDefined();
      
      const testKey = 'test-key';
      mockDesktopDb.deleteKeyValue.mockReturnValueOnce(true);
      
      const result = await handler(null, testKey);
      expect(result).toEqual({ success: true });
      expect(mockDesktopDb.deleteKeyValue).toHaveBeenCalledWith(testKey);
    });
  });

  describe('Database Catalog IPC Handlers', () => {
    test('should handle db:catalogs:set', async () => {
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

    test('should handle db:catalogs:get', async () => {
      const handler = ipcHandlers['db:catalogs:get'];
      expect(handler).toBeDefined();
      
      const testKey = 'buildings';
      const testCatalog = { data: { items: [] }, version: '1.0.0' };
      mockDesktopDb.getCatalog.mockReturnValueOnce(testCatalog);
      
      const result = await handler(null, testKey);
      expect(result).toEqual({ success: true, catalog: testCatalog });
      expect(mockDesktopDb.getCatalog).toHaveBeenCalledWith(testKey);
    });

    test('should handle db:catalogs:getAll', async () => {
      const handler = ipcHandlers['db:catalogs:getAll'];
      expect(handler).toBeDefined();
      
      const testCatalogs = { buildings: { data: {} }, units: { data: {} } };
      mockDesktopDb.getAllCatalogs.mockReturnValueOnce(testCatalogs);
      
      const result = await handler();
      expect(result).toEqual({ success: true, catalogs: testCatalogs });
      expect(mockDesktopDb.getAllCatalogs).toHaveBeenCalled();
    });
  });

  describe('Database Profile IPC Handlers', () => {
    test('should handle db:profile:set', async () => {
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

    test('should handle db:profile:get', async () => {
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
  });

  describe('Database Event Queue IPC Handlers', () => {
    test('should handle db:events:enqueue', async () => {
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
      expect(mockDesktopDb.enqueueEvent).toHaveBeenCalledWith(kind, deviceId, payload, dedupeKey);
    });

    test('should handle db:events:dequeueForFlush', async () => {
      const handler = ipcHandlers['db:events:dequeueForFlush'];
      expect(handler).toBeDefined();
      
      const limit = 10;
      const testEvents = [{ id: 1, kind: 'structures' }];
      mockDesktopDb.dequeueEventsForFlush.mockReturnValueOnce(testEvents);
      
      const result = await handler(null, limit);
      expect(result).toEqual({ success: true, events: testEvents });
      expect(mockDesktopDb.dequeueEventsForFlush).toHaveBeenCalledWith(limit);
    });

    test('should handle db:events:markSent', async () => {
      const handler = ipcHandlers['db:events:markSent'];
      expect(handler).toBeDefined();
      
      const eventId = 1;
      mockDesktopDb.markEventSent.mockReturnValueOnce(true);
      
      const result = await handler(null, eventId);
      expect(result).toEqual({ success: true });
      expect(mockDesktopDb.markEventSent).toHaveBeenCalledWith(eventId);
    });

    test('should handle db:events:markFailed', async () => {
      const handler = ipcHandlers['db:events:markFailed'];
      expect(handler).toBeDefined();
      
      const eventId = 1;
      const errorMessage = 'Test error';
      mockDesktopDb.markEventFailed.mockReturnValueOnce(true);
      
      const result = await handler(null, eventId, errorMessage);
      expect(result).toEqual({ success: true });
      expect(mockDesktopDb.markEventFailed).toHaveBeenCalledWith(eventId, errorMessage);
    });

    test('should handle db:events:cleanup', async () => {
      const handler = ipcHandlers['db:events:cleanup'];
      expect(handler).toBeDefined();
      
      const olderThanDays = 7;
      const deletedRows = 5;
      mockDesktopDb.deleteOldSentEvents.mockReturnValueOnce(deletedRows);
      
      const result = await handler(null, olderThanDays);
      expect(result).toEqual({ success: true, deletedRows });
      expect(mockDesktopDb.deleteOldSentEvents).toHaveBeenCalledWith(olderThanDays);
    });
  });

  describe('Database Sync State IPC Handlers', () => {
    test('should handle db:sync:set', async () => {
      const handler = ipcHandlers['db:sync:set'];
      expect(handler).toBeDefined();
      
      const key = 'last-sync';
      const value = { timestamp: Date.now() };
      mockDesktopDb.setSyncState.mockReturnValueOnce(true);
      
      const result = await handler(null, key, value);
      expect(result).toEqual({ success: true });
      expect(mockDesktopDb.setSyncState).toHaveBeenCalledWith(key, value);
    });

    test('should handle db:sync:get', async () => {
      const handler = ipcHandlers['db:sync:get'];
      expect(handler).toBeDefined();
      
      const key = 'last-sync';
      const value = { timestamp: Date.now() };
      mockDesktopDb.getSyncState.mockReturnValueOnce(value);
      
      const result = await handler(null, key);
      expect(result).toEqual({ success: true, value });
      expect(mockDesktopDb.getSyncState).toHaveBeenCalledWith(key);
    });
  });

  describe('Bootstrap IPC Handler', () => {
    test('should handle db:bootstrap:fetchAndCache successfully (token param)', async () => {
      const handler = ipcHandlers['db:bootstrap:fetchAndCache'];
      expect(handler).toBeDefined();
      
      // Do not rely on keytar for access token; pass it in
      const providedAccessToken = 'test-access-token';
      
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
      
      global.fetch = jest.fn().mockResolvedValueOnce({
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
      
      const result = await handler(null, providedAccessToken);
      expect(result).toEqual({ success: true, data: bootstrapData });
    });

    test('should handle db:bootstrap:fetchAndCache when no access token', async () => {
      const handler = ipcHandlers['db:bootstrap:fetchAndCache'];
      
      keytar.getPassword.mockResolvedValueOnce(null);
      
      const result = await handler();
      expect(result).toEqual({ success: false, error: 'no_access_token' });
    });
  });

  describe('Database Health IPC Handler', () => {
    test('should handle db:health', async () => {
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
  });
});

