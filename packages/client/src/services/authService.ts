import { ApiResponse, AuthResponse } from '@game/shared';
import { AuthManager } from './core/AuthManager';
import { getCurrentApiConfig } from '../utils/apiConfig';

/**
 * Legacy authService API - now acts as a compatibility layer that delegates to AuthManager.
 * This maintains existing API contracts while using the new architecture.
 * 
 * IMPORTANT: This service no longer contains auth refresh logic or token scheduling.
 * All coordination is handled by the AuthManager and ConnectionManager.
 */

// Singleton AuthManager instance
let authManager: AuthManager | null = null;

// Get or create AuthManager instance
const getAuthManager = (): AuthManager => {
  if (!authManager) {
    authManager = new AuthManager({ enableLogging: process.env.NODE_ENV === 'development' });
  }
  return authManager;
};

/**
 * Initialize the AuthManager if not already initialized.
 * This should be called by the ConnectionManager during app startup.
 */
const ensureInitialized = async (): Promise<void> => {
  const manager = getAuthManager();
  if (!manager.isReady()) {
    await manager.initialize();
  }
};

/* Profile caching - maintained for API compatibility */
let inflightGetProfile: Promise<ApiResponse<{ user: any; empire: any }>> | null = null;
let lastProfile: ApiResponse<{ user: any; empire: any }> | null = null;
let lastProfileTs = 0;
const PROFILE_TTL_MS = 5000;

export const authService = {
  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    console.log('[AUTH-SERVICE] Login called with:', { email, password: password ? '[PRESENT]' : '[MISSING]' });
    
    try {
      await ensureInitialized();
      const manager = getAuthManager();
      
      // Use AuthManager for login
      const success = await manager.login(email, password);
      
      if (success) {
        const state = manager.getState();
        return {
          success: true,
          data: {
            user: state.user!,
            empire: state.empire,
            token: state.token!
          } as AuthResponse,
          message: 'Login successful'
        };
      } else {
        return {
          success: false,
          error: 'Login failed - invalid credentials',
          message: 'Login failed'
        };
      }
    } catch (error) {
      console.error('[AUTH-SERVICE] Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
        message: 'Login failed'
      };
    }
  },

  async register(email: string, username: string, password: string): Promise<ApiResponse<AuthResponse>> {
    console.log('[AUTH-SERVICE] Register called with:', { email, username, password: password ? '[PRESENT]' : '[MISSING]' });
    
    try {
      // Registration is not yet implemented in AuthManager - use legacy IPC/API pattern
      // This maintains backward compatibility while we're in transition
      
      // Desktop path: perform register via main IPC
      if (typeof window !== 'undefined' && (window as any).desktop?.auth?.register) {
        const resp = await (window as any).desktop.auth.register(email, username, password);
        
        if (resp?.success && (resp as any).data?.token) {
          // Initialize manager and set state based on response
          await ensureInitialized();
          const manager = getAuthManager();
          
          // Update manager state manually (temporary until register is implemented in manager)
          (manager as any).updateState({
            user: (resp as any).data.user,
            empire: (resp as any).data.empire || null,
            token: (resp as any).data.token,
            isAuthenticated: true
          });
        }
        
        return resp as ApiResponse<AuthResponse>;
      }

      // Web fallback: call API directly (also temporary)
      const response = await fetch(`${getCurrentApiConfig().apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password }),
      });
      
      const data = await response.json();
      
      if (data?.success && (data as any).data?.token) {
        await ensureInitialized();
        const manager = getAuthManager();
        
        // Update manager state manually
        (manager as any).updateState({
          user: (data as any).data.user,
          empire: (data as any).data.empire || null,
          token: (data as any).data.token,
          isAuthenticated: true
        });
      }
      
      return data;
    } catch (error) {
      console.error('[AUTH-SERVICE] Register error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred',
        message: 'Registration failed'
      };
    }
  },

  async getProfile(force: boolean = false): Promise<ApiResponse<{ user: any; empire: any }>> {
    const now = Date.now();

    // Serve from short TTL cache to prevent bursts
    if (!force && lastProfile && now - lastProfileTs < PROFILE_TTL_MS) {
      return lastProfile;
    }

    // Coalesce concurrent profile checks
    if (!force && inflightGetProfile) {
      return await inflightGetProfile;
    }

    if (force) {
      inflightGetProfile = null;
    }
    
    inflightGetProfile = (async () => {
      try {
        await ensureInitialized();
        const manager = getAuthManager();
        
        // Use AuthManager's checkAuthStatus to refresh profile data
        const isValid = await manager.checkAuthStatus();
        
        if (isValid) {
          const state = manager.getState();
          const data: ApiResponse<{ user: any; empire: any }> = {
            success: true,
            data: {
              user: state.user!,
              empire: state.empire!
            },
            message: 'Profile retrieved successfully'
          };
          
          lastProfile = data;
          lastProfileTs = Date.now();
          return data;
        } else {
          return {
            success: false,
            error: 'Authentication failed',
            message: 'Unable to retrieve profile'
          };
        }
      } catch (error) {
        console.error('[AUTH-SERVICE] Profile error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Network error occurred',
          message: 'Profile retrieval failed'
        };
      } finally {
        inflightGetProfile = null;
      }
    })();

    return await inflightGetProfile;
  },

  async logout(): Promise<void> {
    console.log('[AUTH-SERVICE] Logout called');
    
    try {
      await ensureInitialized();
      const manager = getAuthManager();
      
      // Use AuthManager for logout - it handles all cleanup
      await manager.logout();
      
      // Clear profile cache
      lastProfile = null;
      lastProfileTs = 0;
      inflightGetProfile = null;
      
      console.log('[AUTH-SERVICE] Logout completed');
    } catch (error) {
      console.error('[AUTH-SERVICE] Logout error:', error);
      // Even if there's an error, ensure local state is cleared
      lastProfile = null;
      lastProfileTs = 0;
      inflightGetProfile = null;
    }
  },
};

// Additional exports for ConnectionManager integration
export { getAuthManager, ensureInitialized };

// Legacy default export
export default authService;
