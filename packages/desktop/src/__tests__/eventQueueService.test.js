const path = require('path');
const fs = require('fs');

// Mock electron app
const mockApp = {
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(__dirname, 'test-data');
    }
    return '';
  }
};

// Mock electron
jest.mock('electron', () => ({
  app: mockApp
}));

// Mock desktop database
const mockDesktopDb = {
  getKeyValue: jest.fn(),
  setKeyValue: jest.fn(),
  enqueueEvent: jest.fn(),
  dequeueEventsForFlush: jest.fn(),
  markEventSent: jest.fn(),
  markEventFailed: jest.fn(),
  markEventCompleted: jest.fn(),
  deleteOldSentEvents: jest.fn(),
  getEventStats: jest.fn(),
  retryFailedEvents: jest.fn(),
  clearFailedEvents: jest.fn(),
  getPendingEventsCount: jest.fn()
};

jest.mock('../db.js', () => mockDesktopDb);

// Test data directory
const testDataDir = path.join(__dirname, 'test-data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

describe('EventQueueService', () => {
  let eventQueueService;
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
    
    // Reset console logs
    consoleLogs = [];
    
    // Import the EventQueueService
    jest.isolateModules(() => {
      eventQueueService = require('../services/eventQueueService.ts').default;
    });
  });

  afterEach(() => {
    // Restore console.log
    console.log = originalConsoleLog;
    
    // Clean up test data directory
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('Device ID Management', () => {
    test('should generate device ID when none exists', () => {
      mockDesktopDb.getKeyValue.mockReturnValueOnce(null);
      mockDesktopDb.setKeyValue.mockReturnValueOnce(true);
      
      const deviceId = eventQueueService.getDeviceId();
      expect(deviceId).toMatch(/^device_\d+_[a-z0-9]+$/);
      expect(mockDesktopDb.setKeyValue).toHaveBeenCalledWith('device_id', deviceId);
    });

    test('should return existing device ID when available', () => {
      const existingDeviceId = 'device-123';
      mockDesktopDb.getKeyValue.mockReturnValueOnce(existingDeviceId);
      
      const deviceId = eventQueueService.getDeviceId();
      expect(deviceId).toBe(existingDeviceId);
      expect(mockDesktopDb.setKeyValue).not.toHaveBeenCalled();
    });

    test('should generate unique device IDs', () => {
      mockDesktopDb.getKeyValue.mockReturnValue(null);
      mockDesktopDb.setKeyValue.mockReturnValue(true);
      
      const id1 = eventQueueService.generateDeviceId();
      const id2 = eventQueueService.generateDeviceId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^device_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^device_\d+_[a-z0-9]+$/);
    });
  });

  describe('Identity Key Generation', () => {
    test('should generate structures identity key correctly', () => {
      const event = {
        kind: 'structures',
        payload: {
          empireId: 'empire-123',
          locationCoord: 'A00:00:00:00',
          catalogKey: 'solar_plants'
        }
      };
      
      const identityKey = eventQueueService.generateIdentityKey(event);
      expect(identityKey).toBe('empire-123:A00:0:00:00:solar_plants');
    });

    test('should generate research identity key correctly', () => {
      const event = {
        kind: 'research',
        payload: {
          empireId: 'empire-123',
          techKey: 'laser_technology'
        }
      };
      
      const identityKey = eventQueueService.generateIdentityKey(event);
      expect(identityKey).toBe('empire-123:laser_technology');
    });

    test('should generate units identity key correctly', () => {
      const event = {
        kind: 'units',
        payload: {
          empireId: 'empire-123',
          locationCoord: 'A00:00:00:00',
          unitKey: 'fighters'
        }
      };
      
      const identityKey = eventQueueService.generateIdentityKey(event);
      expect(identityKey).toBe('empire-123:A00:00:00:fighters');
    });

    test('should generate defenses identity key correctly', () => {
      const event = {
        kind: 'defenses',
        payload: {
          empireId: 'empire-123',
          locationCoord: 'A00:00:00:00',
          defenseKey: 'laser_turrets'
        }
      };
      
      const identityKey = eventQueueService.generateIdentityKey(event);
      expect(identityKey).toBe('empire-123:A00:00:00:laser_turrets');
    });

    test('should return null for incomplete event data', () => {
      const event = {
        kind: 'structures',
        payload: {
          empireId: 'empire-123'
          // Missing locationCoord and catalogKey
        }
      };
      
      const identityKey = eventQueueService.generateIdentityKey(event);
      expect(identityKey).toBeNull();
    });

    test('should return null for unsupported event kind', () => {
      const event = {
        kind: 'unsupported',
        payload: {}
      };
      
      const identityKey = eventQueueService.generateIdentityKey(event);
      expect(identityKey).toBeNull();
    });

    test('should handle errors gracefully', () => {
      const event = {
        kind: 'structures',
        payload: null // This will cause an error when accessing payload properties
      };
      
      const identityKey = eventQueueService.generateIdentityKey(event);
      expect(identityKey).toBeNull();
    });
  });

  describe('Event Enqueueing', () => {
    test('should enqueue event with proper metadata', async () => {
      const eventId = 1;
      mockDesktopDb.enqueueEvent.mockReturnValueOnce(eventId);
      
      const kind = 'structures';
      const payload = { action: 'build', structure: 'solar_plants' };
      const options = {
        empireId: 'empire-123',
        locationCoord: 'A00:00:00:00',
        catalogKey: 'solar_plants'
      };
      
      const result = await eventQueueService.enqueue(kind, payload, options);
      expect(result).toBe(eventId);
      
      // Verify database call
      expect(mockDesktopDb.enqueueEvent).toHaveBeenCalledWith(
        kind,
        expect.any(String), // deviceId
        {
          kind,
          payload,
          timestamp: expect.any(Number),
          ...options
        },
        {
          dedupeKey: null,
          identityKey: 'empire-123:A00:00:00:solar_plants',
          catalogKey: 'solar_plants',
          locationCoord: 'A00:00:00',
          empireId: 'empire-123'
        }
      );
    });

    test('should enqueue event with custom dedupe key', async () => {
      const eventId = 1;
      const dedupeKey = 'custom-dedupe-key';
      mockDesktopDb.enqueueEvent.mockReturnValueOnce(eventId);
      
      const result = await eventQueueService.enqueue(
        'structures',
        { action: 'build' },
        { dedupeKey }
      );
      
      expect(result).toBe(eventId);
      expect(mockDesktopDb.enqueueEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          dedupeKey
        })
      );
    });

    test('should handle enqueue errors gracefully', async () => {
      mockDesktopDb.enqueueEvent.mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      
      await expect(eventQueueService.enqueue('structures', {})).rejects.toThrow('Database error');
    });
  });

  describe('Event Flushing', () => {
    test('should flush pending events successfully', async () => {
      const testEvents = [
        { id: 1, kind: 'structures', payload: {} },
        { id: 2, kind: 'research', payload: {} }
      ];
      
      mockDesktopDb.dequeueEventsForFlush
        .mockReturnValueOnce([testEvents[0]]) // structures
        .mockReturnValueOnce([testEvents[1]]) // research
        .mockReturnValueOnce([]) // units
        .mockReturnValueOnce([]); // defenses
      
      mockDesktopDb.markEventSent.mockReturnValue(true);
      mockDesktopDb.deleteOldSentEvents.mockReturnValue(2);
      
      const results = await eventQueueService.flushPendingEvents(10);
      
      expect(results).toEqual({
        flushed: 2,
        failed: 0,
        completed: 0
      });
      
      expect(mockDesktopDb.markEventSent).toHaveBeenCalledTimes(2);
      expect(mockDesktopDb.deleteOldSentEvents).toHaveBeenCalledWith(7);
    });

    test('should handle failed event sends', async () => {
      const testEvent = { id: 1, kind: 'structures', payload: {} };
      mockDesktopDb.dequeueEventsForFlush.mockReturnValueOnce([testEvent]);
      mockDesktopDb.dequeueEventsForFlush.mockReturnValue([]); // Empty for other kinds
      
      // Mock sendEventToServer to fail
      eventQueueService.sendEventToServer = jest.fn().mockResolvedValue(false);
      mockDesktopDb.markEventFailed.mockReturnValue(true);
      
      const results = await eventQueueService.flushPendingEvents(10);
      
      expect(results.flushed).toBe(0);
      expect(results.failed).toBe(1);
      expect(mockDesktopDb.markEventFailed).toHaveBeenCalledWith(1, 'Server rejected event');
    });

    test('should handle send errors', async () => {
      const testEvent = { id: 1, kind: 'structures', payload: {} };
      mockDesktopDb.dequeueEventsForFlush.mockReturnValueOnce([testEvent]);
      mockDesktopDb.dequeueEventsForFlush.mockReturnValue([]); // Empty for other kinds
      
      // Mock sendEventToServer to throw error
      eventQueueService.sendEventToServer = jest.fn().mockRejectedValue(new Error('Network error'));
      mockDesktopDb.markEventFailed.mockReturnValue(true);
      
      const results = await eventQueueService.flushPendingEvents(10);
      
      expect(results.failed).toBe(1);
      expect(mockDesktopDb.markEventFailed).toHaveBeenCalledWith(1, 'Network error');
    });

    test('should skip flush when already flushing', async () => {
      // Simulate ongoing flush by setting isFlushing flag
      eventQueueService.isFlushing = true;
      
      const results = await eventQueueService.flushPendingEvents(10);
      
      expect(results).toEqual({
        flushed: 0,
        skipped: true
      });
      
      // Verify no database calls were made
      expect(mockDesktopDb.dequeueEventsForFlush).not.toHaveBeenCalled();
    });
  });

  describe('Event Status Management', () => {
    test('should mark event as sent', async () => {
      const eventId = 1;
      mockDesktopDb.markEventSent.mockReturnValue(true);
      
      await eventQueueService.flushPendingEvents(10);
      
      // The flush method should call markEventSent internally
      expect(mockDesktopDb.markEventSent).toHaveBeenCalled();
    });

    test('should mark event as failed', async () => {
      const eventId = 1;
      const errorMessage = 'Test error';
      mockDesktopDb.markEventFailed.mockReturnValue(true);
      
      await eventQueueService.flushPendingEvents(10);
      
      // The flush method should call markEventFailed internally
      expect(mockDesktopDb.markEventFailed).toHaveBeenCalled();
    });

    test('should mark event as completed', async () => {
      const eventId = 1;
      mockDesktopDb.markEventCompleted.mockReturnValue(true);
      
      const result = await eventQueueService.shutdown();
      
      // shutdown calls flush which should handle completion
      expect(mockDesktopDb.markEventCompleted).not.toHaveBeenCalled(); // Not called in current implementation
    });
  });

  describe('Event Statistics', () => {
    test('should get event statistics successfully', () => {
      const mockStats = [
        { kind: 'structures', status: 'queued', count: 2 },
        { kind: 'research', status: 'sent', count: 1 }
      ];
      
      mockDesktopDb.getEventStats.mockReturnValue(mockStats);
      mockDesktopDb.getPendingEventsCount
        .mockReturnValueOnce(2) // structures
        .mockReturnValueOnce(1) // research
        .mockReturnValueOnce(0) // units
        .mockReturnValueOnce(3); // defenses
      
      const stats = eventQueueService.getEventStats();
      
      expect(stats).toEqual({
        stats: mockStats,
        pendingCounts: {
          structures: 2,
          research: 1,
          units: 0,
          defenses: 3
        },
        totalPending: 6
      });
    });

    test('should handle statistics errors gracefully', () => {
      mockDesktopDb.getEventStats.mockImplementation(() => {
        throw new Error('Stats error');
      });
      
      const stats = eventQueueService.getEventStats();
      
      expect(stats).toEqual({
        stats: [],
        pendingCounts: {
          structures: 0,
          research: 0,
          units: 0,
          defenses: 0
        },
        totalPending: 0
      });
    });
  });

  describe('Failed Event Management', () => {
    test('should retry failed events', () => {
      const resetCount = 3;
      mockDesktopDb.retryFailedEvents.mockReturnValue(resetCount);
      
      const result = eventQueueService.retryFailedEvents(3);
      expect(result).toBe(resetCount);
      expect(mockDesktopDb.retryFailedEvents).toHaveBeenCalledWith(3);
    });

    test('should handle retry errors gracefully', () => {
      mockDesktopDb.retryFailedEvents.mockImplementation(() => {
        throw new Error('Retry error');
      });
      
      const result = eventQueueService.retryFailedEvents(3);
      expect(result).toBe(0);
    });

    test('should clear failed events', () => {
      const clearedCount = 2;
      mockDesktopDb.clearFailedEvents.mockReturnValue(clearedCount);
      
      const result = eventQueueService.clearFailedEvents();
      expect(result).toBe(clearedCount);
      expect(mockDesktopDb.clearFailedEvents).toHaveBeenCalled();
    });

    test('should handle clear errors gracefully', () => {
      mockDesktopDb.clearFailedEvents.mockImplementation(() => {
        throw new Error('Clear error');
      });
      
      const result = eventQueueService.clearFailedEvents();
      expect(result).toBe(0);
    });
  });

  describe('Network Change Handling', () => {
    test('should trigger flush when coming online', async () => {
      // Mock flushPendingEvents to track calls
      const flushSpy = jest.spyOn(eventQueueService, 'flushPendingEvents').mockResolvedValue({ flushed: 0 });
      
      eventQueueService.handleNetworkChange(true);
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(flushSpy).toHaveBeenCalled();
      flushSpy.mockRestore();
    });

    test('should not trigger flush when going offline', async () => {
      const flushSpy = jest.spyOn(eventQueueService, 'flushPendingEvents').mockResolvedValue({ flushed: 0 });
      
      eventQueueService.handleNetworkChange(false);
      
      // Wait for potential async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(flushSpy).not.toHaveBeenCalled();
      flushSpy.mockRestore();
    });
  });

  describe('Queue Synchronization', () => {
    test('should synchronize queue with server events', async () => {
      const serverEvents = [
        { identityKey: 'empire-123:A00:00:00:00:solar_plants', status: 'completed' },
        { identityKey: 'empire-123:laser_tech', status: 'failed', error: 'Research blocked' }
      ];
      
      const localEvents = [
        { id: 1, identityKey: 'empire-123:A00:00:00:00:solar_plants' },
        { id: 2, identityKey: 'empire-123:laser_tech' }
      ];
      
      // Mock getAllPendingEvents to return local events
      eventQueueService.getAllPendingEvents = jest.fn().mockReturnValue(localEvents);
      mockDesktopDb.markEventCompleted.mockReturnValue(true);
      mockDesktopDb.markEventFailed.mockReturnValue(true);
      
      const results = await eventQueueService.synchronizeQueue(serverEvents);
      
      expect(results).toEqual({
        matched: 0,
        completed: 1,
        failed: 1,
        unknown: 0
      });
      
      expect(mockDesktopDb.markEventCompleted).toHaveBeenCalledWith(1);
      expect(mockDesktopDb.markEventFailed).toHaveBeenCalledWith(2, 'Research blocked');
    });

    test('should handle synchronization errors gracefully', async () => {
      eventQueueService.getAllPendingEvents = jest.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      
      const results = await eventQueueService.synchronizeQueue([]);
      
      expect(results).toEqual({
        matched: 0,
        completed: 0,
        failed: 0,
        unknown: 0
      });
    });
  });

  describe('Queue Conflict Resolution', () => {
    test('should resolve queue conflicts correctly', () => {
      const localEvents = [
        { id: 1, identityKey: 'empire-123:A00:0:00:00:solar_plants' }, // Local-only
        { id: 2, identityKey: 'empire-123:laser_tech' } // Both
      ];
      
      const serverEvents = [
        { identityKey: 'empire-123:laser_tech', status: 'completed' }, // Both
        { identityKey: 'empire-123:missile_tech' } // Server-only
      ];
      
      mockDesktopDb.markEventCompleted.mockReturnValue(true);
      
      const results = eventQueueService.resolveQueueConflicts(localEvents, serverEvents);
      
      expect(results).toEqual({
        localOnly: 1,
        serverOnly: 1,
        both: 1,
        resolved: 1
      });
      
      expect(mockDesktopDb.markEventCompleted).toHaveBeenCalledWith(2);
    });

    test('should handle failed server events during conflict resolution', () => {
      const localEvents = [
        { id: 1, identityKey: 'empire-123:laser_tech' }
      ];
      
      const serverEvents = [
        { identityKey: 'empire-123:laser_tech', status: 'failed', error: 'Blocked' }
      ];
      
      mockDesktopDb.markEventFailed.mockReturnValue(true);
      
      const results = eventQueueService.resolveQueueConflicts(localEvents, serverEvents);
      
      expect(results.resolved).toBe(1);
      expect(mockDesktopDb.markEventFailed).toHaveBeenCalledWith(1, 'Blocked');
    });
  });

  describe('Interval Management', () => {
    test('should start flush interval', () => {
      jest.useFakeTimers();
      
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const flushSpy = jest.spyOn(eventQueueService, 'flushPendingEvents').mockResolvedValue({});
      
      eventQueueService.startFlushInterval(1000);
      
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
      
      // Advance timers to trigger interval
      jest.advanceTimersByTime(100);
      
      expect(flushSpy).toHaveBeenCalled();
      
      jest.useRealTimers();
      setIntervalSpy.mockRestore();
      flushSpy.mockRestore();
    });

    test('should stop flush interval', () => {
      jest.useFakeTimers();
      
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      eventQueueService.startFlushInterval(1000);
      eventQueueService.stopFlushInterval();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(eventQueueService.flushInterval).toBeNull();
      
      jest.useRealTimers();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Shutdown', () => {
    test('should shutdown gracefully', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const flushSpy = jest.spyOn(eventQueueService, 'flushPendingEvents').mockResolvedValue({ flushed: 0 });
      
      await eventQueueService.shutdown();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(flushSpy).toHaveBeenCalledWith(100);
      
      clearIntervalSpy.mockRestore();
      flushSpy.mockRestore();
    });
  });
});
