/**
 * File Paths & URLs Constants
 * 
 * Centralized constants for all file paths, URLs, file extensions, and directory paths
 * used throughout the application. This helps eliminate hardcoded path strings and 
 * provides better maintainability.
 * 
 * Usage:
 * - Import the required constants: import { FILE_PATHS, FILE_EXTENSIONS } from '@shared/constants/file-paths'
 * - Use instead of hardcoded strings: FILE_EXTENSIONS.TYPESCRIPT instead of '.ts'
 */

export const FILE_EXTENSIONS = {
  // Source Code
  TYPESCRIPT: '.ts',
  TYPESCRIPT_REACT: '.tsx', 
  JAVASCRIPT: '.js',
  JAVASCRIPT_REACT: '.jsx',
  
  // Data & Config
  JSON: '.json',
  YAML: '.yaml',
  YML: '.yml',
  
  // Documentation
  MARKDOWN: '.md',
  TEXT: '.txt',
  
  // Logs & Output
  LOG: '.log',
  
  // Web Assets
  CSS: '.css',
  HTML: '.html',
  
  // Maps & Debug
  MAP: '.map',
  
  // Other
  GIT_IGNORE: '.gitignore',
  ENV: '.env',
} as const;

export const DIRECTORY_PATHS = {
  // Build & Distribution
  DIST: 'dist',
  BUILD: 'build',
  
  // Dependencies
  NODE_MODULES: 'node_modules',
  
  // Source Code
  SRC: 'src',
  SCRIPTS: 'scripts',
  
  // Testing
  TESTS: '__tests__',
  COVERAGE: 'coverage',
  
  // Configuration
  CONFIG: 'config',
  
  // Assets & Resources
  ASSETS: 'assets',
  RESOURCES: 'resources',
  
  // Documentation
  DOCS: 'docs',
  
  // Version Control
  GIT: '.git',
  
  // Temporary
  TEMP: 'temp',
  TMP: 'tmp',
  
  // Platform Specific
  CLIENT: 'client',
  SERVER: 'server',
  SHARED: 'shared',
  DESKTOP: 'desktop',
  
  // Services
  SERVICES: 'services',
  UTILS: 'utils',
  MIDDLEWARE: 'middleware',
  ROUTES: 'routes',
  COMPONENTS: 'components',
  STORES: 'stores',
  HOOKS: 'hooks',
  TYPES: 'types',
} as const;

export const FILE_PATHS = {
  // Configuration Files
  PACKAGE_JSON: 'package.json',
  TSCONFIG: 'tsconfig.json',
  ESLINTRC: '.eslintrc.js',
  GITIGNORE: '.gitignore',
  ENV_EXAMPLE: '.env.example',
  
  // Build Files
  VITE_CONFIG: 'vite.config.ts',
  JEST_CONFIG: 'jest.config.js',
  NODEMON_CONFIG: 'nodemon.json',
  
  // Documentation
  README: 'README.md',
  
  // Entry Points
  INDEX_TS: 'index.ts',
  INDEX_JS: 'index.js',
  MAIN_JS: 'main.js',
  
  // HTML Files
  INDEX_HTML: 'index.html',
  
  // Database Files
  DB_JS: 'db.js',
} as const;

export const URL_PREFIXES = {
  // Protocol prefixes
  HTTP: 'http://',
  HTTPS: 'https://',
  
  // Local development
  LOCALHOST: 'localhost',
  
  // Common domains (for external services)
  GITHUB: 'github.com',
  NPM: 'npmjs.com',
} as const;

export const API_PATHS = {
  // Base API paths
  BASE: '/api',
  
  // Version prefixes
  V1: '/api/v1',
  
  // Main API categories
  AUTH: '/api/auth',
  GAME: '/api/game', 
  ADMIN: '/api/admin',
  UNIVERSE: '/api/universe',
  MESSAGES: '/api/messages',
  SYNC: '/api/sync',
  SYSTEM: '/api/system',
  
  // Auth endpoints
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REFRESH: '/api/auth/refresh', 
  AUTH_LOGOUT: '/api/auth/logout',
  
  // Game endpoints
  GAME_DASHBOARD: '/api/game/dashboard',
  GAME_BASES: '/api/game/bases',
  GAME_FLEETS: '/api/game/fleets',
  GAME_EMPIRE: '/api/game/empire',
  GAME_STRUCTURES: '/api/game/structures',
  GAME_TECH: '/api/game/tech',
  GAME_UNITS: '/api/game/units',
  GAME_TERRITORIES: '/api/game/territories',
  
  // System endpoints
  SYSTEM_STATUS: '/api/system/status',
  SYSTEM_HEALTH: '/api/system/health',
} as const;

export const ROUTE_PATTERNS = {
  // Parameter placeholders
  COORD_PARAM: ':coord',
  ID_PARAM: ':id',
  
  // Common route patterns
  BY_ID: '/:id',
  BY_COORD: '/:coord',
  STATUS: '/status',
  CATALOG: '/catalog',
  QUEUE: '/queue',
  SUMMARY: '/summary',
  STATS: '/stats',
} as const;

export const LOG_PATHS = {
  // Common log file names
  ERROR_LOG: 'error.log',
  ACCESS_LOG: 'access.log',
  APP_LOG: 'app.log',
  DEBUG_LOG: 'debug.log',
} as const;

// Type definitions for better type safety
export type FileExtension = typeof FILE_EXTENSIONS[keyof typeof FILE_EXTENSIONS];
export type DirectoryPath = typeof DIRECTORY_PATHS[keyof typeof DIRECTORY_PATHS];
export type FilePath = typeof FILE_PATHS[keyof typeof FILE_PATHS];
export type ApiPath = typeof API_PATHS[keyof typeof API_PATHS];
export type RoutePattern = typeof ROUTE_PATTERNS[keyof typeof ROUTE_PATTERNS];

/**
 * Helper function to build file paths
 */
export function buildFilePath(...segments: string[]): string {
  return segments.join('/');
}

/**
 * Helper function to build API endpoints with parameters
 */
export function buildApiPath(basePath: string, ...segments: string[]): string {
  return [basePath, ...segments].join('');
}

/**
 * Helper function to replace route parameters
 */
export function buildRouteWithParams(route: string, params: Record<string, string>): string {
  let result = route;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`:${key}`, encodeURIComponent(value));
  });
  return result;
}

/**
 * Helper function to check if a path has a specific extension
 */
export function hasExtension(path: string, extension: FileExtension): boolean {
  return path.endsWith(extension);
}

/**
 * Helper function to get file extension from path
 */
export function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  return lastDot >= 0 ? path.substring(lastDot) : '';
}

/**
 * Helper function to join path segments properly
 */
export function joinPaths(...segments: string[]): string {
  return segments
    .map(segment => segment.replace(/^\/+|\/+$/g, '')) // Remove leading/trailing slashes
    .filter(segment => segment.length > 0)
    .join('/');
}