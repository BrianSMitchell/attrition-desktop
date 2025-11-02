/**
 * Shared Types and Utilities for Attrition
 * 
 * This package exports types, constants, and utilities used throughout the Attrition game.
 * Exports are organized into logical categories for easy discovery and better tree-shaking.
 * 
 * Export Categories:
 * 1. Type Definitions - All game domain types
 * 2. API Module - Response types and utilities
 * 3. Game Logic - Buildings, tech, units, energy calculations
 * 4. Constants - Configuration, magic numbers, business rules
 * 5. Utilities - Helper functions and validation
 * 6. Messages - Game message system
 */

// ============================================================================
// 1. TYPE DEFINITIONS (Single Source of Truth)
// ============================================================================

/**
 * Re-export comprehensive types from types/index.ts
 * This includes all game domain types, entities, and interfaces
 */
export * from './types/index.js';
export * from './types/test-types.js';

// ============================================================================
// 2. API MODULE (Response Types & Utilities)
// ============================================================================

/**
 * Re-export all API utilities and types for consistent request/response handling
 */
export * from './api/index.js';
export {
  // Type definitions
  HttpStatusCode,
  ApiErrorCode,
  ApiErrorDetail,
  PaginationMeta,
  RateLimitInfo,
  EnhancedApiResponse,
  SuccessResponse,
  ErrorResponse,
  ListResponse,
  BulkOperationResponse,
  AsyncOperationResponse,
  HealthCheckResponse,
  OperationStatus,
  HealthStatus,
  // Utility functions
  generateRequestId,
  createSuccessResponse,
  createErrorResponse,
  createListResponse,
  createBulkOperationResponse,
  createAsyncOperationResponse,
  createHealthCheckResponse,
  createValidationErrors,
  createPaginationMeta,
  createRateLimitInfo,
  getDefaultStatusCodeForError,
  standardizeError,
  withErrorHandling,
  sendApiResponse,
  isSuccessResponse,
  isErrorResponse,
  mergeApiResponses,
  enhancedErrorHandler
} from './api/index.js';

// ============================================================================
// 3. GAME LOGIC (Core Game Systems)
// ============================================================================

/**
 * Game logic modules for buildings, technology, units, and mechanics
 */
export * from './buildings.js';
export * from './tech.js';
export * from './units.js';
export * from './defenses.js';
export * from './structureLevels.js';
export * from './capacities.js';
export * from './energyBudget.js';
export * from './overhaul.js';
export * from './random.js';

// ============================================================================
// 4. CONSTANTS (Configuration & Business Rules)
// ============================================================================

/**
 * Constants organized by category
 */

// File and directory paths
export * from './constants/file-paths.js';
export { DIRECTORY_PATHS } from './constants/file-paths.js';

// Game magic numbers and limits
export * from './constants/magic-numbers.js';
export { 
  STATUS_CODES,
  TIMEOUTS,
  RETRY_LIMITS,
  BUFFER_LIMITS,
  GAME_CONSTANTS,
  NETWORK_CONSTANTS
} from './constants/magic-numbers.js';

// Configuration keys and environment values
export * from './constants/configuration-keys.js';
export {
  ENV_VALUES,
  VITE_CONFIG_KEYS,
  URL_PATTERNS,
  HOST_VALUES
} from './constants/configuration-keys.js';

// Database field mappings
export * from './constants/database-fields.js';

// Environment variables
export * from './constants/env-vars.js';

// String constants and enums
export * from './constants/string-constants.js';

// Business rules and thresholds
export * from './constants/business-thresholds.js';

// Validation rules
export * from './constants/validation-rules.js';

// Response formats (legacy - APIs already exported above)
export {
  HTTP_STATUS,
  RESPONSE_FORMAT,
  ERROR_MESSAGES,
  type ApiErrorCodeType,
  sendApiErrorResponse
} from './constants/response-formats.js';

// Note: ApiErrorCode, createSuccessResponse, createErrorResponse, 
// sendApiResponse, and standardizeError are already exported from './api' above

// ============================================================================
// 5. UTILITIES (Helper Functions & Validation)
// ============================================================================

/**
 * General utility functions
 */
export * from './utils.js';
export * from './utils/env-helpers.js';

/**
 * Validation schemas and utilities
 */
export * from './validation.js'; // validation.ts file
// Note: validation/index.js exports commented out due to conflict with messages/validateGameMessage
// export * from './validation/index.js';

// ============================================================================
// 6. MESSAGES (Game Message System)
// ============================================================================

/**
 * Message types, utilities, and constants for the game message system
 */
export * from './messages/index.js';
