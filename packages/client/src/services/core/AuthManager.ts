import { IAuthManager, AuthState, ConnectionEventCallback, ServiceOptions } from './types';
import { AsyncMutex } from '../utils/AsyncMutex';
import { CircuitBreaker } from '../utils/CircuitBreaker';
import { ApiResponse, AuthResponse } from '@game/shared';
import { getCurrentApiConfig } from '../../utils/apiConfig';
import { setToken, clearToken } from '../tokenProvider';

/**
 * AuthManager handles authentication operations without circular dependencies.
 * Uses mutex to prevent concurrent auth operations and circuit breaker for retry logic.
 */
export class AuthManager implements IAuthManager {
  private state: AuthState = {
    user: null,
    empire: null,
    token: null,
    isAuthenticated: false,
  };

  private listeners = new Set<ConnectionEventCallback<AuthState>>();
  private mutex = new AsyncMutex();
  private circuitBreaker: CircuitBreaker;
  private isInitialized = false;

  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  constructor(private options: ServiceOptions = {}) {
    this.circuitBreaker = new CircuitBreaker(3, 60000, 'AuthManager'); // 1 minute reset
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔐 AuthManager: Initializing...');

    // Try to restore auth state from secure storage
    await this.restoreAuthState();
    
    this.isInitialized = true;
    console.log('🔐 AuthManager: Initialized');
  }

