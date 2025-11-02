// Utility functions for creating consistent API responses with proper error handling

import { 
  EnhancedApiResponse, 
  SuccessResponse, 
  ErrorResponse, 
  ListResponse, 
  BulkOperationResponse,
  AsyncOperationResponse,
  HealthCheckResponse,
  HttpStatusCode, 
  ApiErrorCode, 
  ApiErrorDetail,
  PaginationMeta,
  RateLimitInfo,
  OperationStatus,
  HealthStatus
} from './types';

/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  options?: {
    message?: string;
    statusCode?: HttpStatusCode;
    requestId?: string;
    meta?: PaginationMeta;
    rateLimit?: RateLimitInfo;
    metadata?: Record<string, any>;
  }
): SuccessResponse<T> {
  return {
    success: true,
    statusCode: options?.statusCode || HttpStatusCode.OK,
    data,
    message: options?.message,
    timestamp: new Date().toISOString(),
    requestId: options?.requestId || generateRequestId(),
    meta: options?.meta,
    rateLimit: options?.rateLimit,
    metadata: options?.metadata
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  errorCode: ApiErrorCode,
  error: string,
  options?: {
    statusCode?: HttpStatusCode;
    details?: ApiErrorDetail[];
    requestId?: string;
    rateLimit?: RateLimitInfo;
    metadata?: Record<string, any>;
  }
): ErrorResponse {
  return {
    success: false,
    statusCode: options?.statusCode || getDefaultStatusCodeForError(errorCode),
    errorCode,
    error,
    details: options?.details,
    timestamp: new Date().toISOString(),
    requestId: options?.requestId || generateRequestId(),
    rateLimit: options?.rateLimit,
    metadata: options?.metadata
  };
}

/**
 * Create a paginated list response
 */
export function createListResponse<T>(
  items: T[],
  pagination: PaginationMeta,
  options?: {
    message?: string;
    requestId?: string;
    rateLimit?: RateLimitInfo;
    metadata?: Record<string, any>;
  }
): ListResponse<T> {
  return {
    success: true,
    statusCode: HttpStatusCode.OK,
    data: items,
    message: options?.message,
    meta: pagination,
    timestamp: new Date().toISOString(),
    requestId: options?.requestId || generateRequestId(),
    rateLimit: options?.rateLimit,
    metadata: options?.metadata
  };
}

/**
 * Create a bulk operation response
 */
export function createBulkOperationResponse<T>(
  successful: T[],
  failed: Array<{ item: any; error: ApiErrorDetail }>,
  options?: {
    message?: string;
    requestId?: string;
  }
): BulkOperationResponse<T> {
  const successCount = successful.length;
  const errorCount = failed.length;
  const success = errorCount === 0;
  
  return {
    success,
    successCount,
    errorCount,
    successful,
    failed,
    message: options?.message || 
      `Bulk operation completed: ${successCount} successful, ${errorCount} failed`,
    requestId: options?.requestId || generateRequestId(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Create an async operation response
 */
export function createAsyncOperationResponse<T = unknown>(
  operationId: string,
  status: OperationStatus,
  message: string,
  options?: {
    progress?: number;
    estimatedCompletionTime?: string;
    pollIntervalSeconds?: number;
    result?: T;
    error?: ApiErrorDetail;
  }
): AsyncOperationResponse<T> {
  return {
    operationId,
    status,
    message,
    progress: options?.progress,
    estimatedCompletionTime: options?.estimatedCompletionTime,
    pollIntervalSeconds: options?.pollIntervalSeconds || 5,
    result: options?.result,
    error: options?.error
  };
}

/**
 * Create a health check response
 */
export function createHealthCheckResponse(
  service: string,
  status: HealthStatus,
  options?: {
    version?: string;
    uptime?: number;
    dependencies?: Record<string, {
      status: HealthStatus;
      responseTime?: number;
      message?: string;
    }>;
    metrics?: {
      memoryUsage: number;
      cpuUsage: number;
      activeConnections: number;
    };
  }
): HealthCheckResponse {
  return {
    service,
    status,
    version: options?.version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: options?.uptime || 0,
    dependencies: options?.dependencies || {},
    metrics: options?.metrics
  };
}

/**
 * Create validation error details from field-specific errors
 */
export function createValidationErrors(
  fieldErrors: Record<string, string | string[]>
): ApiErrorDetail[] {
  const details: ApiErrorDetail[] = [];
  
  for (const [field, error] of Object.entries(fieldErrors)) {
    if (Array.isArray(error)) {
      error.forEach(msg => {
        details.push({
          field,
          message: msg,
          code: 'FIELD_VALIDATION_ERROR'
        });
      });
    } else {
      details.push({
        field,
        message: error,
        code: 'FIELD_VALIDATION_ERROR'
      });
    }
  }
  
  return details;
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1
  };
}

/**
 * Create rate limiting information
 */
export function createRateLimitInfo(
  limit: number,
  remaining: number,
  windowSize: number,
  resetTime?: Date
): RateLimitInfo {
  return {
    limit,
    remaining,
    resetTime: resetTime?.getTime() || Date.now() + (windowSize * 1000),
    windowSize
  };
}

/**
 * Get default HTTP status code for API error codes
 */
export function getDefaultStatusCodeForError(errorCode: ApiErrorCode): HttpStatusCode {
  switch (errorCode) {
    // Authentication & Authorization - 401/403
    case ApiErrorCode.INVALID_CREDENTIALS:
    case ApiErrorCode.TOKEN_EXPIRED:
    case ApiErrorCode.TOKEN_INVALID:
      return HttpStatusCode.UNAUTHORIZED;
      
    case ApiErrorCode.ACCESS_DENIED:
    case ApiErrorCode.ACCOUNT_LOCKED:
      return HttpStatusCode.FORBIDDEN;
      
    // Validation - 400/422
    case ApiErrorCode.VALIDATION_FAILED:
    case ApiErrorCode.MISSING_REQUIRED_FIELD:
    case ApiErrorCode.INVALID_FORMAT:
    case ApiErrorCode.VALUE_OUT_OF_RANGE:
    case ApiErrorCode.INVALID_REQUEST:
      return HttpStatusCode.BAD_REQUEST;
      
    // Conflicts - 409
    case ApiErrorCode.DUPLICATE_VALUE:
    case ApiErrorCode.LOCATION_OCCUPIED:
    case ApiErrorCode.FLEET_IN_TRANSIT:
    case ApiErrorCode.COMBAT_IN_PROGRESS:
      return HttpStatusCode.CONFLICT;
      
    // Not Found - 404
    case ApiErrorCode.RESOURCE_NOT_FOUND:
    case ApiErrorCode.EMPIRE_NOT_FOUND:
      return HttpStatusCode.NOT_FOUND;
      
    // Rate Limiting - 429
    case ApiErrorCode.RATE_LIMIT_EXCEEDED:
    case ApiErrorCode.COOLDOWN_ACTIVE:
      return HttpStatusCode.TOO_MANY_REQUESTS;
      
    // Service Issues - 503
    case ApiErrorCode.SERVICE_UNAVAILABLE:
    case ApiErrorCode.MAINTENANCE_MODE:
      return HttpStatusCode.SERVICE_UNAVAILABLE;
      
    // Game Logic - 422 (Unprocessable Entity)
    case ApiErrorCode.INSUFFICIENT_RESOURCES:
    case ApiErrorCode.LOCATION_INVALID:
    case ApiErrorCode.BUILDING_LIMIT_REACHED:
    case ApiErrorCode.TECH_REQUIREMENTS_NOT_MET:
      return HttpStatusCode.UNPROCESSABLE_ENTITY;
      
    // System Errors - 500
    case ApiErrorCode.DATABASE_ERROR:
    case ApiErrorCode.UNKNOWN_ERROR:
    case ApiErrorCode.OPERATION_FAILED:
    default:
      return HttpStatusCode.INTERNAL_SERVER_ERROR;
  }
}

/**
 * Convert unknown error to standardized API error
 */
export function standardizeError(
  error: unknown,
  defaultMessage = 'An unexpected error occurred'
): { errorCode: ApiErrorCode; message: string; details?: ApiErrorDetail[] } {
  if (error instanceof Error) {
    // Check if it's a known validation error
    if (error.name === 'ValidationError' || error.name === 'ZodError') {
      return {
        errorCode: ApiErrorCode.VALIDATION_FAILED,
        message: error.message || 'Validation failed',
        details: error.message ? [{ message: error.message }] : undefined
      };
    }
    
    // Check if it's a database error
    if (error.name === 'MongoError' || error.name === 'DatabaseError') {
      return {
        errorCode: ApiErrorCode.DATABASE_ERROR,
        message: 'Database operation failed'
      };
    }
    
    // Generic error handling
    return {
      errorCode: ApiErrorCode.OPERATION_FAILED,
      message: error.message || defaultMessage
    };
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return {
      errorCode: ApiErrorCode.OPERATION_FAILED,
      message: error || defaultMessage
    };
  }
  
  // Unknown error type
  return {
    errorCode: ApiErrorCode.UNKNOWN_ERROR,
    message: defaultMessage
  };
}

/**
 * Wrap async functions with consistent error handling
 * @template T The async function type to wrap
 */
export function withErrorHandling<T extends (...args: Parameters<T>) => Promise<unknown>>(
  fn: T,
  defaultErrorMessage?: string
): T {
  return (async (...args: Parameters<T>): Promise<unknown> => {
    try {
      return await fn(...args);
    } catch (error) {
      const { errorCode, message, details } = standardizeError(error, defaultErrorMessage);
      throw createErrorResponse(errorCode, message, { details });
    }
  }) as T;
}

/**
 * Express middleware helper for consistent response formatting
 * Sends an API response with appropriate status code
 */
export function sendApiResponse<T>(
  res: {
    status(code: number): { json(body: unknown): void };
  },
  response: EnhancedApiResponse<T>
): void {
  res.status(response.statusCode).json(response);
}

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(response: EnhancedApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true && 'data' in response;
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(response: EnhancedApiResponse<any>): response is ErrorResponse {
  return response.success === false && 'errorCode' in response;
}

/**
 * Merge multiple API responses (useful for batch operations)
 */
export function mergeApiResponses<T>(responses: EnhancedApiResponse<T>[]): BulkOperationResponse<T> {
  const successful: T[] = [];
  const failed: Array<{ item: T; error: ApiErrorDetail }> = [];
  
  responses.forEach(response => {
    if (isSuccessResponse(response)) {
      successful.push(response.data);
    } else if (isErrorResponse(response)) {
      failed.push({
        item: response as any, // We don't have the original item, so use the response
        error: {
          message: response.error,
          code: response.errorCode
        }
      });
    }
  });
  
  return createBulkOperationResponse(successful, failed);
}

/**
 * Express request-like interface for error handler
 */
interface ErrorHandlerRequest {
  correlationId?: string;
  headers: Record<string, string | string[] | undefined>;
  method: string;
  url: string;
  get(name: string): string | undefined;
  ip?: string;
}

/**
 * Express response-like interface for error handler
 */
interface ErrorHandlerResponse {
  status(code: number): { json(body: unknown): void };
}

/**
 * Enhanced error handler middleware for Express.js
 * Converts all errors into standardized API error responses
 * 
 * @param error - The error that was thrown
 * @param req - Express request object
 * @param res - Express response object
 * @param _next - Express next function (unused but required for Express middleware signature)
 */
export function enhancedErrorHandler(
  error: unknown,
  req: ErrorHandlerRequest,
  res: ErrorHandlerResponse,
  _next: (err?: unknown) => void
): void {
  // Generate correlation ID for request tracing
  const requestId = req.correlationId || req.headers['x-request-id'] || generateRequestId();
  
  // Standardize the error
  const { errorCode, message, details } = standardizeError(error, 'An internal server error occurred');
  
  // Create standardized error response
  const response = createErrorResponse(errorCode, message, {
    details,
    requestId,
    metadata: {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    }
  });
  
  // Log the error for debugging (in real apps you'd use a proper logger)
  console.error('[Enhanced Error Handler]', {
    requestId,
    errorCode,
    message,
    stack: error?.stack,
    method: req.method,
    url: req.url
  });
  
  // Send the standardized error response
  sendApiResponse(res, response);
}
