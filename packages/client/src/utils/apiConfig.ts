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
 * Determine if we're running in production mode
 * For desktop development, force development mode
 */
function isProductionBuild(): boolean {
  // Force development mode for desktop builds during development
  // This ensures local server is used even when built with vite build
  const forceDevMode = import.meta.env.VITE_FORCE_DEV_MODE === 'true';
  if (forceDevMode) {
    return false;
  }
  
  // Vite sets NODE_ENV to 'production' for production builds
  return import.meta.env.MODE === 'production' || 
         import.meta.env.PROD === true ||
         (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
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
  } else if (isProduction) {
    // Production: Use HTTPS with configurable host
    const productionHost = import.meta.env.VITE_PRODUCTION_HOST || 'api.attrition.game';
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
