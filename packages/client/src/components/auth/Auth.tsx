import React, { useCallback, useEffect } from 'react';
import { useServiceAuth, useServiceToasts } from '../../hooks/useServiceIntegration';
import { withAuthMigration } from '../ServiceMigrationWrapper';

/**
 * Migrated Login component using service-integrated auth
 */
const LoginComponent: React.FC<{
  onLoginSuccess?: () => void;
  onLoginError?: (error: string) => void;
}> = ({ onLoginSuccess, onLoginError }) => {
  const auth = useServiceAuth();
  const { addToast } = useServiceToasts();

  const handleLogin = useCallback(async (credentials: { email: string; password: string }) => {
    try {
      const success = await auth.login(credentials.email, credentials.password);
      
      if (success) {
        addToast('success', `Welcome back, ${auth.user?.username || 'User'}!`);
        onLoginSuccess?.();
      } else {
        const errorMessage = auth.error || 'Login failed';
        addToast('error', errorMessage);
        onLoginError?.(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unexpected login error';
      addToast('error', errorMessage);
      onLoginError?.(errorMessage);
    }
  }, [auth.login, auth.user, auth.error, addToast, onLoginSuccess, onLoginError]);

  const handleLogout = useCallback(async () => {
    try {
      await auth.logout();
      addToast('info', 'Successfully logged out');
    } catch (error) {
      addToast('error', 'Error during logout');
    }
  }, [auth.logout, addToast]);

  // Auto-refresh auth status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (auth.isAuthenticated && auth.serviceConnected) {
        auth.refreshAuthStatus();
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [auth.isAuthenticated, auth.serviceConnected, auth.refreshAuthStatus]);

  if (!auth.serviceConnected) {
    return (
      <div className="auth-service-disconnected">
        <p>Authentication service is temporarily unavailable.</p>
        <button onClick={() => window.location.reload()}>
          Refresh Page
        </button>
      </div>
    );
  }

  if (auth.isAuthenticated && auth.user) {
    return (
      <div className="auth-authenticated">
        <div className="user-info">
          <h3>Welcome, {auth.user.username}!</h3>
          {auth.empire && (
            <p>Empire: {auth.empire.name}</p>
          )}
          {auth.lastSyncAt && (
            <p className="last-sync">
              Last sync: {new Date(auth.lastSyncAt).toLocaleString()}
            </p>
          )}
        </div>
        
        <button 
          onClick={handleLogout}
          disabled={auth.isLoading}
          className="logout-button"
        >
          {auth.isLoading ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    );
  }

  return (
    <div className="auth-login-form">
      <LoginForm 
        onSubmit={handleLogin}
        loading={auth.isLoading}
        error={auth.error}
        onClearError={auth.clearError}
      />
    </div>
  );
};

/**
 * Login form component with modern form handling
 */
const LoginForm: React.FC<{
  onSubmit: (credentials: { email: string; password: string }) => void;
  loading: boolean;
  error: string | null;
  onClearError: () => void;
}> = ({ onSubmit, loading, error, onClearError }) => {
  const [credentials, setCredentials] = React.useState({
    email: '',
    password: ''
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (credentials.email && credentials.password) {
      onSubmit(credentials);
    }
  }, [credentials, onSubmit]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) {
      onClearError();
    }
  }, [error, onClearError]);

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h2>Login</h2>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button type="button" onClick={onClearError}>×</button>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          value={credentials.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          required
          disabled={loading}
          autoComplete="email"
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password:</label>
        <input
          id="password"
          type="password"
          value={credentials.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          required
          disabled={loading}
          autoComplete="current-password"
        />
      </div>

      <button 
        type="submit" 
        disabled={loading || !credentials.email || !credentials.password}
        className="login-submit"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};

/**
 * Authentication status indicator component
 */
const AuthStatusIndicatorComponent: React.FC<{
  showDetails?: boolean;
}> = ({ showDetails = false }) => {
  const auth = useServiceAuth();

  const getStatusColor = () => {
    if (!auth.serviceConnected) return '#ff6b6b';
    if (!auth.isAuthenticated) return '#ffa726';
    return '#66bb6a';
  };

  const getStatusText = () => {
    if (!auth.serviceConnected) return 'Service Disconnected';
    if (!auth.isAuthenticated) return 'Not Authenticated';
    return 'Authenticated';
  };

  return (
    <div className="auth-status-indicator">
      <div 
        className="status-dot"
        style={{ backgroundColor: getStatusColor() }}
        title={getStatusText()}
      />
      
      {showDetails && (
        <div className="status-details">
          <span className="status-text">{getStatusText()}</span>
          {auth.user && (
            <span className="user-name">{auth.user.username}</span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Auth guard component that protects routes/components
 */
const AuthGuardComponent: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireService?: boolean;
}> = ({ children, fallback, requireService = true }) => {
  const auth = useServiceAuth();

  // If service connection is required but not available
  if (requireService && !auth.serviceConnected) {
    return fallback || (
      <div className="auth-guard-service-error">
        <p>Authentication service is unavailable. Please try again.</p>
      </div>
    );
  }

  // If not authenticated
  if (!auth.isAuthenticated) {
    return fallback || <LoginComponent />;
  }

  // If authenticated, render children
  return <>{children}</>;
};

// Export wrapped components with migration support
export const Login = withAuthMigration(LoginComponent);
export const AuthStatusIndicator = withAuthMigration(AuthStatusIndicatorComponent);
export const AuthGuard = withAuthMigration(AuthGuardComponent);

// Export unwrapped components for direct usage
export { LoginComponent, AuthStatusIndicatorComponent, AuthGuardComponent };

/**
 * Hook for components that need to handle auth state transitions
 */
export const useAuthTransitions = () => {
  const auth = useServiceAuth();
  const { addToast } = useServiceToasts();
  
  useEffect(() => {
    // Handle authentication lost
    if (!auth.isAuthenticated && !auth.isLoading && !auth.error) {
      addToast('warning', 'Your session has expired. Please log in again.');
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.error, addToast]);

  useEffect(() => {
    // Handle service connection lost
    if (!auth.serviceConnected) {
      addToast('error', 'Authentication service connection lost', { duration: 0 });
    }
  }, [auth.serviceConnected, addToast]);

  return {
    isTransitioning: auth.isLoading,
    hasActiveSession: auth.isAuthenticated && auth.serviceConnected,
  };
};