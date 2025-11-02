import { DIRECTORY_PATHS } from '@game/shared';

/**
 * Desktop API Configuration
 * 
 * Provides configuration for API connections in the desktop Electron app.
 * This is NOT a browser application - it runs embedded in Electron.
 */

import { ENV_VALUES, VITE_CONFIG_KEYS, URL_PATTERNS, HOST_VALUES } from '@game/shared';

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
 * Determine if we're running in production mode
 * Uses runtime detection to automatically switch between dev and production APIs
 */
function isProductionBuild(): boolean {
  // Force development mode via environment variable (highest priority)
  const forceDevMode = import.meta.env[VITE_CONFIG_KEYS.VITE_FORCE_DEV_MODE] === 'true';
  if (forceDevMode) {
    return false;
  }
  
  // Force production mode via environment variable (second priority)
  const forceProductionMode = import.meta.env[VITE_CONFIG_KEYS.VITE_FORCE_PRODUCTION_MODE] === 'true';
  if (forceProductionMode) {
    return true;
  }
  
  // Check for desktop development indicators
  const hasDesktopDevIndicators = 
    (typeof window !== 'undefined' && (window as any).desktop?.isPackaged === false) ||
    (typeof window !== 'undefined' && window.location?.href?.includes('localhost')) ||
    (typeof window !== 'undefined' && window.location?.href?.includes('127.0.0.1')) ||
    (typeof window !== 'undefined' && window.location?.href?.includes('packages/client')) ||
    (typeof process !== 'undefined' && process.execPath?.includes(DIRECTORY_PATHS.NODE_MODULES)) ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === ENV_VALUES.DEVELOPMENT) ||
    import.meta.env[VITE_CONFIG_KEYS.VITE_META_DEV] === true ||
    import.meta.env[VITE_CONFIG_KEYS.VITE_META_MODE] === ENV_VALUES.DEVELOPMENT;
  
  return !hasDesktopDevIndicators;
}


/**
 * Get environment name from various sources
 */
function getEnvironment(): string {
  return import.meta.env[VITE_CONFIG_KEYS.VITE_ENVIRONMENT] || 
         import.meta.env[VITE_CONFIG_KEYS.VITE_META_MODE] || 
         (typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined) || 
         ENV_VALUES.DEVELOPMENT;
}


/**
 * Get the API base URL for desktop app
 */
function getApiBaseUrl(): string {
  const isProduction = isProductionBuild();
  
  // Desktop app API configuration
  let baseUrl: string;
  
  if (import.meta.env[VITE_CONFIG_KEYS.VITE_API_URL]) {
    baseUrl = import.meta.env[VITE_CONFIG_KEYS.VITE_API_URL] as string;
  } else if (isProduction) {
    // Production: Use HTTPS with configurable host
    const productionHost = import.meta.env[VITE_CONFIG_KEYS.VITE_PRODUCTION_HOST] || 'attrition-game.onrender.com';
    baseUrl = `${URL_PATTERNS.HTTPS_PROTOCOL}${productionHost}${URL_PATTERNS.API_PATH}`;
  } else {
    // Development: Local server
    baseUrl = `${URL_PATTERNS.HTTP_PROTOCOL}${HOST_VALUES.LOCALHOST}:${HOST_VALUES.DEFAULT_API_PORT}${URL_PATTERNS.API_PATH}`;
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
  if (apiUrl.startsWith(URL_PATTERNS.HTTP_PROTOCOL) && !socketUrl.startsWith(URL_PATTERNS.HTTP_PROTOCOL)) {
    return socketUrl.replace(/^https:/, URL_PATTERNS.HTTP_PROTOCOL.slice(0, -3) + ':');
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
  if (config.isProduction && !config.apiUrl.startsWith(URL_PATTERNS.HTTPS_PROTOCOL)) {
    warnings.push('Using HTTP in production build - HTTPS recommended');
    isSecure = false;
  }
  
  // Check localhost usage in production
  if (config.isProduction && (
    config.apiUrl.includes(URL_PATTERNS.LOCALHOST) || 
    config.apiUrl.includes(URL_PATTERNS.LOCAL_IP)
  )) {
    warnings.push('Using localhost in production build - production server recommended');
    isSecure = false;
  }
  
  // Check WebSocket security
  if (config.httpsEnforced && !config.socketUrl.startsWith(URL_PATTERNS.HTTPS_PROTOCOL)) {
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
let loggedConfigOnce = false;

export function getCurrentApiConfig(): ApiConfig {
  if (!cachedConfig) {
    cachedConfig = getApiConfig();
    
    // Validate security
    const securityCheck = validateApiSecurity(cachedConfig);
    if (!securityCheck.isSecure && cachedConfig.isProduction) {
      console.error('❌ API configuration failed security validation in production');
    }

    // Log a concise one-time summary to reduce noise in dev
    if (!loggedConfigOnce) {
      loggedConfigOnce = true;
      try {
        const forceDev = import.meta.env[VITE_CONFIG_KEYS.VITE_FORCE_DEV_MODE] === 'true';
        const forceProd = import.meta.env[VITE_CONFIG_KEYS.VITE_FORCE_PRODUCTION_MODE] === 'true';
        console.log('[API] Config initialized', {
          environment: cachedConfig.environment,
          isProduction: cachedConfig.isProduction,
          httpsEnforced: cachedConfig.httpsEnforced,
          apiUrl: cachedConfig.apiUrl,
          socketUrl: cachedConfig.socketUrl,
          forceDev,
          forceProd,
        });
      } catch {}
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
