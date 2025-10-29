"use strict";
/**
 * Shared Response Format Constants
 *
 * HTTP Status codes and common response formats used across both client and server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESPONSE_FORMAT = exports.HTTP_STATUS = void 0;
/**
 * HTTP Status codes
 */
exports.HTTP_STATUS = {
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
};
/**
 * Response format builders
 */
exports.RESPONSE_FORMAT = {
    /**
     * Success response builder
     */
    SUCCESS: (data, message) => ({
        success: true,
        data,
        ...(message && { message })
    }),
    /**
     * Error response builder
     */
    ERROR: (error, code) => ({
        success: false,
        error,
        ...(code && { code })
    }),
    /**
     * Success response with message only (no data)
     */
    SUCCESS_MESSAGE: (message) => ({
        success: true,
        message
    }),
    /**
     * Not found error response
     */
    NOT_FOUND: (resource) => ({
        success: false,
        error: `${resource} not found`,
        code: 'NOT_FOUND'
    }),
    /**
     * Validation error response
     */
    VALIDATION_ERROR: (error) => ({
        success: false,
        error,
        code: 'VALIDATION_ERROR'
    }),
    /**
     * Unauthorized error response
     */
    UNAUTHORIZED: (message) => ({
        success: false,
        error: message || 'Authentication is required',
        code: 'UNAUTHORIZED'
    }),
    /**
     * Forbidden error response
     */
    FORBIDDEN: (message) => ({
        success: false,
        error: message || 'Access denied',
        code: 'FORBIDDEN'
    }),
    /**
     * Internal server error response
     */
    INTERNAL_ERROR: (message) => ({
        success: false,
        error: message || 'Internal server error',
        code: 'INTERNAL_ERROR'
    })
};
