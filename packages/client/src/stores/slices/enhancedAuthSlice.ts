import { StateCreator } from 'zustand';
import { User, Empire } from '@game/shared';
import { getServices } from '../../services/core';
import { AuthState as ServiceAuthState } from '../../services/core/types';

import { ERROR_MESSAGES } from '@game/shared';

interface AuthState {
  user: Omit<User, 'passwordHash'> | null;
  empire: Empire | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  // Service integration state
  serviceConnected: boolean;
  lastSyncAt?: number;
}

export interface EnhancedAuthSlice {
  auth: AuthState;
  
  // Actions
  setAuthState: (state: Partial<AuthState>) => void;
  setAuthLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setUser: (user: Omit<User, 'passwordHash'> | null) => void;
  setEmpire: (empire: Empire | null) => void;
  setToken: (token: string | null) => void;
  clearAuth: () => void;
  getIsAuthed: () => boolean;
  
  // Enhanced service-integrated actions
  loginWithService: (email: string, password: string) => Promise<boolean>;
  registerWithService: (email: string, username: string, password: string) => Promise<boolean>;
  logoutWithService: () => Promise<void>;
  refreshAuthStatus: () => Promise<void>;
  updateEmpireFromService: (empire: Empire | null) => void;
  syncAuthWithService: (serviceState: ServiceAuthState) => void;
  initializeAuthService: () => void;
  cleanupAuthService: () => void;
  loadCreditsBalance: () => Promise<void>;
}

const createEnhancedAuthSlice: StateCreator<
  EnhancedAuthSlice,
  [],
  [],
  EnhancedAuthSlice
