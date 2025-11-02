/**
 * @fileoverview Error and exception type definitions
 * Custom error types and exception handling
 */

/**
 * Base application error
 */
export class ApplicationError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApplicationError';
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }
}

/**
 * Validation error
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', 422, message, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends ApplicationError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super('NOT_FOUND', 404, message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ApplicationError {
  constructor(message = 'Authentication failed') {
    super('AUTHENTICATION_ERROR', 401, message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends ApplicationError {
  constructor(message = 'Access denied') {
    super('AUTHORIZATION_ERROR', 403, message);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Conflict error
 */
export class ConflictError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super('CONFLICT', 409, message, details);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Bad request error
 */
export class BadRequestError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super('BAD_REQUEST', 400, message, details);
    this.name = 'BadRequestError';
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * Internal server error
 */
export class InternalServerError extends ApplicationError {
  constructor(message: string, details?: Record<string, any>) {
    super('INTERNAL_SERVER_ERROR', 500, message, details);
    this.name = 'InternalServerError';
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * Service unavailable error
 */
export class ServiceUnavailableError extends ApplicationError {
  constructor(message = 'Service temporarily unavailable') {
    super('SERVICE_UNAVAILABLE', 503, message);
    this.name = 'ServiceUnavailableError';
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ApplicationError {
  constructor(
    public retryAfter: number,
    message = 'Rate limit exceeded'
  ) {
    super('RATE_LIMIT_EXCEEDED', 429, message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Database error
 */
export class DatabaseError extends ApplicationError {
  constructor(
    message: string,
    public operation?: string,
    details?: Record<string, any>
  ) {
    super('DATABASE_ERROR', 500, message, details);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends ApplicationError {
  constructor(message = 'Request timeout') {
    super('TIMEOUT', 504, message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends ApplicationError {
  constructor(
    public service: string,
    message: string,
    details?: Record<string, any>
  ) {
    super('EXTERNAL_SERVICE_ERROR', 502, `${service}: ${message}`, details);
    this.name = 'ExternalServiceError';
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends ApplicationError {
  constructor(message: string) {
    super('CONFIGURATION_ERROR', 500, message);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  status: 'error';
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
  timestamp: number;
  requestId?: string;
}

/**
 * Error handling callback
 */
export type ErrorHandler = (error: Error, context: ErrorContext) => Promise<void>;

/**
 * Error context for handlers
 */
export interface ErrorContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  timestamp: number;
}

/**
 * Error logger interface
 */
export interface ErrorLogger {
  logError(error: Error, context?: ErrorContext): Promise<void>;
  logWarning(message: string, context?: ErrorContext): Promise<void>;
  logInfo(message: string, context?: ErrorContext): Promise<void>;
}

/**
 * Type guard for ApplicationError
 */
export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

/**
 * Type guard for Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Get HTTP status code from error
 */
export function getErrorStatusCode(error: unknown): number {
  if (isApplicationError(error)) {
    return error.statusCode;
  }
  if (isError(error)) {
    return 500;
  }
  return 500;
}

/**
 * Get error code from error
 */
export function getErrorCode(error: unknown): string {
  if (isApplicationError(error)) {
    return error.code;
  }
  if (isError(error)) {
    return 'UNKNOWN_ERROR';
  }
  return 'UNKNOWN_ERROR';
}
