/**
 * @fileoverview Response building utilities
 * Provides helper functions to create consistently typed API responses
 */

import { ApiResponse, PaginatedResponse, PaginationMeta } from '../types';

/**
 * Create a successful API response
 * @param data - Response data
 * @param message - Optional message
 * @param code - Optional response code
 * @returns Typed ApiResponse
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  code?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    code,
    timestamp: Date.now()
  };
}

/**
 * Create an error API response
 * @param error - Error message
 * @param code - Error code
 * @param message - Optional additional message
 * @returns Typed ApiResponse with error
 */
export function createErrorResponse(
  error: string,
  code?: string,
  message?: string
): ApiResponse<never> {
  return {
    success: false,
    error,
    code,
    message,
    timestamp: Date.now()
  };
}

/**
 * Create a paginated response
 * @param data - Array of items
 * @param pagination - Pagination metadata
 * @param message - Optional message
 * @param code - Optional response code
 * @returns Typed PaginatedResponse
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  message?: string,
  code?: string
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    message,
    code,
    meta: pagination,
    timestamp: Date.now()
  };
}

/**
 * Create pagination metadata from parameters
 * @param page - Current page (1-indexed)
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns PaginationMeta object
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const pages = Math.ceil(total / limit);
  const hasNext = page < pages;
  const hasPrev = page > 1;

  return {
    page,
    limit,
    total,
    pages,
    hasNext,
    hasPrev
  };
}

/**
 * Type guard for checking if response is paginated
 * @param response - Response object to check
 * @returns True if response is PaginatedResponse
 */
export function isPaginatedResponse<T>(
  response: ApiResponse<T> | PaginatedResponse<T>
): response is PaginatedResponse<T> {
  return 'meta' in response && (response as any).meta !== undefined;
}
