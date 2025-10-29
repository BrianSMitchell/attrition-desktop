// Standardized API response patterns with consistent error handling

/**
 * HTTP status codes used throughout the API
 */
export enum HttpStatusCode {
  // Success
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  
  // Client Error
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  
  // Server Error
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504
}

/**
 * Standard error codes for consistent error handling across the application
 */
export enum ApiErrorCode {
  // Authentication & Authorization
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  ACCESS_DENIED = 'ACCESS_DENIED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  
  // Validation
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  VALUE_OUT_OF_RANGE = 'VALUE_OUT_OF_RANGE',
  DUPLICATE_VALUE = 'DUPLICATE_VALUE',
  
  // Game Logic
  INSUFFICIENT_RESOURCES = 'INSUFFICIENT_RESOURCES',
  EMPIRE_NOT_FOUND = 'EMPIRE_NOT_FOUND',
  LOCATION_OCCUPIED = 'LOCATION_OCCUPIED',
  LOCATION_INVALID = 'LOCATION_INVALID',
  BUILDING_LIMIT_REACHED = 'BUILDING_LIMIT_REACHED',
  TECH_REQUIREMENTS_NOT_MET = 'TECH_REQUIREMENTS_NOT_MET',
  FLEET_IN_TRANSIT = 'FLEET_IN_TRANSIT',
  COMBAT_IN_PROGRESS = 'COMBAT_IN_PROGRESS',
  COOLDOWN_ACTIVE = 'COOLDOWN_ACTIVE',
  
  // System
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  MAINTENANCE_MODE = 'MAINTENANCE_MODE',
  
  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  OPERATION_FAILED = 'OPERATION_FAILED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  INVALID_REQUEST = 'INVALID_REQUEST'
}

/**
 * Error detail for providing specific information about what went wrong
 */
export interface ApiErrorDetail {
  /** Field or property that caused the error */
  field?: string;
  /** Error message specific to this detail */
  message: string;
  /** Error code for this specific detail */
  code?: string;
  /** Additional context about the error */
  context?: Record<string, any>;
}

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items available */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrevious: boolean;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  /** Maximum number of requests allowed in the time window */
  limit: number;
  /** Number of requests remaining in current window */
  remaining: number;
  /** Time when the rate limit window resets (Unix timestamp) */
  resetTime: number;
  /** Duration of the rate limit window in seconds */
  windowSize: number;
}

/**
 * Enhanced API response structure that extends the basic ApiResponse
 */
export interface EnhancedApiResponse<T = any> {
  /** Whether the request was successful */
  success: boolean;
  /** HTTP status code */
  statusCode: HttpStatusCode;
  /** Response data (present on success) */
  data?: T;
  /** Success message */
  message?: string;
  /** Error code (present on failure) */
  errorCode?: ApiErrorCode;
  /** Error message (present on failure) */
  error?: string;
  /** Detailed error information */
  details?: ApiErrorDetail[];
  /** Request timestamp */
  timestamp: string;
  /** Request identifier for debugging */
  requestId: string;
  /** Pagination metadata for list responses */
  meta?: PaginationMeta;
  /** Rate limiting information */
  rateLimit?: RateLimitInfo;
  /** Additional response metadata */
  metadata?: Record<string, any>;
}

/**
 * Generic success response
 */
export interface SuccessResponse<T = any> extends EnhancedApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Generic error response
 */
export interface ErrorResponse extends EnhancedApiResponse<never> {
  success: false;
  errorCode: ApiErrorCode;
  error: string;
  details?: ApiErrorDetail[];
}

/**
 * List response with pagination
 */
export interface ListResponse<T> extends SuccessResponse<T[]> {
  meta: PaginationMeta;
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse<T = any> {
  /** Overall operation success */
  success: boolean;
  /** Number of items processed successfully */
  successCount: number;
  /** Number of items that failed processing */
  errorCount: number;
  /** Successfully processed items */
  successful: T[];
  /** Failed items with error details */
  failed: Array<{
    item: any;
    error: ApiErrorDetail;
  }>;
  /** Summary message */
  message: string;
  /** Request metadata */
  requestId: string;
  timestamp: string;
}

/**
 * Async operation response (for long-running operations)
 */
export interface AsyncOperationResponse {
  /** Operation ID for tracking */
  operationId: string;
  /** Current status of the operation */
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  /** Progress percentage (0-100) */
  progress?: number;
  /** Operation message */
  message: string;
  /** Estimated completion time */
  estimatedCompletionTime?: string;
  /** Polling interval recommendation in seconds */
  pollIntervalSeconds?: number;
  /** Operation results (when completed) */
  result?: any;
  /** Error information (when failed) */
  error?: ApiErrorDetail;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  /** Service name */
  service: string;
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Service version */
  version: string;
  /** Check timestamp */
  timestamp: string;
  /** Uptime in seconds */
  uptime: number;
  /** Dependency health status */
  dependencies: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    message?: string;
  }>;
  /** System metrics */
  metrics?: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
}