> = (set, get) => {
  let authServiceCleanup: (() => void) | null = null;

  return {
    auth: {
      user: null,
      empire: null,
      token: null,
      isLoading: true,
      error: null,
      isAuthenticated: false,
      serviceConnected: false,
    },

    setAuthState: (newState: Partial<AuthState>) => {
      set((state) => ({
        auth: {
          ...state.auth,
          ...newState,
        },
      }));
    },

    setAuthLoading: (loading: boolean) => {
      set((state) => ({
        auth: {
          ...state.auth,
          isLoading: loading,
        },
      }));
    },

    setError: (error: string | null) => {
      set((state) => ({
        auth: {
          ...state.auth,
          error,
        },
      }));
    },

    clearError: () => {
      set((state) => ({
        auth: {
          ...state.auth,
          error: null,
        },
      }));
    },

    setUser: (user: Omit<User, 'passwordHash'> | null) => {
      set((state) => ({
        auth: {
          ...state.auth,
          user,
          isAuthenticated: !!(user && state.auth.token),
        },
      }));
    },

    setEmpire: (empire: Empire | null) => {
      set((state) => ({
        auth: {
          ...state.auth,
          empire,
        },
      }));
    },

    setToken: (token: string | null) => {
      set((state) => ({
        auth: {
          ...state.auth,
          token,
          isAuthenticated: !!(token && state.auth.user),
        },
      }));
    },

    clearAuth: () => {
      set((state) => ({
        auth: {
          ...state.auth,
          user: null,
          empire: null,
          token: null,
          error: null,
          isAuthenticated: false,
        },
      }));
    },

    getIsAuthed: () => {
      const { auth } = get();
      return auth.isAuthenticated;
    },

    loginWithService: async (email: string, password: string): Promise<boolean> => {
      const { setAuthLoading, setError, syncAuthWithService } = get();
      
      setAuthLoading(true);
      setError(null);

      try {
        let services;
        try {
          services = getServices();
        } catch (error) {
          throw new Error('Services not available');
        }
        
        if (!services.isReady()) {
          throw new Error('Services not initialized');
        }

        // Capture the auth manager reference before awaiting to avoid races
        const authManager = services.getAuthManager();
        const success = await authManager.login(email, password);
        
        if (success) {
          // Try to read state from the captured manager first (resilient to service teardown)
          try {
            const serviceState = authManager.getState();
            syncAuthWithService(serviceState);
          } catch (readErr) {
            // As a fallback, re-check current services and read again if available
            try {
              const currentServices = getServices();
              if (currentServices.isReady()) {
                const state2 = currentServices.getAuthManager().getState();
                syncAuthWithService(state2);
              }
            } catch (fallbackErr) {
              // Final fallback: leave store state as-is; AuthManager has already persisted token
              console.warn('Auth: Unable to sync store state after login (services may have been reset)');
            }
          }
          
          console.log('âœ… Auth: Login successful, store synced with service');
          return true;
        } else {
          setError(ERROR_MESSAGES.LOGIN_FAILED);
          return false;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.LOGIN_FAILED;
        console.error('âŒ Auth: Login error:', error);
        setError(message);
        return false;
      } finally {
        setAuthLoading(false);
      }
    },

    registerWithService: async (email: string, username: string, password: string): Promise<boolean> => {
      const { setAuthLoading, setError, syncAuthWithService } = get();
      setAuthLoading(true);
      setError(null);
      try {
        let services;
        try {
          services = getServices();
        } catch (e) {
          throw new Error('Services not available');
        }
        if (!services.isReady()) {
          throw new Error('Services not initialized');
        }
        const authManager = services.getAuthManager();
        // @ts-ignore register added to IAuthManager
        const success = await (authManager as any).register(email, username, password);
        if (success) {
          try {
            const serviceState = authManager.getState();
            syncAuthWithService(serviceState);
          } catch {
            try {
              const s2 = getServices();
              if (s2.isReady()) {
                syncAuthWithService(s2.getAuthManager().getState());
              }
            } catch {}
          }
          return true;
        } else {
          setError('Registration failed');
          return false;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Registration failed';
        console.error('âŒ Auth: Register error:', error);
        setError(message);
        return false;
      } finally {
        setAuthLoading(false);
      }
    },

    logoutWithService: async (): Promise<void> => {
      const { setAuthLoading, clearAuth } = get();
      
      setAuthLoading(true);

      try {
        const services = getServices();
        if (services.isReady()) {
          await services.getAuthManager().logout();
        }
        
        clearAuth();
        console.log('âœ… Auth: Logout successful');
      } catch (error) {
        console.error('âŒ Auth: Logout error:', error);
        // Clear auth anyway on logout errors
        clearAuth();
      } finally {
        setAuthLoading(false);
      }
    },

    refreshAuthStatus: async (): Promise<void> => {
      const { setAuthLoading, syncAuthWithService } = get();
      
      setAuthLoading(true);

      try {
        const services = getServices();
        if (!services.isReady()) {
          console.warn('âš ï¸ Auth: Services not ready for refresh');
          return;
        }

        await services.getAuthManager().checkAuthStatus();
        const serviceState = services.getAuthManager().getState();
        syncAuthWithService(serviceState);
        
        console.log('âœ… Auth: Status refreshed successfully');
      } catch (error) {
        console.error('âŒ Auth: Refresh error:', error);
        // Don't clear auth on refresh errors - user might still be logged in
      } finally {
        setAuthLoading(false);
      }
    },

    updateEmpireFromService: (empire: Empire | null): void => {
      try {
        const services = getServices();
        if (!services.isReady()) {
          console.warn('âš ï¸ Auth: Services not ready, updating store directly');
          get().setEmpire(empire);
          return;
        }

        // Update through service layer - this will trigger state change listeners
        services.getAuthManager().updateEmpire(empire);
        console.log('âœ… Auth: Empire updated through service');
      } catch (error) {
        console.error('âŒ Auth: Failed to update empire through service:', error);
        // Fallback: update store directly
        get().setEmpire(empire);
      }
    },

    syncAuthWithService: (serviceState: ServiceAuthState): void => {
      const { setAuthState, loadCreditsBalance } = get();
      
      // Normalize empire to ensure stable shape (resources always present)
      const normalizedEmpire = serviceState.empire
        ? {
            ...serviceState.empire,
            resources: {
              credits: serviceState.empire.resources?.credits ?? 0,
            },
          }
        : null;

      setAuthState({
        user: serviceState.user,
        empire: normalizedEmpire as any,
        token: serviceState.token,
        isAuthenticated: serviceState.isAuthenticated,
        serviceConnected: true,
        lastSyncAt: Date.now(),
      });

      console.log('🔄 Auth: Store synced with service state:', {
        hasUser: !!serviceState.user,
        hasEmpire: !!serviceState.empire,
        hasToken: !!serviceState.token,
        isAuthenticated: serviceState.isAuthenticated,
      });
      
      // Auto-load credits balance if we have an empire but credits are 0 or missing
      if (serviceState.isAuthenticated && serviceState.empire) {
        const currentCredits = serviceState.empire.resources?.credits ?? 0;
        if (currentCredits === 0) {
          // Delay slightly to ensure token is set
          setTimeout(() => {
            loadCreditsBalance().catch((error) => {
              console.warn('Failed to auto-load credits:', error);
            });
          }, 100);
        }
      }
    },

    loadCreditsBalance: async (): Promise<void> => {
      const { empire } = get().auth;
      if (!empire) {
        console.warn('No empire to load credits for');
        return;
      }

      try {
        // Import dynamically to avoid circular dependencies
        const { getCreditHistory } = await import('../../services/api');
        const result = await getCreditHistory(1); // Just get the latest entry
        
        if (result.history && result.history.length > 0) {
          const latestBalance = result.history[0].balanceAfter;
          if (typeof latestBalance === 'number') {
            // Update empire with current credits
            get().updateEmpireFromService({
              ...empire,
              resources: {
                ...empire.resources,
                credits: latestBalance,
              },
            });
            console.log('💰 Credits loaded:', latestBalance);
          }
        }
      } catch (error) {
        console.error('Failed to load credits balance:', error);
        throw error;
      }
    },

    initializeAuthService: (): void => {
      try {
        const services = getServices();
        if (!services.isReady()) {
          console.warn('âš ï¸ Auth: Services not ready for initialization');
          return;
        }

        // Subscribe to auth service state changes
        authServiceCleanup = services.getAuthManager().onStateChange((serviceState) => {
          const { syncAuthWithService } = get();
          syncAuthWithService(serviceState);
        });

        // Initial sync with service state
        const serviceState = services.getAuthManager().getState();
        get().syncAuthWithService(serviceState);

        console.log('âœ… Auth: Service integration initialized');
      } catch (error) {
        console.error('âŒ Auth: Service initialization failed:', error);
        
        // Set service disconnected state
        set((state) => ({
          auth: {
            ...state.auth,
            serviceConnected: false,
            error: 'Service connection failed',
          },
        }));
      }
    },

    cleanupAuthService: (): void => {
      if (authServiceCleanup) {
        authServiceCleanup();
        authServiceCleanup = null;
      }

      set((state) => ({
        auth: {
          ...state.auth,
          serviceConnected: false,
        },
      }));

      console.log('âœ… Auth: Service integration cleaned up');
    },
  };
};

export default createEnhancedAuthSlice;

