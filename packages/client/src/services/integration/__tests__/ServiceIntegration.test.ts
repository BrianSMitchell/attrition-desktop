import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { 
import { ERROR_MESSAGES } from '../../server/src/constants/response-formats';

import { HTTP_STATUS } from '@shared/response-formats';
  ServiceRegistry, 
  initializeServices, 
  cleanupServices,
  getServices 
} from '../../core';
import { 
  ServiceIntegrationManager,
  initializeServiceIntegration,
  cleanupServiceIntegration,
  getServiceIntegration
} from '../ServiceIntegrationManager';
import { 
  useEnhancedAppStore,
  initializeEnhancedAppStore,
  cleanupEnhancedAppStore
} from '../../../stores/enhancedAppStore';
import { AppInitializer, initializeApp, cleanupApp } from '../../../initialize';

// Mock external dependencies
vi.mock('../../tokenProvider', () => ({
  getToken: vi.fn(() => 'mock-token'),
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

// Mock desktop IPC
const mockDesktop = {
  auth: {
    login: vi.fn(),
    register: vi.fn(),
    refresh: vi.fn(),
  },
  db: {
    events: {
      getPendingCount: vi.fn(() => ({ success: true, count: 0 })),
      flushQueue: vi.fn(() => ({ success: true, processed: 0 })),
    },
  },
};

// Setup global mocks
beforeAll(() => {
  (global as any).window = {
    navigator: { onLine: true },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    desktop: mockDesktop,
  };

  (global as any).fetch = vi.fn(() => 
    Promise.resolve({
      ok: true,
      status: HTTP_STATUS.OK,
      json: () => Promise.resolve({ success: true }),
    })
  );
});

describe('Service Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await cleanupApp();
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('Service Layer Initialization', () => {
    it('should initialize services successfully', async () => {
      const services = await initializeServices({
        enableLogging: false,
        enableMetrics: false,
        maxRetries: 1,
        retryDelay: 100,
      });

      const registry = getServices();
      expect(registry.isReady()).toBe(true);

      const state = registry.getState();
      expect(state.initialized).toBe(true);
      expect(state.services).toBeDefined();
      expect(state.services.network).toBeDefined();
      expect(state.services.auth).toBeDefined();

      await cleanupServices();
    });

    it('should handle service initialization failures gracefully', async () => {
      // Mock a service failure
      vi.mocked(fetch).mockRejectedValueOnce(new Error(ERROR_MESSAGES.NETWORK_ERROR));

      await expect(initializeServices({
        enableLogging: false,
        maxRetries: 1,
        retryDelay: 10,
      })).rejects.toThrow();
    });

    it('should maintain service isolation', async () => {
      await initializeServices({ enableLogging: false });
      const services = getServices();

      const networkManager = services.getNetworkManager();
      const authManager = services.getAuthManager();

      // Services should be independent instances
      expect(networkManager).not.toBe(authManager);
      expect(networkManager.getState()).not.toBe(authManager.getState());

      await cleanupServices();
    });
  });

  describe('Store-Service Integration', () => {
    it('should establish bidirectional communication', async () => {
      // Initialize complete system
      await initializeApp();

      const store = useEnhancedAppStore.getState();
      const services = getServices();

      // Verify integration is established
      expect(store.services.initialized).toBe(true);
      expect(store.services.isReady).toBe(true);
      expect(services.isReady()).toBe(true);

      // Test service to store sync
      const networkManager = services.getNetworkManager();
      const initialNetworkState = networkManager.getState();
      
      // Network state should be synced to store
      expect(store.network.status.isOnline).toBe(initialNetworkState.isOnline);
      expect(store.network.serviceConnected).toBe(true);
    });

    it('should sync authentication state changes', async () => {
      await initializeApp();
      
      const store = useEnhancedAppStore.getState();
      const services = getServices();
      const authManager = services.getAuthManager();

      // Mock successful login
      const mockAuthState = {
        user: { id: '1', username: 'test', email: 'test@example.com' },
        empire: { id: '1', name: 'Test Empire' },
        token: 'new-token',
        isAuthenticated: true,
      };

      // Simulate auth state change from service
      authManager['state'] = mockAuthState;
      authManager['notifyStateChange']?.(mockAuthState);

      // Wait for state sync
      await new Promise(resolve => setTimeout(resolve, 10));

      // Store should be updated
      expect(store.auth.isAuthenticated).toBe(true);
      expect(store.auth.user?.id).toBe('1');
      expect(store.auth.serviceConnected).toBe(true);
    });

    it('should handle network connectivity changes', async () => {
      await initializeApp();

      const store = useEnhancedAppStore.getState();
      const services = getServices();
      const networkManager = services.getNetworkManager();

      // Simulate network state change
      const offlineState = {
        isOnline: false,
        isApiReachable: false,
        lastChecked: Date.now(),
        error: 'Network unavailable',
      };

      // Update network state
      networkManager['state'] = offlineState;
      networkManager['notifyStateChange']?.(offlineState);

      // Wait for state sync
      await new Promise(resolve => setTimeout(resolve, 10));

      // Store should reflect network change
      expect(store.network.status.isOnline).toBe(false);
      expect(store.network.isFullyConnected).toBe(false);
    });
  });

  describe('Race Condition Prevention', () => {
    it('should prevent concurrent service initializations', async () => {
      const initPromises = [
        initializeApp(),
        initializeApp(),
        initializeApp(),
      ];

      const results = await Promise.allSettled(initPromises);
      
      // All should succeed or fail gracefully
      results.forEach(result => {
        expect(result.status).toMatch(/fulfilled|rejected/);
      });

      // System should be in consistent state
      const appInitializer = AppInitializer.getInstance();
      expect(appInitializer.isInitialized()).toBe(true);
    });

    it('should handle concurrent auth operations', async () => {
      await initializeApp();
      
      const store = useEnhancedAppStore.getState();
      
      // Mock login success
      mockDesktop.auth.login.mockResolvedValue({
        success: true,
        data: { token: 'test-token' }
      });

      // Attempt concurrent logins
      const loginPromises = [
        store.loginWithService('test@example.com', 'password'),
        store.loginWithService('test@example.com', 'password'),
        store.loginWithService('test@example.com', 'password'),
      ];

      const results = await Promise.allSettled(loginPromises);
      
      // Should not cause race conditions
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(0);
      expect(store.auth.isLoading).toBe(false); // Should not be stuck in loading state
    });

    it('should handle concurrent sync operations', async () => {
      await initializeApp();
      
      const store = useEnhancedAppStore.getState();
      
      // Mock sync operations
      mockDesktop.db.events.flushQueue.mockResolvedValue({
        success: true,
        processed: 5
      });

      // Attempt concurrent syncs
      const syncPromises = [
        store.startSyncWithService(),
        store.startSyncWithService(),
        store.flushQueueWithService(),
      ];

      const results = await Promise.allSettled(syncPromises);
      
      // Should handle concurrency gracefully
      results.forEach(result => {
        if (result.status === 'rejected') {
          // Rejections should be due to mutex protection, not race conditions
          expect(result.reason.message).not.toContain('race condition');
        }
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should recover from service failures', async () => {
      await initializeApp();
      
      const store = useEnhancedAppStore.getState();
      const services = getServices();

      // Simulate service error
      const networkManager = services.getNetworkManager();
      const errorState = {
        isOnline: true,
        isApiReachable: false,
        lastChecked: Date.now(),
        error: 'API unreachable',
      };

      networkManager['state'] = errorState;
      networkManager['notifyStateChange']?.(errorState);

      // Wait for error propagation
      await new Promise(resolve => setTimeout(resolve, 10));

      // Store should reflect error state
      expect(store.network.status.error).toBe('API unreachable');
      expect(store.network.isFullyConnected).toBe(false);

      // Simulate recovery
      const recoveredState = {
        isOnline: true,
        isApiReachable: true,
        lastChecked: Date.now(),
        error: undefined,
      };

      networkManager['state'] = recoveredState;
      networkManager['notifyStateChange']?.(recoveredState);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Should recover
      expect(store.network.status.error).toBeUndefined();
      expect(store.network.isFullyConnected).toBe(true);
    });

    it('should handle initialization failures gracefully', async () => {
      // Mock service initialization failure
      vi.mocked(fetch).mockRejectedValueOnce(new Error(ERROR_MESSAGES.SERVICE_UNAVAILABLE));

      await expect(initializeApp()).rejects.toThrow();

      // System should be in clean state after failure
      const appInitializer = AppInitializer.getInstance();
      expect(appInitializer.isInitialized()).toBe(false);
    });

    it('should cleanup properly on errors', async () => {
      await initializeApp();
      
      const store = useEnhancedAppStore.getState();
      expect(store.services.initialized).toBe(true);

      // Force cleanup
      await cleanupApp();

      // Everything should be cleaned up
      expect(store.services.initialized).toBe(false);
      expect(store.services.isReady).toBe(false);
    });
  });

  describe('Service Health Monitoring', () => {
    it('should track service health accurately', async () => {
      await initializeApp();
      
      const appInitializer = AppInitializer.getInstance();
      const healthCheck = appInitializer.performHealthCheck();

      expect(healthCheck.healthy).toBe(true);
      expect(healthCheck.issues).toHaveLength(0);

      const status = appInitializer.getSystemStatus();
      expect(status.initialized).toBe(true);
      expect(status.services.initialized).toBe(true);
      expect(status.services.ready).toBe(true);
    });

    it('should detect service disconnections', async () => {
      await initializeApp();
      
      const store = useEnhancedAppStore.getState();
      
      // Simulate service disconnection
      store.setServiceConnection('auth', false);
      store.setServiceConnection('network', false);

      const appInitializer = AppInitializer.getInstance();
      const healthCheck = appInitializer.performHealthCheck();

      expect(healthCheck.healthy).toBe(false);
      expect(healthCheck.issues).toContain('Auth service not connected');
      expect(healthCheck.issues).toContain('Network service not connected');
    });

    it('should provide detailed system status', async () => {
      await initializeApp();
      
      const appInitializer = AppInitializer.getInstance();
      const status = appInitializer.getSystemStatus();

      expect(status).toHaveProperty('initialized', true);
      expect(status).toHaveProperty('health');
      expect(status).toHaveProperty('services');
      expect(status).toHaveProperty('auth');
      expect(status).toHaveProperty('network');
      expect(status).toHaveProperty('sync');

      expect(status.services).toHaveProperty('initialized');
      expect(status.services).toHaveProperty('ready');
      expect(status.services).toHaveProperty('connections');
      expect(status.auth).toHaveProperty('isAuthenticated');
      expect(status.network).toHaveProperty('isOnline');
      expect(status.sync).toHaveProperty('state');
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should clean up event listeners', async () => {
      await initializeApp();
      
      const integration = getServiceIntegration();
      const initialStatus = integration.getStatus();
      expect(initialStatus.cleanupFunctionsCount).toBeGreaterThan(0);

      await cleanupApp();

      // After cleanup, no hanging listeners
      const finalStatus = integration.getStatus();
      expect(finalStatus.cleanupFunctionsCount).toBe(0);
    });

    it('should not leak service instances', async () => {
      // Initialize and cleanup multiple times
      for (let i = 0; i < 3; i++) {
        await initializeApp();
        await cleanupApp();
      }

      // Should not accumulate instances
      expect(ServiceIntegrationManager['instance']).toBe(null);
      expect(AppInitializer['instance']).toBe(null);
    });
  });
});


