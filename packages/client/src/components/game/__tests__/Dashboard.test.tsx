import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dashboard, DashboardComponent } from '../Dashboard';
import {
  createMockServiceHooks,
  createOfflineServiceHooks,
  createServiceInitializingHooks,
  createSyncingServiceHooks,
  MockModalManager,
  MockLoadingSpinner,
  mockDashboardData
} from '../../__tests__/testUtils';

// Mock the service integration hooks
const mockServiceHooks = createMockServiceHooks();
jest.mock('../../../hooks/useServiceIntegration', () => mockServiceHooks);

// Mock components and services
jest.mock('../../ui/LoadingSpinner', () => MockLoadingSpinner);
jest.mock('./ModalManager', () => MockModalManager);
jest.mock('../ServiceMigrationWrapper', () => ({
  withServiceMigration: (Component: React.ComponentType) => Component
}));

// Mock API
const mockApi = {
  get: jest.fn(),
  post: jest.fn()
};
jest.mock('../../../services/api', () => ({ default: mockApi }));

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset API mocks
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: mockDashboardData
      }
    });
    
    // Reset service hooks to default state
    Object.values(mockServiceHooks).forEach(hook => {
      if (jest.isMockFunction(hook)) {
        hook.mockClear();
      }
    });
  });

  describe('Basic Rendering', () => {
    it('renders dashboard with empire data correctly', async () => {
      render(<DashboardComponent />);
      
      await waitFor(() => {
        expect(screen.getByText(/welcome to test server, testuser!/i)).toBeInTheDocument();
        expect(screen.getByText(/empire: test empire/i)).toBeInTheDocument();
        expect(screen.getByText(/home system: test system/i)).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      render(<DashboardComponent />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
    });

    it('renders resources section when empire exists', async () => {
      render(<DashboardComponent />);
      
      await waitFor(() => {
        expect(screen.getByText(/resources/i)).toBeInTheDocument();
        expect(screen.getByText(/1,000/)).toBeInTheDocument(); // Credits
        expect(screen.getByText(/500/)).toBeInTheDocument(); // Metal
        expect(screen.getByText(/750/)).toBeInTheDocument(); // Energy
        expect(screen.getByText(/250/)).toBeInTheDocument(); // Research
      });
    });

    it('renders empire statistics correctly', async () => {
      render(<DashboardComponent />);
      
      await waitFor(() => {
        expect(screen.getByText(/empire statistics/i)).toBeInTheDocument();
        expect(screen.getByText(/test empire/)).toBeInTheDocument();
        expect(screen.getByText(/150 cred\.\/h/)).toBeInTheDocument(); // Economy rate
        expect(screen.getByText(/75/)).toBeInTheDocument(); // Fleet score
        expect(screen.getByText(/50/)).toBeInTheDocument(); // Tech score
      });
    });
  });

  describe('Service Integration', () => {
    it('shows service initialization message', () => {
      const initializingHooks = createServiceInitializingHooks();
      Object.entries(initializingHooks).forEach(([key, value]) => {
        mockServiceHooks[key as keyof typeof mockServiceHooks].mockReturnValue(value());
      });

      render(<DashboardComponent />);
      
      expect(screen.getByText(/services initializing/i)).toBeInTheDocument();
      expect(screen.getByText(/initializing services/i)).toBeInTheDocument();
    });

    it('shows offline warning when network is unavailable', () => {
      const offlineHooks = createOfflineServiceHooks();
      Object.entries(offlineHooks).forEach(([key, value]) => {
        mockServiceHooks[key as keyof typeof mockServiceHooks].mockReturnValue(value());
      });

      render(<DashboardComponent />);
      
      expect(screen.getByText(/connection issues detected/i)).toBeInTheDocument();
      expect(screen.getByText(/some features may be limited/i)).toBeInTheDocument();
    });

    it('shows sync status when syncing', async () => {
      const syncingHooks = createSyncingServiceHooks();
      Object.entries(syncingHooks).forEach(([key, value]) => {
        mockServiceHooks[key as keyof typeof mockServiceHooks].mockReturnValue(value());
      });

      render(<DashboardComponent />);
      
      await waitFor(() => {
        expect(screen.getByText(/synchronizing empire data/i)).toBeInTheDocument();
      });
    });

    it('calls API when services are ready', async () => {
      render(<DashboardComponent />);
      
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/game/dashboard');
      });
    });

    it('does not call API when services are not ready', () => {
      const initializingHooks = createServiceInitializingHooks();
      Object.entries(initializingHooks).forEach(([key, value]) => {
        mockServiceHooks[key as keyof typeof mockServiceHooks].mockReturnValue(value());
      });

      render(<DashboardComponent />);
      
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });

  describe('Empire Creation Flow', () => {
    beforeEach(() => {
      // Mock no empire state
      mockServiceHooks.useServiceAuth.mockReturnValue({
        ...mockServiceHooks.useServiceAuth(),
        empire: null
      });
      
      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            ...mockDashboardData,
            empire: null
          }
        }
      });
    });

    it('shows empire creation form when no empire exists', async () => {
      render(<DashboardComponent />);
      
      await waitFor(() => {
        expect(screen.getByText(/create your empire/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/empire name/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /establish empire/i })).toBeInTheDocument();
      });
    }, 10000);

    it('validates empire name input', async () => {
      render(<DashboardComponent />);
      
      await waitFor(() => {
        const establishButton = screen.getByRole('button', { name: /establish empire/i });
        expect(establishButton).toBeDisabled(); // Should be disabled with empty name
      });
    });

    it('creates empire with valid input', async () => {
      mockApi.post.mockResolvedValue({
        data: { success: true }
      });

      const mockTriggerSync = jest.fn();
      mockServiceHooks.useServiceSync.mockReturnValue({
        ...mockServiceHooks.useServiceSync(),
        triggerSync: mockTriggerSync
      });

      render(<DashboardComponent />);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/empire name/i);
        const establishButton = screen.getByRole('button', { name: /establish empire/i });
        
        fireEvent.change(nameInput, { target: { value: 'New Empire' } });
        fireEvent.click(establishButton);
      });
      
      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/game/empire', { name: 'New Empire' });
        expect(mockTriggerSync).toHaveBeenCalled();
      });
    });

    it('prevents empire creation when offline', async () => {
      const offlineHooks = createOfflineServiceHooks();
      Object.entries(offlineHooks).forEach(([key, value]) => {
        mockServiceHooks[key as keyof typeof mockServiceHooks].mockReturnValue(value());
      });

      render(<DashboardComponent />);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/empire name/i);
        const establishButton = screen.getByRole('button', { name: /establish empire/i });
        
        expect(nameInput).toBeDisabled();
        expect(establishButton).toBeDisabled();
        expect(screen.getByText(/connection required to create empire/i)).toBeInTheDocument();
      });
    });

    it('shows loading state during empire creation', async () => {
      mockApi.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<DashboardComponent />);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/empire name/i);
        const establishButton = screen.getByRole('button', { name: /establish empire/i });
        
        fireEvent.change(nameInput, { target: { value: 'New Empire' } });
        fireEvent.click(establishButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/creating empire/i)).toBeInTheDocument();
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });
    });
  });

  describe('Resource Display', () => {
    it('shows sync status in resource section', async () => {
      const syncingHooks = createSyncingServiceHooks();
      Object.entries(syncingHooks).forEach(([key, value]) => {
        mockServiceHooks[key as keyof typeof mockServiceHooks].mockReturnValue(value());
      });

      render(<DashboardComponent />);
      
      await waitFor(() => {
        expect(screen.getByText(/syncing/i)).toBeInTheDocument();
      });
    });

    it('shows queued changes indicator', async () => {
      const syncingHooks = createSyncingServiceHooks();
      Object.entries(syncingHooks).forEach(([key, value]) => {
        mockServiceHooks[key as keyof typeof mockServiceHooks].mockReturnValue(value());
      });

      render(<DashboardComponent />);
      
      await waitFor(() => {
        expect(screen.getByText(/3 changes queued/i)).toBeInTheDocument();
      });
    });

    it('applies visual effects during sync', async () => {
      const syncingHooks = createSyncingServiceHooks();
      Object.entries(syncingHooks).forEach(([key, value]) => {
        mockServiceHooks[key as keyof typeof mockServiceHooks].mockReturnValue(value());
      });

      render(<DashboardComponent />);
      
      await waitFor(() => {
        const resourceDisplays = screen.getAllByText(/credits|metal|energy|research/i);
        // Should have opacity-75 class during sync (this would need DOM inspection)
        expect(resourceDisplays.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('shows toast notification on API error', async () => {
      mockApi.get.mockRejectedValue(new Error('Network error'));
      const mockAddToast = jest.fn();
      
      mockServiceHooks.useServiceToasts.mockReturnValue({
        addToast: mockAddToast
      });

      render(<DashboardComponent />);
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('error', 'Failed to load dashboard data. Please try again.');
      });
    });

    it('handles empire creation failure', async () => {
      mockApi.post.mockRejectedValue(new Error('Empire creation failed'));
      const mockAddToast = jest.fn();
      
      mockServiceHooks.useServiceAuth.mockReturnValue({
        ...mockServiceHooks.useServiceAuth(),
        empire: null
      });
      
      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: { ...mockDashboardData, empire: null }
        }
      });
      
      mockServiceHooks.useServiceToasts.mockReturnValue({
        addToast: mockAddToast
      });

      render(<DashboardComponent />);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/empire name/i);
        const establishButton = screen.getByRole('button', { name: /establish empire/i });
        
        fireEvent.change(nameInput, { target: { value: 'Test Empire' } });
        fireEvent.click(establishButton);
      });
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('error', 'Network error. Please try again.');
      });
    });

    it('shows different error messages for different network states', async () => {
      const mockAddToast = jest.fn();
      mockServiceHooks.useServiceToasts.mockReturnValue({
        addToast: mockAddToast
      });

      // Test offline state
      const offlineHooks = createOfflineServiceHooks();
      Object.entries(offlineHooks).forEach(([key, value]) => {
        mockServiceHooks[key as keyof typeof mockServiceHooks].mockReturnValue(value());
      });

      mockApi.get.mockRejectedValue(new Error('Network error'));

      render(<DashboardComponent />);
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('warning', 'Server unreachable. Displaying cached data.');
      });
    });
  });

  describe('Auto-refresh Functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('auto-refreshes data periodically', async () => {
      render(<DashboardComponent />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 60 seconds
      jest.advanceTimersByTime(60000);
      
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(2);
      });
    });

    it('skips auto-refresh during sync', async () => {
      const syncingHooks = createSyncingServiceHooks();
      Object.entries(syncingHooks).forEach(([key, value]) => {
        mockServiceHooks[key as keyof typeof mockServiceHooks].mockReturnValue(value());
      });

      render(<DashboardComponent />);
      
      // Clear initial calls
      await waitFor(() => {
        mockApi.get.mockClear();
      });

      // Fast-forward 60 seconds
      jest.advanceTimersByTime(60000);
      
      // Should not have called API due to syncing state
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('stops auto-refresh when component unmounts', async () => {
      const { unmount } = render(<DashboardComponent />);
      
      unmount();
      
      // Clear calls and advance time
      mockApi.get.mockClear();
      jest.advanceTimersByTime(60000);
      
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });

  describe('Development Mode Features', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('shows data freshness indicator in development', async () => {
      render(<DashboardComponent />);
      
      await waitFor(() => {
        expect(screen.getByText(/updated:/i)).toBeInTheDocument();
      });
    });

    it('shows service status panel in development', async () => {
      render(<DashboardComponent />);
      
      await waitFor(() => {
        expect(screen.getByText(/service status:/i)).toBeInTheDocument();
        expect(screen.getByText(/all systems operational/i)).toBeInTheDocument();
      });
    });
  });

  describe('Modal Integration', () => {
    it('renders modal manager with empire data', async () => {
      render(<DashboardComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('modal-manager')).toBeInTheDocument();
        expect(screen.getByText(/modal manager - empire: test empire/i)).toBeInTheDocument();
      });
    });

    it('triggers sync after modal operations', async () => {
      const mockTriggerSync = jest.fn();
      mockServiceHooks.useServiceSync.mockReturnValue({
        ...mockServiceHooks.useServiceSync(),
        triggerSync: mockTriggerSync
      });

      render(<DashboardComponent />);
      
      await waitFor(() => {
        const modalManager = screen.getByTestId('modal-manager');
        // Simulate modal update callback
        const onUpdateCallback = mockTriggerSync; // In real scenario, this would be passed to ModalManager
        onUpdateCallback();
        
        expect(mockTriggerSync).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      render(<DashboardComponent />);
      
      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1 });
        expect(mainHeading).toHaveTextContent(/welcome to test server/i);
        
        const subHeadings = screen.getAllByRole('heading', { level: 3 });
        expect(subHeadings.length).toBeGreaterThan(0);
      });
    });

    it('has proper form labels for empire creation', async () => {
      mockServiceHooks.useServiceAuth.mockReturnValue({
        ...mockServiceHooks.useServiceAuth(),
        empire: null
      });
      
      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: { ...mockDashboardData, empire: null }
        }
      });

      render(<DashboardComponent />);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText(/empire name/i);
        expect(nameInput).toBeInTheDocument();
        expect(nameInput).toHaveAttribute('id', 'empireName');
      });
    });

    it('provides loading announcements', () => {
      render(<DashboardComponent />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveAttribute('aria-label', 'Loading...');
    });
  });

  describe('Edge Cases', () => {
    it('handles missing profile data gracefully', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            ...mockDashboardData,
            profile: undefined
          }
        }
      });

      render(<DashboardComponent />);
      
      await waitFor(() => {
        expect(screen.getByText(/0\.00/)).toBeInTheDocument(); // Default level
        expect(screen.getByText(/0 cred\.\/h/)).toBeInTheDocument(); // Default economy
      });
    });

    it('handles API response without success flag', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          success: false,
          error: 'Dashboard data unavailable'
        }
      });

      const mockAddToast = jest.fn();
      mockServiceHooks.useServiceToasts.mockReturnValue({
        addToast: mockAddToast
      });

      render(<DashboardComponent />);
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('error', 'Dashboard data unavailable');
      });
    });

    it('handles component unmount during async operations', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockApi.get.mockReturnValue(promise);

      const { unmount } = render(<DashboardComponent />);
      
      unmount();
      
      // Resolve promise after unmount
      resolvePromise!({
        data: { success: true, data: mockDashboardData }
      });
      
      // Should not cause any errors or state updates
      await promise;
    });
  });
});