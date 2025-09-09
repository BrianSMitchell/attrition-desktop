/**
 * Desktop API Configuration
 * 
 * Provides configuration for API connections in the desktop Electron app.
 * This is NOT a browser application - it runs embedded in Electron.
 */

export interface ApiConfig {
  /** API base URL */
  apiUrl: string;
  /** WebSocket base URL */
  socketUrl: string;
  /** Whether HTTPS is enforced */
  httpsEnforced: boolean;
  /** Whether this is a production build */
  isProduction: boolean;
  /** Whether this is a desktop app */
  isDesktop: boolean;
  /** Environment name */
  environment: string;
}

/**
 * Check if we're running in a packaged Electron app
 * Uses synchronous detection that works at module load time
 */
function isPackagedElectronApp(): boolean {
  try {
    // Check if we're in an Electron context using file protocol
    if (typeof window !== 'undefined' && window.location?.protocol === 'file:') {
      // In a packaged Electron app, the location will be a file:// URL
      // pointing to the app resources, not localhost
      const pathname = window.location.pathname;
      // Packaged apps typically have paths like /resources/app.asar/...
      const isPackaged = pathname.includes('resources') || 
                        pathname.includes('app.asar') ||
                        !pathname.includes('packages/client');
      
      console.log(`📦 Electron app detected - packaged: ${isPackaged}`);
      console.log(`🔍 Path analysis: ${pathname}`);
      return isPackaged;
    }
    
    return false;
  } catch (error) {
    console.warn('isPackagedElectronApp failed:', error);
    return false;
  }
}

/**
 * Determine if we're running in production mode
 * Uses runtime detection to automatically switch between dev and production APIs
 */
function isProductionBuild(): boolean {
  // Force development mode via environment variable
  const forceDevMode = import.meta.env.VITE_FORCE_DEV_MODE === 'true';
  if (forceDevMode) {
    console.log('🔧 Forced development mode via VITE_FORCE_DEV_MODE');
    return false;
  }
  
  // Runtime detection: Check if we're in a packaged Electron app
  const isPackaged = isPackagedElectronApp();
  if (isPackaged) {
    console.log('🚀 Packaged Electron app - using production mode');
    return true;
  }
  
  // If we're in an Electron context but not packaged, it's development
  if (typeof window !== 'undefined' && window.location?.protocol === 'file:') {
    console.log('🔧 Development Electron app detected');
    return false;
  }
  
  // Build-time production detection as fallback
  const isBuildProduction = import.meta.env.MODE === 'production' || 
                           import.meta.env.PROD === true ||
                           (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
  
  if (isBuildProduction) {
    console.log('🚀 Production build detected (build-time)');
    return true;
  }
  
  // Default to development if uncertain
  console.log('🔧 Defaulting to development mode');
  return false;
}


/**
 * Get environment name from various sources
 */
function getEnvironment(): string {
  return import.meta.env.VITE_ENVIRONMENT || 
         import.meta.env.MODE || 
         (typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined) || 
         'development';
}


/**
 * Get the API base URL for desktop app
 */
function getApiBaseUrl(): string {
  const isProduction = isProductionBuild();
  
  // Desktop app API configuration
  let baseUrl: string;
  
  if (import.meta.env.VITE_API_URL) {
    baseUrl = import.meta.env.VITE_API_URL;
    console.log(`🖥️ Desktop Explicit API: ${baseUrl}`);
  } else if (isProduction) {
    // Production: Use HTTPS with configurable host
    const productionHost = import.meta.env.VITE_PRODUCTION_HOST || 'attrition-game.onrender.com';
    baseUrl = `https://${productionHost}/api`;
    console.log(`🖥️ Desktop Production API: ${baseUrl}`);
  } else {
    // Development: Local server
    baseUrl = 'http://localhost:3001/api';
    console.log(`🖥️ Desktop Development API: ${baseUrl}`);
  }
  
  return baseUrl;
}

/**
 * Get the WebSocket base URL derived from API URL
 */
function getSocketBaseUrl(apiUrl: string): string {
  // Remove /api suffix and use same protocol/host for WebSocket
  const socketUrl = apiUrl.replace(/\/api\/?$/, '');
  
  // Ensure WebSocket URL protocol matches API URL protocol
  // This is critical for localhost development where we need ws:// not wss://
  if (apiUrl.startsWith('http://') && !socketUrl.startsWith('http://')) {
    return socketUrl.replace(/^https:/, 'http:');
  }
  
  return socketUrl;
}

/**
 * Get desktop API configuration
 */
export function getApiConfig(): ApiConfig {
  const isProduction = isProductionBuild();
  const environment = getEnvironment();
  
  // Get API URL
  const apiUrl = getApiBaseUrl();
  const socketUrl = getSocketBaseUrl(apiUrl);
  
  // Always desktop mode, HTTPS enforced in production
  const httpsEnforced = isProduction;
  
  const config: ApiConfig = {
    apiUrl,
    socketUrl,
    httpsEnforced,
    isProduction,
    isDesktop: true, // Always desktop
    environment
  };
  
  // Log configuration with enhanced debugging
  console.log('🖥️ Desktop API Configuration:', {
    environment,
    isProduction,
    httpsEnforced,
    apiUrl,
    socketUrl,
    forceDevMode: import.meta.env.VITE_FORCE_DEV_MODE
  });
  
  // Security validation for production
  if (isProduction && !apiUrl.startsWith('https://')) {
    console.warn('⚠️ Desktop Production Warning: Consider using HTTPS for security');
  }
  
  return config;
}

/**
 * Validate that the current configuration meets security requirements
 */
export function validateApiSecurity(config: ApiConfig): { isSecure: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let isSecure = true;
  
  // Check HTTPS usage in production
  if (config.isProduction && !config.apiUrl.startsWith('https://')) {
    warnings.push('Using HTTP in production build - HTTPS recommended');
    isSecure = false;
  }
  
  // Check localhost usage in production
  if (config.isProduction && (
    config.apiUrl.includes('localhost') || 
    config.apiUrl.includes('127.0.0.1')
  )) {
    warnings.push('Using localhost in production build - production server recommended');
    isSecure = false;
  }
  
  // Check WebSocket security
  if (config.httpsEnforced && !config.socketUrl.startsWith('https://')) {
    warnings.push('WebSocket URL should use HTTPS when HTTPS is enforced');
    isSecure = false;
  }
  
  // Log warnings
  if (warnings.length > 0) {
    console.warn('⚠️  API Security Warnings:', warnings);
  }
  
  return { isSecure, warnings };
}

/**
 * Get the current API configuration (singleton pattern)
 */
let cachedConfig: ApiConfig | null = null;

export function getCurrentApiConfig(): ApiConfig {
  if (!cachedConfig) {
    cachedConfig = getApiConfig();
    
    // Validate security
    const securityCheck = validateApiSecurity(cachedConfig);
    if (!securityCheck.isSecure && cachedConfig.isProduction) {
      console.error('❌ API configuration failed security validation in production');
    }
  }
  
  return cachedConfig;
}

/**
 * Clear cached configuration (useful for testing or environment changes)
 */
export function clearApiConfigCache(): void {
  cachedConfig = null;
}

// Export individual URL getters for backward compatibility
export const API_BASE_URL = getApiBaseUrl();
export const SOCKET_BASE_URL = getSocketBaseUrl(API_BASE_URL);

export default {
  getApiConfig,
  getCurrentApiConfig,
  validateApiSecurity,
  clearApiConfigCache,
  API_BASE_URL,
  SOCKET_BASE_URL
};
