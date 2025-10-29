"use strict";
// Utility functions for creating consistent API responses with proper error handling
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRequestId = generateRequestId;
exports.createSuccessResponse = createSuccessResponse;
exports.createErrorResponse = createErrorResponse;
exports.createListResponse = createListResponse;
exports.createBulkOperationResponse = createBulkOperationResponse;
exports.createAsyncOperationResponse = createAsyncOperationResponse;
exports.createHealthCheckResponse = createHealthCheckResponse;
exports.createValidationErrors = createValidationErrors;
exports.createPaginationMeta = createPaginationMeta;
exports.createRateLimitInfo = createRateLimitInfo;
exports.getDefaultStatusCodeForError = getDefaultStatusCodeForError;
exports.standardizeError = standardizeError;
exports.withErrorHandling = withErrorHandling;
exports.sendApiResponse = sendApiResponse;
exports.isSuccessResponse = isSuccessResponse;
exports.isErrorResponse = isErrorResponse;
exports.mergeApiResponses = mergeApiResponses;
exports.enhancedErrorHandler = enhancedErrorHandler;
const types_1 = require("./types");
/**
 * Generate a unique request ID for tracking
 */
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Create a standardized success response
 */
function createSuccessResponse(data, options) {
    return {
        success: true,
        statusCode: options?.statusCode || types_1.HttpStatusCode.OK,
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
function createErrorResponse(errorCode, error, options) {
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
function createListResponse(items, pagination, options) {
    return {
        success: true,
        statusCode: types_1.HttpStatusCode.OK,
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
function createBulkOperationResponse(successful, failed, options) {
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
function createAsyncOperationResponse(operationId, status, message, options) {
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
function createHealthCheckResponse(service, status, options) {
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
function createValidationErrors(fieldErrors) {
    const details = [];
    for (const [field, error] of Object.entries(fieldErrors)) {
        if (Array.isArray(error)) {
            error.forEach(msg => {
                details.push({
                    field,
                    message: msg,
                    code: 'FIELD_VALIDATION_ERROR'
                });
            });
        }
        else {
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
function createPaginationMeta(page, limit, total) {
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
function createRateLimitInfo(limit, remaining, windowSize, resetTime) {
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
function getDefaultStatusCodeForError(errorCode) {
    switch (errorCode) {
        // Authentication & Authorization - 401/403
        case types_1.ApiErrorCode.INVALID_CREDENTIALS:
        case types_1.ApiErrorCode.TOKEN_EXPIRED:
        case types_1.ApiErrorCode.TOKEN_INVALID:
            return types_1.HttpStatusCode.UNAUTHORIZED;
        case types_1.ApiErrorCode.ACCESS_DENIED:
        case types_1.ApiErrorCode.ACCOUNT_LOCKED:
            return types_1.HttpStatusCode.FORBIDDEN;
        // Validation - 400/422
        case types_1.ApiErrorCode.VALIDATION_FAILED:
        case types_1.ApiErrorCode.MISSING_REQUIRED_FIELD:
        case types_1.ApiErrorCode.INVALID_FORMAT:
        case types_1.ApiErrorCode.VALUE_OUT_OF_RANGE:
        case types_1.ApiErrorCode.INVALID_REQUEST:
            return types_1.HttpStatusCode.BAD_REQUEST;
        // Conflicts - 409
        case types_1.ApiErrorCode.DUPLICATE_VALUE:
        case types_1.ApiErrorCode.LOCATION_OCCUPIED:
        case types_1.ApiErrorCode.FLEET_IN_TRANSIT:
        case types_1.ApiErrorCode.COMBAT_IN_PROGRESS:
            return types_1.HttpStatusCode.CONFLICT;
        // Not Found - 404
        case types_1.ApiErrorCode.RESOURCE_NOT_FOUND:
        case types_1.ApiErrorCode.EMPIRE_NOT_FOUND:
            return types_1.HttpStatusCode.NOT_FOUND;
        // Rate Limiting - 429
        case types_1.ApiErrorCode.RATE_LIMIT_EXCEEDED:
        case types_1.ApiErrorCode.COOLDOWN_ACTIVE:
            return types_1.HttpStatusCode.TOO_MANY_REQUESTS;
        // Service Issues - 503
        case types_1.ApiErrorCode.SERVICE_UNAVAILABLE:
        case types_1.ApiErrorCode.MAINTENANCE_MODE:
            return types_1.HttpStatusCode.SERVICE_UNAVAILABLE;
        // Game Logic - 422 (Unprocessable Entity)
        case types_1.ApiErrorCode.INSUFFICIENT_RESOURCES:
        case types_1.ApiErrorCode.LOCATION_INVALID:
        case types_1.ApiErrorCode.BUILDING_LIMIT_REACHED:
        case types_1.ApiErrorCode.TECH_REQUIREMENTS_NOT_MET:
            return types_1.HttpStatusCode.UNPROCESSABLE_ENTITY;
        // System Errors - 500
        case types_1.ApiErrorCode.DATABASE_ERROR:
        case types_1.ApiErrorCode.UNKNOWN_ERROR:
        case types_1.ApiErrorCode.OPERATION_FAILED:
        default:
            return types_1.HttpStatusCode.INTERNAL_SERVER_ERROR;
    }
}
/**
 * Convert unknown error to standardized API error
 */
function standardizeError(error, defaultMessage = 'An unexpected error occurred') {
    if (error instanceof Error) {
        // Check if it's a known validation error
        if (error.name === 'ValidationError' || error.name === 'ZodError') {
            return {
                errorCode: types_1.ApiErrorCode.VALIDATION_FAILED,
                message: error.message || 'Validation failed',
                details: error.message ? [{ message: error.message }] : undefined
            };
        }
        // Check if it's a database error
        if (error.name === 'MongoError' || error.name === 'DatabaseError') {
            return {
                errorCode: types_1.ApiErrorCode.DATABASE_ERROR,
                message: 'Database operation failed'
            };
        }
        // Generic error handling
        return {
            errorCode: types_1.ApiErrorCode.OPERATION_FAILED,
            message: error.message || defaultMessage
        };
    }
    // Handle string errors
    if (typeof error === 'string') {
        return {
            errorCode: types_1.ApiErrorCode.OPERATION_FAILED,
            message: error || defaultMessage
        };
    }
    // Unknown error type
    return {
        errorCode: types_1.ApiErrorCode.UNKNOWN_ERROR,
        message: defaultMessage
    };
}
/**
 * Wrap async functions with consistent error handling
 */
function withErrorHandling(fn, defaultErrorMessage) {
    return (async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            const { errorCode, message, details } = standardizeError(error, defaultErrorMessage);
            throw createErrorResponse(errorCode, message, { details });
        }
    });
}
/**
 * Express middleware helper for consistent response formatting
 */
function sendApiResponse(res, // Express Response object
response) {
    res.status(response.statusCode).json(response);
}
/**
 * Type guard to check if response is successful
 */
function isSuccessResponse(response) {
    return response.success === true && 'data' in response;
}
/**
 * Type guard to check if response is an error
 */
function isErrorResponse(response) {
    return response.success === false && 'errorCode' in response;
}
/**
 * Merge multiple API responses (useful for batch operations)
 */
function mergeApiResponses(responses) {
    const successful = [];
    const failed = [];
    responses.forEach(response => {
        if (isSuccessResponse(response)) {
            successful.push(response.data);
        }
        else if (isErrorResponse(response)) {
            failed.push({
                item: response, // We don't have the original item, so use the response
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
 * Enhanced error handler middleware for Express.js
 * Converts all errors into standardized API error responses
 */
function enhancedErrorHandler(error, req, // Express Request
res, // Express Response  
next // Express NextFunction
) {
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
