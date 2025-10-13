/**
 * CSS Constants for Tailwind Class Combinations
 * 
 * This file standardizes commonly used Tailwind class combinations
 * to improve maintainability and consistency across the application.
 * 
 * Generated from analysis of 314+ repeated class combinations.
 */

// =============================================================================
// LAYOUT & FLEXBOX PATTERNS
// =============================================================================

export const LAYOUT_CLASSES = {
  // Flex containers
  FLEX_CENTER: 'flex items-center justify-center',
  FLEX_BETWEEN: 'flex items-center justify-between',
  FLEX_START: 'flex items-center justify-start',
  FLEX_END: 'flex items-center justify-end',
  
  // Full screen layouts
  FULLSCREEN_CENTER: 'min-h-screen flex items-center justify-center',
  FULLSCREEN_CONTAINER: 'min-h-screen flex items-center justify-center relative overflow-hidden',
} as const;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const CARD_CLASSES = {
  // Basic card styling (most common pattern: bg-gray-800 border border-gray-700 rounded p-4)
  BASIC: 'bg-gray-800 border border-gray-700 rounded p-4',
  GAME_CARD: 'bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-lg',
  
  // Specialized cards
  DEBUG_CARD: 'fixed bottom-4 right-4 bg-gray-900 border-2 border-yellow-500 p-4 rounded-lg text-xs font-mono text-white max-w-md shadow-2xl z-50',
} as const;

export const BUTTON_CLASSES = {
  // Primary button
  PRIMARY: 'w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-50',
  
  // Game themed button
  GAME_BUTTON: 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors',
  
  // Button states
  DISABLED: 'bg-gray-600 cursor-not-allowed',
  LOADING_CONTENT: 'flex items-center justify-center',
} as const;

export const INPUT_CLASSES = {
  // Complex form input (repeated pattern)
  PRIMARY: 'w-full px-4 py-3 bg-gray-800 bg-opacity-50 border border-gray-600 border-opacity-50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-50 backdrop-blur-sm transition-all duration-300',
  
  // Game themed input
  GAME_INPUT: 'bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 focus:outline-none focus:border-blue-500',
  
  // Checkbox styling
  CHECKBOX: 'mr-3 w-4 h-4 text-cyan-400 bg-gray-800 bg-opacity-50 border-gray-600 rounded focus:ring-cyan-400 focus:ring-2 focus:ring-opacity-50 backdrop-blur-sm',
} as const;

// =============================================================================
// STATUS & ALERT COMPONENTS
// =============================================================================

export const STATUS_CLASSES = {
  // Online/Offline indicators
  ONLINE: 'text-green-400',
  OFFLINE: 'text-red-400',
  WARNING: 'text-yellow-400',
  
  // Status dots
  DOT: 'w-2 h-2 rounded-full',
  
  // Status details
  DETAILS: 'flex items-center space-x-2 text-sm',
} as const;

export const ALERT_CLASSES = {
  // Base alert with backdrop blur
  BASE: 'p-3 border rounded-lg text-sm backdrop-blur-sm',
  
  // Specific alert types (common patterns from scan)
  WARNING: 'p-3 bg-yellow-500 bg-opacity-20 border border-yellow-400 border-opacity-50 rounded-lg text-yellow-300 text-sm backdrop-blur-sm',
  ERROR: 'p-3 bg-red-500 bg-opacity-20 border border-red-400 border-opacity-50 rounded-lg text-red-300 text-sm backdrop-blur-sm',
  INFO: 'p-3 bg-orange-500 bg-opacity-20 border border-orange-400 border-opacity-50 rounded-lg text-orange-300 text-sm backdrop-blur-sm',
  
  // Alternative error styling (for forms)
  ERROR_ALT: 'mb-4 p-3 bg-red-600 bg-opacity-20 border border-red-600 rounded text-red-400 text-sm',
  
  // Defense/danger alerts
  DANGER: 'p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200',
} as const;

// =============================================================================
// LOADING & ANIMATION COMPONENTS
// =============================================================================

export const LOADING_CLASSES = {
  // Loading spinners (common patterns)
  SPINNER_SMALL: 'animate-spin rounded-full h-4 w-4 border-b-2',
  SPINNER_MEDIUM: 'animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2',
  SPINNER_LARGE: 'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500',
  SPINNER_XLARGE: 'animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto',
  
  // Spinner colors
  SPINNER_YELLOW: 'animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2',
  SPINNER_WHITE: 'animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2',
} as const;

// =============================================================================
// CONTAINER & LAYOUT COMPONENTS
// =============================================================================

