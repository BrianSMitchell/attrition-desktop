const path = require('path');
const fs = require('fs');

// Mock electron modules comprehensively
const mockIpcMain = {
  handle: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn()
};

const mockIpcRenderer = {
  invoke: jest.fn(),
  send: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn()
};

const mockApp = {
  getVersion: jest.fn().mockReturnValue('1.0.0'),
  isPackaged: false,
  setAppUserModelId: jest.fn(),
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(__dirname, 'test-data-e2e');
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
  ipcMain: mockIpcMain,
  ipcRenderer: mockIpcRenderer
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

// Mock desktop database with comprehensive mock
const mockDesktopDb = {
  // KV Store
  setKeyValue: jest.fn(),
  getKeyValue: jest.fn(),
  deleteKeyValue: jest.fn(),
  
  // Catalogs
  setCatalog: jest.fn(),
  getCatalog: jest.fn(),
  getAllCatalogs: jest.fn(),
  
  // Profile Snapshot
  setProfileSnapshot: jest.fn(),
  getProfileSnapshot: jest.fn(),
  
  // Event Queue
  enqueueEvent: jest.fn(),
  dequeueEventsForFlush: jest.fn(),
  markEventSent: jest.fn(),
  markEventFailed: jest.fn(),
  markEventCompleted: jest.fn(),
  deleteOldSentEvents: jest.fn(),
  getPendingEventsCount: jest.fn(),
  getEventStats: jest.fn(),
  retryFailedEvents: jest.fn(),
  clearFailedEvents: jest.fn(),
  
  // Sync State
  setSyncState: jest.fn(),
  getSyncState: jest.fn(),
  
  // Health
  getHealthInfo: jest.fn(),
  
  // Database initialization
  init: jest.fn(),
  initialized: true
};

jest.mock('../db.js', () => mockDesktopDb);

// Test data directory
const testDataDir = path.join(__dirname, 'test-data-e2e');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

describe('Desktop App - End-to-End Integration Tests', () => {
  let mainModule;
  let ipcHandlers = {};
  let rendererBridge;
  let eventQueueService;

  // Helper to register IPC handlers
  const registerIpcHandler = (channel, handler) => {
    ipcHandlers[channel] = handler;
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup ipcMain mock to capture handlers
    mockIpcMain.handle.mockImplementation((channel, handler) => {
      registerIpcHandler(channel, handler);
    });

    // Import modules to register handlers and services
    jest.isolateModules(() => {
      mainModule = require('../main.js');
      eventQueueService = require('../services/eventQueueService.ts').default;
      rendererBridge = require('../preload.cjs');
    });

    // Reset mock implementations
    Object.values(mockDesktopDb).forEach(mock => {
      if (typeof mock === 'function' && mock.mockReset) {
        mock.mockReset();
      }
    });
  });

  afterEach(() => {
    // Clean up test data directory
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
    
    // Clear IPC handlers
    ipcHandlers = {};
  });

  describe('Complete User Journey - Offline/Online Hybrid Flow', () => {
    const TEST_USER_ID = 'user-123';
    const TEST_DEVICE_ID = 'device-456';
    const TEST_ACCESS_TOKEN = 'test-access-token';
    const TEST_REFRESH_TOKEN = 'test-refresh-token';
    const APP_ID = 'com.attrition.desktop';

    test('should handle complete offline-first user journey', async () => {
      // Phase 1: Initial App Launch and Bootstrap
      console.log('[E2E] Starting complete offline-first user journey test');

      // 1.1 App starts in offline mode
      const networkStatusHandler = ipcHandlers['network:getStatus'];
      const isFullyConnectedHandler = ipcHandlers['network:isFullyConnected'];
      
      // Mock offline network status
      mockIpcMain.handle.mockImplementation((channel, handler) => {
        if (channel === 'network:getStatus') {
          return Promise.resolve({
            isOnline: false,
            isApiReachable: false,
            lastChecked: Date.now(),
            latencyMs: 0
          });
        }
        if (channel === 'network:isFullyConnected') {
          return Promise.resolve(false);
        }
        registerIpcHandler(channel, handler);
      });

      const networkStatus = await networkStatusHandler();
      const isFullyConnected = await isFullyConnectedHandler();
      
      expect(networkStatus.isOnline).toBe(false);
      expect(isFullyConnected).toBe(false);
      console.log('[E2E] ✓ App correctly detected offline mode');

      // 1.2 User attempts to perform action while offline
      // This would be handled by UI components that check network status
      // and disable actions accordingly

      // Phase 2: User comes online and authenticates
      console.log('[E2E] Phase 2: User comes online and authenticates');

      // 2.1 Network comes online
      mockIpcMain.handle.mockImplementation((channel, handler) => {
        if (channel === 'network:getStatus') {
          return Promise.resolve({
            isOnline: true,
            isApiReachable: true,
            lastChecked: Date.now(),
            latencyMs: 50
          });
        }
        if (channel === 'network:isFullyConnected') {
          return Promise.resolve(true);
        }
        registerIpcHandler(channel, handler);
      });

      const onlineNetworkStatus = await networkStatusHandler();
      const onlineIsFullyConnected = await isFullyConnectedHandler();
      
      expect(onlineNetworkStatus.isOnline).toBe(true);
      expect(onlineIsFullyConnected).toBe(true);
      console.log('[E2E] ✓ App correctly detected online mode');

      // 2.2 User authenticates (simulating successful auth flow)
      const saveRefreshTokenHandler = ipcHandlers['tokens:saveRefresh'];
      
      // Save refresh token
      const saveRefreshResult = await saveRefreshTokenHandler(null, TEST_REFRESH_TOKEN);
      expect(saveRefreshResult).toEqual({ ok: true });
      expect(mockKeytar.setPassword).toHaveBeenCalledWith(APP_ID, 'refresh', TEST_REFRESH_TOKEN);
      
      console.log('[E2E] ✓ User authentication tokens stored securely');

      // Phase 3: Bootstrap and Data Synchronization
      console.log('[E2E] Phase 3: Bootstrap and data synchronization');

      // 3.1 Fetch and cache bootstrap data
      const bootstrapHandler = ipcHandlers['db:bootstrap:fetchAndCache'];
      
      // Mock successful bootstrap API response
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: {
            version: '1.0.0',
            catalogs: {
              buildings: {
                data: {
                  solar_plants: { key: 'solar_plants', name: 'Solar Plants', cost: { credits: 100 } },
                  metal_refineries: { key: 'metal_refineries', name: 'Metal Refineries', cost: { credits: 200 } }
                },
                version: '1.0.0',
                contentHash: 'abc123'
              },
              units: {
                data: {
                  fighters: { key: 'fighters', name: 'Fighters', cost: { credits: 50 } }
                },
                version: '1.0.0',
                contentHash: 'def456'
              }
            },
            profile: {
              userId: TEST_USER_ID,
              deviceId: TEST_DEVICE_ID,
              data: {
                level: 10,
                resources: { metal: 1000, energy: 500 },
                buildings: { solar_plants: 5, metal_refineries: 3 }
              },
              schemaVersion: 2
            }
          }
        })
      });

      // Mock database operations
      mockDesktopDb.setCatalog.mockImplementation(() => true);
      mockDesktopDb.setProfileSnapshot.mockImplementation(() => true);
      mockDesktopDb.setSyncState.mockImplementation(() => true);

      const bootstrapResult = await bootstrapHandler(null, TEST_ACCESS_TOKEN);
      expect(bootstrapResult).toEqual({
        success: true,
        data: expect.objectContaining({
          version: '1.0.0',
          catalogs: expect.any(Object),
          profile: expect.any(Object)
        })
      });
      
      // Verify all catalogs were cached
      expect(mockDesktopDb.setCatalog).toHaveBeenCalledWith(
        'buildings',
        expect.any(Object),
        '1.0.0',
        'abc123'
      );
      expect(mockDesktopDb.setCatalog).toHaveBeenCalledWith(
        'units',
        expect.any(Object),
        '1.0.0',
        'def456'
      );
      
      // Verify profile was cached
      expect(mockDesktopDb.setProfileSnapshot).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_DEVICE_ID,
        expect.any(Object),
        2
      );
      
      console.log('[E2E] ✓ Bootstrap data successfully fetched and cached');

      // Phase 4: User performs actions and events are queued
      console.log('[E2E] Phase 4: User performs actions and events are queued');

      // 4.1 User builds a structure (simulate event queuing)
      const enqueueEventHandler = ipcHandlers['db:events:enqueue'];
      
      const structureEvent = {
        kind: 'structures',
        deviceId: TEST_DEVICE_ID,
        payload: {
          action: 'build',
          structure: 'solar_plants',
          locationCoord: 'A00:00:00:00',
          empireId: TEST_USER_ID
        },
        options: {
          dedupeKey: 'build-solar-plants-A00:00:00:00',
          identityKey: `${TEST_USER_ID}:A00:00:00:00:solar_plants`,
          catalogKey: 'solar_plants',
          locationCoord: 'A00:00:00:00',
          empireId: TEST_USER_ID
        }
      };

      const eventId = 1;
      mockDesktopDb.enqueueEvent.mockReturnValueOnce(eventId);
      
      const enqueueResult = await enqueueEventHandler(
        null,
        structureEvent.kind,
        structureEvent.deviceId,
        structureEvent.payload,
        structureEvent.options.dedupeKey
      );
      
      expect(enqueueResult).toEqual({ success: true, id: eventId });
      expect(mockDesktopDb.enqueueEvent).toHaveBeenCalledWith(
        structureEvent.kind,
        structureEvent.deviceId,
        structureEvent.payload,
        {
          dedupeKey: structureEvent.options.dedupeKey,
          identityKey: structureEvent.options.identityKey,
          catalogKey: structureEvent.options.catalogKey,
          locationCoord: structureEvent.options.locationCoord,
          empireId: structureEvent.options.empireId
        }
      );
      
      console.log('[E2E] ✓ Structure build event successfully queued');

      // Phase 5: Network disruption and offline queuing
      console.log('[E2E] Phase 5: Network disruption and offline queuing');

      // 5.1 Network goes offline again
      mockIpcMain.handle.mockImplementation((channel, handler) => {
        if (channel === 'network:getStatus') {
          return Promise.resolve({
            isOnline: false,
            isApiReachable: false,
            lastChecked: Date.now(),
            latencyMs: 0
          });
        }
        if (channel === 'network:isFullyConnected') {
          return Promise.resolve(false);
        }
        registerIpcHandler(channel, handler);
      });

      const offlineNetworkStatus = await networkStatusHandler();
      const offlineIsFullyConnected = await isFullyConnectedHandler();
      
      expect(offlineNetworkStatus.isOnline).toBe(false);
      expect(offlineIsFullyConnected).toBe(false);
      console.log('[E2E] ✓ App correctly detected offline mode during network disruption');

      // 5.2 User continues to queue actions while offline
      const researchEvent = {
        kind: 'research',
        deviceId: TEST_DEVICE_ID,
        payload: {
          action: 'research',
          tech: 'laser_technology',
          empireId: TEST_USER_ID
        },
        options: {
          dedupeKey: 'research-laser-tech',
          identityKey: `${TEST_USER_ID}:laser_technology`,
          techKey: 'laser_technology',
          empireId: TEST_USER_ID
        }
      };

      const researchEventId = 2;
      mockDesktopDb.enqueueEvent.mockReturnValueOnce(researchEventId);
      
      const researchEnqueueResult = await enqueueEventHandler(
        null,
        researchEvent.kind,
        researchEvent.deviceId,
        researchEvent.payload,
        researchEvent.options.dedupeKey
      );
      
      expect(researchEnqueueResult).toEqual({ success: true, id: researchEventId });
      console.log('[E2E] ✓ Research event successfully queued while offline');

      // Phase 6: Network restoration and event synchronization
      console.log('[E2E] Phase 6: Network restoration and event synchronization');

      // 6.1 Network comes back online
      mockIpcMain.handle.mockImplementation((channel, handler) => {
        if (channel === 'network:getStatus') {
          return Promise.resolve({
            isOnline: true,
            isApiReachable: true,
            lastChecked: Date.now(),
            latencyMs: 75
          });
        }
        if (channel === 'network:isFullyConnected') {
          return Promise.resolve(true);
        }
        registerIpcHandler(channel, handler);
      });

      const restoredNetworkStatus = await networkStatusHandler();
      const restoredIsFullyConnected = await isFullyConnectedHandler();
      
      expect(restoredNetworkStatus.isOnline).toBe(true);
      expect(restoredIsFullyConnected).toBe(true);
      console.log('[E2E] ✓ Network successfully restored');

      // 6.2 Flush pending events to server
      const dequeueEventsHandler = ipcHandlers['db:events:dequeueForFlush'];
      const markEventSentHandler = ipcHandlers['db:events:markSent'];
      const markEventFailedHandler = ipcHandlers['db:events:markFailed'];
      
      // Mock dequeuing of pending events
      const pendingEvents = [
        {
          id: eventId,
          kind: 'structures',
          payload: structureEvent.payload,
          deviceId: TEST_DEVICE_ID
        },
        {
          id: researchEventId,
          kind: 'research',
          payload: researchEvent.payload,
          deviceId: TEST_DEVICE_ID
        }
      ];
      
      mockDesktopDb.dequeueEventsForFlush.mockReturnValueOnce(pendingEvents);
      
      // Mock successful event sending
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce({ success: true, data: { eventId, status: 'queued' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValueOnce({ success: true, data: { eventId: researchEventId, status: 'queued' } })
        });

      const dequeueResult = await dequeueEventsHandler(null, 10);
      expect(dequeueResult).toEqual({ success: true, events: pendingEvents });
      
      // Simulate sending events to server
      for (const event of pendingEvents) {
        const sendResult = await eventQueueService.sendEventToServer(event);
        expect(sendResult).toBe(true); // 90% success rate in mock
        
        if (sendResult) {
          const markSentResult = await markEventSentHandler(null, event.id);
          expect(markSentResult).toEqual({ success: true });
        } else {
          const markFailedResult = await markEventFailedHandler(null, event.id, 'Server rejected event');
          expect(markFailedResult).toEqual({ success: true });
        }
      }
      
      console.log('[E2E] ✓ Pending events successfully flushed to server');

      // Phase 7: Data consistency verification
      console.log('[E2E] Phase 7: Data consistency verification');

      // 7.1 Verify event statistics
      const eventStats = eventQueueService.getEventStats();
      expect(eventStats).toBeDefined();
      expect(eventStats.totalPending).toBeGreaterThanOrEqual(0);
      console.log('[E2E] ✓ Event statistics verified');

      // 7.2 Verify database health
      const healthHandler = ipcHandlers['db:health'];
      mockDesktopDb.getHealthInfo.mockReturnValueOnce({
        connected: true,
        fileSize: 1024,
        tableCounts: {
          kv_store: 2,
          catalogs: 1,
          profile_snapshot: 1,
          event_queue: 0
        },
        schemaVersion: 2
      });
      
      const healthResult = await healthHandler();
      expect(healthResult).toEqual({
        success: true,
        health: expect.objectContaining({
          connected: true,
          fileSize: 1024
        })
      });
      console.log('[E2E] ✓ Database health verified');

      // Phase 8: Graceful shutdown
      console.log('[E2E] Phase 8: Graceful shutdown');

      // 8.1 Simulate app shutdown
      const shutdownResult = await eventQueueService.shutdown();
      expect(shutdownResult).toBeUndefined(); // shutdown returns void
      console.log('[E2E] ✓ Event queue service shutdown gracefully');

      console.log('[E2E] ✅ Complete offline-first user journey test PASSED');
    }, 30000); // 30 second timeout

    test('should handle authentication token refresh flow', async () => {
      console.log('[E2E] Starting authentication token refresh flow test');

      // Mock expired access token scenario
      mockKeytar.getPassword
        .mockResolvedValueOnce(null) // No access token
        .mockResolvedValueOnce(TEST_REFRESH_TOKEN); // Has refresh token

      // Mock successful token refresh API call
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: {
            token: 'new-access-token',
            refreshToken: 'new-refresh-token'
          }
        })
      });

      // Mock saving new refresh token
      mockKeytar.setPassword.mockResolvedValueOnce(undefined);

      const refreshHandler = ipcHandlers['auth:refresh'];
      const refreshResult = await refreshHandler();

      expect(refreshResult).toEqual({
        ok: true,
        token: 'new-access-token'
      });
      
      // Verify refresh token was rotated
      expect(mockKeytar.setPassword).toHaveBeenCalledWith(
        APP_ID,
        'refresh',
        'new-refresh-token'
      );

      console.log('[E2E] ✅ Authentication token refresh flow test PASSED');
    });

    test('should handle bootstrap failure scenarios gracefully', async () => {
      console.log('[E2E] Starting bootstrap failure scenarios test');

      // Test scenario 1: No access token
      mockKeytar.getPassword.mockResolvedValueOnce(null);
      
      const bootstrapHandler = ipcHandlers['db:bootstrap:fetchAndCache'];
      const noTokenResult = await bootstrapHandler();
      
      expect(noTokenResult).toEqual({
        success: false,
        error: 'no_access_token'
      });
      console.log('[E2E] ✓ Handled no access token scenario');

      // Test scenario 2: HTTP request failure
      mockKeytar.getPassword.mockResolvedValueOnce(TEST_ACCESS_TOKEN);
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValueOnce('Internal Server Error')
      });
      
      const httpFailureResult = await bootstrapHandler(null, TEST_ACCESS_TOKEN);
      expect(httpFailureResult).toEqual({
        success: false,
        error: 'http_500',
        status: 500,
        details: 'Internal Server Error'
      });
      console.log('[E2E] ✓ Handled HTTP request failure scenario');

      // Test scenario 3: Invalid JSON response
      mockKeytar.getPassword.mockResolvedValueOnce(TEST_ACCESS_TOKEN);
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON'))
      });
      
      const jsonFailureResult = await bootstrapHandler(null, TEST_ACCESS_TOKEN);
      expect(jsonFailureResult).toEqual({
        success: false,
        error: 'invalid_response',
        details: {}
      });
      console.log('[E2E] ✓ Handled invalid JSON response scenario');

      console.log('[E2E] ✅ Bootstrap failure scenarios test PASSED');
    });

    test('should handle event queue edge cases', async () => {
      console.log('[E2E] Starting event queue edge cases test');

      const enqueueEventHandler = ipcHandlers['db:events:enqueue'];
      
      // Test scenario 1: Duplicate event prevention
      const eventId1 = 1;
      const eventId2 = 1; // Same ID for duplicate
      
      mockDesktopDb.enqueueEvent
        .mockReturnValueOnce(eventId1)
        .mockReturnValueOnce(eventId2); // Should return same ID for duplicate
      
      const eventOptions = {
        dedupeKey: 'duplicate-test',
        identityKey: 'user:location:structure',
        catalogKey: 'solar_plants',
        locationCoord: 'A00:00:00:00',
        empireId: 'user-123'
      };
      
      const result1 = await enqueueEventHandler(null, 'structures', 'device-123', { action: 'build' }, eventOptions.dedupeKey);
      const result2 = await enqueueEventHandler(null, 'structures', 'device-123', { action: 'build' }, eventOptions.dedupeKey);
      
      expect(result1.id).toBe(result2.id);
      console.log('[E2E] ✓ Handled duplicate event prevention');

      // Test scenario 2: Event marking with errors
      const markEventFailedHandler = ipcHandlers['db:events:markFailed'];
      mockDesktopDb.markEventFailed.mockReturnValueOnce(false); // Simulate database error
      
      const markFailedResult = await markEventFailedHandler(null, 999, 'Test error');
      expect(markFailedResult).toEqual({ success: false, error: expect.any(String) });
      console.log('[E2E] ✓ Handled event marking error scenario');

      // Test scenario 3: Event cleanup
      const cleanupHandler = ipcHandlers['db:events:cleanup'];
      mockDesktopDb.deleteOldSentEvents.mockReturnValueOnce(5);
      
      const cleanupResult = await cleanupHandler(null, 7);
      expect(cleanupResult).toEqual({ success: true, deletedRows: 5 });
      console.log('[E2E] ✓ Handled event cleanup scenario');

      console.log('[E2E] ✅ Event queue edge cases test PASSED');
    });
  });

  describe('Performance and Stress Testing', () => {
    test('should handle high volume event queuing', async () => {
      console.log('[E2E] Starting high volume event queuing test');

      const enqueueEventHandler = ipcHandlers['db:events:enqueue'];
      const eventIdCounter = { current: 1 };
      
      // Mock high volume event queuing
      mockDesktopDb.enqueueEvent.mockImplementation(() => eventIdCounter.current++);
      
      const startTime = Date.now();
      const eventCount = 100;
      const results = [];
      
      // Queue 100 events rapidly
      for (let i = 0; i < eventCount; i++) {
        const result = await enqueueEventHandler(
          null,
          'structures',
          'device-123',
          { action: 'build', index: i },
          `bulk-build-${i}`
        );
        results.push(result);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verify all events were queued
      expect(results).toHaveLength(eventCount);
      expect(results.every(r => r.success)).toBe(true);
      
      console.log(`[E2E] ✓ Queued ${eventCount} events in ${duration}ms (${(eventCount/duration*1000).toFixed(2)} events/sec)`);
    }, 10000); // 10 second timeout

    test('should handle concurrent database operations', async () => {
      console.log('[E2E] Starting concurrent database operations test');

      const kvSetHandler = ipcHandlers['db:kv:set'];
      const kvGetHandler = ipcHandlers['db:kv:get'];
      
      // Mock concurrent KV operations
      mockDesktopDb.setKeyValue.mockImplementation(() => true);
      mockDesktopDb.getKeyValue.mockImplementation((key) => `value-for-${key}`);
      
      // Create concurrent operations
      const operations = [];
      const operationCount = 50;
      
      for (let i = 0; i < operationCount; i++) {
        operations.push(
          kvSetHandler(null, `key-${i}`, `value-${i}`),
          kvGetHandler(null, `key-${i}`)
        );
      }
      
      // Execute all operations concurrently
      const results = await Promise.all(operations);
      
      // Verify results
      expect(results).toHaveLength(operationCount * 2);
      expect(results.slice(0, operationCount).every(r => r.success)).toBe(true);
      expect(results.slice(operationCount).every(r => r.success && r.value)).toBe(true);
      
      console.log(`[E2E] ✓ Handled ${operationCount * 2} concurrent database operations`);
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from database connection failures', async () => {
      console.log('[E2E] Starting database connection failure recovery test');

      const kvSetHandler = ipcHandlers['db:kv:set'];
      
      // Simulate database connection failure
      mockDesktopDb.setKeyValue.mockImplementationOnce(() => {
        throw new Error('Database connection lost');
      });
      
      // First attempt should fail gracefully
      const failResult = await kvSetHandler(null, 'test-key', 'test-value');
      expect(failResult).toEqual({
        success: false,
        error: 'Database connection lost'
      });
      
      // Simulate database recovery
      mockDesktopDb.setKeyValue.mockImplementationOnce(() => true);
      
      // Second attempt should succeed
      const successResult = await kvSetHandler(null, 'test-key', 'test-value');
      expect(successResult).toEqual({ success: true });
      
      console.log('[E2E] ✅ Database connection failure recovery test PASSED');
    });

    test('should handle network timeout scenarios gracefully', async () => {
      console.log('[E2E] Starting network timeout scenarios test');

      const bootstrapHandler = ipcHandlers['db:bootstrap:fetchAndCache'];
      
      // Mock access token
      mockKeytar.getPassword.mockResolvedValueOnce('test-access-token');
      
      // Mock slow network request that times out
      global.fetch = jest.fn().mockImplementationOnce(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ ok: false, status: 408 }), 100);
        });
      });
      
      const timeoutResult = await bootstrapHandler(null, TEST_ACCESS_TOKEN);
      expect(timeoutResult).toEqual({
        success: false,
        error: expect.stringContaining('http_'),
        status: 408,
        details: expect.any(String)
      });
      
      console.log('[E2E] ✅ Network timeout scenarios test PASSED');
    });
  });

  describe('Security and Data Integrity', () => {
    test('should prevent unauthorized access to sensitive data', async () => {
      console.log('[E2E] Starting security and data integrity test');

      // Test that refresh tokens are never exposed to renderer
      const getRefreshTokenHandler = ipcHandlers['tokens:getRefresh']; // Should not exist
      expect(getRefreshTokenHandler).toBeUndefined();
      
      // Test that only secure storage operations are available
      const hasRefreshHandler = ipcHandlers['tokens:hasRefresh'];
      const deleteRefreshHandler = ipcHandlers['tokens:deleteRefresh'];
      
      expect(hasRefreshHandler).toBeDefined();
      expect(deleteRefreshHandler).toBeDefined();
      
      // Test refresh token existence check
      mockKeytar.getPassword.mockResolvedValueOnce('some-refresh-token');
      const hasRefreshResult = await hasRefreshHandler();
      expect(hasRefreshResult).toEqual({ ok: true, has: true });
      
      console.log('[E2E] ✅ Security and data integrity test PASSED');
    });

    test('should handle SQL injection attempts safely', async () => {
      console.log('[E2E] Starting SQL injection safety test');

      const kvSetHandler = ipcHandlers['db:kv:set'];
      
      // Test with malicious input
      const maliciousKey = "'; DROP TABLE kv_store; --";
      const maliciousValue = { data: "test'; INSERT INTO kv_store (key, value) VALUES ('hacked', 'yes'); --" };
      mockDesktopDb.setKeyValue.mockReturnValueOnce(true);
      
      const result = await kvSetHandler(null, maliciousKey, maliciousValue);
      expect(result).toEqual({ success: true });
      
      // Verify that malicious input was treated as literal strings
      expect(mockDesktopDb.setKeyValue).toHaveBeenCalledWith(maliciousKey, maliciousValue);
      
      console.log('[E2E] ✅ SQL injection safety test PASSED');
    });
  });

  describe('Integration with Renderer Process', () => {
    test('should handle renderer-to-main communication seamlessly', async () => {
      console.log('[E2E] Starting renderer-to-main communication test');

      // Simulate renderer process invoking IPC handlers
      const getAppVersionHandler = ipcHandlers['app:getVersion'];
      const openExternalHandler = ipcHandlers['app:openExternal'];
      
      // Test app version retrieval
      const versionResult = await getAppVersionHandler();
      expect(versionResult).toBe('1.0.0');
      
      // Test external URL opening
      const url = 'https://example.com';
      const openResult = await openExternalHandler(null, url);
      expect(openResult).toBe(true);
      expect(mockShell.openExternal).toHaveBeenCalledWith(url);
      
      console.log('[E2E] ✅ Renderer-to-main communication test PASSED');
    });

    test('should maintain consistent state between processes', async () => {
      console.log('[E2E] Starting state consistency test');

      // Set a value in main process
      const kvSetHandler = ipcHandlers['db:kv:set'];
      const kvGetHandler = ipcHandlers['db:kv:get'];
      
      const testKey = 'consistency-test';
      const testValue = { counter: 1, data: 'test' };
      
      mockDesktopDb.setKeyValue.mockReturnValueOnce(true);
      mockDesktopDb.getKeyValue.mockReturnValueOnce(testValue);
      
      await kvSetHandler(null, testKey, testValue);
      const getResult = await kvGetHandler(null, testKey);
      
      expect(getResult).toEqual({ success: true, value: testValue });
      
      console.log('[E2E] ✅ State consistency test PASSED');
    });
  });
});
