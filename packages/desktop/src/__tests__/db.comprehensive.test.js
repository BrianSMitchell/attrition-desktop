const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Mock electron app
const mockApp = {
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(__dirname, 'test-data-comprehensive');
    }
    return '';
  }
};

// Mock electron
jest.mock('electron', () => ({
  app: mockApp
}));

// Test data directory
const testDataDir = path.join(__dirname, 'test-data-comprehensive');
let testDbPath;

describe('Desktop Database - Comprehensive Tests', () => {
  let desktopDb;
  let dbInstance;

  beforeAll(() => {
    // Create test data directory
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    testDbPath = path.join(testDataDir, 'test-comprehensive.db');
  });

  afterAll(() => {
    // Clean up test database file
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Clean up test data directory
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Import the DesktopDb class
    jest.isolateModules(() => {
      const DesktopDb = require('../db.js');
      desktopDb = new DesktopDb();
      
      // Override the db path for testing
      desktopDb.dbPath = testDbPath;
      
      // Clean up any existing test database
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      
      // Initialize database
      dbInstance = desktopDb.init();
    });
  });

  afterEach(() => {
    // Close database connection
    if (desktopDb && desktopDb.db) {
      try {
        desktopDb.db.close();
      } catch (err) {
        // Ignore close errors
      }
    }
    
    // Clean up test database file
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Database Initialization and Schema', () => {
    test('should initialize database with WAL mode', () => {
      expect(desktopDb.db).toBeDefined();
      expect(desktopDb.initialized).toBe(true);
      
      // Check WAL mode
      const journalMode = desktopDb.db.prepare('PRAGMA journal_mode').get();
      expect(journalMode.journal_mode).toBe('wal');
    });

    test('should run migrations and create all required tables', () => {
      // Check schema version table exists
      const schemaVersion = desktopDb.db.prepare(`
        SELECT version FROM schema_version ORDER BY version DESC LIMIT 1
      `).get();
      expect(schemaVersion.version).toBeGreaterThanOrEqual(1);
      
      // Check required tables exist
      const tables = desktopDb.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all();
      
      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('schema_version');
      expect(tableNames).toContain('kv_store');
      expect(tableNames).toContain('catalogs');
      expect(tableNames).toContain('profile_snapshot');
      expect(tableNames).toContain('event_queue');
      expect(tableNames).toContain('sync_state');
    });

    test('should handle re-initialization gracefully', () => {
      // Initialize again - should not fail
      const secondInit = desktopDb.init();
      expect(secondInit).toBe(desktopDb.db);
      expect(desktopDb.initialized).toBe(true);
    });
  });

  describe('Schema Version Management', () => {
    test('should get and set schema version correctly', () => {
      // Get initial version
      const initialVersion = desktopDb.getSchemaVersion();
      expect(initialVersion).toBeGreaterThanOrEqual(1);
      
      // Set new version
      const newVersion = initialVersion + 1;
      desktopDb.setSchemaVersion(newVersion);
      
      // Verify new version
      const updatedVersion = desktopDb.getSchemaVersion();
      expect(updatedVersion).toBe(newVersion);
    });

    test('should handle schema version errors gracefully', () => {
      // Close database to simulate error
      desktopDb.db.close();
      desktopDb.db = null;
      
      // Should return 0 when database is closed
      const version = desktopDb.getSchemaVersion();
      expect(version).toBe(0);
    });
  });

  describe('Key-Value Store Operations', () => {
    test('should set and get primitive values', () => {
      const testCases = [
        { key: 'string-value', value: 'hello world' },
        { key: 'number-value', value: 42 },
        { key: 'boolean-true', value: true },
        { key: 'boolean-false', value: false },
        { key: 'null-value', value: null },
        { key: 'undefined-value', value: undefined }
      ];
      
      testCases.forEach(({ key, value }) => {
        const setResult = desktopDb.setKeyValue(key, value);
        expect(setResult).toBe(true);
        
        const getResult = desktopDb.getKeyValue(key);
        if (value === undefined) {
          expect(getResult).toBeNull(); // undefined becomes null
        } else {
          expect(getResult).toEqual(value);
        }
      });
    });

    test('should set and get complex objects', () => {
      const testKey = 'complex-object';
      const testValue = {
        nested: {
          array: [1, 2, 3],
          object: { a: 'b', c: { d: 'e' } },
          date: new Date().toISOString(),
          null: null,
          undefined: undefined // This should be omitted
        },
        primitives: [true, false, 42, 'string']
      };
      
      const setResult = desktopDb.setKeyValue(testKey, testValue);
      expect(setResult).toBe(true);
      
      const getResult = desktopDb.getKeyValue(testKey);
      expect(getResult).toEqual(testValue);
    });

    test('should handle delete operations', () => {
      const testKey = 'delete-test';
      const testValue = 'test-value';
      
      // Set value
      desktopDb.setKeyValue(testKey, testValue);
      expect(desktopDb.getKeyValue(testKey)).toEqual(testValue);
      
      // Delete value
      const deleteResult = desktopDb.deleteKeyValue(testKey);
      expect(deleteResult).toBe(true);
      expect(desktopDb.getKeyValue(testKey)).toBeNull();
      
      // Delete non-existent key
      const deleteNonExistent = desktopDb.deleteKeyValue('non-existent');
      expect(deleteNonExistent).toBe(false);
    });

    test('should handle KV store errors gracefully', () => {
      // Close database to simulate error
      desktopDb.db.close();
      desktopDb.db = null;
      
      // Operations should not throw but return safe defaults
      expect(desktopDb.setKeyValue('test', 'value')).toBe(false);
      expect(desktopDb.getKeyValue('test')).toBeNull();
      expect(desktopDb.deleteKeyValue('test')).toBe(false);
    });
  });

  describe('Catalog Operations', () => {
    test('should set and get single catalog', () => {
      const testKey = 'buildings';
      const testData = {
        solar_plants: { key: 'solar_plants', name: 'Solar Plants', cost: { credits: 100 } },
        metal_refineries: { key: 'metal_refineries', name: 'Metal Refineries', cost: { credits: 200 } }
      };
      const testVersion = '1.0.0';
      const testHash = 'abc123def456';
      
      const setResult = desktopDb.setCatalog(testKey, testData, testVersion, testHash);
      expect(setResult).toBe(true);
      
      const getResult = desktopDb.getCatalog(testKey);
      expect(getResult).toBeDefined();
      expect(getResult.data).toEqual(testData);
      expect(getResult.version).toBe(testVersion);
      expect(getResult.contentHash).toBe(testHash);
      expect(getResult.updatedAt).toBeDefined();
    });

    test('should get all catalogs', () => {
      const catalogs = {
        buildings: {
          data: { solar_plants: { key: 'solar_plants' } },
          version: '1.0.0',
          contentHash: 'abc123'
        },
        units: {
          data: { fighters: { key: 'fighters' } },
          version: '1.0.0',
          contentHash: 'def456'
        },
        tech: {
          data: { laser_tech: { key: 'laser_tech' } },
          version: '1.0.0',
          contentHash: 'ghi789'
        }
      };
      
      // Set all catalogs
      Object.entries(catalogs).forEach(([key, catalog]) => {
        desktopDb.setCatalog(key, catalog.data, catalog.version, catalog.contentHash);
      });
      
      // Get all catalogs
      const allCatalogs = desktopDb.getAllCatalogs();
      expect(Object.keys(allCatalogs)).toHaveLength(3);
      
      Object.entries(catalogs).forEach(([key, expected]) => {
        expect(allCatalogs[key]).toBeDefined();
        expect(allCatalogs[key].data).toEqual(expected.data);
        expect(allCatalogs[key].version).toBe(expected.version);
        expect(allCatalogs[key].contentHash).toBe(expected.contentHash);
      });
    });

    test('should handle catalog errors gracefully', () => {
      // Close database to simulate error
      desktopDb.db.close();
      desktopDb.db = null;
      
      // Operations should not throw but return safe defaults
      expect(desktopDb.setCatalog('test', {}, '1.0.0')).toBe(false);
      expect(desktopDb.getCatalog('test')).toBeNull();
      expect(desktopDb.getAllCatalogs()).toEqual({});
    });
  });

  describe('Profile Snapshot Operations', () => {
    test('should set and get profile snapshot', () => {
      const userId = 'user-123';
      const deviceId = 'device-456';
      const snapshotData = {
        level: 10,
        resources: { metal: 1000, energy: 500 },
        buildings: { solar_plants: 5, metal_refineries: 3 }
      };
      const schemaVersion = 2;
      
      const setResult = desktopDb.setProfileSnapshot(userId, deviceId, snapshotData, schemaVersion);
      expect(setResult).toBe(true);
      
      const getResult = desktopDb.getProfileSnapshot(userId, deviceId);
      expect(getResult).toBeDefined();
      expect(getResult.data).toEqual(snapshotData);
      expect(getResult.schemaVersion).toBe(schemaVersion);
      expect(getResult.fetchedAt).toBeDefined();
    });

    test('should handle profile snapshot errors gracefully', () => {
      // Close database to simulate error
      desktopDb.db.close();
      desktopDb.db = null;
      
      // Operations should not throw but return safe defaults
      expect(desktopDb.setProfileSnapshot('user', 'device', {}, 1)).toBe(false);
      expect(desktopDb.getProfileSnapshot('user', 'device')).toBeNull();
    });
  });

  describe('Event Queue Operations', () => {
    test('should enqueue and dequeue events with metadata', () => {
      const kind = 'structures';
      const deviceId = 'device-123';
      const payload = { action: 'build', structure: 'solar_plants', location: 'A00:00:00:00' };
      const options = {
        dedupeKey: 'dedupe-123',
        identityKey: 'identity-456',
        catalogKey: 'solar_plants',
        locationCoord: 'A00:00:00:00',
        empireId: 'empire-789'
      };
      
      // Enqueue event
      const eventId = desktopDb.enqueueEvent(kind, deviceId, payload, options);
      expect(typeof eventId).toBe('number');
      expect(eventId).toBeGreaterThan(0);
      
      // Verify event was stored with correct metadata
      const stmt = desktopDb.db.prepare(`
        SELECT * FROM event_queue WHERE id = ?
      `);
      const event = stmt.get(eventId);
      
      expect(event).toBeDefined();
      expect(event.kind).toBe(kind);
      expect(event.device_id).toBe(deviceId);
      expect(event.payload).toBe(JSON.stringify(payload));
      expect(event.dedupe_key).toBe(options.dedupeKey);
      expect(event.identity_key).toBe(options.identityKey);
      expect(event.catalog_key).toBe(options.catalogKey);
      expect(event.location_coord).toBe(options.locationCoord);
      expect(event.empire_id).toBe(options.empireId);
      expect(event.status).toBe('queued');
    });

    test('should prevent duplicate events with same identity key', () => {
      const identityKey = 'test-identity-key';
      const options = { identityKey };
      
      // Enqueue first event
      const eventId1 = desktopDb.enqueueEvent('structures', 'device-123', { action: 'build' }, options);
      
      // Try to enqueue duplicate
      const eventId2 = desktopDb.enqueueEvent('structures', 'device-123', { action: 'build' }, options);
      
      // Should return the same event ID
      expect(eventId2).toBe(eventId1);
    });

    test('should dequeue events for flush by kind', () => {
      // Enqueue multiple events of different kinds
      desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-1' });
      desktopDb.enqueueEvent('research', 'device-123', { action: 'research-1' });
      desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-2' });
      desktopDb.enqueueEvent('units', 'device-123', { action: 'train-1' });
      
      // Dequeue structures events only
      const structuresEvents = desktopDb.dequeueEventsForFlush(10, 'structures');
      expect(structuresEvents).toHaveLength(2);
      structuresEvents.forEach(event => {
        expect(event.kind).toBe('structures');
      });
      
      // Dequeue research events only
      const researchEvents = desktopDb.dequeueEventsForFlush(10, 'research');
      expect(researchEvents).toHaveLength(1);
      expect(researchEvents[0].kind).toBe('research');
      
      // Dequeue all events
      const allEvents = desktopDb.dequeueEventsForFlush(10);
      expect(allEvents).toHaveLength(4); // Including the units event
    });

    test('should handle event marking operations', () => {
      // Enqueue event
      const eventId = desktopDb.enqueueEvent('structures', 'device-123', { action: 'build' });
      
      // Mark as sent
      const sentResult = desktopDb.markEventSent(eventId);
      expect(sentResult).toBe(true);
      
      // Verify status
      const stmt = desktopDb.db.prepare(`SELECT status, sent_at FROM event_queue WHERE id = ?`);
      const event = stmt.get(eventId);
      expect(event.status).toBe('sent');
      expect(event.sent_at).toBeDefined();
      
      // Mark as failed
      const failedResult = desktopDb.markEventFailed(eventId, 'Test error');
      expect(failedResult).toBe(true);
      
      // Verify failed status
      const failedEvent = stmt.get(eventId);
      expect(failedEvent.status).toBe('failed');
      expect(failedEvent.last_error).toBe('Test error');
      expect(failedEvent.retries).toBe(1);
      
      // Mark as completed
      const completedResult = desktopDb.markEventCompleted(eventId);
      expect(completedResult).toBe(true);
      
      // Verify completed status
      const completedEvent = stmt.get(eventId);
      expect(completedEvent.status).toBe('completed');
      expect(completedEvent.completed_at).toBeDefined();
    });

    test('should get pending events count by kind', () => {
      // Initially no events
      expect(desktopDb.getPendingEventsCount()).toBe(0);
      expect(desktopDb.getPendingEventsCount('structures')).toBe(0);
      
      // Add some events
      desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-1' });
      desktopDb.enqueueEvent('research', 'device-123', { action: 'research-1' });
      desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-2' });
      desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-3' });
      
      // Check counts
      expect(desktopDb.getPendingEventsCount()).toBe(4);
      expect(desktopDb.getPendingEventsCount('structures')).toBe(3);
      expect(desktopDb.getPendingEventsCount('research')).toBe(1);
      expect(desktopDb.getPendingEventsCount('units')).toBe(0);
    });

    test('should handle event queue errors gracefully', () => {
      // Close database to simulate error
      desktopDb.db.close();
      desktopDb.db = null;
      
      // Operations should not throw but return safe defaults
      expect(desktopDb.enqueueEvent('test', 'device', {})).toBe(0);
      expect(desktopDb.dequeueEventsForFlush(10)).toEqual([]);
      expect(desktopDb.markEventSent(1)).toBe(false);
      expect(desktopDb.markEventFailed(1, 'error')).toBe(false);
      expect(desktopDb.markEventCompleted(1)).toBe(false);
      expect(desktopDb.getPendingEventsCount()).toBe(0);
    });
  });

  describe('Sync State Operations', () => {
    test('should set and get sync state', () => {
      const key = 'last-sync';
      const value = { timestamp: Date.now(), version: '1.0.0', syncedEvents: 42 };
      
      // Set sync state
      const setResult = desktopDb.setSyncState(key, value);
      expect(setResult).toBe(true);
      
      // Get sync state
      const getResult = desktopDb.getSyncState(key);
      expect(getResult).toEqual(value);
    });

    test('should handle sync state errors gracefully', () => {
      // Close database to simulate error
      desktopDb.db.close();
      desktopDb.db = null;
      
      // Operations should not throw but return safe defaults
      expect(desktopDb.setSyncState('test', {})).toBe(false);
      expect(desktopDb.getSyncState('test')).toBeNull();
    });
  });

  describe('Event Statistics and Cleanup', () => {
    test('should get event statistics', () => {
      // Add some test events with different statuses
      const eventId1 = desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-1' });
      const eventId2 = desktopDb.enqueueEvent('research', 'device-123', { action: 'research-1' });
      const eventId3 = desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-2' });
      
      // Mark some events as sent/failed
      desktopDb.markEventSent(eventId1);
      desktopDb.markEventFailed(eventId2, 'Test error');
      
      // Get statistics
      const stats = desktopDb.getEventStats();
      
      // Should have statistics entries
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
      
      // Check that we have the expected status counts
      const queuedStats = stats.find(s => s.status === 'queued' && s.kind === 'structures');
      const sentStats = stats.find(s => s.status === 'sent' && s.kind === 'structures');
      const failedStats = stats.find(s => s.status === 'failed' && s.kind === 'research');
      
      expect(queuedStats).toBeDefined();
      expect(sentStats).toBeDefined();
      expect(failedStats).toBeDefined();
    });

    test('should delete old sent events', () => {
      // Enqueue and mark some events as sent
      const eventId1 = desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-1' });
      const eventId2 = desktopDb.enqueueEvent('research', 'device-123', { action: 'research-1' });
      const eventId3 = desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-2' });
      
      desktopDb.markEventSent(eventId1);
      desktopDb.markEventSent(eventId2);
      desktopDb.markEventSent(eventId3);
      
      // Delete old events (0 days old for testing)
      const deletedCount = desktopDb.deleteOldSentEvents(0);
      expect(deletedCount).toBe(3);
      
      // Verify events are deleted
      const remainingEvents = desktopDb.getPendingEventsCount();
      expect(remainingEvents).toBe(0);
    });

    test('should retry failed events', () => {
      // Create failed events
      const eventId1 = desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-1' });
      const eventId2 = desktopDb.enqueueEvent('research', 'device-123', { action: 'research-1' });
      
      desktopDb.markEventFailed(eventId1, 'error-1');
      desktopDb.markEventFailed(eventId2, 'error-2');
      
      // Retry failed events
      const resetCount = desktopDb.retryFailedEvents(3);
      expect(resetCount).toBe(2);
      
      // Verify events are reset to queued
      const stmt = desktopDb.db.prepare(`
        SELECT status FROM event_queue WHERE id IN (?, ?)
      `);
      const events = stmt.all(eventId1, eventId2);
      expect(events).toHaveLength(2);
      expect(events[0].status).toBe('queued');
      expect(events[1].status).toBe('queued');
    });

    test('should clear failed events', () => {
      // Create failed events
      const eventId1 = desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-1' });
      const eventId2 = desktopDb.enqueueEvent('research', 'device-123', { action: 'research-1' });
      
      desktopDb.markEventFailed(eventId1, 'error-1');
      desktopDb.markEventFailed(eventId2, 'error-2');
      
      // Clear failed events
      const clearedCount = desktopDb.clearFailedEvents();
      expect(clearedCount).toBe(2);
      
      // Verify events are cleared
      const failedEvents = desktopDb.db.prepare(`
        SELECT COUNT(*) as count FROM event_queue WHERE status = 'failed'
      `).get();
      expect(failedEvents.count).toBe(0);
    });
  });

  describe('Health Check Operations', () => {
    test('should return health information when connected', () => {
      // Add some test data
      desktopDb.setKeyValue('test-key', 'test-value');
      desktopDb.enqueueEvent('structures', 'device-123', { action: 'build' });
      desktopDb.setCatalog('test-catalog', { item: 'test' });
      desktopDb.setProfileSnapshot('user-123', 'device-456', { level: 10 });
      
      const health = desktopDb.getHealthInfo();
      expect(health.connected).toBe(true);
      expect(health.fileSize).toBeGreaterThan(0);
      expect(health.tableCounts).toBeDefined();
      expect(health.tableCounts.kv_store).toBe(1);
      expect(health.tableCounts.event_queue).toBe(1);
      expect(health.tableCounts.catalogs).toBe(1);
      expect(health.tableCounts.profile_snapshot).toBe(1);
      expect(health.schemaVersion).toBeGreaterThanOrEqual(1);
      expect(health.dbPath).toBe(testDbPath);
    });

    test('should handle health check errors gracefully', () => {
      // Close database to simulate error
      if (desktopDb.db) {
        desktopDb.db.close();
        desktopDb.db = null;
      }
      
      const health = desktopDb.getHealthInfo();
      expect(health.connected).toBe(false);
      expect(health.error).toBeDefined();
      expect(health.dbPath).toBe(testDbPath);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed JSON gracefully', () => {
      // Insert malformed JSON directly into database
      const stmt = desktopDb.db.prepare(`
        INSERT INTO kv_store (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run('malformed-json', '{ invalid json }', new Date().toISOString());
      
      // Should return null instead of throwing
      const result = desktopDb.getKeyValue('malformed-json');
      expect(result).toBeNull();
    });

    test('should handle concurrent operations', async () => {
      // Perform multiple operations concurrently
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          desktopDb.setKeyValue(`key-${i}`, `value-${i}`),
          desktopDb.enqueueEvent('structures', 'device', { index: i })
        );
      }
      
      // All operations should complete without error
      const results = await Promise.all(operations);
      expect(results.every(result => result !== undefined)).toBe(true);
      
      // Verify data integrity
      for (let i = 0; i < 10; i++) {
        const value = desktopDb.getKeyValue(`key-${i}`);
        expect(value).toBe(`value-${i}`);
      }
    });

    test('should handle very large payloads', () => {
      // Create large payload
      const largePayload = {
        data: Array(1000).fill(0).map((_, i) => ({
          id: i,
          name: `Item ${i}`,
          nested: {
            deep: {
              deeper: Array(100).fill(`Nested value ${i}`)
            }
          }
        }))
      };
      
      // Should handle large payloads without error
      const setResult = desktopDb.setKeyValue('large-payload', largePayload);
      expect(setResult).toBe(true);
      
      const getResult = desktopDb.getKeyValue('large-payload');
      expect(getResult).toEqual(largePayload);
    });

    test('should handle SQL injection attempts safely', () => {
      // Attempt SQL injection through key names
      const maliciousKeys = [
        "'; DROP TABLE kv_store; --",
        "test'; INSERT INTO kv_store (key, value) VALUES ('hacked', 'yes'); --",
        "normal-key'); DROP TABLE kv_store; --"
      ];
      
      maliciousKeys.forEach(key => {
        expect(() => {
          desktopDb.setKeyValue(key, 'test-value');
          const result = desktopDb.getKeyValue(key);
          expect(result).toBe('test-value');
        }).not.toThrow();
      });
      
      // Verify database integrity
      const tables = desktopDb.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all();
      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('kv_store');
      expect(tableNames).toContain('event_queue');
    });
  });
});
