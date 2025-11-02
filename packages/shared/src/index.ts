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
export * from './types/index';
export * from './types/test-types';

// ============================================================================
// 2. API MODULE (Response Types & Utilities)
// ============================================================================

/**
 * Re-export all API utilities and types for consistent request/response handling
 */
export * from './api';
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
} from './api';

// ============================================================================
// 3. GAME LOGIC (Core Game Systems)
// ============================================================================

/**
 * Game logic modules for buildings, technology, units, and mechanics
 */
export * from './buildings';
export * from './tech';
export * from './units';
export * from './defenses';
export * from './structureLevels';
export * from './capacities';
export * from './energyBudget';
export * from './overhaul';
export * from './random';

// ============================================================================
// 4. CONSTANTS (Configuration & Business Rules)
// ============================================================================

/**
 * Constants organized by category
 */

// File and directory paths
export * from './constants/file-paths';
export { DIRECTORY_PATHS } from './constants/file-paths';

// Game magic numbers and limits
export * from './constants/magic-numbers';
export { 
  STATUS_CODES,
  TIMEOUTS,
  RETRY_LIMITS,
  BUFFER_LIMITS,
  GAME_CONSTANTS,
  NETWORK_CONSTANTS
} from './constants/magic-numbers';

// Configuration keys and environment values
export * from './constants/configuration-keys';
export {
  ENV_VALUES,
  VITE_CONFIG_KEYS,
  URL_PATTERNS,
  HOST_VALUES
} from './constants/configuration-keys';

// Database field mappings
export * from './constants/database-fields';

// Environment variables
export * from './constants/env-vars';

// String constants and enums
export * from './constants/string-constants';

// Business rules and thresholds
export * from './constants/business-thresholds';

// Validation rules
export * from './constants/validation-rules';

// Response formats (legacy - APIs already exported above)
export {
  HTTP_STATUS,
  RESPONSE_FORMAT,
  ERROR_MESSAGES,
  type ApiErrorCodeType,
  sendApiErrorResponse
} from './constants/response-formats';

// Note: ApiErrorCode, createSuccessResponse, createErrorResponse, 
// sendApiResponse, and standardizeError are already exported from './api' above

// ============================================================================
// 5. UTILITIES (Helper Functions & Validation)
// ============================================================================

/**
 * General utility functions
 */
export * from './utils';
export * from './utils/env-helpers';

/**
 * Validation schemas and utilities
 */
export * from './validation';

// ============================================================================
// 6. MESSAGES (Game Message System)
// ============================================================================

/**
 * Message types, utilities, and constants for the game message system
 */
export * from './messages';
