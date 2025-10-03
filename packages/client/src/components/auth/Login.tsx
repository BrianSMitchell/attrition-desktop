import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useServiceAuth, useServiceNetwork, useServiceToasts } from '../../hooks/useServiceIntegration';
import { withAuthMigration } from '../ServiceMigrationWrapper';
import spaceBackground from '../../assets/images/space-background.png';

// Credential storage utilities (unchanged from original)
const CREDENTIALS_KEY = 'attrition-saved-credentials';

interface SavedCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

const saveCredentials = (credentials: SavedCredentials): void => {
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  } catch (error) {
    console.warn('Failed to save credentials:', error);
  }
};

const loadCredentials = (): SavedCredentials | null => {
  try {
    const stored = localStorage.getItem(CREDENTIALS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load credentials:', error);
    return null;
  }
};

const clearCredentials = (): void => {
  try {
    localStorage.removeItem(CREDENTIALS_KEY);
  } catch (error) {
    console.warn('Failed to clear credentials:', error);
  }
};

/**
 * Enhanced Login component with service integration
 * Maintains all original functionality while adding:
 * - Service connection awareness
 * - Enhanced error handling with context
 * - Auto-retry on transient failures
 * - Better user feedback during service issues
 */
const LoginComponent: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  
  // Service integration hooks
  const auth = useServiceAuth();
  const network = useServiceNetwork();
  const { addToast } = useServiceToasts();

  // Load saved credentials on component mount
  useEffect(() => {
    const savedCredentials = loadCredentials();
    if (savedCredentials && savedCredentials.rememberMe) {
      setEmail(savedCredentials.email);
      setPassword(savedCredentials.password);
      setRememberMe(true);
    }
  }, []);

  // Enhanced error handling with service context
  const getContextualErrorMessage = (error: string): string => {
    // Service-specific error enhancement
    if (!auth.serviceConnected) {
      return 'Authentication service is temporarily unavailable. Please try again in a moment.';
    }
    
    if (!network.isOnline) {
      return 'No internet connection. Please check your connection and try again.';
    }
    
    if (!network.isApiReachable) {
      return 'Cannot reach authentication server. Please check your connection and try again.';
    }
    
    // Enhanced error messages based on common issues
    if (error.includes('Invalid credentials') || error.includes('Login failed')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    
    if (error.includes('Network Error') || error.includes('timeout')) {
      return 'Connection timeout. Please check your internet connection and try again.';
    }
    
    if (error.includes('Too many requests')) {
      return 'Too many login attempts. Please wait a moment before trying again.';
    }
    
    // Return original error if no enhancement available
    return error;
  };

  // Auto-retry logic for transient failures
  const shouldAutoRetry = (error: string): boolean => {
    const transientErrors = ['timeout', 'Network Error', 'Connection failed'];
    return retryAttempt < 2 && transientErrors.some(e => error.includes(e));
  };

  // Extracted attempt logic so retries don't depend on React synthetic events
  const attemptLogin = async () => {
    auth.clearError();

    // Basic validation
    if (!email.trim() || !password.trim()) {
      addToast('error', 'Please enter both email and password');
      return;
    }

    // Service availability check
    if (!auth.serviceConnected) {
      addToast('warning', 'Authentication service is initializing. Please wait a moment...');
      return;
    }

    try {
      // Handle credential saving/clearing based on remember me state
      if (rememberMe) {
        saveCredentials({ email, password, rememberMe: true });
      } else {
        clearCredentials();
      }

      const success = await auth.login(email, password);

      if (success) {
        // Success handled by service integration (user state updated automatically)
        setRetryAttempt(0);

        // Enhanced success feedback
        addToast('success', `Welcome back${auth.user?.username ? `, ${auth.user.username}` : ''}!`);

        // Clear form on successful login
        if (!rememberMe) {
          setEmail('');
          setPassword('');
        }
      } else {
        // Enhanced error handling
        const errorMessage = getContextualErrorMessage(auth.error || 'Login failed');

        // Auto-retry logic for transient failures
        if (shouldAutoRetry(auth.error || '')) {
          setRetryAttempt(prev => prev + 1);
          addToast('info', `Login failed, retrying... (${retryAttempt + 1}/2)`);

          // Retry after short delay without reusing the synthetic event
          setTimeout(() => {
            void attemptLogin();
          }, 1000);
          return;
        }

        setRetryAttempt(0);
        addToast('error', errorMessage);
      }
    } catch (error) {
      setRetryAttempt(0);
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error occurred';
      const contextualMessage = getContextualErrorMessage(errorMessage);
      addToast('error', contextualMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await attemptLogin();
  };

  // Service status indicator
  const getServiceStatusIndicator = () => {
    if (!auth.serviceConnected) {
      return (
        <div className="p-3 bg-yellow-500 bg-opacity-20 border border-yellow-400 border-opacity-50 rounded-lg text-yellow-300 text-sm backdrop-blur-sm">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
            Authentication service is starting...
          </div>
        </div>
      );
    }
    
    if (!network.isOnline) {
      return (
        <div className="p-3 bg-red-500 bg-opacity-20 border border-red-400 border-opacity-50 rounded-lg text-red-300 text-sm backdrop-blur-sm">
          <div className="flex items-center">
            <span className="mr-2">🔴</span>
            No internet connection
          </div>
        </div>
      );
    }
    
    if (!network.isApiReachable) {
      return (
        <div className="p-3 bg-orange-500 bg-opacity-20 border border-orange-400 border-opacity-50 rounded-lg text-orange-300 text-sm backdrop-blur-sm">
          <div className="flex items-center">
            <span className="mr-2">🟠</span>
            Server connection issues
          </div>
        </div>
      );
    }
    
    return null;
  };

  // Enhanced loading state
  const isOperational = auth.serviceConnected && network.isApiReachable;
  const isSubmitting = auth.isLoading || retryAttempt > 0;

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url(${spaceBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Background overlay for better contrast */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      
      {/* Login container */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Glass morphism container with glowing border */}
        <div className="login-container backdrop-blur-md bg-gray-900 bg-opacity-20 border border-cyan-400 border-opacity-50 rounded-2xl p-8 shadow-2xl">
          {/* Glowing border effect */}
          <div className="absolute inset-0 rounded-2xl border-2 border-cyan-400 opacity-30 blur-sm"></div>
          <div className="absolute inset-0 rounded-2xl border border-cyan-300 opacity-50"></div>
          
          {/* Content */}
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome to Attrition
              </h1>
              <p className="text-cyan-300 text-sm opacity-80">
                Empire for Your Galaxy Odyssey
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Service status indicator */}
              {getServiceStatusIndicator()}
              
              {/* Error display */}
              {auth.error && (
                <div className="p-3 bg-red-500 bg-opacity-20 border border-red-400 border-opacity-50 rounded-lg text-red-300 text-sm backdrop-blur-sm">
                  {getContextualErrorMessage(auth.error)}
                </div>
              )}

              {/* Email field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  data-testid="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 bg-gray-800 bg-opacity-50 border border-gray-600 border-opacity-50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-50 backdrop-blur-sm transition-all duration-300"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Password field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  data-testid="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 bg-gray-800 bg-opacity-50 border border-gray-600 border-opacity-50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-50 backdrop-blur-sm transition-all duration-300"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Sign In button */}
              <button
                type="submit"
                data-testid="login-submit"
                disabled={isSubmitting || !isOperational}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {retryAttempt > 0 ? `Retrying... (${retryAttempt}/2)` : 'Signing in...'}
                  </div>
                ) : !isOperational ? (
                  <div className="flex items-center justify-center">
                    <span className="mr-2">⚠️</span>
                    Service Unavailable
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>

              {/* Remember me checkbox */}
              <div className="flex items-center justify-center">
                <label className="flex items-center text-sm text-gray-300 cursor-pointer hover:text-white transition-colors duration-200">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isSubmitting}
                    className="mr-3 w-4 h-4 text-cyan-400 bg-gray-800 bg-opacity-50 border-gray-600 rounded focus:ring-cyan-400 focus:ring-2 focus:ring-opacity-50 backdrop-blur-sm"
                  />
                  <span className="relative">
                    Remember me
                    <span className="absolute inset-0 bg-cyan-400 opacity-0 hover:opacity-20 rounded transition-opacity duration-200"></span>
                  </span>
                </label>
              </div>

              {/* Register link */}
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-2">
                  Don't have an account yet?
                </p>
                <Link 
                  to="/register" 
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors duration-200 relative group"
                >
                  Create one here
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyan-400 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export the component wrapped with migration support
export const Login = withAuthMigration(LoginComponent);

// Export the unwrapped component for direct usage if needed
export { LoginComponent };

export default Login;