export const CONTAINER_CLASSES = {
  // Game themed containers
  GAME_CONTAINER: 'min-h-screen bg-gray-900 text-white',
  GAME_NAV: 'bg-gray-800 border-b border-gray-700 px-6 py-4',
  GAME_SIDEBAR: 'bg-gray-800 border-r border-gray-700 w-64 min-h-screen p-4',
  GAME_MAIN: 'flex-1 p-6',
  
  // Login/Auth containers
  LOGIN_CONTAINER: 'login-container backdrop-blur-md bg-gray-900 bg-opacity-20 border border-cyan-400 border-opacity-50 rounded-2xl p-8 shadow-2xl',
  
  // Service status containers
  SERVICE_ERROR_FALLBACK: 'game-container flex items-center justify-center',
  SERVICE_INITIALIZING: 'game-container flex items-center justify-center',
  SERVICE_INIT_ERROR: 'game-container flex flex-col items-center justify-center text-center',
  SERVICE_LOADING: 'flex items-center justify-center p-4',
  SERVICE_CONDITIONAL_LOADING: 'flex items-center justify-center p-8 text-gray-400',
  SERVICE_DISCONNECTED_WARNING: 'bg-yellow-900 border border-yellow-600 text-yellow-200 p-3 rounded mt-2',
} as const;

// =============================================================================
// COMPONENT UTILITY CLASSES
// =============================================================================

export const COMPONENT_CLASSES = {
  // Resource display
  RESOURCE_DISPLAY: 'flex items-center space-x-2 text-sm',
  
  // Network status
  NETWORK_STATUS_COMPACT: 'inline-flex items-center',
  SYNC_STATUS_COMPACT: 'inline-flex items-center relative',
  AUTH_STATUS_INDICATOR: 'inline-flex items-center space-x-2',
  
  // Queue badges
  QUEUE_BADGE: 'bg-red-500 text-white text-xs rounded-full px-1 ml-1',
  
  // Migration debug panel
  MIGRATION_DEBUG_PANEL: 'fixed bottom-4 right-4 bg-gray-900 bg-opacity-95 text-white p-3 rounded-lg text-xs border border-gray-600 shadow-lg',
} as const;

// =============================================================================
// UTILITY & HELPER CLASSES
// =============================================================================

export const UTILITY_CLASSES = {
  // Text utilities
  CENTER_TEXT: 'text-center',
  LOADING_TEXT: 'mt-4 text-lg',
  
  // Spacing utilities (commonly repeated)
  HEADER_SPACING: 'flex items-center justify-between mb-3',
  
  // Background utilities
  BACKDROP_BLUR: 'backdrop-blur-sm',
  
  // Transition utilities
  SMOOTH_TRANSITION: 'transition-all duration-300',
  TRANSFORM_HOVER: 'transform hover:scale-105',
} as const;

// =============================================================================
// EXPORTED COMBINED OBJECTS
// =============================================================================

/**
 * All CSS class constants grouped by category
 */
export const CSS_CLASSES = {
  LAYOUT: LAYOUT_CLASSES,
  CARD: CARD_CLASSES,
  BUTTON: BUTTON_CLASSES,
  INPUT: INPUT_CLASSES,
  STATUS: STATUS_CLASSES,
  ALERT: ALERT_CLASSES,
  LOADING: LOADING_CLASSES,
  CONTAINER: CONTAINER_CLASSES,
  COMPONENT: COMPONENT_CLASSES,
  UTILITY: UTILITY_CLASSES,
} as const;

/**
 * Quick access to most commonly used classes
 */
export const COMMON_CLASSES = {
  // Top 10 most repeated patterns from analysis
  CARD_BASIC: CARD_CLASSES.BASIC,
  FLEX_CENTER: LAYOUT_CLASSES.FLEX_CENTER,
  FLEX_BETWEEN: LAYOUT_CLASSES.FLEX_BETWEEN,
  LOADING_SPINNER: LOADING_CLASSES.SPINNER_MEDIUM,
  ALERT_WARNING: ALERT_CLASSES.WARNING,
  ALERT_ERROR: ALERT_CLASSES.ERROR,
  FORM_INPUT: INPUT_CLASSES.PRIMARY,
  GAME_BUTTON: BUTTON_CLASSES.GAME_BUTTON,
  GAME_CONTAINER: CONTAINER_CLASSES.GAME_CONTAINER,
  LOGIN_CONTAINER: CONTAINER_CLASSES.LOGIN_CONTAINER,
} as const;

// Type exports for TypeScript support
export type CSSClassCategory = keyof typeof CSS_CLASSES;
export type LayoutClass = keyof typeof LAYOUT_CLASSES;
export type CardClass = keyof typeof CARD_CLASSES;
export type ButtonClass = keyof typeof BUTTON_CLASSES;
export type InputClass = keyof typeof INPUT_CLASSES;
export type StatusClass = keyof typeof STATUS_CLASSES;
export type AlertClass = keyof typeof ALERT_CLASSES;
export type LoadingClass = keyof typeof LOADING_CLASSES;
export type ContainerClass = keyof typeof CONTAINER_CLASSES;
export type ComponentClass = keyof typeof COMPONENT_CLASSES;
export type UtilityClass = keyof typeof UTILITY_CLASSES;