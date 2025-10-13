import { DIRECTORY_PATHS } from './constants/file-paths';

/**
 * Configuration Keys Constants
 * 
 * Centralized constants for all configuration-related strings used throughout the application.
 * This eliminates hardcoded configuration keys and provides better maintainability.
 * 
 * Usage:
 * - Import the required constants: import { CONFIG_KEYS } from '@shared/constants/configuration-keys'
 * - Use instead of hardcoded strings: config[CONFIG_KEYS.API_URL] instead of config['apiUrl']
 * 
 * Categories:
 * - Environment Values (common NODE_ENV values)
 * - Environment Variable Names (import from env-vars.ts)
 * - Vite/Build Configuration Keys
 * - API Configuration Keys  
 * - Database Configuration Keys
 * - Security Configuration Keys
 * - Application Configuration Keys
 */

// Re-export environment variable names for convenience
export { ENV_VARS } from './env-vars';

/**
 * Common Environment Values
 * Standard values used with NODE_ENV and similar environment settings
 */
export const ENV_VALUES = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production', 
  TEST: 'test',
  STAGING: 'staging',
  LOCAL: 'local',
} as const;

/**
 * Vite/Build Configuration Keys
 * Configuration keys used in Vite, React, Next.js and other build tools
 */
export const VITE_CONFIG_KEYS = {
  // Vite Environment Variables
  VITE_API_URL: 'VITE_API_URL',
  VITE_SOCKET_URL: 'VITE_SOCKET_URL', 
  VITE_FORCE_DEV_MODE: 'VITE_FORCE_DEV_MODE',
  VITE_FORCE_PRODUCTION_MODE: 'VITE_FORCE_PRODUCTION_MODE',
  VITE_ENVIRONMENT: 'VITE_ENVIRONMENT',
  VITE_PRODUCTION_HOST: 'VITE_PRODUCTION_HOST',
  
  // Vite Meta Environment Properties
  VITE_META_DEV: 'DEV',
  VITE_META_MODE: 'MODE',
  VITE_META_PROD: 'PROD',
  VITE_META_SSR: 'SSR',
} as const;

/**
 * React App Configuration Keys
 * Legacy React app environment variables
 */
export const REACT_CONFIG_KEYS = {
  REACT_APP_VERSION: 'REACT_APP_VERSION',
  REACT_APP_API_URL: 'REACT_APP_API_URL',
  REACT_APP_SOCKET_URL: 'REACT_APP_SOCKET_URL',
} as const;

/**
 * Next.js Configuration Keys
 * Next.js public environment variables
 */
export const NEXT_CONFIG_KEYS = {
  NEXT_PUBLIC_API_URL: 'NEXT_PUBLIC_API_URL',
  NEXT_PUBLIC_SUPABASE_URL: 'NEXT_PUBLIC_SUPABASE_URL',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
} as const;

/**
 * API Configuration Object Keys
 * Keys used in API configuration objects
 */
export const API_CONFIG_KEYS = {
  API_URL: 'apiUrl',
  SOCKET_URL: 'socketUrl',
  BASE_URL: 'baseUrl',
  TIMEOUT: 'timeout',
  RETRY_COUNT: 'retryCount',
  RETRY_DELAY: 'retryDelay',
  HTTPS_ENFORCED: 'httpsEnforced',
  IS_PRODUCTION: 'isProduction',
  IS_DESKTOP: 'isDesktop',
  ENVIRONMENT: 'environment',
  IS_PACKAGED: 'isPackaged',
} as const;

/**
 * Database Configuration Keys
 * Keys used in database configuration objects
 */
export const DB_CONFIG_KEYS = {
  URL: 'url',
  HOST: 'host',
  PORT: 'port',
  DATABASE: 'database',
  USERNAME: 'username',
  PASSWORD: 'password',
  SSL: 'ssl',
  CONNECTION_TIMEOUT: 'connectionTimeout',
  POOL_SIZE: 'poolSize',
  MAX_CONNECTIONS: 'maxConnections',
  IS_PRODUCTION: 'isProduction',
  IS_DEVELOPMENT: 'isDevelopment',
} as const;

/**
 * Security Configuration Keys
 * Keys used in security-related configuration
 */
