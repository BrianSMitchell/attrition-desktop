import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Empire } from '@game/shared';
import { authService } from '../services/authService';
import { connectSocket, disconnectSocket } from '../services/socket';
import { setToken as setMemToken, clearToken as clearMemToken } from '../services/tokenProvider';

interface AuthState {
  user: Omit<User, 'passwordHash'> | null;
  empire: Empire | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  unauthorize: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  checkAuth: (force?: boolean) => Promise<void>;
  getIsAuthed: () => boolean;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      empire: null,
      token: null,
      isLoading: true,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          const response = await authService.login(email, password);

          if (response.success && response.data) {
            set({
              user: response.data.user,
              empire: response.data.empire || null,
              token: response.data.token,
              isLoading: false,
              error: null,
            });
            // Keep access token in-memory only
            try {
              setMemToken(response.data.token);
            } catch {}
            // Save refresh token securely in desktop keychain (best-effort)
            try {
              const rt = (response.data as any)?.refreshToken;
              if (typeof window !== 'undefined' && window.desktop?.tokens?.saveRefresh && rt) {
                await window.desktop.tokens.saveRefresh(rt);
              }
            } catch {
              // ignore secure storage errors
            }
            // Establish authenticated Socket.IO connection
            try {
              connectSocket(() => get().token);
            } catch {
              // ignore socket errors
            }
          } else {
            set({
              error: response.error || 'Login failed',
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
        }
      },

      register: async (email: string, username: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          const response = await authService.register(email, username, password);

          if (response.success && response.data) {
            set({
              user: response.data.user,
              empire: response.data.empire || null,
              token: response.data.token,
              isLoading: false,
              error: null,
            });
            // Keep access token in-memory only
            try {
              setMemToken(response.data.token);
            } catch {}
            // Save refresh token securely in desktop keychain (best-effort)
            try {
              const rt = (response.data as any)?.refreshToken;
              if (typeof window !== 'undefined' && window.desktop?.tokens?.saveRefresh && rt) {
                await window.desktop.tokens.saveRefresh(rt);
              }
            } catch {
              // ignore secure storage errors
            }
            // Establish authenticated Socket.IO connection
            try {
              connectSocket(() => get().token);
            } catch {
              // ignore socket errors
            }
          } else {
            set({
              error: response.error || 'Registration failed',
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false,
          });
        }
      },

      logout: () => {
        authService.logout();
        // Best-effort secure token cleanup on desktop and memory
        try {
          if (typeof window !== 'undefined' && window.desktop?.tokens?.deleteRefresh) {
            window.desktop.tokens.deleteRefresh();
          }
        } catch {
          // ignore
        }
        try { clearMemToken(); } catch {}
        try {
          disconnectSocket();
        } catch {
          // ignore
        }
        set({
          user: null,
          empire: null,
          token: null,
          error: null,
        });
      },

      // Clear auth state on unauthorized responses without making network calls
      unauthorize: () => {
        try { clearMemToken(); } catch {}
        try { disconnectSocket(); } catch {}
        set({
          user: null,
          empire: null,
          token: null,
          isLoading: false,
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      getIsAuthed: () => {
        const { token, user } = get();
        return !!token && !!user;
      },

      checkAuth: async (force: boolean = false) => {
        let { token } = get();

        // If no token in memory/state, attempt desktop refresh using stored refresh token
        if (!token && typeof window !== 'undefined' && window.desktop?.tokens?.hasRefresh && window.desktop?.auth?.refresh) {
          try {
            const probe = await window.desktop.tokens.hasRefresh();
            if (probe?.ok && probe.has) {
              const result = await window.desktop.auth.refresh();
              if (result?.ok && result.token) {
                setMemToken(result.token);
                set({ token: result.token });
                token = result.token;
              }
            }
          } catch {
            // ignore
          }
        }

        if (!token) {
          set({ user: null, empire: null, isLoading: false, error: null });
          try {
            disconnectSocket();
          } catch {
            // ignore
          }
          return;
        }

        try {
          set({ isLoading: true });

          const response = await authService.getProfile(force);

          if (response.success && response.data) {
            set({
              user: response.data.user,
              empire: response.data.empire || null,
              isLoading: false,
              error: null,
            });
            // Ensure socket is connected when a valid session exists
            try {
              connectSocket(() => get().token);
            } catch {
              // ignore
            }
          } else {
            // Token is invalid, clear auth state
            set({
              user: null,
              empire: null,
              token: null,
              isLoading: false,
              error: null,
            });
            try {
              disconnectSocket();
            } catch {
              // ignore
            }
          }
        } catch {
          // Token is invalid or network error, clear auth state
          set({
            user: null,
            empire: null,
            token: null,
            isLoading: false,
            error: null,
          });
          try {
            disconnectSocket();
          } catch {
            // ignore
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Do NOT persist access token
        user: state.user,
        empire: state.empire,
      }),
    }
  )
);

/**
 * Initialize auth check on app start (HMR-safe).
 * Prevent multiple /auth/me storms by guarding with a window-level flag.
 */
if (typeof window !== 'undefined') {
  const w = window as any;
  if (!w.__AUTH_CHECK_RAN__) {
    w.__AUTH_CHECK_RAN__ = true;
    useAuthStore.getState().checkAuth();
  }
}
