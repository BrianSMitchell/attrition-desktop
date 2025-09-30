import { useAppStore } from '../appStore';

// Mock window and navigator for tests
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
  },
  writable: true,
});

Object.defineProperty(window, 'fetch', {
  value: jest.fn(() => Promise.resolve({ ok: true, status: 200 })),
  writable: true,
});

describe('AppStore', () => {
  beforeEach(() => {
    // Clear the store state before each test
    const store = useAppStore.getState();
    store.clearAuth();
    store.clearToasts();
  });

  describe('Auth Slice', () => {
    it('should initialize with correct default state', () => {
      const store = useAppStore.getState();
      
      expect(store.auth.user).toBeNull();
      expect(store.auth.empire).toBeNull();
      expect(store.auth.token).toBeNull();
      expect(store.auth.isLoading).toBe(true);
      expect(store.auth.error).toBeNull();
    });

    it('should update auth state correctly', () => {
      const store = useAppStore.getState();
      
      store.setUser({ id: '1', username: 'test', email: 'test@example.com' } as any);
      store.setToken('test-token');
      store.setLoading(false);

      expect(store.auth.user?.username).toBe('test');
      expect(store.auth.token).toBe('test-token');
      expect(store.auth.isLoading).toBe(false);
    });

    it('should clear auth state correctly', () => {
      const store = useAppStore.getState();
      
      // Set some initial state
      store.setUser({ id: '1', username: 'test', email: 'test@example.com' } as any);
      store.setToken('test-token');

      // Clear auth
      store.clearAuth();

      expect(store.auth.user).toBeNull();
      expect(store.auth.token).toBeNull();
      expect(store.auth.empire).toBeNull();
    });

    it('should correctly determine auth status', () => {
      const store = useAppStore.getState();
      
      // Initially not authed
      expect(store.getIsAuthed()).toBe(false);
      
      // Set user but no token
      store.setUser({ id: '1', username: 'test', email: 'test@example.com' } as any);
      expect(store.getIsAuthed()).toBe(false);
      
      // Set token as well
      store.setToken('test-token');
      expect(store.getIsAuthed()).toBe(true);
    });
  });

  describe('Network Slice', () => {
    it('should initialize with correct default state', () => {
      const store = useAppStore.getState();
      
      expect(store.network.status.isOnline).toBe(true);
      expect(store.network.status.isApiReachable).toBe(true);
      expect(store.network.isFullyConnected).toBe(true);
    });

    it('should update network status correctly', () => {
      const store = useAppStore.getState();
      
      store.setNetworkStatus({
        isOnline: false,
        isApiReachable: false,
        lastChecked: Date.now(),
        error: 'offline',
      });

      expect(store.network.status.isOnline).toBe(false);
      expect(store.network.status.isApiReachable).toBe(false);
      expect(store.network.isFullyConnected).toBe(false);
    });
  });

  describe('UI Slice', () => {
    it('should add and remove toasts correctly', () => {
      const store = useAppStore.getState();
      
      const toastId = store.addToast({
        type: 'success',
        message: 'Test message',
      });

      expect(store.ui.toasts).toHaveLength(1);
      expect(store.ui.toasts[0].message).toBe('Test message');
      expect(store.ui.toasts[0].type).toBe('success');

      store.removeToast(toastId);
      expect(store.ui.toasts).toHaveLength(0);
    });

    it('should manage modal state correctly', () => {
      const store = useAppStore.getState();
      
      // Initially closed
      expect(store.isModalOpen('test-modal')).toBe(false);
      
      // Open modal
      store.openModal('test-modal');
      expect(store.isModalOpen('test-modal')).toBe(true);
      
      // Close modal
      store.closeModal('test-modal');
      expect(store.isModalOpen('test-modal')).toBe(false);
      
      // Toggle modal
      store.toggleModal('test-modal');
      expect(store.isModalOpen('test-modal')).toBe(true);
      
      store.toggleModal('test-modal');
      expect(store.isModalOpen('test-modal')).toBe(false);
    });
  });

  describe('Game Slice', () => {
    const mockBase = {
      _id: 'base-1',
      name: 'Test Base',
      coordinate: 'A01:01:01:01',
      buildings: [],
    } as any;

    it('should manage bases correctly', () => {
      const store = useAppStore.getState();
      
      // Add base
      store.addBase(mockBase);
      expect(store.getTotalBases()).toBe(1);
      expect(store.getBaseById('base-1')).toEqual(mockBase);
      
      // Select base
      store.setSelectedBase('base-1');
      expect(store.getSelectedBase()).toEqual(mockBase);
      
      // Update base
      store.updateBase('base-1', { name: 'Updated Base' });
      const updatedBase = store.getBaseById('base-1');
      expect(updatedBase?.name).toBe('Updated Base');
      
      // Remove base
      store.removeBase('base-1');
      expect(store.getTotalBases()).toBe(0);
      expect(store.getSelectedBase()).toBeNull();
    });
  });

  describe('Sync Slice', () => {
    it('should initialize with correct default state', () => {
      const store = useAppStore.getState();
      
      expect(store.sync.status.state).toBe('idle');
      expect(store.sync.status.queuedCount).toBe(0);
    });

    it('should update sync status correctly', () => {
      const store = useAppStore.getState();
      
      store.setSyncStatus({
        state: 'syncing',
        queuedCount: 5,
        lastRunAt: Date.now(),
        lastDurationMs: 1000,
      });

      expect(store.sync.status.state).toBe('syncing');
      expect(store.sync.status.queuedCount).toBe(5);
      expect(store.sync.status.lastDurationMs).toBe(1000);
    });
  });
});

// Integration test to ensure all slices work together
describe('AppStore Integration', () => {
  it('should maintain state consistency across slices', () => {
    const store = useAppStore.getState();
    
    // Set up some state
    store.setUser({ id: '1', username: 'test', email: 'test@example.com' } as any);
    store.setToken('token');
    store.setNetworkStatus({
      isOnline: true,
      isApiReachable: true,
      lastChecked: Date.now(),
    });
    store.addToast({ type: 'info', message: 'Test integration' });
    
    // Verify all state is maintained
    expect(store.auth.user?.username).toBe('test');
    expect(store.auth.token).toBe('token');
    expect(store.network.isFullyConnected).toBe(true);
    expect(store.ui.toasts).toHaveLength(1);
  });
});
