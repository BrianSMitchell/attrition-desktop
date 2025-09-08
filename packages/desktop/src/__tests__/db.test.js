const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Mock electron app
const mockApp = {
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(__dirname, 'test-data');
    }
    return '';
  }
};

// Create test data directory
const testDataDir = path.join(__dirname, 'test-data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

// Mock the electron import
jest.mock('electron', () => ({
  app: mockApp
}));

// Import the DesktopDb class
const DesktopDb = require('../db.js');

describe('DesktopDb', () => {
  let desktopDb;
  let testDbPath;

  beforeEach(() => {
    desktopDb = new DesktopDb();
    testDbPath = path.join(testDataDir, 'test.db');
    
    // Override the db path for testing
    desktopDb.dbPath = testDbPath;
    
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterEach(() => {
    // Close database connection
    if (desktopDb.db) {
      desktopDb.db.close();
    }
    
    // Clean up test database file
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Clean up test data directory
    if (fs.existsSync(testDataDir)) {
      fs.rmdirSync(testDataDir, { recursive: true });
    }
  });

  describe('init', () => {
    test('should initialize database successfully', () => {
      const db = desktopDb.init();
      expect(db).toBeDefined();
      expect(desktopDb.initialized).toBe(true);
      
      // Check that WAL mode is enabled
      const journalMode = db.prepare('PRAGMA journal_mode').get();
      expect(journalMode.journal_mode).toBe('wal');
    });

    test('should run migrations on first init', () => {
      desktopDb.init();
      
      // Check that schema version table exists
      const schemaVersion = desktopDb.db.prepare(`
        SELECT version FROM schema_version ORDER BY version DESC LIMIT 1
      `).get();
      expect(schemaVersion.version).toBe(2);
      
      // Check that all required tables exist
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
  });

  describe('Schema Version Management', () => {
    test('should get current schema version', () => {
      desktopDb.init();
      const version = desktopDb.getSchemaVersion();
      expect(version).toBe(2);
    });

    test('should set schema version', () => {
      desktopDb.init();
      desktopDb.setSchemaVersion(3);
      const version = desktopDb.getSchemaVersion();
      expect(version).toBe(3);
    });
  });

  describe('Key-Value Store Operations', () => {
    beforeEach(() => {
      desktopDb.init();
    });

    test('should set and get key-value pairs', () => {
      const testKey = 'test-key';
      const testValue = { foo: 'bar', nested: { baz: 42 } };
      
      // Set value
      const setResult = desktopDb.setKeyValue(testKey, testValue);
      expect(setResult).toBe(true);
      
      // Get value
      const getResult = desktopDb.getKeyValue(testKey);
      expect(getResult).toEqual(testValue);
    });

    test('should return null for non-existent keys', () => {
      const result = desktopDb.getKeyValue('non-existent-key');
      expect(result).toBeNull();
    });

    test('should delete key-value pairs', () => {
      const testKey = 'test-key';
      const testValue = 'test-value';
      
      // Set and verify
      desktopDb.setKeyValue(testKey, testValue);
      expect(desktopDb.getKeyValue(testKey)).toEqual(testValue);
      
      // Delete and verify
      const deleteResult = desktopDb.deleteKeyValue(testKey);
      expect(deleteResult).toBe(true);
      expect(desktopDb.getKeyValue(testKey)).toBeNull();
    });

    test('should return false when deleting non-existent keys', () => {
      const result = desktopDb.deleteKeyValue('non-existent-key');
      expect(result).toBe(false);
    });
  });

  describe('Catalog Operations', () => {
    beforeEach(() => {
      desktopDb.init();
    });

    test('should set and get catalogs', () => {
      const testKey = 'buildings';
      const testData = { foo: 'bar' };
      const testVersion = '1.0.0';
      const testHash = 'abc123';
      
      // Set catalog
      const setResult = desktopDb.setCatalog(testKey, testData, testVersion, testHash);
      expect(setResult).toBe(true);
      
      // Get catalog
      const getResult = desktopDb.getCatalog(testKey);
      expect(getResult).toBeDefined();
      expect(getResult.data).toEqual(testData);
      expect(getResult.version).toBe(testVersion);
      expect(getResult.contentHash).toBe(testHash);
      expect(getResult.updatedAt).toBeDefined();
    });

    test('should get all catalogs', () => {
      // Set multiple catalogs
      desktopDb.setCatalog('buildings', { type: 'building' });
      desktopDb.setCatalog('units', { type: 'unit' });
      
      // Get all catalogs
      const allCatalogs = desktopDb.getAllCatalogs();
      expect(Object.keys(allCatalogs)).toHaveLength(2);
      expect(allCatalogs.buildings.data).toEqual({ type: 'building' });
      expect(allCatalogs.units.data).toEqual({ type: 'unit' });
    });

    test('should return null for non-existent catalogs', () => {
      const result = desktopDb.getCatalog('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Profile Snapshot Operations', () => {
    beforeEach(() => {
      desktopDb.init();
    });

    test('should set and get profile snapshots', () => {
      const userId = 'user-123';
      const deviceId = 'device-456';
      const snapshotData = { level: 10, resources: { metal: 1000 } };
      const schemaVersion = 2;
      
      // Set profile snapshot
      const setResult = desktopDb.setProfileSnapshot(userId, deviceId, snapshotData, schemaVersion);
      expect(setResult).toBe(true);
      
      // Get profile snapshot
      const getResult = desktopDb.getProfileSnapshot(userId, deviceId);
      expect(getResult).toBeDefined();
      expect(getResult.data).toEqual(snapshotData);
      expect(getResult.schemaVersion).toBe(schemaVersion);
      expect(getResult.fetchedAt).toBeDefined();
    });

    test('should return null for non-existent profile snapshots', () => {
      const result = desktopDb.getProfileSnapshot('non-existent-user', 'non-existent-device');
      expect(result).toBeNull();
    });
  });

  describe('Event Queue Operations', () => {
    beforeEach(() => {
      desktopDb.init();
    });

    test('should enqueue events with proper metadata', () => {
      const kind = 'structures';
      const deviceId = 'device-123';
      const payload = { action: 'build', structure: 'solar_plants' };
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

    test('should dequeue events for flush', () => {
      // Enqueue multiple events
      desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-1' });
      desktopDb.enqueueEvent('research', 'device-123', { action: 'research-1' });
      desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-2' });
      
      // Dequeue structures events
      const structuresEvents = desktopDb.dequeueEventsForFlush(10, 'structures');
      expect(structuresEvents).toHaveLength(2);
      expect(structuresEvents[0].kind).toBe('structures');
      expect(structuresEvents[1].kind).toBe('structures');
      
      // Dequeue all events
      const allEvents = desktopDb.dequeueEventsForFlush(10);
      expect(allEvents).toHaveLength(3); // Including the research event
    });

    test('should mark events as sent', () => {
      const eventId = desktopDb.enqueueEvent('structures', 'device-123', { action: 'build' });
      
      // Mark as sent
      const result = desktopDb.markEventSent(eventId);
      expect(result).toBe(true);
      
      // Verify status
      const stmt = desktopDb.db.prepare(`
        SELECT status, sent_at FROM event_queue WHERE id = ?
      `);
      const event = stmt.get(eventId);
      expect(event.status).toBe('sent');
      expect(event.sent_at).toBeDefined();
    });

    test('should mark events as failed', () => {
      const eventId = desktopDb.enqueueEvent('structures', 'device-123', { action: 'build' });
      const errorMessage = 'Test error';
      
      // Mark as failed
      const result = desktopDb.markEventFailed(eventId, errorMessage);
      expect(result).toBe(true);
      
      // Verify status and error
      const stmt = desktopDb.db.prepare(`
        SELECT status, last_error, retries FROM event_queue WHERE id = ?
      `);
      const event = stmt.get(eventId);
      expect(event.status).toBe('failed');
      expect(event.last_error).toBe(errorMessage);
      expect(event.retries).toBe(1);
    });

    test('should mark events as completed', () => {
      const eventId = desktopDb.enqueueEvent('structures', 'device-123', { action: 'build' });
      
      // Mark as completed
      const result = desktopDb.markEventCompleted(eventId);
      expect(result).toBe(true);
      
      // Verify status
      const stmt = desktopDb.db.prepare(`
        SELECT status, completed_at FROM event_queue WHERE id = ?
      `);
      const event = stmt.get(eventId);
      expect(event.status).toBe('completed');
      expect(event.completed_at).toBeDefined();
    });

    test('should get pending events count', () => {
      // Initially no events
      expect(desktopDb.getPendingEventsCount()).toBe(0);
      
      // Add some events
      desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-1' });
      desktopDb.enqueueEvent('research', 'device-123', { action: 'research-1' });
      desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-2' });
      
      // Check counts
      expect(desktopDb.getPendingEventsCount()).toBe(3);
      expect(desktopDb.getPendingEventsCount('structures')).toBe(2);
      expect(desktopDb.getPendingEventsCount('research')).toBe(1);
    });

    test('should get events by identity key', () => {
      const identityKey = 'test-identity';
      const options = { identityKey };
      
      desktopDb.enqueueEvent('structures', 'device-123', { action: 'build' }, options);
      
      const events = desktopDb.getEventsByIdentityKey(identityKey);
      expect(events).toHaveLength(1);
      expect(events[0].identity_key).toBe(identityKey);
    });

    test('should delete old sent events', () => {
      // Enqueue and mark some events as sent
      const eventId1 = desktopDb.enqueueEvent('structures', 'device-123', { action: 'build-1' });
      const eventId2 = desktopDb.enqueueEvent('research', 'device-123', { action: 'research-1' });
      
      desktopDb.markEventSent(eventId1);
      desktopDb.markEventSent(eventId2);
      
      // Delete old events (0 days old for testing)
      const deletedCount = desktopDb.deleteOldSentEvents(0);
      expect(deletedCount).toBe(2);
      
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

  describe('Sync State Operations', () => {
    beforeEach(() => {
      desktopDb.init();
    });

    test('should set and get sync state', () => {
      const key = 'last-sync';
      const value = { timestamp: Date.now(), version: '1.0.0' };
      
      // Set sync state
      const setResult = desktopDb.setSyncState(key, value);
      expect(setResult).toBe(true);
      
      // Get sync state
      const getResult = desktopDb.getSyncState(key);
      expect(getResult).toEqual(value);
    });

    test('should return null for non-existent sync state', () => {
      const result = desktopDb.getSyncState('non-existent-key');
      expect(result).toBeNull();
    });
  });

  describe('Health Check', () => {
    beforeEach(() => {
      desktopDb.init();
    });

    test('should return health information', () => {
      // Add some test data
      desktopDb.setKeyValue('test-key', 'test-value');
      desktopDb.enqueueEvent('structures', 'device-123', { action: 'build' });
      
      const health = desktopDb.getHealthInfo();
      expect(health.connected).toBe(true);
      expect(health.fileSize).toBeGreaterThan(0);
      expect(health.tableCounts.kv_store).toBe(1);
      expect(health.tableCounts.event_queue).toBe(1);
      expect(health.schemaVersion).toBe(2);
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
});
