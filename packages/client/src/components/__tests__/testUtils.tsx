import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock service integration hooks for testing
export const createMockServiceHooks = () => ({
  useServiceAuth: jest.fn(() => ({
    user: {
      _id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com'
    },
    empire: {
      _id: 'test-empire-id',
      name: 'Test Empire',
      homeSystem: 'Test System',
      territories: ['System-1', 'System-2'],
      resources: {
        credits: 1000,
        metal: 500,
        energy: 750,
        research: 250
      },
      techLevels: {
        military: 1,
        economic: 2,
        exploration: 1
      }
    },
    isLoading: false,
    isAuthenticated: true,
    serviceConnected: true,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    updateEmpire: jest.fn()
  })),
  
  useServiceNetwork: jest.fn(() => ({
    status: {
      isOnline: true,
      isApiReachable: true,
      latencyMs: 45 as number | undefined
    },
    isFullyConnected: true,
    serviceConnected: true,
    checkConnection: jest.fn(),
    pingServer: jest.fn()
  })),
  
  useServiceSync: jest.fn(() => ({
    status: {
      state: 'idle' as 'idle' | 'syncing' | 'error',
      queuedCount: 0,
      lastError: null
    },
    serviceConnected: true,
    triggerSync: jest.fn(),
    queueAction: jest.fn()
  })),
  
  useServiceHealth: jest.fn(() => ({
    ready: true,
    status: 'ready',
    services: {
      auth: true,
      network: true,
      sync: true
    }
  })),
  
  useServiceToasts: jest.fn(() => ({
    addToast: jest.fn()
  }))
});

// Service hook states for different test scenarios
export const createOfflineServiceHooks = () => {
  const hooks = createMockServiceHooks();
  hooks.useServiceNetwork.mockReturnValue({
    status: {
      isOnline: false,
      isApiReachable: false,
      latencyMs: undefined
    },
    isFullyConnected: false,
    serviceConnected: true,
    checkConnection: jest.fn(),
    pingServer: jest.fn()
  });
  return hooks;
};

export const createDegradedServiceHooks = () => {
  const hooks = createMockServiceHooks();
  hooks.useServiceNetwork.mockReturnValue({
    status: {
      isOnline: true,
      isApiReachable: false,
      latencyMs: undefined
    },
    isFullyConnected: false,
    serviceConnected: true,
    checkConnection: jest.fn(),
    pingServer: jest.fn()
  });
  return hooks;
};

export const createServiceInitializingHooks = () => {
  const hooks = createMockServiceHooks();
  hooks.useServiceHealth.mockReturnValue({
    ready: false,
    status: 'initializing',
    services: {
      auth: false,
      network: true,
      sync: false
    }
  });
  return hooks;
};

export const createSyncingServiceHooks = () => {
  const hooks = createMockServiceHooks();
  hooks.useServiceSync.mockReturnValue({
    status: {
      state: 'syncing' as const,
      queuedCount: 3,
      lastError: null
    },
    serviceConnected: true,
    triggerSync: jest.fn(),
    queueAction: jest.fn()
  });
  return hooks;
};

// Mock components that might be used
export const MockModalManager = ({ empire }: any) => (
  <div data-testid="modal-manager">Modal Manager - Empire: {empire?.name || 'None'}</div>
);

export const MockLoadingSpinner = ({ size = 'md', color = 'blue', className = '' }: any) => (
  <div data-testid="loading-spinner" className={className}>
    Loading Spinner ({size}, {color})
  </div>
);

// Custom render function with router
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
}

export const renderWithRouter = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { initialEntries = ['/'], ...renderOptions } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock stores
export const createMockMessageStore = () => ({
  activeTab: 'inbox' as const,
  inboxMessages: [
    {
      _id: 'msg-1',
      from: { username: 'sender1', empireName: 'Sender Empire' },
      to: { username: 'testuser', empireName: 'Test Empire' },
      subject: 'Test Message 1',
      content: 'This is a test message',
      isRead: false,
      createdAt: new Date().toISOString()
    }
  ],
  sentboxMessages: [],
  selectedMessage: null,
  isLoading: false,
  error: null,
  composeForm: {
    to: '',
    subject: '',
    content: '',
    error: null,
    isSending: false
  },
  summary: {
    totalMessages: 5,
    unreadMessages: 2
  },
  setActiveTab: jest.fn(),
  setSelectedMessage: jest.fn(),
  loadSummary: jest.fn(),
  loadInbox: jest.fn(),
  loadSentbox: jest.fn(),
  clearError: jest.fn(),
  sendMessage: jest.fn(),
  updateComposeForm: jest.fn(),
  clearComposeForm: jest.fn(),
  markAllAsRead: jest.fn(),
  deleteMessage: jest.fn(),
  getUnreadCount: jest.fn(() => 2),
  initializeSocketListeners: jest.fn(),
  cleanupSocketListeners: jest.fn()
});

export const createMockModalStore = () => ({
  openModal: jest.fn(),
  closeModal: jest.fn(),
  isOpen: jest.fn(() => false),
  modalData: {}
});

// API mocks
export const createMockApi = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
});

// Test data
export const mockUser = {
  _id: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com'
};

export const mockEmpire = {
  _id: 'test-empire-id',
  name: 'Test Empire',
  homeSystem: 'Test System',
  territories: ['System-1', 'System-2'],
  resources: {
    credits: 1000,
    metal: 500,
    energy: 750,
    research: 250
  },
  techLevels: {
    military: 1,
    economic: 2,
    exploration: 1
  }
};

export const mockDashboardData = {
  user: mockUser,
  empire: mockEmpire,
  isNewPlayer: false,
  serverInfo: {
    name: 'Test Server',
    version: '1.0.0',
    playersOnline: 42,
    universeSize: { width: 1000, height: 1000 }
  },
  profile: {
    economyPerHour: 150,
    fleetScore: 75,
    technologyScore: 50,
    level: 2.5
  }
};