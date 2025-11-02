/**
 * @fileoverview Server type definitions and public API
 * Central location for all server-wide type exports
 */

// Re-export all types from type modules
export * from './request.types';
export * from './service.types';
export * from './database.types';
export * from './error.types';

/**
 * Common type aliases used throughout the server
 */
export type ID = string | number;
export type Timestamp = number;
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

export interface JSONObject {
  [key: string]: JSONValue;
}

export interface JSONArray extends Array<JSONValue> {}

/**
 * Generic response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  timestamp: Timestamp;
}

/**
 * Generic pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

/**
 * Generic error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Record<string, any>;
  timestamp: Timestamp;
}

/**
 * Query parameters for list operations
 */
export interface ListQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  filter?: Record<string, any>;
  search?: string;
}

/**
 * Filter operator types
 */
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';

/**
 * Advanced filter structure
 */
export interface FilterCondition {
  operator: FilterOperator;
  value: any;
}

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc' | 1 | -1;

/**
 * Sort specification
 */
export interface SortSpec {
  [key: string]: SortDirection;
}
