import axios from 'axios';
import { ApiResponse, AuthResponse } from '@game/shared';
import { attachMetrics } from './httpInstrumentation';
import { getToken as getMemToken, setToken as setMemToken, clearToken as clearMemToken } from './tokenProvider';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/* Create axios instance with default config */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
attachMetrics(api, 'auth');

let isRefreshing = false;
let tokenExpiry: number | null = null;
let proactiveRefreshTimer: NodeJS.Timeout | null = null;

// Decode JWT token to get expiration
const decodeToken = (token: string): { exp?: number; iat?: number } | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

// Set up proactive token refresh (5 minutes before expiration)
const scheduleTokenRefresh = (token: string) => {
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
  
  const decoded = decodeToken(token);
  if (decoded?.exp) {
    tokenExpiry = decoded.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const refreshTime = tokenExpiry - (5 * 60 * 1000); // 5 minutes before expiration
    const delay = refreshTime - now;
    
    if (delay > 0 && delay < (24 * 60 * 60 * 1000)) { // Don't schedule more than 24 hours ahead
      console.log(`[AUTH] Scheduling proactive token refresh in ${Math.round(delay / 1000)}s`);
      proactiveRefreshTimer = setTimeout(async () => {
        console.log('[AUTH] Proactive token refresh triggered');
        await performTokenRefresh();
      }, delay);
    }
  }
};

// Enhanced token refresh function
const performTokenRefresh = async (): Promise<string | null> => {
  if (isRefreshing) {
    console.log('[AUTH] Refresh already in progress, waiting...');
    return null;
  }
  
  try {
    isRefreshing = true;
    console.log('[AUTH] Performing token refresh...');
    
    if (typeof window !== 'undefined' && window.desktop?.auth?.refresh) {
      const result = await window.desktop.auth.refresh();
      if (result?.ok && result.token) {
        setMemToken(result.token);
        scheduleTokenRefresh(result.token);
        console.log('[AUTH] Token refreshed successfully');
        return result.token;
      }
    }
    
    console.warn('[AUTH] Token refresh failed');
    return null;
  } catch (error) {
    console.error('[AUTH] Token refresh error:', error);
    return null;
  } finally {
    isRefreshing = false;
  }
};

// Enhanced setToken function that schedules refresh
const setTokenWithScheduling = (token: string) => {
  setMemToken(token);
  scheduleTokenRefresh(token);
};