  cleanup(): void {
    console.log('🔐 AuthManager: Cleaning up...');
    
    this.clearTokenRefreshTimer();
    this.listeners.clear();
    this.mutex.clearAll();
    
    this.isInitialized = false;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getState(): AuthState {
    return { ...this.state };
  }

  async login(email: string, password: string): Promise<boolean> {
    return this.mutex.acquire('auth-operation', async () => {
      try {
        return await this.circuitBreaker.execute(async () => {
          return await this.performLogin(email, password);
        });
      } catch (error) {
        console.error('🔐 AuthManager: Login failed:', error);
        return false;
      }
    });
  }

  async logout(): Promise<void> {
    return this.mutex.acquire('auth-operation', async () => {
      console.log('🔐 AuthManager: Logging out...');
      
      this.clearTokenRefreshTimer();
      
      // Clear secure storage
      await this.clearSecureStorage();
      
      // Update state
      this.updateState({
        user: null,
        empire: null,
        token: null,
        isAuthenticated: false,
      });
    });
  }

  async refreshToken(): Promise<boolean> {
    return this.mutex.acquire('token-refresh', async () => {
      try {
        return await this.circuitBreaker.execute(async () => {
          return await this.performTokenRefresh();
        });
      } catch (error) {
        console.error('🔐 AuthManager: Token refresh failed:', error);
        // Don't automatically logout on refresh failure - let connection manager decide
        return false;
      }
    });
  }

  async checkAuthStatus(): Promise<boolean> {
    if (!this.state.token) {
      return false;
    }

    return this.mutex.acquire('auth-check', async () => {
      try {
        return await this.circuitBreaker.execute(async () => {
          return await this.performAuthCheck();
        });
      } catch (error) {
        console.error('🔐 AuthManager: Auth check failed:', error);
        return false;
      }
    });
  }

  onStateChange(callback: ConnectionEventCallback<AuthState>): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current state
    callback(this.getState());
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  private async performLogin(email: string, password: string): Promise<boolean> {
    if (this.options.enableLogging) {
      console.log('🔐 AuthManager: Performing login...');
    }

    let response: ApiResponse<AuthResponse>;

    // Use desktop IPC if available, otherwise API
    if (this.isDesktop() && (window as any).desktop?.auth?.login) {
      response = await (window as any).desktop.auth.login(email, password);
    } else {
      response = await this.apiLogin(email, password);
    }

    if (response.success && response.data) {
      const { user, empire, token } = response.data;
      
      // Store in secure storage
      await this.storeSecureToken(token);
      if ((response.data as any).refreshToken) {
        await this.storeRefreshToken((response.data as any).refreshToken);
      }

      // Update state
      this.updateState({
        user,
        empire: empire || null,
        token,
        isAuthenticated: true,
      });

      // Schedule token refresh
      this.scheduleTokenRefresh(token);

      if (this.options.enableLogging) {
        console.log('🔐 AuthManager: Login successful');
      }
      
      return true;
    }

    return false;
  }

  private async performTokenRefresh(): Promise<boolean> {
    if (this.options.enableLogging) {
      console.log('🔐 AuthManager: Refreshing token...');
    }

    // Use desktop IPC if available
    if (this.isDesktop() && (window as any).desktop?.auth?.refresh) {
      try {
        const result = await (window as any).desktop.auth.refresh();
        if (result?.ok && result.token) {
          await this.storeSecureToken(result.token);
          
          this.updateState({
            ...this.state,
            token: result.token,
          });

          this.scheduleTokenRefresh(result.token);
          
          if (this.options.enableLogging) {
            console.log('🔐 AuthManager: Token refresh successful');
          }
          
          return true;
        }
      } catch (error) {
        console.error('🔐 AuthManager: Desktop token refresh failed:', error);
      }
    }

    return false;
  }

  private async performAuthCheck(): Promise<boolean> {
    if (!this.state.token) return false;

    const apiConfig = getCurrentApiConfig();
    const response = await fetch(`${apiConfig.apiUrl}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${this.state.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        // Update user info if it changed
        this.updateState({
          ...this.state,
          user: data.data.user,
          empire: data.data.empire || null,
        });
        return true;
      }
    }

    return false;
  }

  private async apiLogin(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const apiConfig = getCurrentApiConfig();
    const response = await fetch(`${apiConfig.apiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    return response.json();
  }

  private async restoreAuthState(): Promise<void> {
    // Try to restore from desktop secure storage
    if (this.isDesktop() && (window as any).desktop?.tokens?.hasRefresh) {
      try {
        const probe = await (window as any).desktop.tokens.hasRefresh();
        if (probe?.ok && probe.has) {
          // We have a refresh token, try to use it
          const refreshResult = await this.performTokenRefresh();
          if (refreshResult) {
            return;
          }
        }
      } catch (error) {
        console.warn('🔐 AuthManager: Failed to restore from secure storage:', error);
      }
    }

    // Try to restore from localStorage (web fallback)
    try {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.user && parsed?.state?.empire) {
          // Only restore user/empire, not token for security
          this.updateState({
            ...this.state,
            user: parsed.state.user,
            empire: parsed.state.empire,
          });
        }
      }
    } catch (error) {
      console.warn('🔐 AuthManager: Failed to restore from localStorage:', error);
    }
  }

  private scheduleTokenRefresh(token: string): void {
    this.clearTokenRefreshTimer();

    try {
      const decoded = this.decodeToken(token);
      if (decoded?.exp) {
        const now = Date.now() / 1000;
        const timeToRefresh = decoded.exp - now - 300; // 5 minutes before expiry
        
        if (timeToRefresh > 0 && timeToRefresh < 86400) { // Max 24 hours
          this.tokenRefreshTimer = setTimeout(() => {
            this.refreshToken();
          }, timeToRefresh * 1000);
          
          if (this.options.enableLogging) {
            console.log(`🔐 AuthManager: Token refresh scheduled in ${Math.round(timeToRefresh / 60)} minutes`);
          }
        }
      }
    } catch (error) {
      console.warn('🔐 AuthManager: Failed to schedule token refresh:', error);
    }
  }

  private clearTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  private decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  private async storeSecureToken(token: string): Promise<void> {
    // Store in memory (will be handled by tokenProvider)
    try {
      setToken(token);
    } catch (error) {
      console.warn('🔐 AuthManager: Failed to store token in memory:', error);
    }
  }

  private async storeRefreshToken(refreshToken: string): Promise<void> {
    if (this.isDesktop() && (window as any).desktop?.tokens?.saveRefresh) {
      try {
        await (window as any).desktop.tokens.saveRefresh(refreshToken);
      } catch (error) {
        console.warn('🔐 AuthManager: Failed to store refresh token:', error);
      }
    }
  }

  private async clearSecureStorage(): Promise<void> {
    // Clear memory token
    try {
      clearToken();
    } catch (error) {
      console.warn('🔐 AuthManager: Failed to clear memory token:', error);
    }

    // Clear desktop secure storage
    if (this.isDesktop() && (window as any).desktop?.tokens?.deleteRefresh) {
      try {
        await (window as any).desktop.tokens.deleteRefresh();
      } catch (error) {
        console.warn('🔐 AuthManager: Failed to clear secure storage:', error);
      }
    }

    // Clear localStorage
    try {
      localStorage.removeItem('auth-storage');
    } catch (error) {
      console.warn('🔐 AuthManager: Failed to clear localStorage:', error);
    }
  }

  private isDesktop(): boolean {
    return typeof window !== 'undefined' && !!(window as any).desktop;
  }

  private updateState(newState: AuthState): void {
    const oldState = this.state;
    this.state = { ...newState };

    // Notify listeners if state actually changed
    if (this.hasStateChanged(oldState, newState)) {
      this.listeners.forEach(callback => {
        try {
          callback(this.getState());
        } catch (error) {
          console.error('🔐 AuthManager: Error in state change callback:', error);
        }
      });
    }
  }

  private hasStateChanged(oldState: AuthState, newState: AuthState): boolean {
    return (
      oldState.isAuthenticated !== newState.isAuthenticated ||
      oldState.user?._id !== newState.user?._id ||
      oldState.empire?._id !== newState.empire?._id
    );
  }
}