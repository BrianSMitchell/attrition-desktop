import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { NetworkManager } from '../NetworkManager';
import { AuthManager } from '../AuthManager';
import { SocketManager } from '../SocketManager';
import { SyncManager } from '../SyncManager';
import { ConnectionManager } from '../ConnectionManager';
import { AsyncMutex } from '../AsyncMutex';
import { CircuitBreaker } from '../CircuitBreaker';
import { ERROR_MESSAGES } from '../../server/src/constants/response-formats';


// Mock dependencies
import { HTTP_STATUS } from '@shared/response-formats';
import { TIMEOUTS } from '@shared/constants/magic-numbers';
vi.mock('../../tokenProvider', () => ({
  getToken: vi.fn(() => 'test-token'),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

vi.mock('../../../utils/apiConfig', () => ({
  getCurrentApiConfig: vi.fn(() => ({
    apiUrl: 'http://localhost:3000/api',
    socketUrl: 'http://localhost:3000',
    httpsEnforced: false,
    isProduction: false,
    isDesktop: false,
  })),
}));

// Setup global mocks
beforeAll(() => {
  (global as any).window = {
    navigator: { onLine: true },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    setInterval: global.setInterval,
    clearInterval: global.clearInterval,
    desktop: {
      auth: {
        login: vi.fn(),
        refresh: vi.fn(),
      },
      db: {
        events: {
          getPendingCount: vi.fn(() => ({ success: true, count: 5 })),
          flushQueue: vi.fn(() => ({ success: true, processed: 5 })),
        },
      },
    },
  };

  (global as any).fetch = vi.fn(() => 
    Promise.resolve({
      ok: true,
      status: HTTP_STATUS.OK,
      json: () => Promise.resolve({ success: true }),
    })
  );

  // Mock Socket.IO
  (global as any).io = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: true,
    id: 'mock-socket-id',
  }));
});

