import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Login, LoginComponent } from '../Login';
import {
import { ERROR_MESSAGES } from '../../server/src/constants/response-formats';
import { ENV_VARS } from '../../../shared/src/constants/env-vars';


  createMockServiceHooks,
  createOfflineServiceHooks,
  createDegradedServiceHooks,
  createServiceInitializingHooks,
  MockLoadingSpinner
} from '../../__tests__/testUtils';

// Mock the service integration hooks
const mockServiceHooks = createMockServiceHooks();
jest.mock('../../../hooks/useServiceIntegration', () => mockServiceHooks);

// Mock components
jest.mock('../../ui/LoadingSpinner', () => MockLoadingSpinner);
jest.mock('../ServiceMigrationWrapper', () => ({
  withServiceMigration: (Component: React.ComponentType) => Component
}));

// Mock API
const mockApi = {
  post: jest.fn()
};
jest.mock('../../../services/api', () => ({ default: mockApi }));

describe('Login Component', () => {
  const renderLogin = (props = {}) => {
    return render(
      <BrowserRouter>
        <LoginComponent {...props} />
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service hooks to default state
    Object.values(mockServiceHooks).forEach(hook => {
      if (jest.isMockFunction(hook)) {
        hook.mockClear();
      }
    });
  });

  describe('Basic Rendering', () => {
    it('renders login form correctly', () => {
      renderLogin();
      
      expect(screen.getByRole('heading', { name: /welcome to attrition/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    });

    it('shows register form when clicking create account', async () => {
      renderLogin();
      
      const createAccountLink = screen.getByText(/create one/i);
      fireEvent.click(createAccountLink);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      });
    });
  });

  describe('Service Integration', () => {
    it('shows loading state when services are initializing', () => {
      const initializingHooks = createServiceInitializingHooks();
      Object.entries(initializingHooks).forEach(([key, value]) => {
        mockServiceHooks[key as keyof typeof mockServiceHooks].mockReturnValue(value());
      });

      renderLogin();
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/services initializing/i)).toBeInTheDocument();
    });

    it('shows offline warning when network is unavailable', () => {
      const offlineHooks = createOfflineServiceHooks();
      Object.entries(offlineHooks).forEach(([key, value]) => {
        mockServiceHooks[key as keyof typeof mockServiceHooks].mockReturnValue(value());
      });

      renderLogin();
      
      expect(screen.getByText(/connection issues detected/i)).toBeInTheDocument();
      expect(screen.getByText(/authentication will be limited/i)).toBeInTheDocument();
    });

    it('shows degraded connection warning', () => {
      const degradedHooks = createDegradedServiceHooks();
      Object.entries(degradedHooks).forEach(([key, value]) => {
        mockServiceHooks[key as keyof typeof mockServiceHooks].mockReturnValue(value());
      });

      renderLogin();
      
      expect(screen.getByText(/connection issues detected/i)).toBeInTheDocument();
    });

    it('disables form submission when offline', () => {
      const offlineHooks = createOfflineServiceHooks();
      Object.entries(offlineHooks).forEach(([key, value]) => {
        mockServiceHooks[key as keyof typeof mockServiceHooks].mockReturnValue(value());
      });

      renderLogin();
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for empty fields', async () => {
      renderLogin();
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/please enter your username/i)).toBeInTheDocument();
        expect(screen.getByText(/please enter your password/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for short username', async () => {
      renderLogin();
      
      const usernameInput = screen.getByLabelText(/username/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(usernameInput, { target: { value: 'ab' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for short password', async () => {
      renderLogin();
      
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Login Functionality', () => {
    it('calls login service with correct credentials', async () => {
      const mockLogin = jest.fn().mockResolvedValue(true);
      mockServiceHooks.useServiceAuth.mockReturnValue({
        ...mockServiceHooks.useServiceAuth(),
        login: mockLogin,
        isLoading: false
      });

      renderLogin();
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
      });
    });

    it('shows loading state during login', async () => {
      const mockLogin = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      mockServiceHooks.useServiceAuth.mockReturnValue({
        ...mockServiceHooks.useServiceAuth(),
        login: mockLogin,
        isLoading: true
      });

      renderLogin();
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('shows toast notification on login failure', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error(ERROR_MESSAGES.INVALID_CREDENTIALS));
      const mockAddToast = jest.fn();
      
      mockServiceHooks.useServiceAuth.mockReturnValue({
        ...mockServiceHooks.useServiceAuth(),
        login: mockLogin,
        isLoading: false
      });
      
      mockServiceHooks.useServiceToasts.mockReturnValue({
        addToast: mockAddToast
      });

      renderLogin();
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('error', 'Login failed. Please check your credentials and try again.');
      });
    });
  });

  describe('Registration Functionality', () => {
    it('validates registration form correctly', async () => {
      renderLogin();
      
      // Switch to register form
      fireEvent.click(screen.getByText(/create one/i));
      
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /create account/i });
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/please enter your username/i)).toBeInTheDocument();
        expect(screen.getByText(/please enter your email/i)).toBeInTheDocument();
        expect(screen.getByText(/please enter your password/i)).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      renderLogin();
      
      // Switch to register form
      fireEvent.click(screen.getByText(/create one/i));
      
      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        const submitButton = screen.getByRole('button', { name: /create account/i });
        
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('calls register service with correct data', async () => {
      const mockRegister = jest.fn().mockResolvedValue(true);
      mockServiceHooks.useServiceAuth.mockReturnValue({
        ...mockServiceHooks.useServiceAuth(),
        register: mockRegister,
        isLoading: false
      });

      renderLogin();
      
      // Switch to register form
      fireEvent.click(screen.getByText(/create one/i));
      
      await waitFor(() => {
        const usernameInput = screen.getByLabelText(/username/i);
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);
        const submitButton = screen.getByRole('button', { name: /create account/i });
        
        fireEvent.change(usernameInput, { target: { value: 'newuser' } });
        fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('newuser', 'new@example.com', 'password123');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      renderLogin();
      
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });

    it('has proper ARIA attributes for loading states', () => {
      mockServiceHooks.useServiceAuth.mockReturnValue({
        ...mockServiceHooks.useServiceAuth(),
        isLoading: true
      });

      renderLogin();
      
      const submitButton = screen.getByRole('button', { name: /signing in/i });
      expect(submitButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('announces form validation errors to screen readers', async () => {
      renderLogin();
      
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Development Mode Features', () => {
    const originalEnv = process.env[ENV_VARS.NODE_ENV];

    beforeEach(() => {
      process.env[ENV_VARS.NODE_ENV] = 'development';
    });

    afterEach(() => {
      process.env[ENV_VARS.NODE_ENV] = originalEnv;
    });

    it('shows service health indicator in development', () => {
      renderLogin();
      
      // Should show development-only service status
      expect(screen.getByText(/services:/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles network errors gracefully', async () => {
      const mockLogin = jest.fn().mockRejectedValue({ code: 'NETWORK_ERROR' });
      const mockAddToast = jest.fn();
      
      mockServiceHooks.useServiceAuth.mockReturnValue({
        ...mockServiceHooks.useServiceAuth(),
        login: mockLogin
      });
      
      mockServiceHooks.useServiceToasts.mockReturnValue({
        addToast: mockAddToast
      });

      renderLogin();
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('error', 'Network error. Please check your connection and try again.');
      });
    });

    it('handles service disconnection during form submission', async () => {
      // Start with connected services
      renderLogin();
      
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      // Simulate service disconnection
      const offlineHooks = createOfflineServiceHooks();
      Object.entries(offlineHooks).forEach(([key, value]) => {
        mockServiceHooks[key as keyof typeof mockServiceHooks].mockReturnValue(value());
      });
      
      fireEvent.click(submitButton);
      
      // Button should become disabled due to offline state
      expect(submitButton).toBeDisabled();
    });
  });
});