export const SECURITY_CONFIG_KEYS = {
  JWT_SECRET: 'jwtSecret',
  JWT_EXPIRES_IN: 'jwtExpiresIn',
  CORS_ORIGIN: 'corsOrigin',
  CORS_METHODS: 'corsMethods',
  CORS_CREDENTIALS: 'corsCredentials',
  RATE_LIMIT_WINDOW: 'rateLimitWindow',
  RATE_LIMIT_MAX: 'rateLimitMax',
  HTTPS_ONLY: 'httpsOnly',
  SECURE_COOKIES: 'secureCookies',
  SAME_SITE: 'sameSite',
} as const;

/**
 * SSL/TLS Configuration Keys
 * Keys used in SSL/TLS configuration objects
 */
export const TLS_CONFIG_KEYS = {
  KEY_PATH: 'keyPath',
  CERT_PATH: 'certPath',
  CA_PATH: 'caPath',
  KEY_PASSPHRASE: 'keyPassphrase',
  SSL_PORT: 'sslPort',
  FORCE_SSL: 'forceSSL',
  SESSION_TIMEOUT: 'sessionTimeout',
  CACHE_SIZE: 'cacheSize',
  DISABLE_SESSION_RESUMPTION: 'disableSessionResumption',
  OCSP_STAPLING: 'ocspStapling',
  CERT_PINNING_ENABLED: 'certPinningEnabled',
  PINNED_CERTIFICATES: 'pinnedCertificates',
  PINNED_PUBLIC_KEYS: 'pinnedPublicKeys',
} as const;

/**
 * Logging Configuration Keys
 * Keys used in logging configuration objects
 */
export const LOGGING_CONFIG_KEYS = {
  LEVEL: 'level',
  FORMAT: 'format',
  TIMESTAMP: 'timestamp',
  CONSOLE: 'console',
  FILE: 'file',
  FILE_PATH: 'filePath',
  MAX_SIZE: 'maxSize',
  MAX_FILES: 'maxFiles',
  ROTATE: 'rotate',
  DEBUG: 'debug',
  SILENT: 'silent',
} as const;

/**
 * Server Configuration Keys
 * Keys used in server configuration objects
 */
export const SERVER_CONFIG_KEYS = {
  PORT: 'port',
  HOST: 'host',
  HTTPS_PORT: 'httpsPort',
  PROXY: 'proxy',
  TRUST_PROXY: 'trustProxy',
  COMPRESSION: 'compression',
  HELMET: 'helmet',
  BODY_PARSER: 'bodyParser',
  STATIC_FILES: 'staticFiles',
  VIEW_ENGINE: 'viewEngine',
} as const;

/**
 * Game Configuration Keys
 * Keys used in game-specific configuration
 */
export const GAME_CONFIG_KEYS = {
  LOOP_ENABLED: 'loopEnabled',
  LOOP_INTERVAL: 'loopInterval',
  PAYOUT_PERIOD: 'payoutPeriod',
  CITIZEN_PAYOUT_PERIOD: 'citizenPayoutPeriod',
  CREDIT_PAYOUT_PERIOD: 'creditPayoutPeriod',
  DEBUG_RESOURCES: 'debugResources',
  DEBUG_PATCH_LOG: 'debugPatchLog',
  ECONOMY_DEBUG: 'economyDebug',
  AUTO_SAVE_INTERVAL: 'autoSaveInterval',
} as const;

/**
 * Socket Configuration Keys
 * Keys used in WebSocket/Socket.IO configuration
 */
export const SOCKET_CONFIG_KEYS = {
  URL: 'url',
  PATH: 'path',
  TRANSPORTS: 'transports',
  TIMEOUT: 'timeout',
  RECONNECTION: 'reconnection',
  RECONNECTION_ATTEMPTS: 'reconnectionAttempts',
  RECONNECTION_DELAY: 'reconnectionDelay',
  HEARTBEAT_INTERVAL: 'heartbeatInterval',
  PING_TIMEOUT: 'pingTimeout',
  CORS: 'cors',
} as const;

/**
 * Desktop App Configuration Keys
 * Keys used in Electron/Desktop app configuration
 */
