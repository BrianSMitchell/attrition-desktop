import { ERROR_MESSAGES } from '../constants/response-formats';

import { HTTP_STATUS } from '../packages/shared/src/response-formats';
const path = require('path');
const fs = require('fs');

// Mock electron modules
const mockApp = {
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(__dirname, 'test-data');
    }
    return '';
  }
};

const mockIpcMain = {
  handle: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn()
};

const mockKeytar = {
  getPassword: jest.fn(),
  setPassword: jest.fn(),
  deletePassword: jest.fn()
};

// Mock modules
jest.mock('electron', () => ({
  app: mockApp,
  ipcMain: mockIpcMain
}));

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
  setCatalog: jest.fn(),
  setProfileSnapshot: jest.fn(),
  setSyncState: jest.fn(),
  getCatalog: jest.fn(),
  getAllCatalogs: jest.fn(),
  getProfileSnapshot: jest.fn(),
  getSyncState: jest.fn(),
  setKeyValue: jest.fn(),
  getKeyValue: jest.fn(),
  deleteKeyValue: jest.fn(),
  enqueueEvent: jest.fn(),
  dequeueEventsForFlush: jest.fn(),
  markEventSent: jest.fn(),
  markEventFailed: jest.fn(),
  deleteOldSentEvents: jest.fn(),
  getHealthInfo: jest.fn(),
  clearCachedContent: jest.fn(),
  logSyncPerformanceMetric: jest.fn()
};

jest.mock('../db.js', () => mockDesktopDb);

