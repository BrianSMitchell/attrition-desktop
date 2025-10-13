/**
 * Color Constants for CSS Modules and Inline Styles
 * 
 * This file standardizes hardcoded color values found in CSS modules
 * and inline styles to improve maintainability and theming consistency.
 * 
 * Generated from analysis of 25+ hardcoded color values.
 */

// =============================================================================
// GAME THEME COLORS
// =============================================================================

export const GAME_COLORS = {
  // Primary game accent color (found in multiple CSS modules)
  PRIMARY_ACCENT: '#4a9',      // Used for titles and highlights
  SECONDARY_ACCENT: '#5ba',    // Hover state for primary accent
  TERTIARY_ACCENT: '#398',     // Active state for primary accent
  
  // Background colors
  DARK_BACKGROUND: 'rgba(0, 0, 0, 0.85)',        // Semi-transparent dark overlay
  DARKER_BACKGROUND: 'rgba(0, 0, 0, 0.2)',       // Less transparent overlay
  
  // Border colors
  SUBTLE_BORDER: 'rgba(255, 255, 255, 0.1)',     // Light subtle borders
  
  // Text colors
  PRIMARY_TEXT: '#fff',        // Main white text
  SECONDARY_TEXT: '#aaa',      // Muted gray text
  DISABLED_TEXT: '#666',       // Disabled state text
} as const;

// =============================================================================
// UI COMPONENT COLORS
// =============================================================================

export const UI_COLORS = {
  // Status colors (matching Tailwind equivalents)
  SUCCESS: '#10b981',       // green-500 equivalent
  WARNING: '#f59e0b',       // yellow-500 equivalent  
  ERROR: '#ef4444',         // red-500 equivalent
  INFO: '#3b82f6',          // blue-500 equivalent
  
  // Gray scale (commonly used in CSS modules)
  GRAY_100: '#f3f4f6',
  GRAY_200: '#e5e7eb',
  GRAY_300: '#d1d5db',
  GRAY_400: '#9ca3af',
  GRAY_500: '#6b7280',
  GRAY_600: '#4b5563',
  GRAY_700: '#374151',
  GRAY_800: '#1f2937',
  GRAY_900: '#111827',
} as const;

// =============================================================================
// CSS RGBA VALUES
// =============================================================================

export const RGBA_VALUES = {
  // Common opacity combinations
  BLACK_85: 'rgba(0, 0, 0, 0.85)',
  BLACK_20: 'rgba(0, 0, 0, 0.2)',
  WHITE_10: 'rgba(255, 255, 255, 0.1)',
  
  // Semi-transparent overlays
  OVERLAY_LIGHT: 'rgba(255, 255, 255, 0.05)',
  OVERLAY_MEDIUM: 'rgba(255, 255, 255, 0.1)',
  OVERLAY_DARK: 'rgba(0, 0, 0, 0.5)',
} as const;

// =============================================================================
// DIMENSION CONSTANTS (from CSS modules)
// =============================================================================

export const DIMENSIONS = {
  // Border radius (commonly repeated)
  RADIUS_SMALL: '4px',
  RADIUS_MEDIUM: '8px',
  RADIUS_LARGE: '12px',
  
  // Common spacing values
  SPACING_XS: '4px',
  SPACING_SM: '8px',
  SPACING_MD: '12px',
  SPACING_LG: '16px',
  SPACING_XL: '18px',
  
  // Common border widths
  BORDER_THIN: '1px',
  BORDER_THICK: '2px',
  
  // Container widths
  MIN_WIDTH_SMALL: '300px',
  
  // Font sizes (from CSS modules)
  FONT_SM: '14px',
  FONT_MD: '16px',
  FONT_LG: '18px',
} as const;

// =============================================================================
// CSS CUSTOM PROPERTIES (CSS Variables)
// =============================================================================

/**
 * CSS custom properties for dynamic theming
 * These can be used in CSS modules and overridden at runtime
 */
export const CSS_VARIABLES = {
  // Game theme variables
  '--game-primary-accent': GAME_COLORS.PRIMARY_ACCENT,
  '--game-secondary-accent': GAME_COLORS.SECONDARY_ACCENT,
  '--game-tertiary-accent': GAME_COLORS.TERTIARY_ACCENT,
  
  // Background variables
  '--game-dark-bg': GAME_COLORS.DARK_BACKGROUND,
  '--game-darker-bg': GAME_COLORS.DARKER_BACKGROUND,
  
  // Border variables
  '--game-subtle-border': GAME_COLORS.SUBTLE_BORDER,
  
  // Text variables
  '--game-primary-text': GAME_COLORS.PRIMARY_TEXT,
  '--game-secondary-text': GAME_COLORS.SECONDARY_TEXT,
  '--game-disabled-text': GAME_COLORS.DISABLED_TEXT,
  
  // Spacing variables
  '--spacing-xs': DIMENSIONS.SPACING_XS,
  '--spacing-sm': DIMENSIONS.SPACING_SM,
  '--spacing-md': DIMENSIONS.SPACING_MD,
  '--spacing-lg': DIMENSIONS.SPACING_LG,
  '--spacing-xl': DIMENSIONS.SPACING_XL,
  
  // Radius variables
  '--radius-small': DIMENSIONS.RADIUS_SMALL,
  '--radius-medium': DIMENSIONS.RADIUS_MEDIUM,
  '--radius-large': DIMENSIONS.RADIUS_LARGE,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Creates an RGBA color string with the specified opacity
 */
export function withOpacity(hexColor: string, opacity: number): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Status color getter function
 * Used in inline styles where dynamic colors are needed
 */
export function getStatusColor(status: 'online' | 'offline' | 'warning' | 'error' | 'success'): string {
  switch (status) {
    case 'online':
    case 'success':
      return UI_COLORS.SUCCESS;
    case 'warning':
      return UI_COLORS.WARNING;
    case 'error':
    case 'offline':
      return UI_COLORS.ERROR;
    default:
      return UI_COLORS.INFO;
  }
}

// =============================================================================
// EXPORTED COMBINED OBJECTS
// =============================================================================

/**
 * All color constants grouped by category
 */
export const COLORS = {
  GAME: GAME_COLORS,
  UI: UI_COLORS,
  RGBA: RGBA_VALUES,
  DIMENSIONS: DIMENSIONS,
  CSS_VARS: CSS_VARIABLES,
} as const;

/**
 * Quick access to most commonly used colors
 */
export const COMMON_COLORS = {
  PRIMARY_ACCENT: GAME_COLORS.PRIMARY_ACCENT,
  DARK_BACKGROUND: GAME_COLORS.DARK_BACKGROUND,
  SUBTLE_BORDER: GAME_COLORS.SUBTLE_BORDER,
  PRIMARY_TEXT: GAME_COLORS.PRIMARY_TEXT,
  SECONDARY_TEXT: GAME_COLORS.SECONDARY_TEXT,
  SUCCESS: UI_COLORS.SUCCESS,
  WARNING: UI_COLORS.WARNING,
  ERROR: UI_COLORS.ERROR,
} as const;

// Type exports for TypeScript support
export type GameColor = keyof typeof GAME_COLORS;
export type UIColor = keyof typeof UI_COLORS;
export type RGBAValue = keyof typeof RGBA_VALUES;
export type Dimension = keyof typeof DIMENSIONS;
export type StatusType = 'online' | 'offline' | 'warning' | 'error' | 'success';