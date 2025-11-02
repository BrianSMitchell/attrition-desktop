/* Shared types and utilities for Attrition */

// Re-export comprehensive types from types/index (single source of truth)
export * from './types/index';
export * from './types/test-types';
export * from './utils';
export * from './utils/env-helpers';
export * from './validation';
export * from './random';
export * from './tech';
export * from './buildings';
export * from './overhaul';
export * from './defenses';
export * from './units';
export * from './capacities';
export * from './structureLevels';
export * from './energyBudget';
export * from './messages/types';
export * from './messages/utils';
export * from './messages/constants';
export * from './constants/configuration-keys';
export * from './constants/database-fields';
export * from './constants/env-vars';
export * from './constants/file-paths';
export * from './constants/magic-numbers';
export * from './constants/string-constants';
export * from './constants/business-thresholds';
export * from './constants/validation-rules';

// Explicitly re-export commonly used constants for convenience
export { DIRECTORY_PATHS } from './constants/file-paths';
export { 
  STATUS_CODES,
  TIMEOUTS,
  RETRY_LIMITS,
  BUFFER_LIMITS,
  GAME_CONSTANTS,
  NETWORK_CONSTANTS
} from './constants/magic-numbers';

// Export response formats without ApiResponse to avoid conflict
export {
  HTTP_STATUS,
  RESPONSE_FORMAT,
  ERROR_MESSAGES,
  type PaginatedResponse,
  ApiErrorCode,
  type ApiErrorCodeType,
  createSuccessResponse,
  createErrorResponse,
  sendApiResponse,
  sendApiErrorResponse,
  standardizeError
} from './constants/response-formats';