// Test data directory
const testDataDir = path.join(__dirname, 'test-data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

describe('Bootstrap Functionality', () => {
  let bootstrapHandler;
  let originalFetch;
  let originalConsoleLog;
  let consoleLogs = [];

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Capture console logs
    originalConsoleLog = console.log;
    console.log = (...args) => {
      consoleLogs.push(args.join(' '));
      originalConsoleLog(...args);
    };
    
    // Mock fetch
    originalFetch = global.fetch;
    global.fetch = jest.fn();
    
    // Reset console logs
    consoleLogs = [];
    
    // Import main module to get the bootstrap handler
    jest.isolateModules(() => {
      require('../main.js');
    });
    
    // Find the bootstrap handler from ipcMain.mock.calls
    const bootstrapCall = mockIpcMain.handle.mock.calls.find(call => call[0] === 'db:bootstrap:fetchAndCache');
    if (bootstrapCall) {
      bootstrapHandler = bootstrapCall[1];
    }
  });

  afterEach(() => {
    // Restore fetch
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }
    
    // Restore console.log
    console.log = originalConsoleLog;
    
    // Clean up test data directory
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('Bootstrap Handler Registration', () => {
    test('should register db:bootstrap:fetchAndCache IPC handler', () => {
      expect(bootstrapHandler).toBeDefined();
      expect(typeof bootstrapHandler).toBe('function');
    });
  });

  describe('Bootstrap Failure Cases', () => {
    test('should fail when no access token is available', async () => {
      const result = await bootstrapHandler();
      expect(result).toEqual({ success: false, error: 'no_access_token' });
    });

    test('should fail when HTTP request fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        text: jest.fn().mockResolvedValueOnce('Internal Server Error')
      });
      
      const result = await bootstrapHandler(null, 'test-access-token');
      expect(result).toEqual({
        success: false,
        error: 'http_500',
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        details: 'Internal Server Error'
      });
    });

    test('should fail when response is not valid JSON', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON'))
      });
      
      const result = await bootstrapHandler(null, 'test-access-token');
      expect(result).toEqual({
        success: false,
        error: 'invalid_response',
        details: {}
      });
    });

    test('should fail when response structure is invalid', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: false,
          error: 'invalid_data'
        })
      });
      
      const result = await bootstrapHandler(null, 'test-access-token');
      expect(result).toEqual({
        success: false,
        error: 'invalid_response',
        details: {
          success: false,
          error: 'invalid_data'
        }
      });
    });
  });

  describe('Bootstrap Success Cases', () => {
    test('should successfully fetch and cache bootstrap data with catalogs and profile', async () => {
      const accessToken = 'test-access-token';
      const bootstrapData = {
        version: '1.0.0',
        catalogs: {
          buildings: {
            data: { solar_plants: { key: 'solar_plants', name: 'Solar Plants' } },
            version: '1.0.0',
            contentHash: 'abc123'
          },
          units: {
            data: { fighters: { key: 'fighters', name: 'Fighters' } },
            version: '1.0.0',
            contentHash: 'def456'
          }
        },
        profile: {
          userId: 'user-123',
          deviceId: 'device-456',
          data: { level: 10, resources: { metal: 1000 } },
          schemaVersion: 2
        }
      };
      
      
      // Mock successful HTTP response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: bootstrapData
        })
      });
      
      // Mock successful database operations
      mockDesktopDb.setCatalog.mockImplementation(() => true);
      mockDesktopDb.setProfileSnapshot.mockImplementation(() => true);
      mockDesktopDb.setSyncState.mockImplementation(() => true);
      
      const result = await bootstrapHandler(null, accessToken);
      expect(result).toEqual({ success: true, data: bootstrapData });
      
      // Verify fetch was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/sync/bootstrap',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Verify catalogs were cached
      expect(mockDesktopDb.setCatalog).toHaveBeenCalledWith(
        'buildings',
        bootstrapData.catalogs.buildings.data,
        '1.0.0',
        'abc123'
      );
      expect(mockDesktopDb.setCatalog).toHaveBeenCalledWith(
        'units',
        bootstrapData.catalogs.units.data,
        '1.0.0',
        'def456'
      );
      
      // Verify profile was cached
      expect(mockDesktopDb.setProfileSnapshot).toHaveBeenCalledWith(
        'user-123',
        'device-456',
        bootstrapData.profile.data,
        2
      );
      
      // Verify bootstrap state was recorded
      expect(mockDesktopDb.setSyncState).toHaveBeenCalledWith(
        'bootstrap_completed_at',
        expect.any(String)
      );
      expect(mockDesktopDb.setSyncState).toHaveBeenCalledWith(
        'bootstrap_version',
        '1.0.0'
      );
    });

    test('should successfully fetch and cache bootstrap data with only catalogs', async () => {
      const accessToken = 'test-access-token';
      const bootstrapData = {
        version: '1.0.0',
        catalogs: {
          buildings: {
            data: { solar_plants: { key: 'solar_plants', name: 'Solar Plants' } },
            version: '1.0.0',
            contentHash: 'abc123'
          }
        }
        // No profile data
      };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: bootstrapData
        })
      });
      
      mockDesktopDb.setCatalog.mockImplementation(() => true);
      mockDesktopDb.setProfileSnapshot.mockImplementation(() => true);
      mockDesktopDb.setSyncState.mockImplementation(() => true);
      
      const result = await bootstrapHandler(null, accessToken);
      expect(result).toEqual({ success: true, data: bootstrapData });
      
      // Verify catalogs were cached
      expect(mockDesktopDb.setCatalog).toHaveBeenCalledWith(
        'buildings',
        bootstrapData.catalogs.buildings.data,
        '1.0.0',
        'abc123'
      );
      
      // Verify profile snapshot was not called since no profile data
      expect(mockDesktopDb.setProfileSnapshot).not.toHaveBeenCalled();
    });

    test('should successfully fetch and cache bootstrap data with only profile', async () => {
      const accessToken = 'test-access-token';
      const bootstrapData = {
        version: '1.0.0',
        profile: {
          userId: 'user-123',
          deviceId: 'device-456',
          data: { level: 10, resources: { metal: 1000 } },
          schemaVersion: 2
        }
        // No catalogs data
      };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: bootstrapData
        })
      });
      
      mockDesktopDb.setCatalog.mockImplementation(() => true);
      mockDesktopDb.setProfileSnapshot.mockImplementation(() => true);
      mockDesktopDb.setSyncState.mockImplementation(() => true);
      
      const result = await bootstrapHandler(null, accessToken);
      expect(result).toEqual({ success: true, data: bootstrapData });
      
      // Verify profile was cached
      expect(mockDesktopDb.setProfileSnapshot).toHaveBeenCalledWith(
        'user-123',
        'device-456',
        bootstrapData.profile.data,
        2
      );
      
      // Verify catalogs were not processed since no catalogs data
      expect(mockDesktopDb.setCatalog).not.toHaveBeenCalled();
    });
  });

  describe('Cache Version Invalidation', () => {
    test('does not clear cache when version unchanged', async () => {
      const accessToken = 'test-access-token';
      const bootstrapData = { version: '1.0.0', catalogs: {}, profile: null };

      // Previous version same as incoming
      mockDesktopDb.getSyncState.mockReturnValueOnce('1.0.0');

      // Mock successful HTTP response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: bootstrapData
        })
      });

      // Allow state recording
      mockDesktopDb.setSyncState.mockImplementation(() => true);

      const result = await bootstrapHandler(null, accessToken);
      expect(result).toEqual({ success: true, data: bootstrapData });
      expect(mockDesktopDb.clearCachedContent).not.toHaveBeenCalled();
    });

    test('clears cached content when version changes', async () => {
      const accessToken = 'test-access-token';
      const bootstrapData = { version: '1.0.0', catalogs: {}, profile: null };

      // Previous version differs from incoming
      mockDesktopDb.getSyncState.mockReturnValueOnce('0.9.0');

      // Mock successful HTTP response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: bootstrapData
        })
      });

      mockDesktopDb.setSyncState.mockImplementation(() => true);
      mockDesktopDb.clearCachedContent.mockReturnValueOnce(true);

      const result = await bootstrapHandler(null, accessToken);
      expect(result).toEqual({ success: true, data: bootstrapData });
      expect(mockDesktopDb.clearCachedContent).toHaveBeenCalled();
    });
  });

  describe('Bootstrap Error Handling', () => {
    test('should handle catalog caching failure', async () => {
      const accessToken = 'test-access-token';
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
      
      const result = await bootstrapHandler(null, accessToken);
      expect(result).toEqual({
        success: false,
        error: 'cache_catalog_buildings',
        details: ERROR_MESSAGES.DATABASE_ERROR
      });
    });

    test('should handle profile caching failure', async () => {
      const accessToken = 'test-access-token';
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
      
      const result = await bootstrapHandler(null, accessToken);
      expect(result).toEqual({
        success: false,
        error: 'cache_profile',
        details: 'Profile database error'
      });
    });

    test('should handle bootstrap state recording failure gracefully', async () => {
      const accessToken = 'test-access-token';
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
      
      mockDesktopDb.setCatalog.mockImplementation(() => true);
      mockDesktopDb.setSyncState.mockImplementationOnce(() => {
        throw new Error('State recording error');
      });
      
      // Should still succeed even if state recording fails
      const result = await bootstrapHandler(null, accessToken);
      expect(result).toEqual({ success: true, data: bootstrapData });
    });
  });

  describe('Bootstrap Logging', () => {
    test('should log bootstrap process steps', async () => {
      const accessToken = 'test-access-token';
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
      mockDesktopDb.setSyncState.mockImplementation(() => true);
      
      await bootstrapHandler();
      
      // Verify logging occurred (check for key substrings emitted by errorLogger)
      expect(consoleLogs.some(log => log.includes('Starting bootstrap fetch and cache'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Fetching bootstrap data'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Bootstrap fetch and cache completed'))).toBe(true);
    });
  });

  describe('Bootstrap with Custom API Base URL', () => {
    test('should use custom API base URL from environment', async () => {
      // Temporarily set custom API base URL
      const originalApiBaseUrl = process.env.API_BASE_URL;
      process.env.API_BASE_URL = 'https://custom-api.example.com/api';
      
      try {
        const accessToken = 'test-access-token';
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
        
        mockKeytar.getPassword.mockResolvedValueOnce(accessToken);
        
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce({
            success: true,
            data: bootstrapData
          })
        });
        
        mockDesktopDb.setCatalog.mockImplementation(() => true);
        mockDesktopDb.setSyncState.mockImplementation(() => true);
        
        await bootstrapHandler(null, accessToken);
        
        // Verify fetch was called with custom URL
        expect(global.fetch).toHaveBeenCalledWith(
          'https://custom-api.example.com/api/sync/bootstrap',
          expect.any(Object)
        );
      } finally {
        // Restore original API base URL
        if (originalApiBaseUrl) {
          process.env.API_BASE_URL = originalApiBaseUrl;
        } else {
          delete process.env.API_BASE_URL;
        }
      }
    });
  });
});



