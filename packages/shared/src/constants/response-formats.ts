/**
 * Shared Response Format Constants
 * 
 * HTTP Status codes and common response formats used across both client and server
 */

/**
 * HTTP Status codes
 */
export const HTTP_STATUS = {
  // 2xx Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // 3xx Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  
  // 4xx Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  UPGRADE_REQUIRED: 426,
  TOO_MANY_REQUESTS: 429,
  
  // 5xx Server Error
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

/**
 * Response format builders
 */
export const RESPONSE_FORMAT = {
  /**
   * Success response builder
   */
  SUCCESS: <T = any>(data: T, message?: string): ApiResponse<T> => ({
    success: true,
    data,
    ...(message && { message })
  }),

  /**
   * Error response builder
   */
  ERROR: (error: string, code?: string): ApiResponse => ({
    success: false,
    error,
    ...(code && { code })
  }),

  /**
   * Success response with message only (no data)
   */
  SUCCESS_MESSAGE: (message: string): ApiResponse => ({
    success: true,
    message
  }),

  /**
   * Not found error response
   */
  NOT_FOUND: (resource: string): ApiResponse => ({
    success: false,
    error: `${resource} not found`,
    code: 'NOT_FOUND'
  }),

  /**
   * Validation error response
   */
  VALIDATION_ERROR: (error: string): ApiResponse => ({
    success: false,
    error,
    code: 'VALIDATION_ERROR'
  }),

  /**
   * Unauthorized error response
   */
  UNAUTHORIZED: (message?: string): ApiResponse => ({
    success: false,
    error: message || 'Authentication is required',
    code: 'UNAUTHORIZED'
  }),

  /**
   * Forbidden error response
   */
  FORBIDDEN: (message?: string): ApiResponse => ({
    success: false,
    error: message || 'Access denied',
    code: 'FORBIDDEN'
  }),

  /**
   * Internal server error response
   */
  INTERNAL_ERROR: (message?: string): ApiResponse => ({
    success: false,
    error: message || 'Internal server error',
    code: 'INTERNAL_ERROR'
  })
} as const;

/**
 * Pagination response format
 */
export interface PaginatedResponse<T> {
  success: true;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}