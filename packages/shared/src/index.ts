/* Shared types and utilities for Attrition */

export * from './types';
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
export * from './constants/configuration-keys';
export * from './constants/database-fields';
export * from './constants/env-vars';
export * from './constants/file-paths';
export * from './constants/magic-numbers';
export * from './constants/string-constants';
export * from './constants/business-thresholds';
export * from './constants/validation-rules';
export { DIRECTORY_PATHS } from './constants/file-paths';
export { STATUS_CODES } from './constants/magic-numbers';

// Export response formats without ApiResponse to avoid conflict
export {
  HTTP_STATUS,
  RESPONSE_FORMAT,
  type PaginatedResponse,
  ApiErrorCode,
  type ApiErrorCodeType,
  createSuccessResponse,
  createErrorResponse,
  sendApiResponse,
  sendApiErrorResponse,
  standardizeError
} from './constants/response-formats';