api.interceptors.request.use(async (config) => {
  // Access token lives in memory only for desktop
  const bearer = getMemToken();
  
  if (bearer) {
    // Check if token is close to expiring (within 2 minutes)
    const decoded = decodeToken(bearer);
    if (decoded?.exp) {
      const now = Date.now() / 1000;
      const timeLeft = decoded.exp - now;
      
      // If token expires in less than 2 minutes, try to refresh it
      if (timeLeft < 120 && !isRefreshing) {
        console.log(`[AUTH] Token expires in ${Math.round(timeLeft)}s, attempting refresh...`);
        const newToken = await performTokenRefresh();
        if (newToken) {
          config.headers = config.headers ?? {};
          (config.headers as any).Authorization = `Bearer ${newToken}`;
          return config;
        }
      }
    }
    
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${bearer}`;
  }
  
  return config;
});

// Handle auth errors (attempt desktop refresh once, then redirect)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const original = error?.config || {};
    
    // Enhanced 401 handling with better retry logic
    if (status === 401 && !original._retry && typeof window !== 'undefined' && window.desktop?.auth?.refresh) {
      original._retry = true;
      
      console.log('[AUTH] 401 response, attempting token refresh...');
      const newToken = await performTokenRefresh();
      
      if (newToken) {
        console.log('[AUTH] Retrying original request with new token');
        // Retry original request with new token
        original.headers = original.headers || {};
        (original.headers as any).Authorization = `Bearer ${newToken}`;
        return api.request(original);
      }
    }

    if (status === 401) {
      // Clear any persisted web storage (if present) and memory token, then navigate to login
      try { localStorage.removeItem('auth-storage'); } catch {}
      try { clearMemToken(); } catch {}
      try {
        if (window.desktop?.tokens?.deleteRefresh) {
          await window.desktop.tokens.deleteRefresh();
        }
      } catch {}
      if (typeof window !== 'undefined') {
        if (window.location.protocol === 'file:') {
          // Electron/desktop uses HashRouter; avoid file:///C:/login
          window.location.hash = '#/login';
        } else {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

/* In-flight and TTL cache for getProfile */
let inflightGetProfile: Promise<ApiResponse<{ user: any; empire: any }>> | null = null;
let lastProfile: ApiResponse<{ user: any; empire: any }> | null = null;
let lastProfileTs = 0;
const PROFILE_TTL_MS = 5000;

export const authService = {
  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    try {
      // Desktop path: perform login via main IPC so refresh token never touches renderer
      if (typeof window !== 'undefined' && window.desktop?.auth?.login) {
        const resp = await window.desktop.auth.login(email, password);
      if (resp?.success && (resp as any).data?.token) {
        setTokenWithScheduling((resp as any).data.token as string);
      }
        return resp as ApiResponse<AuthResponse>;
      }

      // Web fallback: call API directly
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
        email,
        password,
      });

      const data = response.data;
      // Keep access token in memory only
      if (data?.success && (data as any).data?.token) {
        setTokenWithScheduling((data as any).data.token as string);
      }
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      throw new Error('Network error occurred');
    }
  },

  async register(email: string, username: string, password: string): Promise<ApiResponse<AuthResponse>> {
    try {
      // Desktop path: perform register via main IPC so refresh token never touches renderer
      if (typeof window !== 'undefined' && window.desktop?.auth?.register) {
        const resp = await window.desktop.auth.register(email, username, password);
      if (resp?.success && (resp as any).data?.token) {
        setTokenWithScheduling((resp as any).data.token as string);
      }
        return resp as ApiResponse<AuthResponse>;
      }

      // Web fallback: call API directly
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', {
        email,
        username,
        password,
      });
      const data = response.data;
      if (data?.success && (data as any).data?.token) {
        setTokenWithScheduling((data as any).data.token as string);
      }
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      throw new Error('Network error occurred');
    }
  },

  async getProfile(force: boolean = false): Promise<ApiResponse<{ user: any; empire: any }>> {
    const now = Date.now();

    // Serve from short TTL cache to prevent bursts
    if (!force && lastProfile && now - lastProfileTs < PROFILE_TTL_MS) {
      return lastProfile;
    }

    // Coalesce concurrent /auth/me calls
    if (!force && inflightGetProfile) {
      return await inflightGetProfile;
    }

    if (force) {
      inflightGetProfile = null;
    }
    inflightGetProfile = (async () => {
      try {
        const response = await api.get<ApiResponse<{ user: any; empire: any }>>('/auth/me');
        const data = response.data;
        if (data && data.success) {
          lastProfile = data;
          lastProfileTs = Date.now();
        }
        return data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          return error.response.data as ApiResponse<{ user: any; empire: any }>;
        }
        throw new Error('Network error occurred');
      } finally {
        inflightGetProfile = null;
      }
    })();

    return await inflightGetProfile;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors, just clear local storage
      console.error('Logout error:', error);
    } finally {
      // Clear token refresh timer
      if (proactiveRefreshTimer) {
        clearTimeout(proactiveRefreshTimer);
        proactiveRefreshTimer = null;
      }
      tokenExpiry = null;
      
      // Clear tokens
      clearMemToken();
      localStorage.removeItem('auth-storage');
      
      // Clear refresh token from desktop
      if (typeof window !== 'undefined' && window.desktop?.tokens?.deleteRefresh) {
        try {
          await window.desktop.tokens.deleteRefresh();
        } catch (error) {
          console.error('Error clearing refresh token:', error);
        }
      }
    }
  },
};

export default authService;