export const DESKTOP_CONFIG_KEYS = {
  IS_DESKTOP: 'isDesktop',
  IS_PACKAGED: 'isPackaged',
  IS_DEV: 'isDev',
  APP_DATA_PATH: 'appDataPath',
  USER_DATA_PATH: 'userDataPath',
  RESOURCES_PATH: 'resourcesPath',
  EXECUTABLE_PATH: 'executablePath',
  PLATFORM: 'platform',
  ARCH: 'arch',
  VERSION: 'version',
} as const;

/**
 * Testing Configuration Keys
 * Keys used in testing configuration objects
 */
export const TEST_CONFIG_KEYS = {
  TEST_ENV: 'testEnv',
  TEST_TIMEOUT: 'testTimeout',
  SETUP_FILES: 'setupFiles',
  COVERAGE: DIRECTORY_PATHS.COVERAGE,
  MOCK_MODULES: 'mockModules',
  TEST_MATCH: 'testMatch',
  IGNORE_PATTERNS: 'ignorePatterns',
  VERBOSE: 'verbose',
} as const;

/**
 * Common Protocol and URL Patterns
 * Standard protocols and URL patterns used in configuration
 */
export const URL_PATTERNS = {
  HTTP_PROTOCOL: 'http://',
  HTTPS_PROTOCOL: 'https://',
  WS_PROTOCOL: 'ws://',
  WSS_PROTOCOL: 'wss://',
  LOCALHOST: 'localhost',
  LOCAL_IP: '127.0.0.1',
  API_PATH: '/api',
  SOCKET_PATH: '/socket.io',
} as const;

/**
 * Common Host and Port Values
 * Standard values for hosts and ports used in development/production
 */
export const HOST_VALUES = {
  LOCALHOST: 'localhost',
  LOCAL_IP: '127.0.0.1',
  ALL_INTERFACES: '0.0.0.0',
  DEFAULT_HTTP_PORT: '3000',
  DEFAULT_HTTPS_PORT: '3001',
  DEFAULT_API_PORT: '3001',
  DEFAULT_SOCKET_PORT: '3001',
} as const;

/**
 * All configuration constants combined for convenience
 */
export const CONFIG_KEYS = {
  ...ENV_VALUES,
  ...VITE_CONFIG_KEYS,
  ...REACT_CONFIG_KEYS,
  ...NEXT_CONFIG_KEYS,
  ...API_CONFIG_KEYS,
  ...DB_CONFIG_KEYS,
  ...SECURITY_CONFIG_KEYS,
  ...TLS_CONFIG_KEYS,
  ...LOGGING_CONFIG_KEYS,
  ...SERVER_CONFIG_KEYS,
  ...GAME_CONFIG_KEYS,
  ...SOCKET_CONFIG_KEYS,
  ...DESKTOP_CONFIG_KEYS,
  ...TEST_CONFIG_KEYS,
  ...URL_PATTERNS,
  ...HOST_VALUES,
} as const;

// Type definitions for configuration keys
export type EnvValue = typeof ENV_VALUES[keyof typeof ENV_VALUES];
export type ViteConfigKey = typeof VITE_CONFIG_KEYS[keyof typeof VITE_CONFIG_KEYS];
export type ApiConfigKey = typeof API_CONFIG_KEYS[keyof typeof API_CONFIG_KEYS];
export type DbConfigKey = typeof DB_CONFIG_KEYS[keyof typeof DB_CONFIG_KEYS];
export type SecurityConfigKey = typeof SECURITY_CONFIG_KEYS[keyof typeof SECURITY_CONFIG_KEYS];
export type ConfigKey = typeof CONFIG_KEYS[keyof typeof CONFIG_KEYS];

/**
 * Helper function to validate environment value
 */
export function isValidEnvironment(env: string): env is EnvValue {
  return Object.values(ENV_VALUES).includes(env as EnvValue);
}

/**
 * Helper function to check if running in development
 */
export function isDevelopmentEnv(env?: string): boolean {
  return env === ENV_VALUES.DEVELOPMENT || env === ENV_VALUES.LOCAL;
}

/**
 * Helper function to check if running in production
 */
export function isProductionEnv(env?: string): boolean {
  return env === ENV_VALUES.PRODUCTION;
}

/**
 * Helper function to check if running in test
 */
export function isTestEnv(env?: string): boolean {
  return env === ENV_VALUES.TEST;
}