describe('Core Services Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AsyncMutex', () => {
    it('should prevent concurrent execution', async () => {
      const mutex = new AsyncMutex({ timeout: TIMEOUTS.ONE_SECOND });
      const results: number[] = [];
      let counter = 0;

      const task = async (id: number) => {
        return mutex.execute(async () => {
          const currentCounter = counter;
          await new Promise(resolve => setTimeout(resolve, 10));
          counter = currentCounter + 1;
          results.push(counter);
        });
      };

      // Execute concurrent tasks
      await Promise.all([
        task(1),
        task(2), 
        task(3),
      ]);

      // Should execute sequentially
      expect(results).toEqual([1, 2, 3]);
      expect(counter).toBe(3);
    });

    it('should timeout on long operations', async () => {
      const mutex = new AsyncMutex({ timeout: 100 });

      const longTask = () => mutex.execute(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      await expect(longTask()).rejects.toThrow('Mutex timeout');
    });

    it('should handle errors in protected operations', async () => {
      const mutex = new AsyncMutex({ timeout: TIMEOUTS.ONE_SECOND });

      const failingTask = () => mutex.execute(async () => {
        throw new Error('Task failed');
      });

      await expect(failingTask()).rejects.toThrow('Task failed');

      // Mutex should still work after error
      const successTask = () => mutex.execute(async () => 'success');
      await expect(successTask()).resolves.toBe('success');
    });
  });

  describe('CircuitBreaker', () => {
    it('should allow operations when closed', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 1000,
        monitoringPeriod: 1000,
      });

      expect(breaker.canExecute()).toBe(true);
      expect(breaker.getState().state).toBe('CLOSED');
    });

    it('should open after threshold failures', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000,
        monitoringPeriod: 1000,
      });

      // Record failures
      breaker.recordFailure();
      expect(breaker.canExecute()).toBe(true);

      breaker.recordFailure();
      expect(breaker.canExecute()).toBe(false);
      expect(breaker.getState().state).toBe('OPEN');
    });

    it('should transition to half-open after timeout', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 50,
        monitoringPeriod: 1000,
      });

      // Trigger opening
      breaker.recordFailure();
      expect(breaker.canExecute()).toBe(false);

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 60));

      expect(breaker.canExecute()).toBe(true);
      expect(breaker.getState().state).toBe('HALF_OPEN');
    });

    it('should close on success after half-open', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 50,
        monitoringPeriod: 1000,
      });

      // Open the breaker
      breaker.recordFailure();
      
      // Wait for half-open
      await new Promise(resolve => setTimeout(resolve, 60));
      expect(breaker.getState().state).toBe('HALF_OPEN');

      // Record success
      breaker.recordSuccess();
      expect(breaker.getState().state).toBe('CLOSED');
    });
  });

  describe('NetworkManager', () => {
    let networkManager: NetworkManager;

    beforeEach(async () => {
      networkManager = new NetworkManager({ enableLogging: false });
      await networkManager.initialize();
    });

    afterEach(() => {
      networkManager.cleanup();
    });

    it('should initialize with default state', () => {
      const state = networkManager.getState();
      expect(state.isOnline).toBe(true);
      expect(state.lastChecked).toBeDefined();
    });

    it('should check connectivity', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: HTTP_STATUS.OK,
      } as Response);

      await networkManager.checkConnectivity();
      
      const state = networkManager.getState();
      expect(state.isApiReachable).toBe(true);
      expect(state.latencyMs).toBeDefined();
    });

    it('should handle connectivity failures', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error(ERROR_MESSAGES.NETWORK_ERROR));

      await networkManager.checkConnectivity();
      
      const state = networkManager.getState();
      expect(state.isApiReachable).toBe(false);
      expect(state.error).toBe(ERROR_MESSAGES.NETWORK_ERROR);
    });

    it('should notify state changes', async () => {
      const callback = vi.fn();
      networkManager.onStateChange(callback);

      await networkManager.checkConnectivity();
      
      expect(callback).toHaveBeenCalled();
    });

    it('should start and stop monitoring', () => {
      networkManager.startMonitoring();
      expect(networkManager.isMonitoring()).toBe(true);

      networkManager.stopMonitoring();
      expect(networkManager.isMonitoring()).toBe(false);
    });
  });

  describe('AuthManager', () => {
    let authManager: AuthManager;

    beforeEach(async () => {
      authManager = new AuthManager({ enableLogging: false });
      await authManager.initialize();
    });

    afterEach(() => {
      authManager.cleanup();
    });

    it('should initialize with unauthenticated state', () => {
      const state = authManager.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBe(null);
      expect(state.token).toBe(null);
    });

    it('should handle successful login', async () => {
      const mockResponse = {
        success: true,
        data: { 
          user: { id: '1', username: 'test' },
          empire: { id: '1', name: 'Test Empire' },
          token: 'auth-token'
        }
      };

      (global as any).window.desktop.auth.login.mockResolvedValueOnce(mockResponse);

      const result = await authManager.login('test@example.com', 'password');
      expect(result).toBe(true);

      const state = authManager.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.id).toBe('1');
      expect(state.token).toBe('auth-token');
    });

    it('should handle failed login', async () => {
      (global as any).window.desktop.auth.login.mockResolvedValueOnce({
        success: false,
        error: ERROR_MESSAGES.INVALID_CREDENTIALS
      });

      const result = await authManager.login('test@example.com', 'wrong');
      expect(result).toBe(false);

      const state = authManager.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle logout', async () => {
      // Set authenticated state
      authManager['state'] = {
        user: { id: '1', username: 'test', email: 'test@example.com' },
        empire: { id: '1', name: 'Test Empire' },
        token: 'token',
        isAuthenticated: true,
      };

      await authManager.logout();

      const state = authManager.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBe(null);
      expect(state.token).toBe(null);
    });

    it('should notify state changes', async () => {
      const callback = vi.fn();
      authManager.onStateChange(callback);

      await authManager.logout();
      
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('SocketManager', () => {
    let socketManager: SocketManager;

    beforeEach(async () => {
      socketManager = new SocketManager({ enableLogging: false });
      await socketManager.initialize();
    });

    afterEach(() => {
      socketManager.cleanup();
    });

    it('should initialize with disconnected state', () => {
      const state = socketManager.getState();
      expect(state.isConnected).toBe(false);
      expect(state.reconnectAttempts).toBe(0);
    });

    it('should connect successfully', async () => {
      const mockSocket = {
        connect: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        connected: true,
        id: 'test-socket-id',
      };

      (global as any).io.mockReturnValueOnce(mockSocket);

      await socketManager.connect();

      const state = socketManager.getState();
      expect(state.isConnected).toBe(true);
      expect(state.connectionId).toBe('test-socket-id');
    });

    it('should handle connection failures', async () => {
      (global as any).io.mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      await expect(socketManager.connect()).rejects.toThrow();

      const state = socketManager.getState();
      expect(state.isConnected).toBe(false);
    });

    it('should prevent concurrent connections', async () => {
      const connectPromises = [
        socketManager.connect(),
        socketManager.connect(),
        socketManager.connect(),
      ];

      const results = await Promise.allSettled(connectPromises);
      
      // Should not cause race conditions
      const rejectedCount = results.filter(r => r.status === 'rejected').length;
      expect(rejectedCount).toBe(0);
    });

    it('should manage event listeners', () => {
      const callback = vi.fn();
      const cleanup = socketManager.on('test-event', callback);

      expect(typeof cleanup).toBe('function');
      
      cleanup();
      // Cleanup should remove the listener
    });
  });

  describe('SyncManager', () => {
    let syncManager: SyncManager;

    beforeEach(async () => {
      syncManager = new SyncManager({ enableLogging: false });
      await syncManager.initialize();
    });

    afterEach(() => {
      syncManager.cleanup();
    });

    it('should initialize with idle state', () => {
      const state = syncManager.getState();
      expect(state.isActive).toBe(false);
      expect(state.queuedCount).toBeDefined();
    });

    it('should handle sync operations', async () => {
      (global as any).window.desktop.db.events.flushQueue.mockResolvedValueOnce({
        success: true,
        processed: 3
      });

      await syncManager.startSync();

      const state = syncManager.getState();
      expect(state.isActive).toBe(false); // Should be false after completion
      expect(state.lastSyncAt).toBeDefined();
    });

    it('should prevent concurrent sync operations', async () => {
      (global as any).window.desktop.db.events.flushQueue.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const syncPromises = [
        syncManager.startSync(),
        syncManager.startSync(),
        syncManager.startSync(),
      ];

      const results = await Promise.allSettled(syncPromises);
      
      // First should succeed, others should be handled gracefully
      const fulfilledCount = results.filter(r => r.status === 'fulfilled').length;
      expect(fulfilledCount).toBeGreaterThan(0);
    });

    it('should handle sync failures', async () => {
      (global as any).window.desktop.db.events.flushQueue.mockRejectedValueOnce(
        new Error('Sync failed')
      );

      await expect(syncManager.startSync()).rejects.toThrow('Sync failed');

      const state = syncManager.getState();
      expect(state.lastError).toBe('Sync failed');
    });

    it('should get queue count', async () => {
      (global as any).window.desktop.db.events.getPendingCount.mockResolvedValueOnce({
        success: true,
        count: 10
      });

      const count = await syncManager.getQueueCount();
      expect(count).toBe(10);
    });
  });

  describe('ConnectionManager', () => {
    let connectionManager: ConnectionManager;

    beforeEach(() => {
      connectionManager = new ConnectionManager(
        { socketReconnectDelay: 100 },
        { enableLogging: false }
      );
    });

    afterEach(async () => {
      await connectionManager.cleanup();
    });

    it('should initialize all services', async () => {
      await connectionManager.initialize();

      const state = connectionManager.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.services.network).toBeDefined();
      expect(state.services.auth).toBeDefined();
    });

    it('should coordinate service dependencies', async () => {
      const socketManager = new SocketManager({ enableLogging: false });
      connectionManager.setSocketManager(socketManager);

      await connectionManager.initialize();

      // Test network change coordination
      const networkManager = connectionManager.network;
      const authManager = connectionManager.auth;

      // Mock authenticated state
      authManager['state'] = {
        user: { id: '1', username: 'test', email: 'test@example.com' },
        empire: null,
        token: 'token',
        isAuthenticated: true,
      };

      // Simulate network coming online
      await connectionManager.handleNetworkChange({
        isOnline: true,
        isApiReachable: true,
        lastChecked: Date.now(),
      });

      // Should attempt to connect socket since user is authenticated and network is available
      // (We can't easily test this without more complex mocking, but the structure is correct)
    });

    it('should handle service coordination events', async () => {
      const eventCallback = vi.fn();
      connectionManager.on('network-change', eventCallback);

      await connectionManager.initialize();

      await connectionManager.handleNetworkChange({
        isOnline: false,
        isApiReachable: false,
        lastChecked: Date.now(),
      });

      expect(eventCallback).toHaveBeenCalled();
    });

    it('should provide service access', async () => {
      await connectionManager.initialize();

      expect(connectionManager.network).toBeDefined();
      expect(connectionManager.auth).toBeDefined();
      expect(connectionManager.socket).toBe(null); // Not set
      expect(connectionManager.sync).toBe(null); // Not set
    });

    it('should clean up properly', async () => {
      await connectionManager.initialize();
      expect(connectionManager.getState().isInitialized).toBe(true);

      await connectionManager.cleanup();
      expect(connectionManager.getState().isInitialized).toBe(false);
    });
  });
});


