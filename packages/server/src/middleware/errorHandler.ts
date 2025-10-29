import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/response-formats';
import { ENV_VARS, ENV_VALUES } from '@game/shared';


// Create Winston logger instance
const logger = winston.createLogger({
  level: process.env[ENV_VARS.LOG_LEVEL] || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'attrition-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  errorCode?: string;
  correlationId?: string;
  context?: Record<string, any>;
}

// Error categories for better classification
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  SYSTEM = 'SYSTEM'
}

// Enhanced error handler middleware
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate correlation ID for request tracing
  const correlationId = error.correlationId || uuidv4();
  error.correlationId = correlationId;

  // Default error values
  let {
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message = ERROR_MESSAGES.INTERNAL_ERROR,
    errorCode = ERROR_MESSAGES.INTERNAL_ERROR
  } = error;

  // Enhanced error categorization
  let category = ErrorCategory.SYSTEM;

  // Generic validation error
  if (error.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = ERROR_MESSAGES.VALIDATION_ERROR;
    errorCode = 'VALIDATION_ERROR';
    category = ErrorCategory.VALIDATION;
  }

  // Database constraint errors (Supabase/PostgreSQL)
  if ((error as any).code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Duplicate field value';
    errorCode = 'DUPLICATE_VALUE';
    category = ErrorCategory.DATABASE;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = ERROR_MESSAGES.TOKEN_INVALID;
    errorCode = 'INVALID_TOKEN';
    category = ErrorCategory.AUTHENTICATION;
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = ERROR_MESSAGES.TOKEN_EXPIRED;
    errorCode = 'TOKEN_EXPIRED';
    category = ErrorCategory.AUTHENTICATION;
  }

  // Database connection errors (Supabase)
  if (error.message?.includes('connection') || error.message?.includes('timeout')) {
    statusCode = 503;
    message = 'Database unavailable';
    errorCode = 'DATABASE_UNAVAILABLE';
    category = ErrorCategory.DATABASE;
  }

  // Log error with structured format
  const errorLog = {
    correlationId,
    timestamp: new Date().toISOString(),
    level: 'error',
    category,
    errorCode,
    message: error.message,
    stack: error.stack,
    statusCode,
    isOperational: error.isOperational,
    context: error.context || {},
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      correlationId
    }
  };

  // Log error
  logger.error('Application Error', errorLog);

  // Don't leak internal error details in production
  const isDevelopment = process.env[ENV_VARS.NODE_ENV] === ENV_VALUES.DEVELOPMENT;
  
  const response = {
    success: false,
    error: message,
    errorCode,
    correlationId,
    ...(isDevelopment && { stack: error.stack }),
    ...(statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR && { 
      message: 'An internal server error occurred. Please try again later.' 
    })
  };

  res.status(statusCode).json(response);
};

// Async handler wrapper for better error handling
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation error handler
export const handleValidationError = (error: any, fieldName: string) => {
  const appError: AppError = new Error(`Invalid ${fieldName}`);
  appError.statusCode = HTTP_STATUS.BAD_REQUEST;
  appError.errorCode = 'VALIDATION_ERROR';
  appError.context = { field: fieldName, originalError: error.message };
  return appError;
};

// Database error handler
export const handleDatabaseError = (error: any, operation: string) => {
  const appError: AppError = new Error(`Database operation failed: ${operation}`);
  appError.statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  appError.errorCode = 'DATABASE_ERROR';
  appError.context = { operation, originalError: error.message };
  
  // Log database errors with higher severity
  logger.error(ERROR_MESSAGES.DATABASE_ERROR, {
    operation,
    error: error.message,
    stack: error.stack
  });
  
  return appError;
};

// Business logic error handler
export const handleBusinessLogicError = (message: string, errorCode: string = 'BUSINESS_LOGIC_ERROR') => {
  const appError: AppError = new Error(message);
  appError.statusCode = HTTP_STATUS.BAD_REQUEST;
  appError.errorCode = errorCode;
  appError.isOperational = true;
  return appError;
};

// External service error handler
export const handleExternalServiceError = (service: string, error: any) => {
  const appError: AppError = new Error(`External service error: ${service}`);
  appError.statusCode = 502;
  appError.errorCode = 'EXTERNAL_SERVICE_ERROR';
  appError.context = { service, originalError: error.message };
  
  logger.error('External Service Error', {
    service,
    error: error.message,
    stack: error.stack
  });
  
  return appError;
};

// Get logger instance for use in other modules
export const getLogger = () => logger;

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const correlationId = uuidv4();
  
  // Add correlation ID to request
  (req as any).correlationId = correlationId;

  // Log request start
  logger.info('Request Started', {
    correlationId,
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Log response completion
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = duration > 1000 ? 'warn' : 'info';
    
    logger.log(logLevel, 'Request Completed', {
      correlationId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      timestamp: new Date().toISOString()
    });
  });

  next();
};






