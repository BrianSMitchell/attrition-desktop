import { StateCreator } from 'zustand';
import { User, Empire } from '@game/shared';
import { getServices } from '../../services/core';
import { AuthState as ServiceAuthState } from '../../services/core/types';

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
  logoutWithService: () => Promise<void>;
  refreshAuthStatus: () => Promise<void>;
  syncAuthWithService: (serviceState: ServiceAuthState) => void;
  initializeAuthService: () => void;
  cleanupAuthService: () => void;
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

        const success = await services.getAuthManager().login(email, password);
        
        if (success) {
          // Sync the store state with the service state
          const serviceState = services.getAuthManager().getState();
          syncAuthWithService(serviceState);
          
          console.log('✅ Auth: Login successful, store synced with service');
          return true;
        } else {
          setError('Login failed');
          return false;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        console.error('❌ Auth: Login error:', error);
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
        console.log('✅ Auth: Logout successful');
      } catch (error) {
        console.error('❌ Auth: Logout error:', error);
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
          console.warn('⚠️ Auth: Services not ready for refresh');
          return;
        }

        await services.getAuthManager().checkAuthStatus();
        const serviceState = services.getAuthManager().getState();
        syncAuthWithService(serviceState);
        
        console.log('✅ Auth: Status refreshed successfully');
      } catch (error) {
        console.error('❌ Auth: Refresh error:', error);
        // Don't clear auth on refresh errors - user might still be logged in
      } finally {
        setAuthLoading(false);
      }
    },

    syncAuthWithService: (serviceState: ServiceAuthState): void => {
      const { setAuthState } = get();
      
      setAuthState({
        user: serviceState.user,
        empire: serviceState.empire,
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
    },

    initializeAuthService: (): void => {
      try {
        const services = getServices();
        if (!services.isReady()) {
          console.warn('⚠️ Auth: Services not ready for initialization');
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

        console.log('✅ Auth: Service integration initialized');
      } catch (error) {
        console.error('❌ Auth: Service initialization failed:', error);
        
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

      console.log('✅ Auth: Service integration cleaned up');
    },
  };
};

export default createEnhancedAuthSlice;